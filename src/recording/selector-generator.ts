/**
 * VibeTesting CLI - Selector Generator
 *
 * Generates stable, unique selectors for DOM elements.
 * Prioritizes selectors by stability: data-testid > id > aria-label > css > xpath
 *
 * @license MIT
 */

import type { GeneratedSelector, SelectorStrategy } from './types.js';

/**
 * Configuration for selector generation.
 */
export interface SelectorGeneratorConfig {
  /** Strategies to use, in priority order */
  strategies?: SelectorStrategy[];
  /** Maximum depth for CSS selectors */
  maxCssDepth?: number;
  /** Whether to include text-based selectors */
  includeText?: boolean;
}

const DEFAULT_CONFIG: Required<SelectorGeneratorConfig> = {
  strategies: ['data-testid', 'id', 'aria-label', 'placeholder', 'text', 'css', 'xpath'],
  maxCssDepth: 5,
  includeText: true,
};

/**
 * SelectorGenerator class for generating stable element selectors.
 *
 * This class is designed to be injected into the browser context and
 * generate multiple selector strategies for any given element.
 */
export class SelectorGenerator {
  private config: Required<SelectorGeneratorConfig>;

  constructor(config?: SelectorGeneratorConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generates all possible selectors for an element, ranked by stability.
   *
   * @param element - The DOM element to generate selectors for
   * @returns Array of generated selectors, sorted by confidence (highest first)
   */
  generateSelectors(element: Element): GeneratedSelector[] {
    const selectors: GeneratedSelector[] = [];

    for (const strategy of this.config.strategies) {
      const selector = this.generateByStrategy(element, strategy);
      if (selector) {
        selectors.push(selector);
      }
    }

    // Sort by confidence (highest first)
    return selectors.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Gets the best (most stable) selector for an element.
   *
   * @param element - The DOM element
   * @returns The most stable selector, or null if none found
   */
  getBestSelector(element: Element): GeneratedSelector | null {
    const selectors = this.generateSelectors(element);
    return selectors[0] ?? null;
  }

  /**
   * Generates a selector using a specific strategy.
   */
  private generateByStrategy(
    element: Element,
    strategy: SelectorStrategy
  ): GeneratedSelector | null {
    switch (strategy) {
      case 'data-testid':
        return this.generateDataTestId(element);
      case 'id':
        return this.generateId(element);
      case 'aria-label':
        return this.generateAriaLabel(element);
      case 'placeholder':
        return this.generatePlaceholder(element);
      case 'text':
        return this.config.includeText ? this.generateTextSelector(element) : null;
      case 'css':
        return this.generateCss(element);
      case 'xpath':
        return this.generateXPath(element);
      default:
        return null;
    }
  }

  /**
   * Generates a data-testid selector (highest confidence).
   */
  private generateDataTestId(element: Element): GeneratedSelector | null {
    const testId = element.getAttribute('data-testid');
    if (testId && this.isValidValue(testId)) {
      const selector = `[data-testid="${this.escapeAttribute(testId)}"]`;
      if (this.isUnique(selector)) {
        return { value: selector, strategy: 'data-testid', confidence: 1.0 };
      }
    }
    return null;
  }

  /**
   * Generates an id selector.
   */
  private generateId(element: Element): GeneratedSelector | null {
    const id = element.getAttribute('id');
    if (id && this.isValidId(id)) {
      const selector = `#${CSS.escape(id)}`;
      if (this.isUnique(selector)) {
        return { value: selector, strategy: 'id', confidence: 0.95 };
      }
    }
    return null;
  }

  /**
   * Generates an aria-label selector.
   */
  private generateAriaLabel(element: Element): GeneratedSelector | null {
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && this.isValidValue(ariaLabel)) {
      const selector = `[aria-label="${this.escapeAttribute(ariaLabel)}"]`;
      if (this.isUnique(selector)) {
        return { value: selector, strategy: 'aria-label', confidence: 0.9 };
      }
    }
    return null;
  }

  /**
   * Generates a placeholder selector (for inputs).
   */
  private generatePlaceholder(element: Element): GeneratedSelector | null {
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && this.isValidValue(placeholder)) {
      const selector = `[placeholder="${this.escapeAttribute(placeholder)}"]`;
      if (this.isUnique(selector)) {
        return { value: selector, strategy: 'placeholder', confidence: 0.85 };
      }
    }
    return null;
  }

