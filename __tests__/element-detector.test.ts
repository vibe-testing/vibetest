/**
 * ElementDetector Tests
 *
 * Comprehensive tests for the ElementDetector class that identifies
 * interactive elements on a page using Playwright.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ElementDetector } from '../src/graph/element-detector.js';
import type { ElementType, InputFieldType } from '../src/graph/types.js';

// Mock Playwright Page type
interface MockPage {
  evaluate: ReturnType<typeof vi.fn>;
}

// Helper to create a mock page with evaluate function
function createMockPage(evaluateResult: unknown[] = []): MockPage {
  return {
    evaluate: vi.fn().mockResolvedValue(evaluateResult),
  };
}

// Helper to create mock raw element data
interface MockRawElement {
  selector: string;
  tagName: string;
  type: string;
  inputType: string | null;
  text: string | null;
  href: string | null;
  name: string | null;
  placeholder: string | null;
  ariaLabel: string | null;
  isVisible: boolean;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
}

function createMockElement(
  overrides: Partial<MockRawElement> = {}
): MockRawElement {
  return {
    selector: 'button',
    tagName: 'button',
    type: 'button',
    inputType: null,
    text: null,
    href: null,
    name: null,
    placeholder: null,
    ariaLabel: null,
    isVisible: true,
    boundingBox: { x: 0, y: 0, width: 100, height: 40 },
    ...overrides,
  };
}

describe('ElementDetector', () => {
  let detector: ElementDetector;

  beforeEach(() => {
    detector = new ElementDetector();
  });

  describe('detectElements()', () => {
    it('returns empty array for empty page', async () => {
      const mockPage = createMockPage([]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements).toEqual([]);
      expect(mockPage.evaluate).toHaveBeenCalledOnce();
    });

    it('finds buttons', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: 'button.submit',
          tagName: 'button',
          type: 'button',
          text: 'Submit',
        }),
        createMockElement({
          selector: '[data-testid="cancel-btn"]',
          tagName: 'button',
          type: 'button',
          text: 'Cancel',
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements.length).toBe(2);
      expect(elements[0].type).toBe('button');
      expect(elements[0].text).toBe('Submit');
      expect(elements[1].type).toBe('button');
      expect(elements[1].text).toBe('Cancel');
    });

    it('finds links', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: 'a.nav-link',
          tagName: 'a',
          type: 'link',
          text: 'Home',
          href: 'https://example.com/',
        }),
        createMockElement({
          selector: 'a.about-link',
          tagName: 'a',
          type: 'link',
          text: 'About Us',
          href: 'https://example.com/about',
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements.length).toBe(2);
      expect(elements[0].type).toBe('link');
      expect(elements[0].href).toBe('https://example.com/');
      expect(elements[1].type).toBe('link');
      expect(elements[1].href).toBe('https://example.com/about');
    });

    it('finds input fields', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: 'input#email',
          tagName: 'input',
          type: 'input',
          inputType: 'email',
          placeholder: 'Enter email',
          name: 'email',
        }),
        createMockElement({
          selector: 'input#password',
          tagName: 'input',
          type: 'input',
          inputType: 'password',
          placeholder: 'Enter password',
          name: 'password',
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements.length).toBe(2);
      expect(elements[0].type).toBe('input');
      expect(elements[0].inputType).toBe('email');
      expect(elements[0].placeholder).toBe('Enter email');
      expect(elements[1].type).toBe('input');
      expect(elements[1].inputType).toBe('password');
    });

    it('finds forms', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: 'form#login',
          tagName: 'form',
          type: 'form',
          ariaLabel: 'Login form',
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements.length).toBe(1);
      expect(elements[0].type).toBe('form');
      expect(elements[0].ariaLabel).toBe('Login form');
    });

    it('finds select dropdowns', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: 'select#country',
          tagName: 'select',
          type: 'select',
          name: 'country',
          ariaLabel: 'Select country',
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements.length).toBe(1);
      expect(elements[0].type).toBe('select');
      expect(elements[0].name).toBe('country');
    });

    it('finds checkboxes', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: 'input#agree',
          tagName: 'input',
          type: 'checkbox',
          inputType: 'checkbox',
          name: 'agree',
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements.length).toBe(1);
      expect(elements[0].type).toBe('checkbox');
    });

    it('finds radio buttons', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: 'input#option1',
          tagName: 'input',
          type: 'radio',
          inputType: 'radio',
          name: 'options',
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements.length).toBe(1);
      expect(elements[0].type).toBe('radio');
    });

    it('finds textareas', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: 'textarea#message',
          tagName: 'textarea',
          type: 'textarea',
          inputType: 'text',
          placeholder: 'Enter message',
          name: 'message',
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements.length).toBe(1);
      expect(elements[0].type).toBe('textarea');
      expect(elements[0].inputType).toBe('text');
    });

    it('sorts elements by importance (forms first, then buttons, then inputs)', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: 'a.link',
          tagName: 'a',
          type: 'link',
          text: 'Link',
        }),
        createMockElement({
          selector: 'input#text',
          tagName: 'input',
          type: 'input',
          inputType: 'text',
        }),
        createMockElement({
          selector: 'form#main',
          tagName: 'form',
          type: 'form',
        }),
        createMockElement({
          selector: 'button.submit',
          tagName: 'button',
          type: 'button',
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      // Importance order: form(100) > button(90) > input(80) > link(50)
      expect(elements[0].type).toBe('form');
      expect(elements[1].type).toBe('button');
      expect(elements[2].type).toBe('input');
      expect(elements[3].type).toBe('link');
    });

    it('limits elements to 100', async () => {
      // Create 150 mock elements
      const mockElements = Array.from({ length: 150 }, (_, i) =>
        createMockElement({
          selector: `button#btn-${i}`,
          tagName: 'button',
          type: 'button',
        })
      );

      const mockPage = createMockPage(mockElements);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements.length).toBe(100);
    });

    it('generates selectors correctly', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: '[data-testid="submit-btn"]',
          tagName: 'button',
          type: 'button',
        }),
        createMockElement({
          selector: '#login-form',
          tagName: 'form',
          type: 'form',
        }),
        createMockElement({
          selector: '[aria-label="Close dialog"]',
          tagName: 'button',
          type: 'button',
        }),
        createMockElement({
          selector: 'body > div > button:nth-of-type(2)',
          tagName: 'button',
          type: 'button',
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements.map((e) => e.selector)).toContain(
        '[data-testid="submit-btn"]'
      );
      expect(elements.map((e) => e.selector)).toContain('#login-form');
      expect(elements.map((e) => e.selector)).toContain(
        '[aria-label="Close dialog"]'
      );
      expect(elements.map((e) => e.selector)).toContain(
        'body > div > button:nth-of-type(2)'
      );
    });

    it('includes boundingBox when available', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: 'button',
          tagName: 'button',
          type: 'button',
          boundingBox: { x: 100, y: 200, width: 150, height: 50 },
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements[0].boundingBox).toEqual({
        x: 100,
        y: 200,
        width: 150,
        height: 50,
      });
    });

    it('handles null boundingBox', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: 'button',
          tagName: 'button',
          type: 'button',
          boundingBox: null,
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements[0].boundingBox).toBeNull();
    });

    it('includes isVisible property', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: 'button.visible',
          tagName: 'button',
          type: 'button',
          isVisible: true,
        }),
        createMockElement({
          selector: 'button.hidden',
          tagName: 'button',
          type: 'button',
          isVisible: false,
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements[0].isVisible).toBe(true);
      expect(elements[1].isVisible).toBe(false);
    });

    it('only includes optional properties when they have values', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: 'button',
          tagName: 'button',
          type: 'button',
          inputType: null,
          text: null,
          href: null,
          name: null,
          placeholder: null,
          ariaLabel: null,
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements[0]).not.toHaveProperty('inputType');
      expect(elements[0]).not.toHaveProperty('text');
      expect(elements[0]).not.toHaveProperty('href');
      expect(elements[0]).not.toHaveProperty('name');
      expect(elements[0]).not.toHaveProperty('placeholder');
      expect(elements[0]).not.toHaveProperty('ariaLabel');
    });

    it('includes optional properties when they have values', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: 'input',
          tagName: 'input',
          type: 'input',
          inputType: 'email',
          text: 'Some text',
          href: null,
          name: 'email',
          placeholder: 'Enter email',
          ariaLabel: 'Email field',
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements[0].inputType).toBe('email');
      expect(elements[0].text).toBe('Some text');
      expect(elements[0].name).toBe('email');
      expect(elements[0].placeholder).toBe('Enter email');
      expect(elements[0].ariaLabel).toBe('Email field');
    });

    it('passes correct parameters to page.evaluate', async () => {
      const mockPage = createMockPage([]);

      await detector.detectElements(mockPage as any);

      expect(mockPage.evaluate).toHaveBeenCalledWith(
        expect.any(Function),
        [100, 100] // MAX_ELEMENTS, MAX_TEXT_LENGTH
      );
    });

    it('handles mixed element types', async () => {
      const mockPage = createMockPage([
        createMockElement({ type: 'button', tagName: 'button' }),
        createMockElement({ type: 'link', tagName: 'a', href: 'https://example.com' }),
        createMockElement({ type: 'input', tagName: 'input', inputType: 'text' }),
        createMockElement({ type: 'select', tagName: 'select' }),
        createMockElement({ type: 'textarea', tagName: 'textarea', inputType: 'text' }),
        createMockElement({ type: 'checkbox', tagName: 'input', inputType: 'checkbox' }),
        createMockElement({ type: 'radio', tagName: 'input', inputType: 'radio' }),
        createMockElement({ type: 'form', tagName: 'form' }),
        createMockElement({ type: 'other', tagName: 'div' }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements.length).toBe(9);
      const types = elements.map((e) => e.type);
      expect(types).toContain('button');
      expect(types).toContain('link');
      expect(types).toContain('input');
      expect(types).toContain('select');
      expect(types).toContain('textarea');
      expect(types).toContain('checkbox');
      expect(types).toContain('radio');
      expect(types).toContain('form');
      expect(types).toContain('other');
    });

    it('correctly types elements as DetectedElement', async () => {
      const mockPage = createMockPage([
        createMockElement({
          selector: 'button#test',
          tagName: 'button',
          type: 'button',
          isVisible: true,
          boundingBox: { x: 0, y: 0, width: 100, height: 40 },
        }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      // Verify the returned object matches DetectedElement interface
      expect(elements[0]).toHaveProperty('selector');
      expect(elements[0]).toHaveProperty('tagName');
      expect(elements[0]).toHaveProperty('type');
      expect(elements[0]).toHaveProperty('isVisible');
      expect(elements[0]).toHaveProperty('boundingBox');
    });
  });

  describe('element importance sorting', () => {
    it('sorts forms before all other elements', async () => {
      const mockPage = createMockPage([
        createMockElement({ type: 'button', selector: 'button' }),
        createMockElement({ type: 'form', selector: 'form' }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements[0].type).toBe('form');
      expect(elements[1].type).toBe('button');
    });

    it('sorts buttons before inputs', async () => {
      const mockPage = createMockPage([
        createMockElement({ type: 'input', selector: 'input' }),
        createMockElement({ type: 'button', selector: 'button' }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements[0].type).toBe('button');
      expect(elements[1].type).toBe('input');
    });

    it('sorts inputs before links', async () => {
      const mockPage = createMockPage([
        createMockElement({ type: 'link', selector: 'a' }),
        createMockElement({ type: 'input', selector: 'input' }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements[0].type).toBe('input');
      expect(elements[1].type).toBe('link');
    });

    it('maintains stable order for elements of same type', async () => {
      const mockPage = createMockPage([
        createMockElement({ type: 'button', selector: 'button.first', text: 'First' }),
        createMockElement({ type: 'button', selector: 'button.second', text: 'Second' }),
        createMockElement({ type: 'button', selector: 'button.third', text: 'Third' }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      // All buttons, so original order should be preserved
      expect(elements[0].selector).toBe('button.first');
      expect(elements[1].selector).toBe('button.second');
      expect(elements[2].selector).toBe('button.third');
    });

    it('handles unknown types with lowest priority', async () => {
      const mockPage = createMockPage([
        createMockElement({ type: 'other', selector: 'div.clickable' }),
        createMockElement({ type: 'link', selector: 'a.nav' }),
      ]);

      const elements = await detector.detectElements(mockPage as any);

      expect(elements[0].type).toBe('link');
      expect(elements[1].type).toBe('other');
    });
  });
});
