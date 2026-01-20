/**
 * VibeTesting CLI - Error Scenario Detector
 *
 * Generates error test scenarios from analyzed flows.
 * Identifies opportunities to test error handling.
 *
 * @license MIT
 */

import type { RecordedEvent } from '../recording/types.js';
import type {
  ErrorScenario,
  DetectedIntent,
  ValidationRule,
} from './types.js';

/**
 * Generates error scenarios for testing error handling.
 */
export class ErrorScenarioDetector {
  /**
   * Generates error scenarios from a flow.
   *
   * @param events - Events in the flow
   * @param intent - Detected intent
   * @param validations - Validation rules for the flow
   * @returns Array of error scenarios to test
   */
  generateScenarios(
    events: RecordedEvent[],
    intent: DetectedIntent,
    validations: ValidationRule[]
  ): ErrorScenario[] {
    const scenarios: ErrorScenario[] = [];

    // Generate scenarios based on intent type
    switch (intent.type) {
      case 'form_submission':
        scenarios.push(...this.generateFormErrorScenarios(events, validations));
        break;
      case 'authentication':
        scenarios.push(...this.generateAuthErrorScenarios(events));
        break;
      case 'checkout':
        scenarios.push(...this.generateCheckoutErrorScenarios(events, validations));
        break;
      case 'search':
        scenarios.push(...this.generateSearchErrorScenarios(events));
        break;
      case 'file_upload':
        scenarios.push(...this.generateFileUploadErrorScenarios(events));
        break;
      default:
        break;
    }

    // Add generic network error scenarios for any flow with potential API calls
    scenarios.push(...this.generateNetworkErrorScenarios(events, intent));

    return scenarios;
  }

  /**
   * Generates error scenarios for form submissions.
   */
  private generateFormErrorScenarios(
    _events: RecordedEvent[],
    validations: ValidationRule[]
  ): ErrorScenario[] {
    const scenarios: ErrorScenario[] = [];

    // Empty field submissions for required fields
    for (const validation of validations) {
      if (validation.constraint === 'required') {
        scenarios.push({
          type: 'validation_error',
          trigger: `Submit form with empty ${validation.fieldName || 'field'}`,
          selector: validation.fieldSelector,
          expectedBehavior: 'Should show validation error for required field',
          errorMessage: `${validation.fieldName || 'Field'} is required`,
        });
      }
    }

    // Invalid format submissions
    for (const validation of validations) {
      if (validation.constraint === 'email') {
        scenarios.push({
          type: 'validation_error',
          trigger: `Submit form with invalid email format`,
          selector: validation.fieldSelector,
          expectedBehavior: 'Should show email format validation error',
          errorMessage: 'Please enter a valid email address',
        });
      }

      if (validation.constraint === 'phone') {
        scenarios.push({
          type: 'validation_error',
          trigger: `Submit form with invalid phone number`,
          selector: validation.fieldSelector,
          expectedBehavior: 'Should show phone format validation error',
          errorMessage: 'Please enter a valid phone number',
        });
      }

      if (validation.constraint === 'min_length' && validation.value) {
        scenarios.push({
          type: 'validation_error',
          trigger: `Submit form with ${validation.fieldName || 'field'} shorter than ${validation.value} characters`,
          selector: validation.fieldSelector,
          expectedBehavior: `Should show minimum length validation error`,
          errorMessage: `Minimum ${validation.value} characters required`,
        });
      }

      if (validation.constraint === 'max_length' && validation.value) {
        scenarios.push({
          type: 'validation_error',
          trigger: `Submit form with ${validation.fieldName || 'field'} longer than ${validation.value} characters`,
          selector: validation.fieldSelector,
          expectedBehavior: `Should show maximum length validation error`,
          errorMessage: `Maximum ${validation.value} characters allowed`,
        });
      }
    }

    // Special character/injection tests
    scenarios.push({
      type: 'validation_error',
      trigger: 'Submit form with special characters in text fields',
      expectedBehavior: 'Should handle special characters safely',
    });

    scenarios.push({
      type: 'validation_error',
      trigger: 'Submit form with SQL injection attempt',
      expectedBehavior: 'Should sanitize input and not show database errors',
    });

    scenarios.push({
      type: 'validation_error',
      trigger: 'Submit form with XSS script tag',
      expectedBehavior: 'Should escape HTML and prevent script execution',
    });

    return scenarios;
  }

  /**
   * Generates error scenarios for authentication flows.
   */
  private generateAuthErrorScenarios(_events: RecordedEvent[]): ErrorScenario[] {
    return [
      {
        type: 'authentication_error',
        trigger: 'Submit login with invalid credentials',
        expectedBehavior: 'Should show authentication error message',
        statusCode: 401,
        errorMessage: 'Invalid username or password',
      },
      {
        type: 'authentication_error',
        trigger: 'Submit login with non-existent user',
        expectedBehavior: 'Should show same error as invalid password (no user enumeration)',
        statusCode: 401,
        errorMessage: 'Invalid username or password',
      },
      {
        type: 'rate_limit',
        trigger: 'Submit login multiple times rapidly',
        expectedBehavior: 'Should rate limit after several failed attempts',
        statusCode: 429,
        errorMessage: 'Too many login attempts',
      },
      {
        type: 'validation_error',
        trigger: 'Submit login with empty password',
        expectedBehavior: 'Should show validation error',
        errorMessage: 'Password is required',
      },
      {
        type: 'server_error',
        trigger: 'Authentication service unavailable',
        expectedBehavior: 'Should show friendly error message',
        statusCode: 503,
      },
    ];
  }

