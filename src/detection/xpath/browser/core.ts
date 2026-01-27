import type {
  BrowserCtx,
  XPathGeneratorConfig,
  RichSelectorResult,
  SelectorResult,
  ExtractedData,
  Strategy,
} from "./types.js";
import { findAnchorAncestor } from "./anchors.js";
import { extractData } from "./extract.js";
import { findLandmarkAncestor } from "./landmarks.js";
import { buildStrategies } from "./strategies.js";
import {
  createIsUnique,
  countMatches,
  scopeXPath,
  escapeAttr,
} from "./xpath-utils.js";

/**
 * Maximum number of elements to iterate when finding positional index.
 * Prevents performance degradation on large DOMs with many matching elements.
 * If the element isn't found within this limit, we fall back to other strategies.
 */
const POSITIONAL_ITERATION_CAP = 100;

function tryStrategiesInScope(
  strategies: Strategy[],
  data: ExtractedData,
  prefix: string,
  scope: RichSelectorResult["scope"],
  ctx: BrowserCtx,
): RichSelectorResult | null {
  for (const strategy of strategies) {
    const xpath = strategy.run(data, prefix, ctx);
    if (xpath) {
      return { selector: xpath, strategy: strategy.name, scope };
    }
  }
  return null;
}

/**
 * Try simple scope + tag fallback.
 *
 * @returns RichSelectorResult if unique, null otherwise
 */
function tryScopedTagFallback(
  prefix: string,
  tagName: string,
  scope: RichSelectorResult["scope"],
  isUnique: (xpath: string) => boolean,
): RichSelectorResult | null {
  const xpath = scopeXPath(prefix, tagName);
  if (isUnique(xpath)) {
    return { selector: xpath, strategy: "tag", scope };
  }
  return null;
}

/**
 * Try positional scoped selector (anchor + tag[n]).
 *
 * Uses an iterator pattern instead of snapshot to avoid loading all matches
 * into memory at once. Includes an iteration cap to prevent performance issues
 * on large DOMs with many matching elements (e.g., hundreds of divs).
 */
function tryPositionalScoped(
  el: Element,
  prefix: string,
  data: ExtractedData,
  ctx: BrowserCtx,
  isUnique: (xpath: string) => boolean,
): RichSelectorResult | null {
  const anchorTagXPath = scopeXPath(prefix, data.tagName);
  const iterator = ctx.document.evaluate(
    anchorTagXPath,
    ctx.document,
    null,
    XPathResult.ORDERED_NODE_ITERATOR_TYPE,
    null,
  );

  let position = 0;
  let node = iterator.iterateNext();

  while (node && position < POSITIONAL_ITERATION_CAP) {
    position++;
    if (node === el) {
      const posXpath = scopeXPath(prefix, `${data.tagName}[${position}]`);
      if (isUnique(posXpath)) {
        return {
          selector: posXpath,
          strategy: "positionalScoped",
          scope: "anchor",
        };
      }
      // Found element but xpath not unique, no point continuing
      return null;
    }
    node = iterator.iterateNext();
  }

  // Element not found within iteration cap, fall back to other strategies
  return null;
}

/**
 * Generate a positional XPath as fallback when no semantic selector works.
 *
 * This creates an absolute path from the document root using tag names
 * and positional indices. Very fragile to DOM changes.
 */
function generatePositionalXPath(
  element: Element,
  isUnique: (xpath: string) => boolean,
  maxDepth: number,
): string | null {
  const segments: string[] = [];
  let current: Element | null = element;
  let depth = 0;

  while (
    current &&
    current.nodeType === Node.ELEMENT_NODE &&
    depth < maxDepth
  ) {
    const elementId = (current as HTMLElement).id;

    // If we find a unique ID, we can short-circuit
    if (elementId && elementId.trim() !== "") {
      const idXpath = `//*[@id=${escapeAttr(elementId)}]`;
      if (isUnique(idXpath)) {
        return segments.length === 0
          ? idXpath
          : `${idXpath}/${segments.join("/")}`;
      }
      // ID exists but not unique, use it as a segment
      segments.unshift(
        `${current.nodeName.toLowerCase()}[@id=${escapeAttr(elementId)}]`,
      );
    } else {
      const precedingSiblingCount = countPrecedingSiblingsOfSameType(current);
      const hasSiblings =
        precedingSiblingCount > 0 || hasFollowingSiblingOfSameType(current);
      const tagName = current.nodeName.toLowerCase();
      const xpathIndex = hasSiblings ? `[${precedingSiblingCount + 1}]` : "";
      segments.unshift(`${tagName}${xpathIndex}`);
    }

    current = current.parentElement;
    depth++;
  }

  return segments.length > 0 ? `/${segments.join("/")}` : null;
}

