/**
 * Browser Module
 *
 * Provides browser automation services using Playwright.
 */

// Browser service
export { BrowserService, isUrlSafe, assertUrlSafe } from "./browser-service.js";

// Constants
export { INTERACTIVE_DATA_ATTRIBUTE } from "./constants.js";

// Page ready utilities (from page-ready submodule)
export {
  waitForPageReady,
  type PageReadyConfig,
  type PageReadyResult,
  DEFAULT_PAGE_READY_CONFIG,
  STRATEGY_PRESETS,
  resolvePageReadyConfig,
} from "./page-ready/index.js";
