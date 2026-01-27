/**
 * Browser Service
 *
 * Core service for managing Playwright browser lifecycle and page operations.
 * Provides SSRF protection via URL validation and request blocking.
 *
 * Adapted from original NestJS service at original-idea/api/src/browser/browser.service.ts
 * - Removed NestJS dependencies (@Injectable, OnModuleInit, OnModuleDestroy)
 * - Added explicit initialize() and cleanup() lifecycle methods
 * - Simplified for CLI usage while preserving core functionality
 */

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
  type PageScreenshotOptions,
} from "playwright";
import * as ipaddr from "ipaddr.js";

import { INTERACTIVE_DATA_ATTRIBUTE } from "./constants.js";
import { trackEventListeners } from "./utils/track-event-listeners.js";
import { patchInlineHandlers } from "./utils/patch-inline-handlers.js";

// =============================================================================
// URL SAFETY VALIDATION (SSRF Protection)
// =============================================================================

/**
 * Check if we're running in development mode
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production";
}

/**
 * Hostnames allowed only in development mode
 */
const DEV_ALLOWED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
];

/**
 * Blocked hostnames - always blocked even in development (cloud metadata)
 */
const ALWAYS_BLOCKED_HOSTNAMES = [
  "metadata.google.internal",
  "metadata.goog",
  "169.254.169.254", // AWS/Azure/GCP metadata
  "fd00:ec2::254", // AWS IMDSv2 IPv6
];

/**
 * Blocked protocols that should never be navigated to
 */
const BLOCKED_PROTOCOLS = ["file:", "javascript:", "data:", "vbscript:"];

/**
 * Allowed ports for navigation in production
 */
const ALLOWED_PORTS_PROD = [80, 443, 8080, 8443];

/**
 * IP ranges that should be blocked in production (using ipaddr.js range names)
 */
const BLOCKED_IP_RANGES_PROD = [
  "unspecified", // 0.0.0.0/8, ::/128
  "loopback", // 127.0.0.0/8, ::1/128
  "private", // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7
  "linkLocal", // 169.254.0.0/16, fe80::/10
  "carrierGradeNat", // 100.64.0.0/10
  "reserved", // Various reserved ranges
];

/**
 * IP ranges blocked even in development (metadata endpoints)
 */
const ALWAYS_BLOCKED_IP_RANGES = [
  "linkLocal", // 169.254.0.0/16 - includes cloud metadata
];

/**
 * Check if hostname is a blocked IP address using ipaddr.js
 */
function isBlockedIP(hostname: string, isDevMode: boolean): boolean {
  // Remove IPv6 brackets if present
  const cleanHostname = hostname.replace(/^\[|\]$/g, "");

  // Check if it's a valid IP address
  if (!ipaddr.isValid(cleanHostname)) {
    // Not an IP address (it's a domain name), allow it
    return false;
  }

  try {
    const addr = ipaddr.parse(cleanHostname);
    const range = addr.range();

    // Always block link-local (metadata endpoints)
    if (ALWAYS_BLOCKED_IP_RANGES.includes(range)) {
      return true;
    }

    // In dev mode, allow private/loopback IPs
    if (isDevMode) {
      return false;
    }

    return BLOCKED_IP_RANGES_PROD.includes(range);
  } catch {
    // If parsing fails, be safe and block it
    return true;
  }
}

/**
 * Validates that a URL is safe for browser navigation (prevents SSRF)
 * Uses ipaddr.js for robust IP address range detection.
 * In development mode, allows localhost and private IPs for local testing.
 */
