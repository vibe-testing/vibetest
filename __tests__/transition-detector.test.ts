/**
 * TransitionDetector Tests
 *
 * Comprehensive tests for the TransitionDetector class that detects
 * page transitions from element interactions using Playwright.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransitionDetector } from '../src/graph/transition-detector.js';
import { TransitionType } from '../src/graph/types.js';

// Mock element handle type
interface MockElementHandle {
  evaluate: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  click: ReturnType<typeof vi.fn>;
}

// Mock Playwright Page type
interface MockPage {
  url: ReturnType<typeof vi.fn>;
  $: ReturnType<typeof vi.fn>;
  $eval: ReturnType<typeof vi.fn>;
  click: ReturnType<typeof vi.fn>;
  evaluate: ReturnType<typeof vi.fn>;
  waitForNavigation: ReturnType<typeof vi.fn>;
  waitForLoadState: ReturnType<typeof vi.fn>;
  waitForTimeout: ReturnType<typeof vi.fn>;
}

// Helper to create mock element handle
function createMockElementHandle(
  overrides: Partial<MockElementHandle> = {}
): MockElementHandle {
  return {
    evaluate: vi.fn().mockResolvedValue('button'),
    fill: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Helper to create a mock page
function createMockPage(overrides: Partial<MockPage> = {}): MockPage {
  return {
    url: vi.fn().mockReturnValue('https://example.com'),
    $: vi.fn().mockResolvedValue(null),
    $eval: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue('hash123'),
    waitForNavigation: vi.fn().mockResolvedValue(undefined),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('TransitionDetector', () => {
  let detector: TransitionDetector;

  beforeEach(() => {
    detector = new TransitionDetector();
  });

  describe('detectClickTransition()', () => {
    it('returns occurred: false if element not found', async () => {
      const mockPage = createMockPage({
        $: vi.fn().mockResolvedValue(null),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'button.not-found'
      );

      expect(result.occurred).toBe(false);
      expect(result.type).toBe(TransitionType.UNKNOWN);
      expect(result.fromUrl).toBe('https://example.com');
      expect(result.toUrl).toBeNull();
      expect(result.triggerElement).toBe('button.not-found');
      expect(result.error).toContain('Element not found');
    });

    it('detects navigation when URL changes after click', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('a')
          .mockResolvedValueOnce('https://example.com/about'),
      });

      let urlCallCount = 0;
      const mockPage = createMockPage({
        url: vi.fn().mockImplementation(() => {
          urlCallCount++;
          return urlCallCount === 1
            ? 'https://example.com'
            : 'https://example.com/about';
        }),
        $: vi.fn().mockResolvedValue(mockElement),
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('hash-before')
          .mockResolvedValueOnce('hash-after'),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'a.nav-link'
      );

      expect(result.occurred).toBe(true);
      expect(result.fromUrl).toBe('https://example.com');
      expect(result.toUrl).toBe('https://example.com/about');
      expect(result.triggerElement).toBe('a.nav-link');
    });

    it('detects LINK_CLICK transition for anchor elements', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('a')
          .mockResolvedValueOnce('https://example.com/about'),
      });

      let urlCallCount = 0;
      const mockPage = createMockPage({
        url: vi.fn().mockImplementation(() => {
          urlCallCount++;
          return urlCallCount <= 2
            ? 'https://example.com'
            : 'https://example.com/about';
        }),
        $: vi.fn().mockResolvedValue(mockElement),
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('hash1')
          .mockResolvedValueOnce('hash2'),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'a.nav'
      );

      expect(result.type).toBe(TransitionType.LINK_CLICK);
    });

    it('detects BUTTON_CLICK transition for button elements', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('button')
          .mockResolvedValueOnce(null),
      });

      let urlCallCount = 0;
      const mockPage = createMockPage({
        url: vi.fn().mockImplementation(() => {
          urlCallCount++;
          return urlCallCount <= 2
            ? 'https://example.com'
            : 'https://example.com/dashboard';
        }),
        $: vi.fn().mockResolvedValue(mockElement),
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('hash1')
          .mockResolvedValueOnce('hash2'),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'button.submit'
      );

      expect(result.type).toBe(TransitionType.BUTTON_CLICK);
    });

    it('handles timeout errors', async () => {
      const timeoutError = new Error('Timeout exceeded: 5000ms');
      const mockElement = createMockElementHandle({
        evaluate: vi.fn().mockResolvedValue('button'),
      });

      const mockPage = createMockPage({
        $: vi.fn().mockResolvedValue(mockElement),
        click: vi.fn().mockRejectedValue(timeoutError),
        waitForNavigation: vi.fn().mockRejectedValue(timeoutError),
        waitForLoadState: vi.fn().mockRejectedValue(timeoutError),
        waitForTimeout: vi.fn().mockRejectedValue(timeoutError),
        evaluate: vi.fn().mockRejectedValue(timeoutError),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'button.slow'
      );

      expect(result.occurred).toBe(false);
      expect(result.error).toContain('Timeout');
    });

    it('handles blocked navigation errors', async () => {
      const blockedError = new Error('net::ERR_BLOCKED_BY_CLIENT');
      const mockElement = createMockElementHandle({
        evaluate: vi.fn().mockResolvedValue('a'),
      });

      const mockPage = createMockPage({
        $: vi.fn().mockResolvedValue(mockElement),
        click: vi.fn().mockRejectedValue(blockedError),
        waitForNavigation: vi.fn().mockRejectedValue(blockedError),
        waitForLoadState: vi.fn().mockRejectedValue(blockedError),
        waitForTimeout: vi.fn().mockRejectedValue(blockedError),
        evaluate: vi.fn().mockRejectedValue(blockedError),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'a.blocked'
      );

      expect(result.occurred).toBe(false);
      expect(result.error).toContain('blocked');
    });

    it('detects DOM changes without URL change (classified by element type)', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('button')
          .mockResolvedValueOnce(null),
      });

      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com'),
        $: vi.fn().mockResolvedValue(mockElement),
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('hash-before')
          .mockResolvedValueOnce('hash-after-different'),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'button.load-more'
      );

      expect(result.occurred).toBe(true);
      // Button clicks without URL change are classified as BUTTON_CLICK
      expect(result.type).toBe(TransitionType.BUTTON_CLICK);
    });

    it('records response time', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi.fn().mockResolvedValue('button'),
      });

      const mockPage = createMockPage({
        $: vi.fn().mockResolvedValue(mockElement),
        evaluate: vi.fn().mockResolvedValue('hash'),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'button'
      );

      expect(result.responseTimeMs).toBeDefined();
      expect(typeof result.responseTimeMs).toBe('number');
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('returns occurred: false when no changes detected', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('button')
          .mockResolvedValueOnce(null),
      });

      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com'),
        $: vi.fn().mockResolvedValue(mockElement),
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('same-hash')
          .mockResolvedValueOnce('same-hash'),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'button.no-action'
      );

      expect(result.occurred).toBe(false);
      expect(result.toUrl).toBeNull();
    });
  });

  describe('detectFormSubmitTransition()', () => {
    it('returns occurred: false if form not found', async () => {
      const mockPage = createMockPage({
        $: vi.fn().mockResolvedValue(null),
      });

      const result = await detector.detectFormSubmitTransition(
        mockPage as any,
        'form.not-found'
      );

      expect(result.occurred).toBe(false);
      expect(result.type).toBe(TransitionType.FORM_SUBMIT);
      expect(result.error).toContain('Form not found');
    });

    it('fills form fields and submits', async () => {
      const mockFieldEmail = createMockElementHandle();
      const mockFieldPassword = createMockElementHandle();
      const mockSubmitButton = createMockElementHandle();
      const mockForm = createMockElementHandle();

      let dollarCallCount = 0;
      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com/login'),
        $: vi.fn().mockImplementation((selector: string) => {
          dollarCallCount++;
          if (selector === 'form#login') {
            return Promise.resolve(mockForm);
          }
          if (selector.includes('[name="email"]')) {
            return Promise.resolve(mockFieldEmail);
          }
          if (selector.includes('[name="password"]')) {
            return Promise.resolve(mockFieldPassword);
          }
          if (selector.includes('[type="submit"]') || selector.includes('button')) {
            return Promise.resolve(mockSubmitButton);
          }
          return Promise.resolve(null);
        }),
        evaluate: vi.fn().mockResolvedValue('hash'),
      });

      const formData = {
        email: 'test@example.com',
        password: 'secret123',
      };

      await detector.detectFormSubmitTransition(
        mockPage as any,
        'form#login',
        formData
      );

      expect(mockFieldEmail.fill).toHaveBeenCalledWith('test@example.com');
      expect(mockFieldPassword.fill).toHaveBeenCalledWith('secret123');
    });

    it('submits form via submit button when available', async () => {
      const mockSubmitButton = createMockElementHandle();
      const mockForm = createMockElementHandle();

      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com/form'),
        $: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'form#contact') {
            return Promise.resolve(mockForm);
          }
          if (selector.includes('[type="submit"]') || selector.includes('button')) {
            return Promise.resolve(mockSubmitButton);
          }
          return Promise.resolve(null);
        }),
        evaluate: vi.fn().mockResolvedValue('hash'),
      });

      await detector.detectFormSubmitTransition(
        mockPage as any,
        'form#contact'
      );

      expect(mockSubmitButton.click).toHaveBeenCalled();
    });

    it('submits form programmatically when no submit button', async () => {
      const mockForm = createMockElementHandle();

      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com/form'),
        $: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'form#ajax-form') {
            return Promise.resolve(mockForm);
          }
          // No submit button found
          return Promise.resolve(null);
        }),
        $eval: vi.fn().mockResolvedValue(undefined),
        evaluate: vi.fn().mockResolvedValue('hash'),
      });

      await detector.detectFormSubmitTransition(
        mockPage as any,
        'form#ajax-form'
      );

      expect(mockPage.$eval).toHaveBeenCalled();
    });

    it('returns FORM_SUBMIT type', async () => {
      const mockForm = createMockElementHandle();
      const mockSubmitButton = createMockElementHandle();

      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com/form'),
        $: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'form#test') {
            return Promise.resolve(mockForm);
          }
          if (selector.includes('[type="submit"]') || selector.includes('button')) {
            return Promise.resolve(mockSubmitButton);
          }
          return Promise.resolve(null);
        }),
        evaluate: vi.fn().mockResolvedValue('hash'),
      });

      const result = await detector.detectFormSubmitTransition(
        mockPage as any,
        'form#test'
      );

      expect(result.type).toBe(TransitionType.FORM_SUBMIT);
    });

    it('detects transition when DOM changes after form submit', async () => {
      const mockForm = createMockElementHandle();
      const mockSubmitButton = createMockElementHandle();

      // URL stays the same but DOM changes
      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com/form'),
        $: vi.fn().mockImplementation((selector: string) => {
          if (selector.includes('form')) {
            return Promise.resolve(mockForm);
          }
          if (selector.includes('[type="submit"]') || selector.includes('button')) {
            return Promise.resolve(mockSubmitButton);
          }
          return Promise.resolve(null);
        }),
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('hash-before')
          .mockResolvedValueOnce('hash-after-changed'),
      });

      const result = await detector.detectFormSubmitTransition(
        mockPage as any,
        'form#login'
      );

      expect(result.occurred).toBe(true);
      expect(result.toUrl).toBe('https://example.com/form');
    });

    it('handles form field not found', async () => {
      const mockForm = createMockElementHandle();

      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com/form'),
        $: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'form#test') {
            return Promise.resolve(mockForm);
          }
          // All field selectors return null
          return Promise.resolve(null);
        }),
        evaluate: vi.fn().mockResolvedValue('hash'),
      });

      const formData = {
        nonexistent: 'value',
      };

      const result = await detector.detectFormSubmitTransition(
        mockPage as any,
        'form#test',
        formData
      );

      expect(result.occurred).toBe(false);
      expect(result.error).toContain('Could not find form field');
    });

    it('records response time for form submission', async () => {
      const mockForm = createMockElementHandle();
      const mockSubmitButton = createMockElementHandle();

      const mockPage = createMockPage({
        $: vi.fn().mockImplementation((selector: string) => {
          if (selector.includes('form')) {
            return Promise.resolve(mockForm);
          }
          if (selector.includes('[type="submit"]') || selector.includes('button')) {
            return Promise.resolve(mockSubmitButton);
          }
          return Promise.resolve(null);
        }),
        evaluate: vi.fn().mockResolvedValue('hash'),
      });

      const result = await detector.detectFormSubmitTransition(
        mockPage as any,
        'form#test'
      );

      expect(result.responseTimeMs).toBeDefined();
      expect(typeof result.responseTimeMs).toBe('number');
    });

    it('includes trigger element in result', async () => {
      const mockForm = createMockElementHandle();
      const mockSubmitButton = createMockElementHandle();

      const mockPage = createMockPage({
        $: vi.fn().mockImplementation((selector: string) => {
          if (selector.includes('form')) {
            return Promise.resolve(mockForm);
          }
          if (selector.includes('[type="submit"]') || selector.includes('button')) {
            return Promise.resolve(mockSubmitButton);
          }
          return Promise.resolve(null);
        }),
        evaluate: vi.fn().mockResolvedValue('hash'),
      });

      const result = await detector.detectFormSubmitTransition(
        mockPage as any,
        'form#login'
      );

      expect(result.triggerElement).toBe('form#login');
    });
  });

  describe('error handling', () => {
    it('handles generic errors gracefully', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi.fn().mockRejectedValue(new Error('Generic error')),
      });

      const mockPage = createMockPage({
        $: vi.fn().mockResolvedValue(mockElement),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'button'
      );

      expect(result.occurred).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles network errors', async () => {
      const networkError = new Error('net::ERR_CONNECTION_REFUSED');
      const mockElement = createMockElementHandle({
        evaluate: vi.fn().mockResolvedValue('button'),
      });

      const mockPage = createMockPage({
        $: vi.fn().mockResolvedValue(mockElement),
        click: vi.fn().mockRejectedValue(networkError),
        waitForNavigation: vi.fn().mockRejectedValue(networkError),
        waitForLoadState: vi.fn().mockRejectedValue(networkError),
        waitForTimeout: vi.fn().mockRejectedValue(networkError),
        evaluate: vi.fn().mockRejectedValue(networkError),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'a.external'
      );

      expect(result.occurred).toBe(false);
      expect(result.error).toContain('blocked');
    });

    it('handles element not found errors in handleError', async () => {
      const notFoundError = new Error('No element found for selector');
      const mockElement = createMockElementHandle({
        evaluate: vi.fn().mockRejectedValue(notFoundError),
      });

      const mockPage = createMockPage({
        $: vi.fn().mockResolvedValue(mockElement),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'button.missing'
      );

      expect(result.error).toContain('not found');
    });
  });

  describe('fillFormFields coverage', () => {
    it('tries multiple selector strategies to find form fields', async () => {
      const mockForm = createMockElementHandle();
      const mockField = createMockElementHandle();
      const mockSubmitButton = createMockElementHandle();

      // Track all selector queries
      const queriedSelectors: string[] = [];
      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com/form'),
        $: vi.fn().mockImplementation((selector: string) => {
          queriedSelectors.push(selector);
          if (selector === 'form#test') {
            return Promise.resolve(mockForm);
          }
          // Return field for the second selector strategy (by id)
          if (selector.includes('#username')) {
            return Promise.resolve(mockField);
          }
          if (
            selector.includes('[type="submit"]') ||
            selector.includes('button')
          ) {
            return Promise.resolve(mockSubmitButton);
          }
          return Promise.resolve(null);
        }),
        evaluate: vi.fn().mockResolvedValue('hash'),
      });

      const formData = { username: 'testuser' };

      await detector.detectFormSubmitTransition(
        mockPage as any,
        'form#test',
        formData
      );

      // Verify the field fill was called
      expect(mockField.fill).toHaveBeenCalledWith('testuser');
    });

    it('tries placeholder selector when name and id fail', async () => {
      const mockForm = createMockElementHandle();
      const mockField = createMockElementHandle();
      const mockSubmitButton = createMockElementHandle();

      let callCount = 0;
      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com/form'),
        $: vi.fn().mockImplementation((selector: string) => {
          callCount++;
          if (selector === 'form#test') {
            return Promise.resolve(mockForm);
          }
          // Return field for placeholder selector (third strategy)
          if (selector.includes('placeholder')) {
            return Promise.resolve(mockField);
          }
          if (
            selector.includes('[type="submit"]') ||
            selector.includes('button')
          ) {
            return Promise.resolve(mockSubmitButton);
          }
          return Promise.resolve(null);
        }),
        evaluate: vi.fn().mockResolvedValue('hash'),
      });

      const formData = { search: 'test query' };

      await detector.detectFormSubmitTransition(
        mockPage as any,
        'form#test',
        formData
      );

      expect(mockField.fill).toHaveBeenCalledWith('test query');
    });

    it('tries textarea selector when other strategies fail', async () => {
      const mockForm = createMockElementHandle();
      const mockField = createMockElementHandle();
      const mockSubmitButton = createMockElementHandle();

      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com/form'),
        $: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'form#test') {
            return Promise.resolve(mockForm);
          }
          // Return field for textarea selector (fourth strategy)
          if (selector.includes('textarea')) {
            return Promise.resolve(mockField);
          }
          if (
            selector.includes('[type="submit"]') ||
            selector.includes('button')
          ) {
            return Promise.resolve(mockSubmitButton);
          }
          return Promise.resolve(null);
        }),
        evaluate: vi.fn().mockResolvedValue('hash'),
      });

      const formData = { message: 'Hello world' };

      await detector.detectFormSubmitTransition(
        mockPage as any,
        'form#test',
        formData
      );

      expect(mockField.fill).toHaveBeenCalledWith('Hello world');
    });
  });

  describe('submitFormAndWait coverage', () => {
    it('submits form programmatically when no submit button exists', async () => {
      const mockForm = createMockElementHandle();

      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com/form'),
        $: vi.fn().mockImplementation((selector: string) => {
          if (selector === 'form#programmatic') {
            return Promise.resolve(mockForm);
          }
          // No submit button found
          return Promise.resolve(null);
        }),
        $eval: vi.fn().mockResolvedValue(undefined),
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('hash-before')
          .mockResolvedValueOnce('hash-after'),
      });

      const result = await detector.detectFormSubmitTransition(
        mockPage as any,
        'form#programmatic'
      );

      // $eval should be called to submit the form programmatically
      expect(mockPage.$eval).toHaveBeenCalled();
      expect(result.type).toBe(TransitionType.FORM_SUBMIT);
    });
  });

  describe('transition type classification', () => {
    it('classifies anchor with href as LINK_CLICK when URL changes', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('a')
          .mockResolvedValueOnce('/about'),
      });

      let urlCallCount = 0;
      const mockPage = createMockPage({
        url: vi.fn().mockImplementation(() => {
          urlCallCount++;
          return urlCallCount <= 2
            ? 'https://example.com'
            : 'https://example.com/about';
        }),
        $: vi.fn().mockResolvedValue(mockElement),
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('h1')
          .mockResolvedValueOnce('h2'),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'a'
      );

      expect(result.type).toBe(TransitionType.LINK_CLICK);
    });

    it('classifies input element click as BUTTON_CLICK', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('input')
          .mockResolvedValueOnce(null),
      });

      let urlCallCount = 0;
      const mockPage = createMockPage({
        url: vi.fn().mockImplementation(() => {
          urlCallCount++;
          return urlCallCount <= 2
            ? 'https://example.com'
            : 'https://example.com/results';
        }),
        $: vi.fn().mockResolvedValue(mockElement),
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('h1')
          .mockResolvedValueOnce('h2'),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'input[type="submit"]'
      );

      expect(result.type).toBe(TransitionType.BUTTON_CLICK);
    });

    it('classifies other elements as CLICK when DOM changes without URL change', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('div')
          .mockResolvedValueOnce(null),
      });

      // URL stays the same, only DOM changes
      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com'),
        $: vi.fn().mockResolvedValue(mockElement),
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('h1')
          .mockResolvedValueOnce('h2'),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'div.clickable'
      );

      // When element is not a/button/input and URL doesn't change, it's CLICK
      expect(result.type).toBe(TransitionType.CLICK);
    });

    it('classifies anchor click without URL change as LINK_CLICK', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('a')
          .mockResolvedValueOnce('#section'),
      });

      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com'),
        $: vi.fn().mockResolvedValue(mockElement),
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('hash1')
          .mockResolvedValueOnce('hash2'),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'a#hash-link'
      );

      expect(result.type).toBe(TransitionType.LINK_CLICK);
    });

    it('classifies button click without URL change as BUTTON_CLICK', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('button')
          .mockResolvedValueOnce(null),
      });

      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com'),
        $: vi.fn().mockResolvedValue(mockElement),
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('hash1')
          .mockResolvedValueOnce('hash2'),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'button.toggle'
      );

      expect(result.type).toBe(TransitionType.BUTTON_CLICK);
    });

    it('classifies other element click without URL change as CLICK', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('span')
          .mockResolvedValueOnce(null),
      });

      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com'),
        $: vi.fn().mockResolvedValue(mockElement),
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('hash1')
          .mockResolvedValueOnce('hash2'),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'span.clickable'
      );

      expect(result.type).toBe(TransitionType.CLICK);
    });
  });

  describe('DOM hash detection', () => {
    it('detects DOM changes even when URL stays the same', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('button')
          .mockResolvedValueOnce(null),
      });

      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com'),
        $: vi.fn().mockResolvedValue(mockElement),
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('original-dom-hash')
          .mockResolvedValueOnce('changed-dom-hash'),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'button.modal-trigger'
      );

      expect(result.occurred).toBe(true);
    });

    it('returns occurred: false when DOM hash is unchanged', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('button')
          .mockResolvedValueOnce(null),
      });

      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com'),
        $: vi.fn().mockResolvedValue(mockElement),
        evaluate: vi
          .fn()
          .mockResolvedValueOnce('same-hash')
          .mockResolvedValueOnce('same-hash'),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'button.no-effect'
      );

      expect(result.occurred).toBe(false);
    });

    it('handles DOM hash evaluation errors', async () => {
      const mockElement = createMockElementHandle({
        evaluate: vi.fn().mockResolvedValue('button'),
      });

      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://example.com'),
        $: vi.fn().mockResolvedValue(mockElement),
        evaluate: vi.fn().mockRejectedValue(new Error('Evaluation failed')),
      });

      const result = await detector.detectClickTransition(
        mockPage as any,
        'button'
      );

      // Should handle gracefully and return a result
      expect(result).toBeDefined();
      expect(result.fromUrl).toBe('https://example.com');
    });
  });
});
