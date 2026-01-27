/**
 * Site Exploration Orchestrator
 *
 * Crawls a website starting from a URL, detecting interactive elements
 * and building an ExplorationGraph of pages and navigation paths.
 */

import type { Page } from "playwright";

import { BrowserService, assertUrlSafe } from "../browser/browser-service.js";
import { waitForPageReady } from "../browser/page-ready/index.js";
import { detectElementsAsCards } from "../detection/detector.js";
import {
  ExplorationGraph,
  TransitionType,
  NavigationStatus,
  ElementType,
} from "../graph/index.js";
import type { ExploreOptions, ExploreProgress, ProgressCallback } from "./types.js";

/**
 * Default options for exploration.
 * Exported for testing.
 */
export const DEFAULT_OPTIONS: Required<ExploreOptions> = {
  maxDepth: 3,
  maxPages: 50,
  headless: true,
  viewportWidth: 1280,
  viewportHeight: 720,
};

/**
 * Explore a website starting from the given URL.
 *
 * Performs a breadth-first crawl of the site, detecting interactive
 * elements on each page and building an ExplorationGraph.
 *
 * @param startUrl - URL to start exploration from
 * @param options - Exploration options
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to the completed ExplorationGraph
 */
export async function explore(
  startUrl: string,
  options: ExploreOptions = {},
  onProgress?: ProgressCallback
): Promise<ExplorationGraph> {
  // Validate URL before doing anything else
  assertUrlSafe(startUrl);

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const graph = new ExplorationGraph();
  graph.initialize("cli-exploration", startUrl, {
    maxDepth: opts.maxDepth,
    maxPages: opts.maxPages,
  });

  const browser = new BrowserService();
  await browser.initialize();

  try {
    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number; fromPageId?: string }> = [
      { url: startUrl, depth: 0 },
    ];

    while (queue.length > 0 && visited.size < opts.maxPages) {
      const { url, depth, fromPageId } = queue.shift()!;

      // Normalize URL for deduplication
      const normalizedUrl = normalizeUrl(url);
      if (visited.has(normalizedUrl) || depth > opts.maxDepth) continue;
      visited.add(normalizedUrl);

      const pageId = `page-${visited.size}`;

      if (onProgress) {
        onProgress({
          pagesDiscovered: queue.length + visited.size,
          pagesVisited: visited.size,
          currentUrl: url,
          depth,
        });
      }

      const page = await browser.newPage();
      await page.setViewportSize({
        width: opts.viewportWidth,
        height: opts.viewportHeight,
      });

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await waitForPageReady(page, { timing: { maxWaitMs: 10000 } });

        // Add page node
        graph.addPageNode(pageId, {
          url: normalizedUrl,
          title: await page.title(),
          discoveredAt: new Date(),
          depth,
          isStartPage: depth === 0,
        });

        // Add navigation edge from previous page
        if (fromPageId) {
          graph.addNavigationEdge(
            `edge-${fromPageId}-${pageId}`,
            fromPageId,
            pageId,
            {
              transitionType: TransitionType.CLICK,
              status: NavigationStatus.SUCCESS,
              traversedAt: new Date(),
            }
          );
        }

        // Detect elements
        const elements = await detectElementsAsCards(page);
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          graph.addElementToPage(pageId, `${pageId}-el-${i}`, {
            selector: el.selector,
            type: mapElementType(el.elementType),
            tagName: el.tagName,
            text: el.innerText,
            href: el.href,
            importance: el.confidenceScore / 100,
            isInteractable: true,
          });
        }

        // Extract links for next depth
        if (depth < opts.maxDepth) {
          const links = await extractLinks(page, startUrl);
          for (const link of links) {
            if (!visited.has(normalizeUrl(link))) {
              queue.push({ url: link, depth: depth + 1, fromPageId: pageId });
            }
          }
        }
      } catch (error) {
        // Add failed page node
        graph.addPageNode(pageId, {
          url: normalizedUrl,
          discoveredAt: new Date(),
          depth,
          isStartPage: depth === 0,
        });
        // Mark navigation as failed if coming from another page
        if (fromPageId) {
          graph.addNavigationEdge(
            `edge-${fromPageId}-${pageId}`,
            fromPageId,
            pageId,
            {
              transitionType: TransitionType.CLICK,
              status: NavigationStatus.FAILED,
              traversedAt: new Date(),
              errorMessage:
                error instanceof Error ? error.message : String(error),
            }
          );
        }
      } finally {
        await page.close();
      }
    }

    return graph;
  } finally {
    await browser.cleanup();
  }
}

/**
 * Normalize a URL for deduplication.
 *
 * - Removes trailing slashes (except root)
 * - Removes hash fragments
 * - Removes common UTM tracking parameters
 *
 * @param url - URL to normalize
 * @returns Normalized URL string
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove hash
    parsed.hash = "";
    // Remove common tracking params
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");

    let pathname = parsed.pathname;
    // Remove trailing slash (including root /)
    if (pathname.endsWith("/") && pathname.length >= 1) {
      pathname = pathname.slice(0, -1);
    }

    // Build result without trailing slash
    const searchStr = parsed.search;
    return `${parsed.origin}${pathname}${searchStr}`;
  } catch {
    // Invalid URL, return as-is
    return url;
  }
}

/**
 * Extract same-domain links from a page.
 *
 * Filters to only links on the same domain as the base URL,
 * and resolves relative URLs.
 *
 * @param page - Playwright Page to extract links from
 * @param baseUrl - Base URL to determine same-domain
 * @returns Array of absolute URLs
 */
export async function extractLinks(
  page: Page,
  baseUrl: string
): Promise<string[]> {
  const baseDomain = new URL(baseUrl).hostname;

  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]"))
      .map((a) => a.getAttribute("href"))
      .filter((href): href is string => href !== null);
  });

  // Filter to same-domain links and resolve relative URLs
  return links
    .map((href) => {
      try {
        return new URL(href, page.url()).href;
      } catch {
        return null;
      }
    })
    .filter((url): url is string => {
      if (!url) return false;
      try {
        const parsed = new URL(url);
        return (
          parsed.hostname === baseDomain &&
          (parsed.protocol === "http:" || parsed.protocol === "https:")
        );
      } catch {
        return false;
      }
    });
}

/**
 * Map element type string to ElementType enum.
 *
 * @param elementType - Element type string (e.g., "ButtonElement")
 * @returns Corresponding ElementType enum value
 */
export function mapElementType(elementType: string): ElementType {
  const mapping: Record<string, ElementType> = {
    ButtonElement: ElementType.BUTTON,
    HyperlinkElement: ElementType.LINK,
    TextInputElement: ElementType.INPUT,
    PasswordInputElement: ElementType.INPUT,
    TextareaElement: ElementType.TEXTAREA,
    SelectElement: ElementType.SELECT,
    CheckboxElement: ElementType.CHECKBOX,
    RadioElement: ElementType.RADIO,
    NumberInputElement: ElementType.INPUT,
    DateInputElement: ElementType.INPUT,
    FileInputElement: ElementType.INPUT,
    RangeInputElement: ElementType.INPUT,
    ColorInputElement: ElementType.INPUT,
    InteractableElement: ElementType.OTHER,
  };
  return mapping[elementType] || ElementType.OTHER;
}
