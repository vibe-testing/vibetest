/**
 * XPath Generation Types
 *
 * Type definitions for XPath generation used by both browser-side and Node.js code.
 */

/**
 * Configuration for XPath generation.
 * Passed from Node.js to browser via Playwright's evaluate().
 */
export interface XPathGeneratorConfig {
  maxTextLength: number;
  maxDepth: number;
  minHrefLength: number;
  maxHrefLength: number;
  textTags: string[];
  containerTags: string[];
  landmarkTags: string[];
  landmarkRoles: string[];
  testIdAttrs: string[];
}

/**
 * Context object passed to all browser-side functions.
 * Provides access to config, document, and shared caches.
 *
 * This pattern:
 * - Makes dependencies explicit (no hidden globals)
 * - Enables easy testing (mock the ctx)
 * - Keeps functions pure and composable
 */
export interface BrowserCtx {
  config: XPathGeneratorConfig;
  document: Document;
}

/**
 * Extracted data from a DOM element.
 * All the attributes/properties we might use for XPath generation.
 */
export interface ExtractedData {
  tagName: string;
  id: string | null;
  type: string | null;
  dataTestId: string | null;
  dataTest: string | null;
  dataCy: string | null;
  dataTestIdAlt: string | null;
  dataQa: string | null;
  name: string | null;
  forAttr: string | null;
  ariaLabel: string | null;
  title: string | null;
  alt: string | null;
  href: string | null;
  value: string | null;
  placeholder: string | null;
  role: string | null;
  text: string | null;
  textLength: number;
  /** All valid alt texts from descendant images (deduped, length-filtered) */
  descendantImgAlts: string[];
}

/**
 * Strategy function signature.
 * Takes extracted data, scope prefix, and context.
 * Returns unique XPath string or null if strategy doesn't apply.
 */
export type StrategyRunner = (
  data: ExtractedData,
  prefix: string,
  ctx: BrowserCtx,
) => string | null;

/**
 * Named strategy with its runner function.
 */
export interface Strategy {
  name: string;
  run: StrategyRunner;
}

/**
 * Rich result with selector metadata.
 */
export interface RichSelectorResult {
  selector: string;
  strategy: string;
  scope: "global" | "landmark" | "anchor";
}

/**
 * Result when no selector could be generated.
 *
 * Reasons:
 * - `'shadow-dom'`: Element is inside a ShadowRoot. XPath cannot cross shadow
 *   boundaries. Callers should use alternative strategies (CSS deep combinators,
 *   element handles, or piercing selectors).
 * - `'no-unique'`: No unique selector could be found. All strategies were tried
 *   but none produced a selector that uniquely identifies the element.
 */
export interface NoSelectorResult {
  selector: null;
  reason: "shadow-dom" | "no-unique";
}

/**
 * Union type for all possible results.
 */
export type SelectorResult = RichSelectorResult | NoSelectorResult;

/**
 * Scope in which an XPath selector was found.
 * Helps determine selector stability and portability.
 *
 * - global: Selector works from document root with no structural dependency
 * - landmark: Selector is scoped within a semantic landmark (header/main/footer/nav)
 * - anchor: Selector is scoped within an ancestor with unique ID or test-id
 */
export type SelectorScope = "global" | "landmark" | "anchor";

/**
 * Reason why no selector could be generated.
 *
 * - `'shadow-dom'`: Element is inside a ShadowRoot. XPath cannot cross shadow
 *   boundaries. Callers should use alternative strategies (CSS deep combinators,
 *   element handles, or piercing selectors).
 * - `'no-unique'`: No unique selector could be found. All strategies were tried
 *   but none produced a selector that uniquely identifies the element.
 */
export type NoSelectorReason = "shadow-dom" | "no-unique";
