/**
 * VibeTesting CLI - Assertion Generator
 *
 * Converts test assertions to Playwright expect() statements.
 *
 * @license MIT
 */

import type { TestAssertion } from '../generation/types.js';
import type { PlaywrightAssertion } from './types.js';

/**
 * Generates Playwright assertions from test assertions.
 */
export class AssertionGenerator {
  /**
   * Converts a test assertion to Playwright code.
   *
   * @param assertion - Test assertion to convert
   * @returns PlaywrightAssertion or null if type is not supported
   */
  convertAssertion(assertion: TestAssertion): PlaywrightAssertion | null {
    switch (assertion.type) {
      case 'visible':
        return this.generateVisible(assertion);

      case 'hidden':
        return this.generateHidden(assertion);

      case 'text_contains':
        return this.generateTextContains(assertion);

      case 'text_equals':
        return this.generateTextEquals(assertion);

      case 'attribute_equals':
        return this.generateAttributeEquals(assertion);

      case 'url_contains':
        return this.generateUrlContains(assertion);

      case 'url_equals':
        return this.generateUrlEquals(assertion);

      case 'element_count':
        return this.generateElementCount(assertion);

      case 'enabled':
        return this.generateEnabled(assertion);

      case 'disabled':
        return this.generateDisabled(assertion);

      case 'checked':
        return this.generateChecked(assertion);

      case 'focused':
        return this.generateFocused(assertion);

      case 'has_class':
        return this.generateHasClass(assertion);

      case 'response_status':
        return this.generateResponseStatus(assertion);

      case 'response_body':
        return this.generateResponseBody(assertion);

      default:
        return null;
    }
  }

  /**
   * Converts multiple assertions to code lines.
   */
  convertAssertions(assertions: TestAssertion[]): string[] {
    const lines: string[] = [];

    for (const assertion of assertions) {
      const pwAssertion = this.convertAssertion(assertion);
      if (pwAssertion) {
        if (pwAssertion.comment) {
          lines.push(`// ${pwAssertion.comment}`);
        }

        const notStr = pwAssertion.not ? '.not' : '';
        const argsStr = pwAssertion.args.length > 0 ? pwAssertion.args.join(', ') : '';
        lines.push(`await ${pwAssertion.expect}${notStr}.${pwAssertion.matcher}(${argsStr});`);
      }
    }

    return lines;
  }

  /**
   * Builds a PlaywrightAssertion with conditional optional properties.
   */
  private buildAssertion(
    expect: string,
    matcher: string,
    args: string[],
    comment: string | undefined,
    not: boolean | undefined
  ): PlaywrightAssertion {
    const result: PlaywrightAssertion = {
      expect,
      matcher,
      args,
    };

    if (comment !== undefined) {
      result.comment = comment;
    }

    if (not !== undefined) {
      result.not = not;
    }

    return result;
  }

  /**
   * Generates a visibility assertion.
   */
  private generateVisible(assertion: TestAssertion): PlaywrightAssertion {
    const selector = this.escapeString(assertion.selector || 'body');
    return this.buildAssertion(
      `expect(page.locator(${selector}))`,
      'toBeVisible',
      [],
      assertion.description,
      assertion.not
    );
  }

  /**
   * Generates a hidden assertion.
   */
  private generateHidden(assertion: TestAssertion): PlaywrightAssertion {
    const selector = this.escapeString(assertion.selector || 'body');
    return this.buildAssertion(
      `expect(page.locator(${selector}))`,
      'toBeHidden',
      [],
      assertion.description,
      assertion.not
    );
  }

  /**
   * Generates a text contains assertion.
   */
  private generateTextContains(assertion: TestAssertion): PlaywrightAssertion {
    const selector = this.escapeString(assertion.selector || 'body');
    const expected = this.formatExpected(assertion.expected);

    return this.buildAssertion(
      `expect(page.locator(${selector}))`,
      'toContainText',
      [expected],
      assertion.description,
      assertion.not
    );
  }

  /**
   * Generates a text equals assertion.
   */
  private generateTextEquals(assertion: TestAssertion): PlaywrightAssertion {
    const selector = this.escapeString(assertion.selector || 'body');
    const expected = this.formatExpected(assertion.expected);

    return this.buildAssertion(
      `expect(page.locator(${selector}))`,
      'toHaveText',
      [expected],
      assertion.description,
      assertion.not
    );
  }

