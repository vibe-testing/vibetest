import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "bun:test";
import { chromium, type Browser, type Page } from "playwright";
import { waitForPageReady } from "./page-ready.js";

describe("PageReady", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
  }, 30000); // Increased timeout for browser launch

  afterAll(async () => {
    await browser.close();
  }, 10000);

  beforeEach(async () => {
    page = await browser.newPage();
  }, 10000);

  afterEach(async () => {
    await page.close();
  }, 10000);

  it("detects ready state on simple HTML page", async () => {
    await page.setContent(
      "<html><body><h1>Hello</h1><button>Click</button></body></html>"
    );
    const result = await waitForPageReady(page);
    expect(result.ready).toBe(true);
    expect(result.reason).toBe("all_conditions_met");
  });

  it("respects timeout config", async () => {
    await page.setContent(`
      <html><body>
        <button>Click</button>
        <script>
          setInterval(() => {
            document.body.appendChild(document.createElement('div'));
          }, 50);
        </script>
      </body></html>
    `);
    const result = await waitForPageReady(page, {
      timing: { maxWaitMs: 300 },
    });
    expect(result.ready).toBe(false);
    expect(result.reason).toBe("timeout");
  });

  it("uses strategy presets", async () => {
    await page.setContent(
      "<html><body><button>Click</button></body></html>"
    );
    const result = await waitForPageReady(page, { strategy: "static" });
    expect(result.ready).toBe(true);
  });
});
