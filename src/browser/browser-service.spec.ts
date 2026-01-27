import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { BrowserService } from "./browser-service.js";

describe("BrowserService", () => {
  let browserService: BrowserService;

  beforeAll(async () => {
    browserService = new BrowserService();
    await browserService.initialize();
  });

  afterAll(async () => {
    await browserService.cleanup();
  });

  describe("lifecycle", () => {
    it("can be initialized", () => {
      expect(browserService).toBeDefined();
    });

    it("isInitialized returns true after initialization", () => {
      expect(browserService.isInitialized()).toBe(true);
    });
  });

  describe("newPage", () => {
    it("creates a new page", async () => {
      const page = await browserService.newPage();
      expect(page).toBeDefined();
      expect(page.url()).toBe("about:blank");
      await page.close();
    });

    it("creates multiple independent pages", async () => {
      const page1 = await browserService.newPage();
      const page2 = await browserService.newPage();

      expect(page1).not.toBe(page2);

      await page1.close();
      await page2.close();
    });
  });

  describe("navigation", () => {
    it("navigates to a URL", async () => {
      const page = await browserService.newPage();
      await page.goto("https://example.com");
      expect(page.url()).toContain("example.com");
      await page.close();
    });
  });

  describe("openPage", () => {
    it("opens a page and navigates to URL", async () => {
      const page = await browserService.openPage("https://example.com");
      expect(page.url()).toContain("example.com");
      await browserService.closePage(page);
    });

    it("throws on invalid URL", async () => {
      await expect(browserService.openPage("not-a-url")).rejects.toThrow();
    });

    it("throws on file:// URL", async () => {
      await expect(
        browserService.openPage("file:///etc/passwd")
      ).rejects.toThrow();
    });

    it("throws on javascript: URL", async () => {
      await expect(
        browserService.openPage("javascript:alert(1)")
      ).rejects.toThrow();
    });
  });

  describe("SSRF protection", () => {
    it("blocks cloud metadata endpoints", async () => {
      // AWS/GCP/Azure metadata endpoint
      await expect(
        browserService.openPage("http://169.254.169.254/latest/meta-data/")
      ).rejects.toThrow();
    });

    it("blocks internal hostnames in production", async () => {
      // Save original NODE_ENV
      const originalEnv = process.env.NODE_ENV;

      try {
        // Set production mode
        process.env.NODE_ENV = "production";

        // Need a fresh service for production mode
        const prodService = new BrowserService();
        await prodService.initialize();

        await expect(
          prodService.openPage("http://127.0.0.1:8080/api")
        ).rejects.toThrow();

        await prodService.cleanup();
      } finally {
        // Restore original NODE_ENV
        process.env.NODE_ENV = originalEnv;
      }
    });

    it("allows localhost in development mode", async () => {
      // Save original NODE_ENV
      const originalEnv = process.env.NODE_ENV;

      try {
        // Set development mode
        process.env.NODE_ENV = "development";

        // The URL is syntactically valid in dev mode, but the server won't be running
        // So we check that it doesn't throw the SSRF error specifically
        const devService = new BrowserService();
        await devService.initialize();

        // This will fail due to connection refused, not SSRF protection
        try {
          await devService.openPage("http://localhost:9999/test");
        } catch (err) {
          const message = (err as Error).message;
          // Should NOT be an SSRF error
          expect(message).not.toContain("not safe for navigation");
          // Should be a connection error
          expect(
            message.includes("net::ERR_CONNECTION_REFUSED") ||
              message.includes("Navigation failed")
          ).toBe(true);
        }

        await devService.cleanup();
      } finally {
        // Restore original NODE_ENV
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe("screenshots", () => {
    it("takes a full page screenshot", async () => {
      const page = await browserService.newPage();
      await page.goto("https://example.com");

      const screenshot = await browserService.getScreenshot(page);
      expect(screenshot).toBeInstanceOf(Buffer);
      expect(screenshot.length).toBeGreaterThan(0);

      await page.close();
    });

    it("takes a viewport screenshot", async () => {
      const page = await browserService.newPage();
      await page.goto("https://example.com");

      const screenshot = await browserService.getViewportScreenshot(page);
      expect(screenshot).toBeInstanceOf(Buffer);
      expect(screenshot.length).toBeGreaterThan(0);

      await page.close();
    });
  });

  describe("page content", () => {
    it("gets page source", async () => {
      const page = await browserService.newPage();
      await page.goto("https://example.com");

      const source = await browserService.getSource(page);
      expect(source).toContain("<!DOCTYPE html>");
      expect(source).toContain("Example Domain");

      await page.close();
    });
  });
});
