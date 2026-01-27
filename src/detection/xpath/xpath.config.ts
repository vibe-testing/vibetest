import type { XPathGeneratorConfig } from "./types.js";

export const DEFAULT_CONFIG: XPathGeneratorConfig = {
  maxTextLength: 50,
  maxDepth: 50,
  minHrefLength: 2, // Excludes "/" and "#"
  maxHrefLength: 100, // Excludes very long URLs
  textTags: [
    "button",
    "a",
    "label",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "span",
    "p",
    "td",
    "th",
  ],
  containerTags: ["a", "button", "div", "span", "li"],
  // HTML5 semantic landmark elements
  landmarkTags: [
    "header",
    "footer",
    "main",
    "nav",
    "aside",
    "section",
    "article",
  ],
  // ARIA landmark roles (used by elements with explicit role="...")
  // See: https://www.w3.org/TR/wai-aria-1.2/#landmark_roles
  //
  // NOTE: 'form' is intentionally excluded. Generic forms (without aria-label)
  // are not landmarks per ARIA spec - only forms with accessible names are.
  // Including all forms creates false positives (most forms lack accessible names).
  landmarkRoles: [
    "banner", // <header> equivalent
    "navigation", // <nav> equivalent
    "main", // <main> equivalent
    "complementary", // <aside> equivalent
    "contentinfo", // <footer> equivalent
    "region", // <section> with aria-label
    "search", // search form
  ],
  testIdAttrs: [
    "data-testid",
    "data-test",
    "data-cy",
    "data-test-id",
    "data-qa",
  ],
};