  /**
   * Generates a text-based selector.
   */
  private generateTextSelector(element: Element): GeneratedSelector | null {
    const text = element.textContent?.trim();
    if (text && text.length > 0 && text.length <= 50) {
      // For buttons and links, use text-based selectors
      const tagName = element.tagName.toLowerCase();
      if (['button', 'a'].includes(tagName)) {
        const escapedText = this.escapeXPathString(text);
        const selector = `//${tagName}[normalize-space()=${escapedText}]`;
        // Check uniqueness in context
        try {
          const result = document.evaluate(
            selector,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          );
          if (result.snapshotLength === 1) {
            return { value: selector, strategy: 'text', confidence: 0.8 };
          }
        } catch {
          // XPath evaluation failed
        }
      }
    }
    return null;
  }

  /**
   * Generates a CSS selector with nth-of-type for uniqueness.
   */
  private generateCss(element: Element): GeneratedSelector | null {
    const path: string[] = [];
    const elements: Element[] = [];

    // Collect ancestor chain
    let el: Element | null = element;
    while (el && el !== document.body && elements.length < this.config.maxCssDepth) {
      elements.push(el);
      el = el.parentElement;
    }

    // Process from element up toward root
    for (let i = 0; i < elements.length; i++) {
      const current = elements[i]!;
      const tagName = current.tagName.toLowerCase();

      // Try to find a unique identifier at this level
      const testId = current.getAttribute('data-testid');
      if (testId) {
        path.unshift(`[data-testid="${this.escapeAttribute(testId)}"]`);
        break;
      }

      const id = current.getAttribute('id');
      if (id && this.isValidId(id)) {
        path.unshift(`#${CSS.escape(id)}`);
        break;
      }

      // Calculate nth-of-type
      const parentEl = current.parentElement;
      if (parentEl) {
        const children = Array.from(parentEl.children) as Element[];
        const siblings = children.filter(
          (c) => c.tagName.toLowerCase() === tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          path.unshift(`${tagName}:nth-of-type(${index})`);
        } else {
          path.unshift(tagName);
        }
      } else {
        path.unshift(tagName);
      }
    }

    if (path.length > 0) {
      const selector = path.join(' > ');
      if (this.isUnique(selector)) {
        // Confidence decreases with selector complexity
        const confidence = Math.max(0.4, 0.75 - (path.length - 1) * 0.1);
        return { value: selector, strategy: 'css', confidence };
      }
    }

    return null;
  }

  /**
   * Generates an XPath selector.
   */
  private generateXPath(element: Element): GeneratedSelector | null {
    const path: string[] = [];
    const elements: Element[] = [];

    // Collect ancestor chain
    let el: Element | null = element;
    while (el && el !== document.documentElement) {
      elements.push(el);
      el = el.parentElement;
    }

    // Process from element up toward root
    for (const current of elements) {
      const tagName = current.tagName.toLowerCase();
      const parentEl = current.parentElement;

      if (parentEl) {
        const children = Array.from(parentEl.children) as Element[];
        const siblings = children.filter(
          (c) => c.tagName.toLowerCase() === tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          path.unshift(`${tagName}[${index}]`);
        } else {
          path.unshift(tagName);
        }
      } else {
        path.unshift(tagName);
      }
    }

    if (path.length > 0) {
      const selector = '//' + path.join('/');
      // XPath has lower confidence as it's more brittle
      const confidence = Math.max(0.3, 0.5 - (path.length - 1) * 0.05);
      return { value: selector, strategy: 'xpath', confidence };
    }

    return null;
  }

