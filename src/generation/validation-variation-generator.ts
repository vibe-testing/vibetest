/**
 * VibeTesting CLI - Validation Variation Generator
 *
 * Generates test variations for validation rules.
 *
 * @license MIT
 */

import type { AnalyzedFlow, ValidationRule } from '../analysis/types.js';
import type { RecordedEvent } from '../recording/types.js';
import type {
  TestVariation,
  TestStep,
  GenerationConfig,
} from './types.js';
import { createStep, createAssertion } from './variation-generator.js';

/**
 * Test data generators for validation testing.
 */
const INVALID_EMAIL_VALUES = [
  'invalid',
  'invalid@',
  '@invalid.com',
  'invalid@invalid',
  'invalid email@test.com',
];

const INVALID_PHONE_VALUES = [
  'abc',
  '123',
  '12345678901234567890',
  'phone-number',
];

const SQL_INJECTION_VALUES = [
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  "1; DELETE FROM users",
  "' UNION SELECT * FROM users --",
];

const XSS_VALUES = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert("xss")>',
  '"><script>alert("xss")</script>',
  "javascript:alert('xss')",
];

const SPECIAL_CHAR_VALUES = [
  '<>\'"`',
  '!@#$%^&*()',
  '{}[]|\\',
  '\n\r\t',
];

/**
 * Generates validation test variations.
 */
export class ValidationVariationGenerator {
  /**
   * Generates validation variations for a flow.
   *
   * @param flow - Analyzed flow to generate tests for
   * @param config - Generation configuration
   * @returns Array of validation test variations
   */
  generate(flow: AnalyzedFlow, config: GenerationConfig): TestVariation[] {
    const variations: TestVariation[] = [];

    // Generate empty field tests for required fields
    for (const validation of flow.validations) {
      if (validation.constraint === 'required') {
        variations.push(
          this.generateEmptyFieldTest(flow, validation, config)
        );
      }
    }

    // Generate invalid format tests
    for (const validation of flow.validations) {
      const formatTests = this.generateFormatTests(flow, validation, config);
      variations.push(...formatTests);
    }

    // Generate security tests
    if (config.includeSecurity) {
      variations.push(...this.generateSecurityTests(flow, config));
    }

    return variations;
  }


  /**
   * Generates test for empty required field submission.
   */
  private generateEmptyFieldTest(
    flow: AnalyzedFlow,
    validation: ValidationRule,
    config: GenerationConfig
  ): TestVariation {
    const steps = this.createStepsSkippingField(flow, validation.fieldSelector);
    const fieldName = validation.fieldName || 'field';

    return {
      id: `${flow.id}_empty_${this.sanitizeId(validation.fieldSelector)}`,
      name: '',
      description: `Verifies validation error when ${fieldName} is left empty`,
      category: 'validation',
      priority: 'high',
      steps,
      assertions: [
        createAssertion('visible', `Should show error for empty ${fieldName}`, {
          selector: this.getErrorSelector(validation.fieldSelector),
        }),
      ],
      tags: ['validation', 'required', flow.intent.type],
      sourceFlowId: flow.id,
      validationRule: validation,
      timeout: config.defaultTimeout,
    };
  }

  /**
   * Generates format validation tests based on constraint type.
   */
  private generateFormatTests(
    flow: AnalyzedFlow,
    validation: ValidationRule,
    config: GenerationConfig
  ): TestVariation[] {
    const variations: TestVariation[] = [];

    switch (validation.constraint) {
      case 'email':
        variations.push(
          this.generateInvalidFormatTest(
            flow,
            validation,
            INVALID_EMAIL_VALUES[0]!,
            'invalid email format',
            config
          )
        );
        break;

      case 'phone':
        variations.push(
          this.generateInvalidFormatTest(
            flow,
            validation,
            INVALID_PHONE_VALUES[0]!,
            'invalid phone number',
            config
          )
        );
        break;

      case 'min_length':
        if (typeof validation.value === 'number') {
          const shortValue = 'x'.repeat(Math.max(1, validation.value - 1));
          variations.push(
            this.generateInvalidFormatTest(
              flow,
              validation,
              shortValue,
              `value shorter than ${validation.value} characters`,
              config
            )
          );
        }
        break;

      case 'max_length':
        if (typeof validation.value === 'number') {
          const longValue = 'x'.repeat(validation.value + 10);
          variations.push(
            this.generateInvalidFormatTest(
              flow,
              validation,
              longValue,
              `value longer than ${validation.value} characters`,
              config
            )
          );
        }
        break;

      case 'min_value':
        if (typeof validation.value === 'number') {
          const belowMin = String(validation.value - 1);
          variations.push(
            this.generateInvalidFormatTest(
              flow,
              validation,
              belowMin,
              `value below minimum ${validation.value}`,
              config
            )
          );
        }
        break;

      case 'max_value':
        if (typeof validation.value === 'number') {
          const aboveMax = String(validation.value + 1);
          variations.push(
            this.generateInvalidFormatTest(
              flow,
              validation,
              aboveMax,
              `value above maximum ${validation.value}`,
              config
            )
          );
        }
        break;

      case 'pattern':
        // Generate a value that doesn't match the pattern
        variations.push(
          this.generateInvalidFormatTest(
            flow,
            validation,
            '!!!INVALID!!!',
            'value not matching pattern',
            config
          )
        );
        break;

      default:
        break;
    }

    return variations;
  }

