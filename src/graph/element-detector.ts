/**
 * VibeTesting CLI - Element Detector
 *
 * Playwright-based element detector that identifies interactive elements on a page.
 *
 * @license MIT
 */

import type { Page } from 'playwright';
import type { DetectedElement, ElementType, InputFieldType } from './types.js';

/** Maximum number of elements to detect per page */
const MAX_ELEMENTS = 100;

/** Maximum length for text content */
const MAX_TEXT_LENGTH = 100;

/** Element importance for sorting (higher = more important) */
const ELEMENT_IMPORTANCE: Record<ElementType, number> = {
  form: 100,
  button: 90,
  input: 80,
  textarea: 75,
  select: 70,
  checkbox: 65,
  radio: 60,
  link: 50,
  image: 30,
  video: 25,
  audio: 20,
  iframe: 15,
  other: 10,
};

/** Raw element data extracted from the DOM (browser context) */
interface RawElementData {
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
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

// Type alias for page.evaluate return type
type EvaluateResult = RawElementData[];

/**
 * ElementDetector class for detecting interactive elements on a page.
 */
export class ElementDetector {
  /**
   * Detect interactive elements on a page.
   *
   * @param page - Playwright Page instance
   * @returns Array of detected elements, sorted by importance
   */
  async detectElements(page: Page): Promise<DetectedElement[]> {
    const rawElements: EvaluateResult = await page.evaluate(
      ([maxElements, maxTextLength]) => {
        /**
         * Generate a unique, stable selector for an element.
         * Priority: data-testid > id > aria-label > nth-of-type
         */
        function generateSelector(element: Element): string {
          // Prefer data-testid
          const testId = element.getAttribute('data-testid');
          if (testId) {
            return `[data-testid="${testId}"]`;
          }

          // Then try id
          const id = element.getAttribute('id');
          if (id && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) {
            return `#${id}`;
          }

          // Then try aria-label
          const ariaLabel = element.getAttribute('aria-label');
          if (ariaLabel) {
            const escapedLabel = ariaLabel.replace(/"/g, '\\"');
            return `[aria-label="${escapedLabel}"]`;
          }

          // Fall back to tag + nth-of-type
          const tagName = element.tagName.toLowerCase();
          const parent = element.parentElement;

          if (parent) {
            const siblings = Array.from(parent.children).filter(
              (child: Element) => child.tagName.toLowerCase() === tagName
            );
            const index = siblings.indexOf(element) + 1;

            if (siblings.length > 1) {
              const parentSelector = generateParentPath(parent);
              return `${parentSelector} > ${tagName}:nth-of-type(${index})`;
            }

            const parentSelector = generateParentPath(parent);
            return `${parentSelector} > ${tagName}`;
          }

          return tagName;
        }

        /**
         * Generate a shortened parent path for selector construction.
         */
        function generateParentPath(element: Element, depth = 0): string {
          if (depth > 3 || !element || element === document.body) {
            return 'body';
          }

          const testId = element.getAttribute('data-testid');
          if (testId) {
            return `[data-testid="${testId}"]`;
          }

          const id = element.getAttribute('id');
          if (id && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) {
            return `#${id}`;
          }

          const parent = element.parentElement;
          if (parent && parent !== document.body) {
            return generateParentPath(parent, depth + 1);
          }

          return element.tagName.toLowerCase();
        }

        /**
         * Determine the ElementType for an element.
         */
        function getElementType(element: Element): string {
          const tagName = element.tagName.toLowerCase();

          if (tagName === 'button') return 'button';
          if (tagName === 'a' && element.hasAttribute('href')) return 'link';
          if (tagName === 'select') return 'select';
          if (tagName === 'textarea') return 'textarea';
          if (tagName === 'form') return 'form';

          if (tagName === 'input') {
            const inputType = (element as HTMLInputElement).type.toLowerCase();
            if (inputType === 'checkbox') return 'checkbox';
            if (inputType === 'radio') return 'radio';
            if (inputType === 'submit' || inputType === 'button') return 'button';
            return 'input';
          }

          // Check for role="button"
          if (element.getAttribute('role') === 'button') return 'button';

          return 'other';
        }

        /**
         * Determine the InputFieldType for an input element.
         */
        function getInputFieldType(element: Element): string | null {
          const tagName = element.tagName.toLowerCase();

          if (tagName === 'textarea') return 'text';

          if (tagName === 'input') {
            const inputType = (element as HTMLInputElement).type.toLowerCase();

            const typeMap: Record<string, string> = {
              text: 'text',
              email: 'email',
              password: 'password',
              number: 'number',
              tel: 'tel',
              url: 'url',
              search: 'search',
              date: 'date',
              time: 'time',
              'datetime-local': 'datetime-local',
              file: 'file',
              hidden: 'hidden',
            };

            return typeMap[inputType] ?? 'other';
          }

          return null;
        }

        /**
         * Check if an element is visible (has dimensions and is in viewport).
         */
        function isElementVisible(element: Element): boolean {
          const rect = element.getBoundingClientRect();

          // Must have dimensions
          if (rect.width === 0 || rect.height === 0) {
            return false;
          }

          // Must be at least partially in viewport
          const viewportWidth =
            window.innerWidth || document.documentElement.clientWidth;
          const viewportHeight =
            window.innerHeight || document.documentElement.clientHeight;

          if (
            rect.right < 0 ||
            rect.bottom < 0 ||
            rect.left > viewportWidth ||
            rect.top > viewportHeight
          ) {
            return false;
          }

          // Check computed visibility
          const style = window.getComputedStyle(element);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0'
          ) {
            return false;
          }

          return true;
        }

        /**
         * Get the bounding box of an element.
         */
        function getBoundingBox(
          element: Element
        ): { x: number; y: number; width: number; height: number } | null {
          const rect = element.getBoundingClientRect();

          if (rect.width === 0 && rect.height === 0) {
            return null;
          }

          return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        }

        /**
         * Truncate text to a maximum length.
         */
        function truncateText(
          text: string | null,
          maxLength: number
        ): string | null {
          if (!text) return null;

          const trimmed = text.trim().replace(/\s+/g, ' ');
          if (trimmed.length === 0) return null;

          if (trimmed.length <= maxLength) {
            return trimmed;
          }

          return trimmed.substring(0, maxLength - 3) + '...';
        }

        // Type for data returned from browser context
        interface BrowserElementData {
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
          boundingBox: {
            x: number;
            y: number;
            width: number;
            height: number;
          } | null;
        }

        /**
         * Extract element data.
         */
        function extractElementData(element: Element): BrowserElementData {
          const tagName = element.tagName.toLowerCase();
          const type = getElementType(element);
          const inputType = getInputFieldType(element);

          return {
            selector: generateSelector(element),
            tagName,
            type,
            inputType,
            text: truncateText(element.textContent, maxTextLength),
            href:
              tagName === 'a' ? (element as HTMLAnchorElement).href : null,
            name: element.getAttribute('name'),
            placeholder: element.getAttribute('placeholder'),
            ariaLabel: element.getAttribute('aria-label'),
            isVisible: isElementVisible(element),
            boundingBox: getBoundingBox(element),
          };
        }

        // Selectors for interactive elements
        const selectors = [
          'button',
          '[role="button"]',
          'input[type="submit"]',
          'input[type="button"]',
          'a[href]',
          'input:not([type="submit"]):not([type="button"]):not([type="hidden"])',
          'select',
          'textarea',
          'input[type="checkbox"]',
          'input[type="radio"]',
          'form',
        ];

        // Collect all elements
        const allElements: Element[] = [];
        const seenElements = new Set<Element>();

        for (const selector of selectors) {
          try {
            const elements = Array.from(document.querySelectorAll(selector));
            for (let i = 0; i < elements.length; i++) {
              const element = elements[i];
              if (element && !seenElements.has(element)) {
                seenElements.add(element);
                allElements.push(element);
              }
            }
          } catch {
            // Skip invalid selectors
          }
        }

        // Extract data from elements
        const rawElements: BrowserElementData[] = [];

        for (const element of allElements) {
          if (rawElements.length >= maxElements) break;

          try {
            const data = extractElementData(element);
            rawElements.push(data);
          } catch {
            // Skip elements that fail extraction
          }
        }

        return rawElements;
      },
      [MAX_ELEMENTS, MAX_TEXT_LENGTH] as [number, number]
    );

    // Sort by importance and convert to DetectedElement type
    const sortedElements = rawElements
      .sort((a, b) => {
        const importanceA = ELEMENT_IMPORTANCE[a.type as ElementType] ?? 0;
        const importanceB = ELEMENT_IMPORTANCE[b.type as ElementType] ?? 0;
        return importanceB - importanceA;
      })
      .slice(0, MAX_ELEMENTS);

    // Map to DetectedElement with proper typing
    return sortedElements.map((raw): DetectedElement => {
      const result: DetectedElement = {
        selector: raw.selector,
        tagName: raw.tagName,
        type: raw.type as ElementType,
        isVisible: raw.isVisible,
        boundingBox: raw.boundingBox,
      };

      // Only add optional properties if they have values
      if (raw.inputType !== null) {
        result.inputType = raw.inputType as InputFieldType;
      }
      if (raw.text !== null) {
        result.text = raw.text;
      }
      if (raw.href !== null) {
        result.href = raw.href;
      }
      if (raw.name !== null) {
        result.name = raw.name;
      }
      if (raw.placeholder !== null) {
        result.placeholder = raw.placeholder;
      }
      if (raw.ariaLabel !== null) {
        result.ariaLabel = raw.ariaLabel;
      }

      return result;
    });
  }
}