  /**
   * Checks if a selector uniquely identifies one element.
   */
  private isUnique(selector: string): boolean {
    try {
      const elements = document.querySelectorAll(selector);
      return elements.length === 1;
    } catch {
      return false;
    }
  }

  /**
   * Validates an ID attribute value.
   */
  private isValidId(id: string): boolean {
    // ID should start with a letter and not be auto-generated
    if (!/^[a-zA-Z]/.test(id)) return false;
    // Reject common auto-generated patterns
    if (/^(ember|react|ng-|v-|data-)[\d-]+$/.test(id)) return false;
    if (/^[:]{2}[\w]+$/.test(id)) return false; // ::r1, ::r2, etc.
    if (id.length > 100) return false;
    return true;
  }

  /**
   * Validates a generic attribute value.
   */
  private isValidValue(value: string): boolean {
    if (!value || value.length === 0) return false;
    if (value.length > 100) return false;
    return true;
  }

  /**
   * Escapes a string for use in CSS attribute selectors.
   */
  private escapeAttribute(value: string): string {
    return value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  /**
   * Escapes a string for use in XPath expressions.
   */
  private escapeXPathString(value: string): string {
    if (!value.includes("'")) {
      return `'${value}'`;
    }
    if (!value.includes('"')) {
      return `"${value}"`;
    }
    // String contains both quotes - use concat
    const parts = value.split("'");
    return `concat('${parts.join("', \"'\", '")}')`;
  }
}

/**
 * Creates a browser-injectable script that includes the SelectorGenerator.
 * This is used to inject selector generation capabilities into recorded pages.
 */
export function createSelectorGeneratorScript(): string {
  return `
(function() {
  if (window.__vibetest_selector_generator) return;

  class SelectorGenerator {
    constructor(config) {
      this.config = {
        strategies: ['data-testid', 'id', 'aria-label', 'placeholder', 'text', 'css', 'xpath'],
        maxCssDepth: 5,
        includeText: true,
        ...config
      };
    }

    generateSelectors(element) {
      const selectors = [];
      for (const strategy of this.config.strategies) {
        const selector = this.generateByStrategy(element, strategy);
        if (selector) selectors.push(selector);
      }
      return selectors.sort((a, b) => b.confidence - a.confidence);
    }

    getBestSelector(element) {
      const selectors = this.generateSelectors(element);
      return selectors[0] || null;
    }

    generateByStrategy(element, strategy) {
      switch (strategy) {
        case 'data-testid': return this.generateDataTestId(element);
        case 'id': return this.generateId(element);
        case 'aria-label': return this.generateAriaLabel(element);
        case 'placeholder': return this.generatePlaceholder(element);
        case 'text': return this.config.includeText ? this.generateTextSelector(element) : null;
        case 'css': return this.generateCss(element);
        case 'xpath': return this.generateXPath(element);
        default: return null;
      }
    }

    generateDataTestId(element) {
      const testId = element.getAttribute('data-testid');
      if (testId && this.isValidValue(testId)) {
        const selector = '[data-testid="' + this.escapeAttribute(testId) + '"]';
        if (this.isUnique(selector)) {
          return { value: selector, strategy: 'data-testid', confidence: 1.0 };
        }
      }
      return null;
    }

    generateId(element) {
      const id = element.getAttribute('id');
      if (id && this.isValidId(id)) {
        const selector = '#' + CSS.escape(id);
        if (this.isUnique(selector)) {
          return { value: selector, strategy: 'id', confidence: 0.95 };
        }
      }
      return null;
    }

    generateAriaLabel(element) {
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel && this.isValidValue(ariaLabel)) {
        const selector = '[aria-label="' + this.escapeAttribute(ariaLabel) + '"]';
        if (this.isUnique(selector)) {
          return { value: selector, strategy: 'aria-label', confidence: 0.9 };
        }
      }
      return null;
    }

    generatePlaceholder(element) {
      const placeholder = element.getAttribute('placeholder');
      if (placeholder && this.isValidValue(placeholder)) {
        const selector = '[placeholder="' + this.escapeAttribute(placeholder) + '"]';
        if (this.isUnique(selector)) {
          return { value: selector, strategy: 'placeholder', confidence: 0.85 };
        }
      }
      return null;
    }

    generateTextSelector(element) {
      const text = element.textContent?.trim();
      if (text && text.length > 0 && text.length <= 50) {
        const tagName = element.tagName.toLowerCase();
        if (['button', 'a'].includes(tagName)) {
          const escapedText = this.escapeXPathString(text);
          const selector = '//' + tagName + '[normalize-space()=' + escapedText + ']';
          try {
            const result = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            if (result.snapshotLength === 1) {
              return { value: selector, strategy: 'text', confidence: 0.8 };
            }
          } catch {}
        }
      }
      return null;
    }

    generateCss(element) {
      const path = [];
      let current = element;
      let depth = 0;

      while (current && current !== document.body && depth < this.config.maxCssDepth) {
        const tagName = current.tagName.toLowerCase();
        const parent = current.parentElement;

        const testId = current.getAttribute('data-testid');
        if (testId) {
          path.unshift('[data-testid="' + this.escapeAttribute(testId) + '"]');
          break;
        }

        const id = current.getAttribute('id');
        if (id && this.isValidId(id)) {
          path.unshift('#' + CSS.escape(id));
          break;
        }

        if (parent) {
          const siblings = Array.from(parent.children).filter(c => c.tagName.toLowerCase() === tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            path.unshift(tagName + ':nth-of-type(' + index + ')');
          } else {
            path.unshift(tagName);
          }
        } else {
          path.unshift(tagName);
        }

        current = parent;
        depth++;
      }

      if (path.length > 0) {
        const selector = path.join(' > ');
        if (this.isUnique(selector)) {
          const confidence = Math.max(0.4, 0.75 - (path.length - 1) * 0.1);
          return { value: selector, strategy: 'css', confidence };
        }
      }
      return null;
    }

    generateXPath(element) {
      const path = [];
      let current = element;

      while (current && current !== document.documentElement) {
        const tagName = current.tagName.toLowerCase();
        const parent = current.parentElement;

        if (parent) {
          const siblings = Array.from(parent.children).filter(c => c.tagName.toLowerCase() === tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            path.unshift(tagName + '[' + index + ']');
          } else {
            path.unshift(tagName);
          }
        } else {
          path.unshift(tagName);
        }

        current = parent;
      }

      if (path.length > 0) {
        const selector = '//' + path.join('/');
        const confidence = Math.max(0.3, 0.5 - (path.length - 1) * 0.05);
        return { value: selector, strategy: 'xpath', confidence };
      }
      return null;
    }

    isUnique(selector) {
      try {
        return document.querySelectorAll(selector).length === 1;
      } catch {
        return false;
      }
    }

    isValidId(id) {
      if (!/^[a-zA-Z]/.test(id)) return false;
      if (/^(ember|react|ng-|v-|data-)[\\d-]+$/.test(id)) return false;
      if (/^[:]{2}[\\w]+$/.test(id)) return false;
      if (id.length > 100) return false;
      return true;
    }

    isValidValue(value) {
      if (!value || value.length === 0) return false;
      if (value.length > 100) return false;
      return true;
    }

    escapeAttribute(value) {
      return value.replace(/"/g, '\\\\"').replace(/\\n/g, '\\\\n');
    }

    escapeXPathString(value) {
      if (!value.includes("'")) return "'" + value + "'";
      if (!value.includes('"')) return '"' + value + '"';
      const parts = value.split("'");
      return "concat('" + parts.join("', \\"'\\" , '") + "')";
    }
  }

  window.__vibetest_selector_generator = new SelectorGenerator();
})();
`;
}
