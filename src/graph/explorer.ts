/**
 * Explorer - Main exploration orchestrator
 *
 * Uses Playwright to crawl web applications, detect elements,
 * and build an exploration graph.
 *
 * @license MIT
 */

import { chromium, type Browser, type BrowserContext } from 'playwright';
import { GraphBuilder } from './builder.js';
import { ElementDetector } from './element-detector.js';
import { TransitionDetector } from './transition-detector.js';
import {
  type ExplorationGraphData,
  type DetectedElement,
  TransitionType,
  NavigationStatus,
  ElementType,
} from './types.js';

export interface ExplorerOptions {
  maxDepth: number;
  maxPages: number;
  headless: boolean;
  timeout: number;
  followLinks?: boolean;
  clickButtons?: boolean;
}

export interface ExplorationProgress {
  pagesVisited: number;
  currentDepth: number;
  currentUrl: string;
  elementsFound: number;
}

export type ProgressCallback = (progress: ExplorationProgress) => void;

interface QueueItem {
  url: string;
  depth: number;
  sourcePageId?: string;
  sourceElementId?: string;
}

export class Explorer {
  private options: Required<ExplorerOptions>;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private graphBuilder: GraphBuilder;
  private elementDetector: ElementDetector;
  private transitionDetector: TransitionDetector;
  private visitedUrls: Set<string> = new Set();

  constructor(options: ExplorerOptions) {
    this.options = {
      followLinks: true,
      clickButtons: false,
      ...options,
    };
    this.graphBuilder = new GraphBuilder();
    this.elementDetector = new ElementDetector();
    this.transitionDetector = new TransitionDetector();
  }

