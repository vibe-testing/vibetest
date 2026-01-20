/**
 * VibeTesting CLI - Transition Detector
 *
 * Detects page transitions from element interactions.
 * Handles clicks, form submissions, and navigation events.
 *
 * @license MIT
 */

import type { Page } from 'playwright';
import { TransitionResult, TransitionType } from './types.js';

const DEFAULT_TIMEOUT = 5000;
const NAVIGATION_WAIT_OPTIONS = { timeout: DEFAULT_TIMEOUT };

/**
 * Detects and analyzes page transitions triggered by user interactions.
 */
export class TransitionDetector {
  /**
   * Detects transition caused by clicking an element.
   *
   * @param page - Playwright Page instance
   * @param selector - CSS selector for the element to click
   * @returns TransitionResult with details about the transition
   */
  async detectClickTransition(
    page: Page,
    selector: string
  ): Promise<TransitionResult> {
    const startTime = Date.now();
    const fromUrl = page.url();

    try {
      // Check if element exists
      const element = await page.$(selector);
      if (!element) {
        return {
          occurred: false,
          type: TransitionType.UNKNOWN,
          fromUrl,
          toUrl: null,
          triggerElement: selector,
          responseTimeMs: Date.now() - startTime,
          error: `Element not found: ${selector}`,
        };
      }

      // Determine element type for transition classification
      const tagName = await element.evaluate((el) =>
        el.tagName.toLowerCase()
      );
      const href = await element.evaluate((el) =>
        el.getAttribute('href')
      );

      // Click and wait for potential navigation
      const transitionResult = await this.performClickAndWait(
        page,
        selector,
        fromUrl,
        startTime
      );

      // Classify the transition type based on element and result
      if (transitionResult.occurred) {
        transitionResult.type = this.classifyClickTransition(
          tagName,
          href,
          fromUrl,
          transitionResult.toUrl
        );
      }

      transitionResult.triggerElement = selector;
      return transitionResult;
    } catch (error) {
      return this.handleError(error, fromUrl, selector, startTime);
    }
  }

  /**
   * Detects transition caused by form submission.
   *
   * @param page - Playwright Page instance
   * @param formSelector - CSS selector for the form element
   * @param formData - Optional key-value pairs to fill in the form
   * @returns TransitionResult with details about the transition
   */
  async detectFormSubmitTransition(
    page: Page,
    formSelector: string,
    formData?: Record<string, string>
  ): Promise<TransitionResult> {
    const startTime = Date.now();
    const fromUrl = page.url();

    try {
      // Check if form exists
      const form = await page.$(formSelector);
      if (!form) {
        return {
          occurred: false,
          type: TransitionType.FORM_SUBMIT,
          fromUrl,
          toUrl: null,
          triggerElement: formSelector,
          responseTimeMs: Date.now() - startTime,
          error: `Form not found: ${formSelector}`,
        };
      }

      // Fill form fields if data provided
      if (formData) {
        await this.fillFormFields(page, formSelector, formData);
      }

      // Submit form and wait for navigation
      const transitionResult = await this.submitFormAndWait(
        page,
        formSelector,
        fromUrl,
        startTime
      );

      transitionResult.type = TransitionType.FORM_SUBMIT;
      transitionResult.triggerElement = formSelector;
      return transitionResult;
    } catch (error) {
      return this.handleError(error, fromUrl, formSelector, startTime);
    }
  }