/**
 * Count preceding siblings of the same tag type.
 */
function countPrecedingSiblingsOfSameType(element: Element): number {
  let count = 0;
  let sibling = element.previousSibling;

  while (sibling) {
    if (
      sibling.nodeType === Node.ELEMENT_NODE &&
      sibling.nodeName === element.nodeName
    ) {
      count++;
    }
    sibling = sibling.previousSibling;
  }

  return count;
}

/**
 * Check if element has any following siblings of the same tag type.
 */
function hasFollowingSiblingOfSameType(element: Element): boolean {
  let sibling = element.nextSibling;

  while (sibling) {
    if (
      sibling.nodeType === Node.ELEMENT_NODE &&
      sibling.nodeName === element.nodeName
    ) {
      return true;
    }
    sibling = sibling.nextSibling;
  }

  return false;
}

/**
 * Core XPath generator function.
 *
 * ## Shadow DOM Handling
 *
 * Elements inside Shadow DOM cannot have standard XPath selectors because XPath
 * cannot cross shadow boundaries. When an element is inside a ShadowRoot, this
 * function returns `{ selector: null, reason: 'shadow-dom' }`.
 *
 * Callers should check for this reason and implement appropriate fallback logic.
 */
export function browserXPathGenerator(
  el: Element,
  config: XPathGeneratorConfig,
): SelectorResult {
  // Shadow DOM check: XPath cannot cross shadow boundaries.
  // Returns explicit reason so callers can implement fallback strategies.
  const rootNode = el.getRootNode();
  if (rootNode instanceof ShadowRoot) {
    return { selector: null, reason: "shadow-dom" };
  }

  // Set up context
  const ctx: BrowserCtx = {
    config,
    document: el.ownerDocument,
  };

  const isUnique = createIsUnique(ctx);
  const strategies = buildStrategies(isUnique);
  const data = extractData(el, ctx);

  // Try strategies at global scope
  let result = tryStrategiesInScope(strategies, data, "", "global", ctx);
  if (result) return result;

  // Try strategies within landmark scope
  const landmarkPrefix = findLandmarkAncestor(el, ctx, isUnique);
  if (landmarkPrefix) {
    result = tryStrategiesInScope(
      strategies,
      data,
      landmarkPrefix,
      "landmark",
      ctx,
    );
    if (result) return result;

    result = tryScopedTagFallback(
      landmarkPrefix,
      data.tagName,
      "landmark",
      isUnique,
    );
    if (result) return result;
  }

  // Try strategies within anchor scope
  const anchorPrefix = findAnchorAncestor(el, ctx, isUnique);
  if (anchorPrefix) {
    result = tryStrategiesInScope(
      strategies,
      data,
      anchorPrefix,
      "anchor",
      ctx,
    );
    if (result) return result;

    result = tryScopedTagFallback(
      anchorPrefix,
      data.tagName,
      "anchor",
      isUnique,
    );
    if (result) return result;

    result = tryPositionalScoped(el, anchorPrefix, data, ctx, isUnique);
    if (result) return result;
  }

  // Fall back to positional XPath from document root
  const positionalXpath = generatePositionalXPath(
    el,
    isUnique,
    config.maxDepth,
  );
  if (positionalXpath && countMatches(ctx, positionalXpath) === 1) {
    return {
      selector: positionalXpath,
      strategy: "positionalAbsolute",
      scope: "global",
    };
  }

  return { selector: null, reason: "no-unique" };
}