  /**
   * Generates an attribute equals assertion.
   * Expected format: "attributeName=value" or just "value" (defaults to data-testid)
   */
  private generateAttributeEquals(assertion: TestAssertion): PlaywrightAssertion {
    const selector = this.escapeString(assertion.selector || 'body');

    // Parse expected value for "attr=value" format
    let attributeName = 'data-testid';
    let attributeValue: string | undefined;

    if (typeof assertion.expected === 'string' && assertion.expected.includes('=')) {
      const parts = assertion.expected.split('=');
      const name = parts[0];
      if (name) {
        attributeName = name;
      }
      attributeValue = parts.slice(1).join('='); // Handle values that contain '='
    } else {
      attributeValue = assertion.expected as string | undefined;
    }

    return this.buildAssertion(
      `expect(page.locator(${selector}))`,
      'toHaveAttribute',
      [this.escapeString(attributeName), this.formatExpected(attributeValue)],
      assertion.description,
      assertion.not
    );
  }

  /**
   * Generates a URL contains assertion.
   */
  private generateUrlContains(assertion: TestAssertion): PlaywrightAssertion {
    return this.buildAssertion(
      'expect(page)',
      'toHaveURL',
      [this.toRegex(assertion.expected)],
      assertion.description,
      assertion.not
    );
  }

  /**
   * Generates a URL equals assertion.
   */
  private generateUrlEquals(assertion: TestAssertion): PlaywrightAssertion {
    const expected = this.formatExpected(assertion.expected);

    return this.buildAssertion(
      'expect(page)',
      'toHaveURL',
      [expected],
      assertion.description,
      assertion.not
    );
  }

  /**
   * Generates an element count assertion.
   */
  private generateElementCount(assertion: TestAssertion): PlaywrightAssertion {
    const selector = this.escapeString(assertion.selector || '*');
    const count = typeof assertion.expected === 'number' ? assertion.expected : 1;

    return this.buildAssertion(
      `expect(page.locator(${selector}))`,
      'toHaveCount',
      [String(count)],
      assertion.description,
      assertion.not
    );
  }

  /**
   * Generates an enabled assertion.
   */
  private generateEnabled(assertion: TestAssertion): PlaywrightAssertion {
    const selector = this.escapeString(assertion.selector || 'body');
    return this.buildAssertion(
      `expect(page.locator(${selector}))`,
      'toBeEnabled',
      [],
      assertion.description,
      assertion.not
    );
  }

  /**
   * Generates a disabled assertion.
   */
  private generateDisabled(assertion: TestAssertion): PlaywrightAssertion {
    const selector = this.escapeString(assertion.selector || 'body');
    return this.buildAssertion(
      `expect(page.locator(${selector}))`,
      'toBeDisabled',
      [],
      assertion.description,
      assertion.not
    );
  }

  /**
   * Generates a checked assertion.
   */
  private generateChecked(assertion: TestAssertion): PlaywrightAssertion {
    const selector = this.escapeString(assertion.selector || 'input');
    return this.buildAssertion(
      `expect(page.locator(${selector}))`,
      'toBeChecked',
      [],
      assertion.description,
      assertion.not
    );
  }

  /**
   * Generates a focused assertion.
   */
  private generateFocused(assertion: TestAssertion): PlaywrightAssertion {
    const selector = this.escapeString(assertion.selector || 'body');
    return this.buildAssertion(
      `expect(page.locator(${selector}))`,
      'toBeFocused',
      [],
      assertion.description,
      assertion.not
    );
  }

  /**
   * Generates a has class assertion.
   */
  private generateHasClass(assertion: TestAssertion): PlaywrightAssertion {
    const selector = this.escapeString(assertion.selector || 'body');

    return this.buildAssertion(
      `expect(page.locator(${selector}))`,
      'toHaveClass',
      [this.toRegex(assertion.expected)],
      assertion.description,
      assertion.not
    );
  }

  /**
   * Generates a response status assertion.
   */
  private generateResponseStatus(assertion: TestAssertion): PlaywrightAssertion {
    const status = typeof assertion.expected === 'number' ? assertion.expected : 200;
    const not = assertion.not || status >= 400;

    return this.buildAssertion(
      'expect(response)',
      'toBeOK',
      [],
      assertion.description,
      not
    );
  }

  /**
   * Generates a response body assertion.
   * Validates that the response body contains expected content.
   */
  private generateResponseBody(assertion: TestAssertion): PlaywrightAssertion {
    const expected = this.formatExpected(assertion.expected);

    return this.buildAssertion(
      'expect(await response.text())',
      'toContain',
      [expected],
      assertion.description,
      assertion.not
    );
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

  /**
   * Formats an expected value for generated code.
   */
  private formatExpected(value: string | number | boolean | undefined): string {
    if (value === undefined) {
      return "''";
    }
    if (typeof value === 'string') {
      return this.escapeString(value);
    }
    if (typeof value === 'boolean') {
      return String(value);
    }
    return String(value);
  }

  /**
   * Converts a string to a regex pattern for partial matching.
   */
  private toRegex(value: string | number | boolean | undefined): string {
    if (value === undefined) {
      return '/.*/';
    }
    if (typeof value === 'string') {
      // Escape special regex characters and create a contains pattern
      const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return `/${escaped}/`;
    }
    return `/${value}/`;
  }
}
