import type { BrowserCtx, ExtractedData } from "./types.js";

/**
 * Normalize whitespace to match XPath's normalize-space() behavior.
 * - Strips leading and trailing whitespace
 * - Collapses internal runs of whitespace to single space
 *
 * Example: "  Hello   World  " -> "Hello World"
 */
export function normalizeSpace(str: string | null | undefined): string | null {
  if (!str) {
    return null;
  }
  const normalized = str.replace(/\s+/g, " ").trim();
  return normalized || null;
}

/**
 * Extract all relevant data from a DOM element for XPath generation.
 *
 * This consolidates element property/attribute access into a single object
 * that can be passed to strategy functions, avoiding repeated DOM access.
 */
export function extractData(element: Element, ctx: BrowserCtx): ExtractedData {
  const tagName = element.tagName.toLowerCase();
  // Use normalizeSpace to match XPath's normalize-space() behavior
  const text = normalizeSpace(element.textContent);

  // Collect all valid alt texts from descendant images (deduped)
  const descendantImgAlts: string[] = [];
  if (ctx.config.containerTags.includes(tagName)) {
    const images = element.querySelectorAll("img[alt]");
    const seen = new Set<string>();
    for (const img of images) {
      const rawAlt = img.getAttribute("alt");
      const normalized = normalizeSpace(rawAlt);
      // Filter: non-empty, within length limit, not already seen
      if (
        normalized &&
        normalized.length < ctx.config.maxTextLength &&
        !seen.has(normalized)
      ) {
        seen.add(normalized);
        descendantImgAlts.push(normalized);
      }
    }
  }

  return {
    tagName,
    id: element.getAttribute("id") || null,
    type: element.getAttribute("type") || null,
    dataTestId: element.getAttribute("data-testid") || null,
    dataTest: element.getAttribute("data-test") || null,
    dataCy: element.getAttribute("data-cy") || null,
    dataTestIdAlt: element.getAttribute("data-test-id") || null,
    dataQa: element.getAttribute("data-qa") || null,
    name: element.getAttribute("name") || null,
    forAttr: element.getAttribute("for") || null,
    ariaLabel: element.getAttribute("aria-label") || null,
    title: element.getAttribute("title") || null,
    alt: element.getAttribute("alt") || null,
    href: element.getAttribute("href") || null,
    value: element.getAttribute("value") || null,
    placeholder: element.getAttribute("placeholder") || null,
    role: element.getAttribute("role") || null,
    text,
    textLength: text ? text.length : 0,
    descendantImgAlts,
  };
}