export function isUrlSafe(value: string): boolean {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    const isDevMode = isDevelopment();

    // Block dangerous protocols (always)
    if (BLOCKED_PROTOCOLS.includes(url.protocol)) {
      return false;
    }

    // Only allow http and https
    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    // Always block cloud metadata endpoints
    if (ALWAYS_BLOCKED_HOSTNAMES.includes(hostname)) {
      return false;
    }

    // In development, allow localhost/loopback
    if (!isDevMode && DEV_ALLOWED_HOSTNAMES.includes(hostname)) {
      return false;
    }

    // Block private/internal IP ranges (with dev mode exception)
    if (isBlockedIP(hostname, isDevMode)) {
      return false;
    }

    // Validate port if specified (skip in dev mode - allow any port)
    if (
      !isDevMode &&
      url.port &&
      !ALLOWED_PORTS_PROD.includes(parseInt(url.port, 10))
    ) {
      return false;
    }

    // Block URLs with credentials (always)
    if (url.username || url.password) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Utility function to validate a URL and throw if unsafe.
 * Respects NODE_ENV - allows localhost in development mode.
 */
export function assertUrlSafe(url: string): void {
  if (!isUrlSafe(url)) {
    const message =
      process.env.NODE_ENV !== "production"
        ? "URL is not safe for navigation: must be a valid HTTP/HTTPS URL"
        : "URL is not safe for navigation: must be a publicly accessible HTTP/HTTPS URL";
    throw new Error(message);
  }
}

// =============================================================================
// BROWSER SERVICE
// =============================================================================

/**
 * BrowserService manages the Playwright browser lifecycle and provides
 * methods for creating pages, navigating to URLs, and taking screenshots.
 *
 * Features:
 * - Browser lifecycle management (initialize/cleanup)
 * - SSRF protection via URL validation and request blocking
 * - Event listener tracking via init scripts
 * - Screenshot capture (full page and viewport)
 *
 * Usage:
 * ```typescript
 * const browserService = new BrowserService();
 * await browserService.initialize();
 *
 * const page = await browserService.openPage("https://example.com");
 * const screenshot = await browserService.getScreenshot(page);
 *
 * await browserService.closePage(page);
 * await browserService.cleanup();
 * ```
 */
export class BrowserService {
  private browser: Browser | null = null;

  /**
   * Initialize the browser.
   * Must be called before using any other methods.
   */
  async initialize(): Promise<void> {
    if (this.browser) {
      return; // Already initialized
    }
    this.browser = await chromium.launch({ headless: true });
  }

  /**
   * Clean up the browser and release resources.
   * Should be called when done using the service.
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Check if the browser is initialized.
   */
  isInitialized(): boolean {
    return this.browser !== null;
  }

  /**
   * Create a new browser context with event tracking init scripts.
   */
  async createContext(): Promise<BrowserContext> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call initialize() first.");
    }

    const ctx = await this.browser.newContext();

    // Add init scripts for event listener tracking
    const script = `
      (${trackEventListeners.toString()})("${INTERACTIVE_DATA_ATTRIBUTE}");
      (${patchInlineHandlers.toString()})("${INTERACTIVE_DATA_ATTRIBUTE}");
    `;
    await ctx.addInitScript(script);

    return ctx;
  }

  /**
   * Create a new page in a new context.
   * The page will have event tracking enabled.
   */
  async newPage(): Promise<Page> {
    const ctx = await this.createContext();
    return ctx.newPage();
  }

  /**
   * Close a page and its associated context.
   */
  async closePage(page: Page): Promise<void> {
    await page.context().close();
  }

  /**
   * Open a page and navigate to the given URL.
   * Includes SSRF protection.
   *
   * @param url - The URL to navigate to
   * @param waitUntil - When to consider navigation complete
   * @returns The page after navigation
   * @throws Error if URL is not safe or navigation fails
   */
  async openPage(
    url: string,
    waitUntil:
      | "load"
      | "domcontentloaded"
      | "networkidle"
      | "commit" = "domcontentloaded"
  ): Promise<Page> {
    // SSRF Prevention: Validate URL before navigation
    assertUrlSafe(url);

    const page = await this.newPage();

    try {
      // Block requests to internal/private resources during page load
      await this.setupSsrfProtection(page);
      await page.goto(url, { waitUntil });
      return page;
    } catch (err) {
      // Clean up page context on failure to prevent resource leaks
      await page
        .context()
        .close()
        .catch(() => {});
      throw err;
    }
  }

  /**
   * Sets up SSRF protection by blocking requests to internal/private resources
   */
  private async setupSsrfProtection(page: Page): Promise<void> {
    await page.route("**/*", (route) => {
      const requestUrl = route.request().url();

      if (!isUrlSafe(requestUrl)) {
        console.debug(`Blocked SSRF attempt to: ${requestUrl}`);
        return route.abort("blockedbyclient");
      }

      return route.continue();
    });
  }

  /**
   * Take a full-page screenshot.
   *
   * @param page - The page to screenshot
   * @param opts - Screenshot options
   * @returns The screenshot as a Buffer
   */
  async getScreenshot(
    page: Page,
    opts: PageScreenshotOptions = {}
  ): Promise<Buffer> {
    return page.screenshot({
      scale: "css",
      fullPage: true,
      ...opts,
    });
  }

  /**
   * Take a viewport-only screenshot (what's currently visible).
   *
   * @param page - The page to screenshot
   * @param opts - Screenshot options
   * @returns The screenshot as a Buffer
   */
  async getViewportScreenshot(
    page: Page,
    opts: PageScreenshotOptions = {}
  ): Promise<Buffer> {
    return page.screenshot({
      scale: "css",
      fullPage: false,
      ...opts,
    });
  }

  /**
   * Get the HTML source of the page.
   *
   * @param page - The page to get source from
   * @returns The HTML content
   */
  async getSource(page: Page): Promise<string> {
    return page.content();
  }
}