  /**
   * Performs a click and waits for potential navigation or DOM changes.
   */
  private async performClickAndWait(
    page: Page,
    selector: string,
    fromUrl: string,
    startTime: number
  ): Promise<TransitionResult> {
    const domHashBefore = await this.getDomHash(page);

    try {
      // Use Promise.race to handle multiple possible outcomes
      await Promise.race([
        this.clickWithNavigation(page, selector),
        this.clickWithNetworkIdle(page, selector),
        this.clickWithTimeout(page, selector),
      ]);

      const responseTimeMs = Date.now() - startTime;
      const toUrl = page.url();
      const domHashAfter = await this.getDomHash(page);

      // Determine if a transition occurred
      const urlChanged = fromUrl !== toUrl;
      const domChanged = domHashBefore !== domHashAfter;
      const occurred = urlChanged || domChanged;

      return {
        occurred,
        type: urlChanged ? TransitionType.NAVIGATION : TransitionType.AJAX,
        fromUrl,
        toUrl: occurred ? toUrl : null,
        responseTimeMs,
      };
    } catch (error) {
      // If all race conditions fail, still check for changes
      const responseTimeMs = Date.now() - startTime;
      const toUrl = page.url();
      const urlChanged = fromUrl !== toUrl;

      if (urlChanged) {
        return {
          occurred: true,
          type: TransitionType.NAVIGATION,
          fromUrl,
          toUrl,
          responseTimeMs,
        };
      }

      throw error;
    }
  }

  /**
   * Clicks element and waits for navigation event.
   */
  private async clickWithNavigation(
    page: Page,
    selector: string
  ): Promise<void> {
    await Promise.all([
      page.waitForNavigation(NAVIGATION_WAIT_OPTIONS),
      page.click(selector, { timeout: DEFAULT_TIMEOUT }),
    ]);
  }

  /**
   * Clicks element and waits for network to be idle.
   */
  private async clickWithNetworkIdle(
    page: Page,
    selector: string
  ): Promise<void> {
    await page.click(selector, { timeout: DEFAULT_TIMEOUT });
    await page.waitForLoadState('networkidle', NAVIGATION_WAIT_OPTIONS);
  }

  /**
   * Clicks element with a simple timeout wait.
   */
  private async clickWithTimeout(
    page: Page,
    selector: string
  ): Promise<void> {
    await page.click(selector, { timeout: DEFAULT_TIMEOUT });
    // Short wait for any immediate DOM updates
    await page.waitForTimeout(500);
  }

  /**
   * Fills form fields with provided data.
   */
  private async fillFormFields(
    page: Page,
    formSelector: string,
    formData: Record<string, string>
  ): Promise<void> {
    for (const [fieldName, value] of Object.entries(formData)) {
      // Try multiple selector strategies for form fields
      const fieldSelectors = [
        `${formSelector} [name="${fieldName}"]`,
        `${formSelector} #${fieldName}`,
        `${formSelector} input[placeholder*="${fieldName}" i]`,
        `${formSelector} textarea[name="${fieldName}"]`,
      ];

      let filled = false;
      for (const fieldSelector of fieldSelectors) {
        try {
          const field = await page.$(fieldSelector);
          if (field) {
            await field.fill(value);
            filled = true;
            break;
          }
        } catch {
          // Continue to next selector
        }
      }

      if (!filled) {
        throw new Error(`Could not find form field: ${fieldName}`);
      }
    }
  }

  /**
   * Submits form and waits for navigation or response.
   */
  private async submitFormAndWait(
    page: Page,
    formSelector: string,
    fromUrl: string,
    startTime: number
  ): Promise<TransitionResult> {
    const domHashBefore = await this.getDomHash(page);

    try {
      // Try to find and click submit button, or submit the form directly
      const submitButton = await page.$(
        `${formSelector} [type="submit"], ${formSelector} button:not([type="button"])`
      );

      if (submitButton) {
        await Promise.race([
          Promise.all([
            page.waitForNavigation(NAVIGATION_WAIT_OPTIONS),
            submitButton.click(),
          ]),
          this.submitWithNetworkIdle(page, formSelector, submitButton),
        ]);
      } else {
        // Submit form programmatically
        await Promise.race([
          Promise.all([
            page.waitForNavigation(NAVIGATION_WAIT_OPTIONS),
            page.$eval(formSelector, (form: Element) => {
              if (form instanceof HTMLFormElement) {
                form.submit();
              }
            }),
          ]),
          this.submitFormProgrammatically(page, formSelector),
        ]);
      }
    } catch {
      // Continue even if submission method throws - check for changes
    }

    const responseTimeMs = Date.now() - startTime;
    const toUrl = page.url();
    const domHashAfter = await this.getDomHash(page);

    const urlChanged = fromUrl !== toUrl;
    const domChanged = domHashBefore !== domHashAfter;
    const occurred = urlChanged || domChanged;

    return {
      occurred,
      type: TransitionType.FORM_SUBMIT,
      fromUrl,
      toUrl: occurred ? toUrl : null,
      responseTimeMs,
    };
  }

