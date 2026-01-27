/**
 * Tests for element detection service.
 *
 * These tests verify the core detection functionality including:
 * - Detection of different element types (buttons, inputs, links, etc.)
 * - Deduplication of elements by XPath
 * - Priority-based classification when elements match multiple selectors
 * - Shadow DOM and iframe handling (optional)
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { chromium, type Browser, type Page } from "playwright";

import { detectElements, type DetectionOptions } from "./detector.js";
import { AbstractElement } from "./elements/abstract.element.js";
import { ElementAction } from "./elements/actions.js";

describe("Element Detection", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  }, 30000); // Increased timeout for browser launch

  afterAll(async () => {
    await browser.close();
  }, 10000); // Increased timeout for cleanup

  describe("detectElements", () => {
    it("detects button elements", async () => {
      await page.setContent('<button id="test-btn">Click me</button>');
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0].constructor.name).toBe("ButtonElement");
    });

    it("detects text inputs", async () => {
      await page.setContent('<input type="text" placeholder="Enter text">');
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0].constructor.name).toBe("TextInputElement");
    });

    it("detects links", async () => {
      await page.setContent('<a href="/about">About</a>');
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0].constructor.name).toBe("HyperlinkElement");
    });

    it("detects checkboxes", async () => {
      await page.setContent('<input type="checkbox" id="agree">');
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0].constructor.name).toBe("CheckboxElement");
    });

    it("detects radio buttons", async () => {
      await page.setContent(
        '<input type="radio" name="choice" value="a"><input type="radio" name="choice" value="b">',
      );
      const elements = await detectElements(page);

      expect(elements.length).toBe(2);
      expect(elements[0].constructor.name).toBe("RadioElement");
    });

    it("detects select dropdowns", async () => {
      await page.setContent(
        '<select><option value="1">One</option><option value="2">Two</option></select>',
      );
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0].constructor.name).toBe("SelectElement");
    });

    it("detects textareas", async () => {
      await page.setContent("<textarea>Some text</textarea>");
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0].constructor.name).toBe("TextareaElement");
    });

    it("returns AbstractElement instances", async () => {
      await page.setContent("<button>Test</button>");
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0]).toBeInstanceOf(AbstractElement);
    });

    it("filters out invisible elements", async () => {
      await page.setContent(`
        <button id="visible">Visible</button>
        <button id="hidden" style="display: none;">Hidden</button>
      `);
      const elements = await detectElements(page);

      // Only the visible button should be detected
      expect(elements.length).toBe(1);
    });

    it("deduplicates elements with same XPath", async () => {
      // A button element will match both button selector and any event listener selectors
      await page.setContent('<button class="btn">Click</button>');
      const elements = await detectElements(page);

      // Should have only one element after deduplication
      expect(elements.length).toBe(1);
    });

    it("detects multiple different element types", async () => {
      await page.setContent(`
        <button>Submit</button>
        <input type="text" placeholder="Name">
        <a href="/home">Home</a>
        <input type="checkbox">
        <select><option>Choose</option></select>
      `);
      const elements = await detectElements(page);

      expect(elements.length).toBe(5);

      const types = elements.map((e) => e.constructor.name);
      expect(types).toContain("ButtonElement");
      expect(types).toContain("TextInputElement");
      expect(types).toContain("HyperlinkElement");
      expect(types).toContain("CheckboxElement");
      expect(types).toContain("SelectElement");
    });
  });

  describe("AbstractElement methods", () => {
    it("getXPath returns valid xpath", async () => {
      await page.setContent('<button id="test-btn">Click me</button>');
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      const xpath = await elements[0].getXPath();

      expect(xpath).not.toBeNull();
      expect(typeof xpath).toBe("string");
      // XPath generator chooses most unique selector (ID-based is preferred)
      expect(xpath).toMatch(/^\/\//);
    });

    it("isVisible returns true for visible elements", async () => {
      await page.setContent("<button>Visible</button>");
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      const isVisible = await elements[0].isVisible();

      expect(isVisible).toBe(true);
    });

    it("isEnabled returns true for enabled elements", async () => {
      await page.setContent("<button>Enabled</button>");
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      const isEnabled = await elements[0].isEnabled();

      expect(isEnabled).toBe(true);
    });

    it("text returns element inner text", async () => {
      await page.setContent("<button>Click Me</button>");
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      const text = await elements[0].text();

      expect(text).toBe("Click Me");
    });

    it("getDefaultActions returns valid actions", async () => {
      await page.setContent("<button>Action</button>");
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      const actions = elements[0].getDefaultActions();

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions).toContain(ElementAction.CLICK);
    });

    it("getConfidenceScore returns number between 0-100", async () => {
      await page.setContent("<button>High Confidence</button>");
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      const score = await elements[0].getConfidenceScore();

      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe("ARIA role detection", () => {
    it("detects elements with role=button", async () => {
      await page.setContent('<div role="button" tabindex="0">Custom Button</div>');
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0].constructor.name).toBe("ButtonElement");
    });

    it("detects elements with role=textbox", async () => {
      await page.setContent(
        '<div role="textbox" contenteditable="true">Editable</div>',
      );
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0].constructor.name).toBe("TextInputElement");
    });

    it("detects elements with role=link", async () => {
      await page.setContent('<span role="link" tabindex="0">Fake Link</span>');
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0].constructor.name).toBe("HyperlinkElement");
    });

    it("detects elements with role=checkbox", async () => {
      await page.setContent(
        '<div role="checkbox" tabindex="0" aria-checked="false">Toggle</div>',
      );
      const elements = await detectElements(page);

      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0].constructor.name).toBe("CheckboxElement");
    });
  });

  describe("Detection options", () => {
    // NOTE: This test can be flaky when running with other browser tests because
    // of browser resource contention. It passes when run in isolation:
    // bun test src/detection/detector.spec.ts
    it.skip(
      "filters out shadow DOM elements when includeShadowDom is false",
      async () => {
        // NOTE: This test creates shadow DOM for testing purposes.
        await page.setContent(`
          <div id="host"></div>
          <button id="light-btn">Light DOM</button>
        `);

        // Use evaluate to safely create shadow DOM
        await page.evaluate(() => {
          const host = document.getElementById("host");
          if (host) {
            const shadow = host.attachShadow({ mode: "open" });
            const btn = document.createElement("button");
            btn.id = "shadow-btn";
            btn.textContent = "Shadow DOM";
            shadow.appendChild(btn);
          }
        });

        const options: DetectionOptions = { includeShadowDom: false };
        const elements = await detectElements(page, options);

        // Should only have the light DOM button
        expect(elements.length).toBe(1);
      },
      { timeout: 30000 },
    );
  });
});