  async explore(
    startUrl: string,
    onProgress?: ProgressCallback
  ): Promise<ExplorationGraphData> {
    // Initialize the graph builder
    this.graphBuilder.initialize(startUrl, {
      maxDepth: this.options.maxDepth,
      maxPages: this.options.maxPages,
    });

    this.browser = await chromium.launch({
      headless: this.options.headless,
    });
    this.context = await this.browser.newContext();
    const page = await this.context.newPage();
    page.setDefaultTimeout(this.options.timeout);

    const queue: QueueItem[] = [{ url: this.normalizeUrl(startUrl), depth: 0 }];
    let pagesVisited = 0;
    let totalElementsFound = 0;

    while (queue.length > 0 && pagesVisited < this.options.maxPages) {
      const item = queue.shift()!;
      const normalizedUrl = this.normalizeUrl(item.url);

      if (this.visitedUrls.has(normalizedUrl)) {
        continue;
      }

      if (item.depth > this.options.maxDepth) {
        continue;
      }

      this.visitedUrls.add(normalizedUrl);

      try {
        const startTime = Date.now();
        const response = await page.goto(normalizedUrl, {
          waitUntil: 'networkidle',
          timeout: this.options.timeout,
        });
        const loadTime = Date.now() - startTime;

        const currentUrl = page.url();
        const pageId = this.urlToId(currentUrl);
        const title = await page.title();

        // Add page to graph
        const pageOptions: Parameters<typeof this.graphBuilder.addPage>[2] = {
          title,
          depth: item.depth,
          isStartPage: item.depth === 0,
          loadTime,
        };
        const statusCode = response?.status();
        if (statusCode !== undefined) {
          pageOptions.statusCode = statusCode;
        }
        this.graphBuilder.addPage(pageId, currentUrl, pageOptions);

        // Add navigation edge from source if exists
        if (item.sourcePageId) {
          const navOptions: Parameters<typeof this.graphBuilder.addNavigation>[2] = {
            transitionType: TransitionType.LINK_CLICK,
            status: NavigationStatus.SUCCESS,
          };
          if (item.sourceElementId) {
            navOptions.triggerElementId = item.sourceElementId;
          }
          this.graphBuilder.addNavigation(item.sourcePageId, pageId, navOptions);
        }

        // Detect elements on the page
        const elements = await this.elementDetector.detectElements(page);
        totalElementsFound += elements.length;

        // Add elements to graph and extract links
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i]!;
          const elementId = `${pageId}-el-${i}`;
          const importance = this.calculateImportance(element);

          const elementOptions: Parameters<typeof this.graphBuilder.addElement>[2] = {
            selector: element.selector,
            type: element.type,
            tagName: element.tagName,
            importance,
            isInteractable: true,
            isVisible: element.isVisible,
          };
          if (element.inputType) elementOptions.inputType = element.inputType;
          if (element.text) elementOptions.text = element.text;
          if (element.href) elementOptions.href = element.href;
          if (element.name) elementOptions.name = element.name;
          if (element.placeholder) elementOptions.placeholder = element.placeholder;
          if (element.ariaLabel) elementOptions.ariaLabel = element.ariaLabel;
          if (element.boundingBox) elementOptions.boundingBox = element.boundingBox;

          this.graphBuilder.addElement(pageId, elementId, elementOptions);

          // Queue links for exploration
          if (
            this.options.followLinks &&
            element.type === ElementType.LINK &&
            element.href
          ) {
            if (this.shouldExplore(element.href, currentUrl)) {
              queue.push({
                url: element.href,
                depth: item.depth + 1,
                sourcePageId: pageId,
                sourceElementId: elementId,
              });
            }
          }
        }

        // Handle button clicks if enabled
        if (this.options.clickButtons) {
          const buttons = elements.filter((e) => e.type === ElementType.BUTTON);
          for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i]!;
            try {
              const transition = await this.transitionDetector.detectClickTransition(
                page,
                button.selector
              );
              if (transition.occurred && transition.toUrl) {
                const targetPageId = this.urlToId(transition.toUrl);
                const buttonElementId = `${pageId}-btn-${i}`;

                // Add navigation edge
                const btnNavOptions: Parameters<typeof this.graphBuilder.addNavigation>[2] = {
                  triggerElementId: buttonElementId,
                  transitionType: transition.type,
                  status: NavigationStatus.SUCCESS,
                };
                if (transition.responseTimeMs !== undefined) {
                  btnNavOptions.responseTimeMs = transition.responseTimeMs;
                }
                this.graphBuilder.addNavigation(pageId, targetPageId, btnNavOptions);

                if (this.shouldExplore(transition.toUrl, currentUrl)) {
                  queue.push({
                    url: transition.toUrl,
                    depth: item.depth + 1,
                    sourcePageId: pageId,
                    sourceElementId: buttonElementId,
                  });
                }
              }
            } catch (error) {
              // Log and continue on button click errors
              console.warn(
                `Failed to detect transition for button:`,
                error instanceof Error ? error.message : error
              );
            }
          }
        }

        pagesVisited++;

        // Report progress
        if (onProgress) {
          onProgress({
            pagesVisited,
            currentDepth: item.depth,
            currentUrl,
            elementsFound: totalElementsFound,
          });
        }
      } catch (error) {
        // Handle timeout and navigation errors gracefully
        console.warn(`Failed to explore ${normalizedUrl}:`, error instanceof Error ? error.message : error);

        const pageId = this.urlToId(normalizedUrl);
        this.graphBuilder.addPage(pageId, normalizedUrl, {
          depth: item.depth,
          isStartPage: item.depth === 0,
        });

        pagesVisited++;

        if (onProgress) {
          onProgress({
            pagesVisited,
            currentDepth: item.depth,
            currentUrl: normalizedUrl,
            elementsFound: totalElementsFound,
          });
        }
      }
    }

    return this.graphBuilder.serialize();
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove hash
      parsed.hash = '';
      // Remove trailing slash from pathname (except for root)
      if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }
      // Sort query parameters for consistency
      parsed.searchParams.sort();
      return parsed.toString();
    } catch {
      return url;
    }
  }

  private urlToId(url: string): string {
    const normalized = this.normalizeUrl(url);
    // Create a stable ID by hashing the URL
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `page_${Math.abs(hash).toString(16)}`;
  }

  private shouldExplore(url: string, currentUrl: string): boolean {
    try {
      const targetUrl = new URL(url, currentUrl);
      const baseUrl = new URL(currentUrl);

      // Only explore same origin
      if (targetUrl.origin !== baseUrl.origin) {
        return false;
      }

      // Skip common non-page resources
      const skipExtensions = [
        '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg',
        '.css', '.js', '.ico', '.woff', '.woff2', '.ttf', '.eot',
      ];
      const pathname = targetUrl.pathname.toLowerCase();
      if (skipExtensions.some((ext) => pathname.endsWith(ext))) {
        return false;
      }

      // Skip mailto and tel links
      if (
        targetUrl.protocol === 'mailto:' ||
        targetUrl.protocol === 'tel:' ||
        targetUrl.protocol === 'javascript:'
      ) {
        return false;
      }

      const normalizedTarget = this.normalizeUrl(targetUrl.toString());
      return !this.visitedUrls.has(normalizedTarget);
    } catch {
      return false;
    }
  }

  private calculateImportance(element: DetectedElement): number {
    let score = 50; // Base score

    // Type-based scoring
    switch (element.type) {
      case ElementType.FORM:
        score += 35;
        break;
      case ElementType.BUTTON:
        score += 25;
        break;
      case ElementType.LINK:
        score += 20;
        break;
      case ElementType.INPUT:
        score += 15;
        break;
      case ElementType.SELECT:
        score += 15;
        break;
      case ElementType.TEXTAREA:
        score += 15;
        break;
      case ElementType.CHECKBOX:
      case ElementType.RADIO:
        score += 10;
        break;
      default:
        break;
    }

    // Position-based scoring (elements above the fold are more important)
    if (element.boundingBox) {
      const { y, height } = element.boundingBox;
      if (y < 300) {
        score += 20; // Above the fold
      } else if (y < 600) {
        score += 10; // Near the fold
      }

      // Larger elements tend to be more important
      const area = element.boundingBox.width * height;
      if (area > 10000) {
        score += 15;
      } else if (area > 5000) {
        score += 10;
      } else if (area > 1000) {
        score += 5;
      }
    }

    // Text content scoring
    if (element.text) {
      const text = element.text.toLowerCase();
      const importantWords = [
        'submit', 'login', 'sign', 'register', 'search',
        'buy', 'checkout', 'cart', 'menu', 'navigation',
      ];
      if (importantWords.some((word) => text.includes(word))) {
        score += 15;
      }
    }

    // Normalize to 0-100 range
    return Math.min(100, Math.max(0, score));
  }
}