  /**
   * Submits form via button click and waits for network idle.
   */
  private async submitWithNetworkIdle(
    page: Page,
    _formSelector: string,
    submitButton: Awaited<ReturnType<Page['$']>>
  ): Promise<void> {
    if (submitButton) {
      await submitButton.click();
      await page.waitForLoadState('networkidle', NAVIGATION_WAIT_OPTIONS);
    }
  }

  /**
   * Submits form programmatically and waits for network idle.
   */
  private async submitFormProgrammatically(
    page: Page,
    formSelector: string
  ): Promise<void> {
    await page.$eval(formSelector, (form: Element) => {
      if (form instanceof HTMLFormElement) {
        form.submit();
      }
    });
    await page.waitForLoadState('networkidle', NAVIGATION_WAIT_OPTIONS);
  }

  /**
   * Classifies the type of click transition based on element properties.
   */
  private classifyClickTransition(
    tagName: string,
    href: string | null,
    fromUrl: string,
    toUrl: string | null
  ): TransitionType {
    // Full page navigation (URL changed)
    if (toUrl && fromUrl !== toUrl) {
      if (tagName === 'a' && href) {
        return TransitionType.LINK_CLICK;
      }
      if (tagName === 'button' || tagName === 'input') {
        return TransitionType.BUTTON_CLICK;
      }
      return TransitionType.NAVIGATION;
    }

    // SPA transition (DOM changed but URL same or hash change)
    if (tagName === 'a') {
      return TransitionType.LINK_CLICK;
    }
    if (tagName === 'button' || tagName === 'input') {
      return TransitionType.BUTTON_CLICK;
    }

    return TransitionType.CLICK;
  }

  /**
   * Generates a simple hash of the current DOM state for change detection.
   * Uses Playwright's page.evaluate to run code in browser context.
   */
  private async getDomHash(page: Page): Promise<string> {
    try {
      return await page.evaluate(() => {
        const html = document.documentElement.outerHTML;
        // Simple hash function for DOM content
        let hash = 0;
        for (let i = 0; i < Math.min(html.length, 10000); i++) {
          const char = html.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
      });
    } catch {
      return '';
    }
  }

  /**
   * Handles errors and returns appropriate TransitionResult.
   */
  private handleError(
    error: unknown,
    fromUrl: string,
    triggerElement: string,
    startTime: number
  ): TransitionResult {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Classify error type
    if (errorMessage.includes('Timeout') || errorMessage.includes('timeout')) {
      return {
        occurred: false,
        type: TransitionType.UNKNOWN,
        fromUrl,
        toUrl: null,
        triggerElement,
        responseTimeMs,
        error: `Timeout: ${errorMessage}`,
      };
    }

    if (
      errorMessage.includes('blocked') ||
      errorMessage.includes('ERR_BLOCKED') ||
      errorMessage.includes('net::ERR_')
    ) {
      return {
        occurred: false,
        type: TransitionType.UNKNOWN,
        fromUrl,
        toUrl: null,
        triggerElement,
        responseTimeMs,
        error: `Navigation blocked: ${errorMessage}`,
      };
    }

    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('No element')
    ) {
      return {
        occurred: false,
        type: TransitionType.UNKNOWN,
        fromUrl,
        toUrl: null,
        triggerElement,
        responseTimeMs,
        error: `Element not found: ${errorMessage}`,
      };
    }

    return {
      occurred: false,
      type: TransitionType.UNKNOWN,
      fromUrl,
      toUrl: null,
      triggerElement,
      responseTimeMs,
      error: errorMessage,
    };
  }
}
