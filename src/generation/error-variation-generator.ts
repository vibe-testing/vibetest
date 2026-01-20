/**
 * VibeTesting CLI - Error Variation Generator
 *
 * Generates test variations for error scenarios.
 *
 * @license MIT
 */

import type { AnalyzedFlow, ErrorScenario } from '../analysis/types.js';
import type {
  TestVariation,
  TestStep,
  TestAssertion,
  GenerationConfig,
  MockResponse,
} from './types.js';
import { createStep, createAssertion } from './variation-generator.js';

/**
 * Common API patterns to intercept for error mocking.
 */
const API_PATTERNS = [
  '**/api/**',
  '**/graphql',
  '**/*.json',
  '**/submit*',
  '**/login*',
  '**/auth*',
  '**/checkout*',
  '**/payment*',
];

/**
 * Generates error handling test variations.
 */
export class ErrorVariationGenerator {
  /**
   * Generates error variations for a flow.
   *
   * @param flow - Analyzed flow to generate tests for
   * @param config - Generation configuration
   * @returns Array of error handling test variations
   */
  generate(flow: AnalyzedFlow, config: GenerationConfig): TestVariation[] {
    const variations: TestVariation[] = [];

    // Generate variations for each error scenario
    for (const scenario of flow.errorScenarios) {
      const variation = this.generateFromScenario(flow, scenario, config);
      if (variation) {
        variations.push(variation);
      }
    }

    // Add generic network error tests if flow likely has API calls
    if (this.flowHasApiInteraction(flow)) {
      variations.push(...this.generateNetworkErrorTests(flow, config));
    }

    return variations;
  }

  /**
   * Generates a test variation from an error scenario.
   */
  private generateFromScenario(
    flow: AnalyzedFlow,
    scenario: ErrorScenario,
    config: GenerationConfig
  ): TestVariation | null {
    const steps = this.createStepsWithMocking(flow, scenario);
    const assertions = this.createErrorAssertions(scenario);

    return {
      id: `${flow.id}_error_${scenario.type}`,
      name: '',
      description: scenario.expectedBehavior || `Tests ${scenario.type} handling`,
      category: 'error_handling',
      priority: this.getScenarioPriority(scenario),
      steps,
      assertions,
      tags: ['error-handling', scenario.type, flow.intent.type],
      sourceFlowId: flow.id,
      errorScenario: scenario,
      timeout: config.defaultTimeout,
      requiresMocking: this.requiresMocking(scenario),
    };
  }

  /**
   * Creates steps that include mock response setup.
   */
  private createStepsWithMocking(
    flow: AnalyzedFlow,
    scenario: ErrorScenario
  ): TestStep[] {
    const steps: TestStep[] = [];

    // Add mock setup if needed
    if (scenario.statusCode) {
      const mockResponse = this.createMockResponse(scenario);
      steps.push(
        createStep('mock_response', `Mock API to return ${scenario.statusCode}`, {
          mockResponse,
        })
      );
    }

    // Add navigation
    if (flow.startUrl) {
      steps.push(createStep('navigate', `Navigate to ${flow.startUrl}`, { url: flow.startUrl }));
    }

    // Add flow steps
    for (const event of flow.events) {
      const step = this.eventToStep(event);
      if (step) {
        steps.push(step);
      }
    }

    return steps;
  }