  /**
   * Generates error scenarios for checkout flows.
   */
  private generateCheckoutErrorScenarios(
    events: RecordedEvent[],
    validations: ValidationRule[]
  ): ErrorScenario[] {
    const scenarios = this.generateFormErrorScenarios(events, validations);

    // Checkout-specific scenarios
    scenarios.push(
      {
        type: 'validation_error',
        trigger: 'Submit with expired credit card',
        expectedBehavior: 'Should show card expiration error',
        errorMessage: 'Card has expired',
      },
      {
        type: 'validation_error',
        trigger: 'Submit with invalid card number',
        expectedBehavior: 'Should show invalid card error',
        errorMessage: 'Invalid card number',
      },
      {
        type: 'validation_error',
        trigger: 'Submit with incorrect CVV',
        expectedBehavior: 'Should show CVV validation error',
        errorMessage: 'Invalid security code',
      },
      {
        type: 'client_error',
        trigger: 'Submit order with insufficient funds',
        expectedBehavior: 'Should show payment declined message',
        statusCode: 402,
        errorMessage: 'Payment declined',
      },
      {
        type: 'conflict',
        trigger: 'Submit order when item is out of stock',
        expectedBehavior: 'Should show out of stock error',
        statusCode: 409,
        errorMessage: 'Item is no longer available',
      },
      {
        type: 'server_error',
        trigger: 'Payment gateway timeout',
        expectedBehavior: 'Should show timeout error and not double-charge',
        statusCode: 504,
      }
    );

    return scenarios;
  }

  /**
   * Generates error scenarios for search flows.
   */
  private generateSearchErrorScenarios(_events: RecordedEvent[]): ErrorScenario[] {
    return [
      {
        type: 'validation_error',
        trigger: 'Search with empty query',
        expectedBehavior: 'Should show message or handle gracefully',
      },
      {
        type: 'client_error',
        trigger: 'Search with no results',
        expectedBehavior: 'Should show "no results found" message',
        statusCode: 200,
      },
      {
        type: 'validation_error',
        trigger: 'Search with special characters',
        expectedBehavior: 'Should handle special characters safely',
      },
      {
        type: 'rate_limit',
        trigger: 'Rapid consecutive searches',
        expectedBehavior: 'Should debounce or rate limit requests',
        statusCode: 429,
      },
    ];
  }

  /**
   * Generates error scenarios for file uploads.
   */
  private generateFileUploadErrorScenarios(events: RecordedEvent[]): ErrorScenario[] {
    const fileEvent = events.find((e) => e.attributes?.['type'] === 'file');
    const acceptedTypes = fileEvent?.attributes?.['accept'] as string | undefined;

    const invalidTypeScenario: ErrorScenario = {
      type: 'validation_error',
      trigger: 'Upload file with invalid type',
      expectedBehavior: acceptedTypes
        ? `Should reject files not matching: ${acceptedTypes}`
        : 'Should show file type error',
      errorMessage: 'File type not allowed',
    };
    if (fileEvent?.selector) {
      invalidTypeScenario.selector = fileEvent.selector;
    }

    const sizeScenario: ErrorScenario = {
      type: 'validation_error',
      trigger: 'Upload file exceeding size limit',
      expectedBehavior: 'Should show file size error',
      errorMessage: 'File is too large',
    };
    if (fileEvent?.selector) {
      sizeScenario.selector = fileEvent.selector;
    }

    const scenarios: ErrorScenario[] = [
      invalidTypeScenario,
      sizeScenario,
      {
        type: 'network_timeout',
        trigger: 'Upload large file with slow connection',
        expectedBehavior: 'Should show timeout error or allow resume',
      },
      {
        type: 'server_error',
        trigger: 'Storage service unavailable during upload',
        expectedBehavior: 'Should show friendly error message',
        statusCode: 503,
      },
    ];

    return scenarios;
  }

  /**
   * Generates generic network error scenarios applicable to most flows.
   */
  private generateNetworkErrorScenarios(
    _events: RecordedEvent[],
    intent: DetectedIntent
  ): ErrorScenario[] {
    // Only add network scenarios for flows that likely make API calls
    const likelyApiFlow = [
      'form_submission',
      'authentication',
      'checkout',
      'search',
      'file_upload',
    ].includes(intent.type);

    if (!likelyApiFlow) {
      return [];
    }

    return [
      {
        type: 'network_timeout',
        trigger: 'Server takes too long to respond',
        expectedBehavior: 'Should show timeout message after reasonable wait',
        statusCode: 408,
      },
      {
        type: 'server_error',
        trigger: 'Server returns 500 Internal Server Error',
        expectedBehavior: 'Should show friendly error message, not stack trace',
        statusCode: 500,
      },
      {
        type: 'server_error',
        trigger: 'Server returns 502 Bad Gateway',
        expectedBehavior: 'Should show service unavailable message',
        statusCode: 502,
      },
      {
        type: 'server_error',
        trigger: 'Server returns 503 Service Unavailable',
        expectedBehavior: 'Should show maintenance or retry message',
        statusCode: 503,
      },
      {
        type: 'network_timeout',
        trigger: 'Network connection lost during request',
        expectedBehavior: 'Should detect offline state and show message',
      },
    ];
  }
}
