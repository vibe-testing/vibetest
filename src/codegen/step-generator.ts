/**
 * VibeTesting CLI - Step Generator
 *
 * Converts test steps to Playwright code.
 *
 * @license MIT
 */

import type { TestStep } from '../generation/types.js';
import type { PlaywrightStep, PlaywrightMock } from './types.js';

/**
 * Generates Playwright code from test steps.
 */
export class StepGenerator {
  /**
   * Converts a test step to Playwright code.
   *
   * @param step - Test step to convert
   * @returns PlaywrightStep or null if step type is not supported
   */
  convertStep(step: TestStep): PlaywrightStep | null {
    switch (step.type) {
      case 'navigate':
        return this.generateNavigate(step);

      case 'click':
        return this.generateClick(step);

      case 'fill':
        return this.generateFill(step);

      case 'select':
        return this.generateSelect(step);

      case 'check':
        return this.generateCheck(step);

      case 'uncheck':
        return this.generateUncheck(step);

      case 'upload':
        return this.generateUpload(step);

      case 'press_key':
        return this.generatePressKey(step);

      case 'wait':
        return this.generateWait(step);

      case 'screenshot':
        return this.generateScreenshot(step);

      case 'mock_response':
        // Handled separately in mock generator
        return null;

      case 'intercept_request':
        // Handled separately in mock generator
        return null;

      default:
        return null;
    }
  }

  /**
   * Converts multiple steps to code lines.
   */
  convertSteps(steps: TestStep[]): string[] {
    const lines: string[] = [];

    for (const step of steps) {
      const pwStep = this.convertStep(step);
      if (pwStep) {
        if (pwStep.comment) {
          lines.push(`// ${pwStep.comment}`);
        }
        const awaitPrefix = pwStep.needsAwait ? 'await ' : '';
        lines.push(`${awaitPrefix}${pwStep.method}(${pwStep.args.join(', ')});`);
      }
    }

    return lines;
  }

  /**
   * Extracts mock configurations from steps.
   */
  extractMocks(steps: TestStep[]): PlaywrightMock[] {
    const mocks: PlaywrightMock[] = [];

    for (const step of steps) {
      if (step.type === 'mock_response' && step.mockResponse) {
        const mock: PlaywrightMock = {
          urlPattern: step.mockResponse.urlPattern,
          status: step.mockResponse.status,
          body: step.mockResponse.body || '{}',
          contentType: step.mockResponse.headers?.['Content-Type'] || 'application/json',
        };

        if (step.mockResponse.delay !== undefined) {
          mock.delay = step.mockResponse.delay;
        }

        mocks.push(mock);
      }
    }

    return mocks;
  }

  /**
   * Generates a navigate step.
   */
  private generateNavigate(step: TestStep): PlaywrightStep {
    const url = this.escapeString(step.url || '/');
    return {
      method: 'page.goto',
      args: [url],
      comment: step.description,
      needsAwait: true,
    };
  }

  /**
   * Generates a click step.
   */
  private generateClick(step: TestStep): PlaywrightStep {
    const selector = this.escapeString(step.selector || '');
    return {
      method: 'page.click',
      args: [selector],
      comment: step.description,
      needsAwait: true,
    };
  }

  /**
   * Generates a fill step.
   */
  private generateFill(step: TestStep): PlaywrightStep {
    const selector = this.escapeString(step.selector || '');
    const value = this.escapeString(step.value || '');
    return {
      method: 'page.fill',
      args: [selector, value],
      comment: step.description,
      needsAwait: true,
    };
  }

  /**
   * Generates a select step.
   */
  private generateSelect(step: TestStep): PlaywrightStep {
    const selector = this.escapeString(step.selector || '');
    const value = this.escapeString(step.value || '');
    return {
      method: 'page.selectOption',
      args: [selector, value],
      comment: step.description,
      needsAwait: true,
    };
  }

  /**
   * Generates a check step.
   */
  private generateCheck(step: TestStep): PlaywrightStep {
    const selector = this.escapeString(step.selector || '');
    return {
      method: 'page.check',
      args: [selector],
      comment: step.description,
      needsAwait: true,
    };
  }

  /**
   * Generates an uncheck step.
   */
  private generateUncheck(step: TestStep): PlaywrightStep {
    const selector = this.escapeString(step.selector || '');
    return {
      method: 'page.uncheck',
      args: [selector],
      comment: step.description,
      needsAwait: true,
    };
  }

  /**
   * Generates an upload step.
   */
  private generateUpload(step: TestStep): PlaywrightStep {
    const selector = this.escapeString(step.selector || '');
    const filePath = this.escapeString(step.filePath || 'test-file.txt');
    return {
      method: 'page.setInputFiles',
      args: [selector, filePath],
      comment: step.description,
      needsAwait: true,
    };
  }

  /**
   * Generates a press key step.
   */
  private generatePressKey(step: TestStep): PlaywrightStep {
    const key = this.escapeString(step.key || 'Enter');

    // If there's a selector, use locator().press() chain
    if (step.selector) {
      const selector = this.escapeString(step.selector);
      return {
        method: `page.locator(${selector}).press`,
        args: [key],
        comment: step.description,
        needsAwait: true,
      };
    }

    return {
      method: 'page.keyboard.press',
      args: [key],
      comment: step.description,
      needsAwait: true,
    };
  }

  /**
   * Generates a wait step.
   */
  private generateWait(step: TestStep): PlaywrightStep {
    const duration = step.duration || 1000;
    return {
      method: 'page.waitForTimeout',
      args: [String(duration)],
      comment: step.description,
      needsAwait: true,
    };
  }

  /**
   * Generates a screenshot step.
   */
  private generateScreenshot(step: TestStep): PlaywrightStep {
    return {
      method: 'page.screenshot',
      args: ["{ path: 'screenshot.png' }"],
      comment: step.description,
      needsAwait: true,
    };
  }

  /**
   * Escapes a string for use in generated code.
   */
  private escapeString(str: string): string {
    const escaped = str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    return `'${escaped}'`;
  }
}
