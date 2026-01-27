import type { BrowserCtx } from "./types.js";
import { resolveElementXPath } from "./scope-utils.js";

/**
 * Check if an element is a valid landmark for scoping purposes.
 * section/article require accessible names or stable anchors per ARIA spec.
 */
function isValidLandmark(el: Element, ctx: BrowserCtx): boolean {
  const tag = el.tagName.toLowerCase();

  // section and article are only landmarks if they have accessible names
  // or stable anchors (id, test-id). Otherwise they're just generic containers.
  // See: https://www.w3.org/TR/wai-aria-1.2/#region
  if (tag === "section" || tag === "article") {
    if (
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      (el as HTMLElement).id
    ) {
      return true;
    }
    for (const attr of ctx.config.testIdAttrs) {
      if (el.getAttribute(attr)) return true;
    }
    return false;
  }

  return true;
}

/**
 * Find the closest landmark ancestor and return a unique XPath prefix for it.
 *
 * Landmarks are HTML5 semantic elements (header, main, nav, etc.) or elements
 * with ARIA landmark roles. They provide stable scoping for XPath generation.
 */
export function findLandmarkAncestor(
  element: Element,
  ctx: BrowserCtx,
  isUnique: (xpath: string) => boolean,
): string | null {
  // Walk up the DOM to find the closest valid landmark
  // We can't use .closest() directly because we need to validate each candidate
  let landmark: Element | null = null;
  let current = element.parentElement;

  while (
    current &&
    current !== ctx.document.body &&
    current !== ctx.document.documentElement
  ) {
    const tag = current.tagName.toLowerCase();
    const role = current.getAttribute("role");

    const isLandmarkTag = ctx.config.landmarkTags.includes(tag);
    const hasLandmarkRole = role && ctx.config.landmarkRoles.includes(role);

    if (isLandmarkTag || hasLandmarkRole) {
      // For landmark tags, validate (section/article need accessible names)
      if (isLandmarkTag && !isValidLandmark(current, ctx)) {
        // Skip this one, keep looking
        current = current.parentElement;
        continue;
      }
      landmark = current;
      break;
    }

    current = current.parentElement;
  }

  if (!landmark) {
    return null;
  }

  return resolveElementXPath(landmark, ctx, isUnique, {
    tag: landmark.tagName.toLowerCase(),
    tryAriaLabel: true,
    tryRole: true,
    positionalFallback: true,
  });
}
