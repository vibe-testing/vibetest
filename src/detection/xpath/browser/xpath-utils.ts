import type { BrowserCtx } from "./types.js";
import { escapeXPathAttribute, scopeXPath } from "../shared.js";

// Re-export shared utilities (escapeAttr is the browser alias for escapeXPathAttribute)
export { scopeXPath };
export { escapeXPathAttribute as escapeAttr };

/**
 * Create an isUnique function bound to the given context.
 *
 * Returns a function that checks if an XPath uniquely identifies exactly one element.
 * Uses an iterator-based approach that short-circuits as soon as we find a second match.
 */
export function createIsUnique(ctx: BrowserCtx): (xpath: string) => boolean {
  return (xpath: string): boolean => {
    try {
      // Use UNORDERED_NODE_ITERATOR_TYPE - it returns matches one at a time,
      // allowing us to stop after finding the second match (short-circuit)
      const iterator = ctx.document.evaluate(
        xpath,
        ctx.document,
        null,
        XPathResult.UNORDERED_NODE_ITERATOR_TYPE,
        null,
      );

      const first = iterator.iterateNext();
      if (!first) {
        return false;
      }

      const second = iterator.iterateNext();
      return !second;
    } catch (e) {
      throw new Error(`Invalid XPath: "${xpath}"`, { cause: e });
    }
  };
}

/**
 * Count matches for an XPath expression.
 * Used only for positional fallback where we need the actual count.
 * Note: This is expensive (full document scan) - prefer isUnique() when possible.
 */
export function countMatches(ctx: BrowserCtx, xpath: string): number {
  try {
    const result = ctx.document.evaluate(
      xpath,
      ctx.document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null,
    );
    return result.snapshotLength;
  } catch (e) {
    throw new Error(`Invalid XPath: "${xpath}"`, { cause: e });
  }
}