  /**
   * Creates a mock response configuration.
   */
  private createMockResponse(scenario: ErrorScenario): MockResponse {
    const urlPattern = this.getApiPattern(scenario);

    return {
      urlPattern,
      status: scenario.statusCode || 500,
      body: JSON.stringify({
        error: scenario.errorMessage || 'An error occurred',
        code: scenario.type.toUpperCase(),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * Gets the API pattern for mocking based on scenario type.
   */
  private getApiPattern(scenario: ErrorScenario): string {
    switch (scenario.type) {
      case 'authentication_error':
        return '**/auth/**';
      case 'rate_limit':
        return '**/api/**';
      case 'network_timeout':
        return '**/*';
      case 'server_error':
        return '**/api/**';
      default:
        return '**/api/**';
    }
  }

  /**
   * Creates assertions for error scenarios.
   */
  private createErrorAssertions(scenario: ErrorScenario): TestAssertion[] {
    const assertions: TestAssertion[] = [];

    // Should show error message
    assertions.push(
      createAssertion('visible', 'Should display error feedback', {
        selector: '.error, .alert, [role="alert"], .notification, .toast',
      })
    );

    // Should not show stack trace or technical details
    assertions.push(
      createAssertion('text_contains', 'Should not expose stack traces', {
        selector: 'body',
        expected: 'at Object.',
        not: true,
      })
    );

    // For specific scenarios, add targeted assertions
    if (scenario.errorMessage) {
      assertions.push(
        createAssertion('text_contains', `Should show error: ${scenario.errorMessage}`, {
          selector: 'body',
          expected: scenario.errorMessage,
        })
      );
    }

    return assertions;
  }

  /**
   * Generates generic network error tests.
   */
  private generateNetworkErrorTests(
    flow: AnalyzedFlow,
    config: GenerationConfig
  ): TestVariation[] {
    const variations: TestVariation[] = [];

    // Server 500 error
    variations.push({
      id: `${flow.id}_server_500`,
      name: '',
      description: 'Verifies graceful handling of server 500 errors',
      category: 'error_handling',
      priority: 'high',
      steps: this.createStepsWithStatusCode(flow, 500),
      assertions: [
        createAssertion('visible', 'Should show error message', {
          selector: '.error, .alert, [role="alert"]',
        }),
        createAssertion('text_contains', 'Should not show stack trace', {
          selector: 'body',
          expected: 'Internal Server Error',
          not: true,
        }),
      ],
      tags: ['error-handling', 'server-error', '500', flow.intent.type],
      sourceFlowId: flow.id,
      timeout: config.defaultTimeout,
      requiresMocking: true,
    });

    // Server 503 service unavailable
    variations.push({
      id: `${flow.id}_server_503`,
      name: '',
      description: 'Verifies handling of service unavailable errors',
      category: 'error_handling',
      priority: 'medium',
      steps: this.createStepsWithStatusCode(flow, 503),
      assertions: [
        createAssertion('visible', 'Should show maintenance or retry message', {
          selector: '.error, .alert, [role="alert"], body',
        }),
      ],
      tags: ['error-handling', 'server-error', '503', flow.intent.type],
      sourceFlowId: flow.id,
      timeout: config.defaultTimeout,
      requiresMocking: true,
    });

    // Timeout simulation
    variations.push({
      id: `${flow.id}_timeout`,
      name: '',
      description: 'Verifies handling of request timeouts',
      category: 'error_handling',
      priority: 'medium',
      steps: this.createStepsWithTimeout(flow, 30000),
      assertions: [
        createAssertion('visible', 'Should show timeout message or loading state', {
          selector: '.error, .loading, .spinner, [role="alert"]',
        }),
      ],
      tags: ['error-handling', 'timeout', flow.intent.type],
      sourceFlowId: flow.id,
      timeout: config.defaultTimeout + 35000, // Allow extra time for timeout test
      requiresMocking: true,
    });

    // Rate limiting (429)
    if (flow.intent.type === 'authentication' || flow.intent.type === 'form_submission') {
      variations.push({
        id: `${flow.id}_rate_limit`,
        name: '',
        description: 'Verifies handling of rate limiting (429)',
        category: 'error_handling',
        priority: 'medium',
        steps: this.createStepsWithStatusCode(flow, 429),
        assertions: [
          createAssertion('visible', 'Should show rate limit message', {
            selector: '.error, .alert, [role="alert"], body',
          }),
        ],
        tags: ['error-handling', 'rate-limit', '429', flow.intent.type],
        sourceFlowId: flow.id,
        timeout: config.defaultTimeout,
        requiresMocking: true,
      });
    }

    return variations;
  }

  /**
   * Creates steps with a mock status code.
   */
  private createStepsWithStatusCode(
    flow: AnalyzedFlow,
    statusCode: number
  ): TestStep[] {
    const steps: TestStep[] = [];

    // Add mock setup
    steps.push(
      createStep('mock_response', `Mock API to return ${statusCode}`, {
        mockResponse: {
          urlPattern: API_PATTERNS[0]!,
          status: statusCode,
          body: JSON.stringify({ error: `Server error ${statusCode}` }),
        },
      })
    );

    // Add navigation and flow steps
    if (flow.startUrl) {
      steps.push(createStep('navigate', `Navigate to ${flow.startUrl}`, { url: flow.startUrl }));
    }

    for (const event of flow.events) {
      const step = this.eventToStep(event);
      if (step) {
        steps.push(step);
      }
    }

    return steps;
  }

  /**
   * Creates steps with a simulated timeout.
   */
  private createStepsWithTimeout(
    flow: AnalyzedFlow,
    delayMs: number
  ): TestStep[] {
    const steps: TestStep[] = [];

    // Add mock setup with delay
    steps.push(
      createStep('mock_response', `Mock API with ${delayMs}ms delay (timeout)`, {
        mockResponse: {
          urlPattern: API_PATTERNS[0]!,
          status: 200,
          body: '{}',
          delay: delayMs,
        },
      })
    );

    // Add navigation and flow steps
    if (flow.startUrl) {
      steps.push(createStep('navigate', `Navigate to ${flow.startUrl}`, { url: flow.startUrl }));
    }

    for (const event of flow.events) {
      const step = this.eventToStep(event);
      if (step) {
        steps.push(step);
      }
    }

    return steps;
  }

  /**
   * Converts an event to a test step.
   */
  private eventToStep(event: AnalyzedFlow['events'][number]): TestStep | null {
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
   * Determines if a flow likely has API interactions.
   */
  private flowHasApiInteraction(flow: AnalyzedFlow): boolean {
    const apiIntents = [
      'form_submission',
      'authentication',
      'checkout',
      'search',
      'file_upload',
    ];
    return apiIntents.includes(flow.intent.type);
  }

  /**
   * Gets priority level for an error scenario.
   */
  private getScenarioPriority(
    scenario: ErrorScenario
  ): TestVariation['priority'] {
    switch (scenario.type) {
      case 'server_error':
      case 'authentication_error':
        return 'critical';
      case 'validation_error':
      case 'network_timeout':
        return 'high';
      case 'rate_limit':
      case 'conflict':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Determines if a scenario requires API mocking.
   */
  private requiresMocking(scenario: ErrorScenario): boolean {
    const mockingScenarios = [
      'server_error',
      'network_timeout',
      'rate_limit',
      'authentication_error',
    ];
    return mockingScenarios.includes(scenario.type);
  }
}
