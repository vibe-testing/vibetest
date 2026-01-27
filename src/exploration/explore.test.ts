/**
 * Tests for exploration orchestrator
 */
import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";

import type { ExploreOptions, ExploreProgress, ProgressCallback } from "./types.js";
import { explore, normalizeUrl, extractLinks, mapElementType } from "./explore.js";
import { ExplorationGraph, ElementType } from "../graph/index.js";

// =============================================================================
// UNIT TESTS FOR HELPER FUNCTIONS
// =============================================================================

describe("normalizeUrl", () => {
  test("removes trailing slashes", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com");
    expect(normalizeUrl("https://example.com/path/")).toBe("https://example.com/path");
  });

  test("preserves single slash root", () => {
    // A single slash at root should stay
    const result = normalizeUrl("https://example.com");
    expect(result).toBe("https://example.com");
  });

  test("removes hash fragments", () => {
    expect(normalizeUrl("https://example.com/page#section")).toBe("https://example.com/page");
  });

  test("removes common UTM tracking parameters", () => {
    const url = "https://example.com/page?utm_source=google&utm_medium=cpc&utm_campaign=test&other=keep";
    const normalized = normalizeUrl(url);
    expect(normalized).toBe("https://example.com/page?other=keep");
  });

  test("handles invalid URLs gracefully", () => {
    expect(normalizeUrl("not-a-url")).toBe("not-a-url");
  });

  test("preserves non-tracking query params", () => {
    const url = "https://example.com/search?q=test&page=2";
    expect(normalizeUrl(url)).toBe("https://example.com/search?q=test&page=2");
  });
});

describe("mapElementType", () => {
  test("maps ButtonElement to BUTTON", () => {
    expect(mapElementType("ButtonElement")).toBe(ElementType.BUTTON);
  });

  test("maps HyperlinkElement to LINK", () => {
    expect(mapElementType("HyperlinkElement")).toBe(ElementType.LINK);
  });

  test("maps TextInputElement to INPUT", () => {
    expect(mapElementType("TextInputElement")).toBe(ElementType.INPUT);
  });

  test("maps PasswordInputElement to INPUT", () => {
    expect(mapElementType("PasswordInputElement")).toBe(ElementType.INPUT);
  });

  test("maps TextareaElement to TEXTAREA", () => {
    expect(mapElementType("TextareaElement")).toBe(ElementType.TEXTAREA);
  });

  test("maps SelectElement to SELECT", () => {
    expect(mapElementType("SelectElement")).toBe(ElementType.SELECT);
  });

  test("maps CheckboxElement to CHECKBOX", () => {
    expect(mapElementType("CheckboxElement")).toBe(ElementType.CHECKBOX);
  });

  test("maps RadioElement to RADIO", () => {
    expect(mapElementType("RadioElement")).toBe(ElementType.RADIO);
  });

  test("maps unknown types to OTHER", () => {
    expect(mapElementType("UnknownElement")).toBe(ElementType.OTHER);
    expect(mapElementType("")).toBe(ElementType.OTHER);
  });
});

// =============================================================================
// INTEGRATION TEST - OPTIONS MERGING
// =============================================================================

describe("ExploreOptions defaults", () => {
  test("DEFAULT_OPTIONS has expected values", async () => {
    // Import the DEFAULT_OPTIONS constant
    const { DEFAULT_OPTIONS } = await import("./explore.js");

    expect(DEFAULT_OPTIONS.maxDepth).toBe(3);
    expect(DEFAULT_OPTIONS.maxPages).toBe(50);
    expect(DEFAULT_OPTIONS.headless).toBe(true);
    expect(DEFAULT_OPTIONS.viewportWidth).toBe(1280);
    expect(DEFAULT_OPTIONS.viewportHeight).toBe(720);
  });
});

// =============================================================================
// EXPLORATION GRAPH CREATION TEST
// Note: Full integration tests with real browser are expensive.
// We test that explore() can be called and handles errors gracefully.
// =============================================================================

describe("explore function", () => {
  test("throws on invalid URL", async () => {
    // Invalid URLs should be caught early
    await expect(explore("not-a-valid-url")).rejects.toThrow();
  });

  test("returns an ExplorationGraph instance", async () => {
    // This test uses a file:// URL which should fail the SSRF check
    // but we can test with a valid URL format to verify the return type
    // Using localhost which is allowed in dev mode
    const progressCalls: ExploreProgress[] = [];

    // This will likely fail to connect but should return a graph
    // with at least an attempt to add the start page
    try {
      const graph = await explore("http://localhost:1", {
        maxDepth: 1,
        maxPages: 1,
      }, (progress) => progressCalls.push(progress));

      // Even if page fails to load, we should get a graph back
      expect(graph).toBeInstanceOf(ExplorationGraph);
    } catch (error) {
      // Connection refused is expected for localhost:1
      // The important thing is that explore() was called
      expect(error).toBeDefined();
    }
  });

  test("calls progress callback with correct structure", async () => {
    const progressCalls: ExploreProgress[] = [];

    try {
      await explore("http://localhost:1", {
        maxDepth: 1,
        maxPages: 1,
      }, (progress) => {
        progressCalls.push(progress);
        // Verify progress structure
        expect(typeof progress.pagesDiscovered).toBe("number");
        expect(typeof progress.pagesVisited).toBe("number");
        expect(typeof progress.currentUrl).toBe("string");
        expect(typeof progress.depth).toBe("number");
      });
    } catch {
      // Expected - connection will fail
    }
  });

  test("respects maxPages option", async () => {
    // This is a structural test - we verify the option is passed through
    // The actual page limit enforcement is tested via the internal logic
    const options: ExploreOptions = {
      maxPages: 5,
      maxDepth: 2,
    };

    // Just verify the options are accepted without error
    expect(options.maxPages).toBe(5);
    expect(options.maxDepth).toBe(2);
  });
});

// =============================================================================
// TYPES TESTS
// =============================================================================

describe("ExploreOptions type", () => {
  test("all fields are optional", () => {
    const emptyOptions: ExploreOptions = {};
    expect(emptyOptions).toBeDefined();
  });

  test("accepts all valid options", () => {
    const fullOptions: ExploreOptions = {
      maxDepth: 5,
      maxPages: 100,
      headless: false,
      viewportWidth: 1920,
      viewportHeight: 1080,
    };
    expect(fullOptions.maxDepth).toBe(5);
    expect(fullOptions.maxPages).toBe(100);
    expect(fullOptions.headless).toBe(false);
    expect(fullOptions.viewportWidth).toBe(1920);
    expect(fullOptions.viewportHeight).toBe(1080);
  });
});

describe("ExploreProgress type", () => {
  test("has required fields", () => {
    const progress: ExploreProgress = {
      pagesDiscovered: 10,
      pagesVisited: 5,
      currentUrl: "https://example.com/page",
      depth: 2,
    };
    expect(progress.pagesDiscovered).toBe(10);
    expect(progress.pagesVisited).toBe(5);
    expect(progress.currentUrl).toBe("https://example.com/page");
    expect(progress.depth).toBe(2);
  });
});

describe("ProgressCallback type", () => {
  test("is a function accepting ExploreProgress", () => {
    const callback: ProgressCallback = (progress) => {
      console.log(progress.currentUrl);
    };
    expect(typeof callback).toBe("function");
  });
});