  /**
   * Creates a test for invalid format input.
   */
  private generateInvalidFormatTest(
    flow: AnalyzedFlow,
    validation: ValidationRule,
    invalidValue: string,
    description: string,
    config: GenerationConfig
  ): TestVariation {
    const steps = this.createStepsWithValue(
      flow,
      validation.fieldSelector,
      invalidValue
    );
    const fieldName = validation.fieldName || 'field';

    return {
      id: `${flow.id}_invalid_${validation.constraint}_${this.sanitizeId(validation.fieldSelector)}`,
      name: '',
      description: `Verifies validation error when ${fieldName} has ${description}`,
      category: 'validation',
      priority: 'high',
      steps,
      assertions: [
        createAssertion('visible', `Should show validation error for ${fieldName}`, {
          selector: this.getErrorSelector(validation.fieldSelector),
        }),
      ],
      tags: ['validation', validation.constraint, flow.intent.type],
      sourceFlowId: flow.id,
      validationRule: validation,
      timeout: config.defaultTimeout,
    };
  }

  /**
   * Generates security-focused validation tests.
   */
  private generateSecurityTests(
    flow: AnalyzedFlow,
    config: GenerationConfig
  ): TestVariation[] {
    const variations: TestVariation[] = [];
    const inputFields = this.getInputFields(flow);

    if (inputFields.length === 0) {
      return variations;
    }

    // Use first text input field for security tests
    const targetField = inputFields[0]!;

    // SQL injection test
    variations.push({
      id: `${flow.id}_sql_injection`,
      name: '',
      description: 'Verifies the application handles SQL injection attempts safely',
      category: 'security',
      priority: 'critical',
      steps: this.createStepsWithValue(flow, targetField.selector, SQL_INJECTION_VALUES[0]!),
      assertions: [
        createAssertion('text_contains', 'Should not expose database errors', {
          selector: 'body',
          expected: 'error',
          not: true,
        }),
      ],
      tags: ['security', 'sql-injection', flow.intent.type],
      sourceFlowId: flow.id,
      timeout: config.defaultTimeout,
    });

    // XSS test
    variations.push({
      id: `${flow.id}_xss`,
      name: '',
      description: 'Verifies the application escapes HTML and prevents XSS',
      category: 'security',
      priority: 'critical',
      steps: this.createStepsWithValue(flow, targetField.selector, XSS_VALUES[0]!),
      assertions: [
        createAssertion('text_contains', 'Should escape script tags', {
          selector: 'body',
          expected: '<script>',
          not: true,
        }),
      ],
      tags: ['security', 'xss', flow.intent.type],
      sourceFlowId: flow.id,
      timeout: config.defaultTimeout,
    });

    // Special characters test
    variations.push({
      id: `${flow.id}_special_chars`,
      name: '',
      description: 'Verifies the application handles special characters safely',
      category: 'security',
      priority: 'medium',
      steps: this.createStepsWithValue(flow, targetField.selector, SPECIAL_CHAR_VALUES[0]!),
      assertions: [
        createAssertion('visible', 'Page should still be functional', {
          selector: 'body',
        }),
      ],
      tags: ['security', 'special-chars', flow.intent.type],
      sourceFlowId: flow.id,
      timeout: config.defaultTimeout,
    });

    return variations;
  }

  /**
   * Creates steps that skip filling a specific field.
   */
  private createStepsSkippingField(
    flow: AnalyzedFlow,
    skipSelector: string
  ): TestStep[] {
    const steps: TestStep[] = [];

    if (flow.startUrl) {
      steps.push(createStep('navigate', `Navigate to ${flow.startUrl}`, { url: flow.startUrl }));
    }

    for (const event of flow.events) {
      // Skip the target field
      if (event.selector === skipSelector) {
        continue;
      }

      const step = this.eventToStep(event);
      if (step) {
        steps.push(step);
      }
    }

    return steps;
  }

  /**
   * Creates steps with a specific value for a field.
   */
  private createStepsWithValue(
    flow: AnalyzedFlow,
    fieldSelector: string,
    value: string
  ): TestStep[] {
    const steps: TestStep[] = [];

    if (flow.startUrl) {
      steps.push(createStep('navigate', `Navigate to ${flow.startUrl}`, { url: flow.startUrl }));
    }

    for (const event of flow.events) {
      if (event.selector === fieldSelector && ['input', 'change'].includes(event.type)) {
        // Replace with our test value
        steps.push(createStep('fill', `Fill field with test value`, {
          selector: event.selector,
          value,
        }));
      } else {
        const step = this.eventToStep(event);
        if (step) {
          steps.push(step);
        }
      }
    }

    return steps;
  }

  /**
   * Converts an event to a test step.
   */
  private eventToStep(event: RecordedEvent): TestStep | null {
    switch (event.type) {
      case 'click':
      case 'submit':
        return createStep('click', `Click on element`, { selector: event.selector });

      case 'input':
      case 'change':
        return createStep('fill', `Fill field`, {
          selector: event.selector,
          value: event.value || '',
        });

      case 'select':
        return createStep('select', `Select option`, {
          selector: event.selector,
          value: event.value || '',
        });

      default:
        return null;
    }
  }

  /**
   * Gets input field events from a flow.
   */
  private getInputFields(flow: AnalyzedFlow): RecordedEvent[] {
    return flow.events.filter(
      (e) =>
        ['input', 'change'].includes(e.type) &&
        e.attributes?.['type'] !== 'file' &&
        e.attributes?.['type'] !== 'checkbox' &&
        e.attributes?.['type'] !== 'radio'
    );
  }

  /**
   * Generates an error selector for a field.
   */
  private getErrorSelector(fieldSelector: string): string {
    // Common patterns for error messages
    return `${fieldSelector} ~ .error, ${fieldSelector} + .error, [data-error-for="${fieldSelector}"], .error`;
  }

  /**
   * Sanitizes a string for use in an ID.
   */
  private sanitizeId(str: string): string {
    return str.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  }
}
