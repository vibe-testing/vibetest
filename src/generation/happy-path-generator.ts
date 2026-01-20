/**
 * VibeTesting CLI - Happy Path Generator
 *
 * Generates successful flow test variations.
 *
 * @license MIT
 */

import type { AnalyzedFlow, GeneratedAssertion } from '../analysis/types.js';
import type { RecordedEvent } from '../recording/types.js';
import type {
  TestVariation,
  TestStep,
  TestAssertion,
  GenerationConfig,
} from './types.js';
import { createStep, createAssertion } from './variation-generator.js';

/**
 * Generates happy path (successful flow) test variations.
 */
export class HappyPathGenerator {
  /**
   * Generates happy path variations for a flow.
   *
   * @param flow - Analyzed flow to generate tests for
   * @param config - Generation configuration
   * @returns Array of happy path test variations
   */
  generate(flow: AnalyzedFlow, config: GenerationConfig): TestVariation[] {
    const variations: TestVariation[] = [];

    // Main happy path - exact replay
    variations.push(this.generateMainHappyPath(flow, config));

    // If the flow has enough complexity, add variations
    if (flow.events.length >= 3) {
      // With all optional fields filled
      const withOptional = this.generateWithOptionalFields(flow, config);
      if (withOptional) {
        variations.push(withOptional);
      }
    }

    return variations;
  }

  /**
   * Generates the main happy path test.
   */
  private generateMainHappyPath(
    flow: AnalyzedFlow,
    config: GenerationConfig
  ): TestVariation {
    const steps = this.convertEventsToSteps(flow.events, flow.startUrl);
    const assertions = this.generateAssertions(flow);

    return {
      id: `${flow.id}_happy_path`,
      name: '', // Will be set by TestNamer
      description: `Verifies the complete ${flow.intent.type.replace(/_/g, ' ')} flow executes successfully`,
      category: 'happy_path',
      priority: 'critical',
      steps,
      assertions,
      tags: ['happy-path', 'smoke', flow.intent.type],
      sourceFlowId: flow.id,
      timeout: config.defaultTimeout,
    };
  }

  /**
   * Generates a variation with all optional fields filled.
   */
  private generateWithOptionalFields(
    flow: AnalyzedFlow,
    config: GenerationConfig
  ): TestVariation | null {
    // Check if there are optional fields (fields without required validation)
    const requiredFields = new Set(
      flow.validations
        .filter((v) => v.constraint === 'required')
        .map((v) => v.fieldSelector)
    );

    const inputEvents = flow.events.filter((e) =>
      ['input', 'change', 'select'].includes(e.type)
    );

    const optionalFields = inputEvents.filter(
      (e) => !requiredFields.has(e.selector)
    );

    if (optionalFields.length === 0) {
      return null;
    }

    const steps = this.convertEventsToSteps(flow.events, flow.startUrl);
    const assertions = this.generateAssertions(flow);

    return {
      id: `${flow.id}_happy_path_full`,
      name: '',
      description: `Verifies the flow succeeds with all optional fields populated`,
      category: 'happy_path',
      priority: 'medium',
      steps,
      assertions,
      tags: ['happy-path', 'full-form', flow.intent.type],
      sourceFlowId: flow.id,
      timeout: config.defaultTimeout,
    };
  }

  /**
   * Converts recorded events to test steps.
   */
  private convertEventsToSteps(
    events: RecordedEvent[],
    startUrl?: string
  ): TestStep[] {
    const steps: TestStep[] = [];

    // Add navigation step if we have a start URL
    if (startUrl) {
      steps.push(createStep('navigate', `Navigate to ${startUrl}`, { url: startUrl }));
    }

    for (const event of events) {
      const step = this.eventToStep(event);
      if (step) {
        steps.push(step);
      }
    }

    return steps;
  }

  /**
   * Converts a single event to a test step.
   */
  private eventToStep(event: RecordedEvent): TestStep | null {
    switch (event.type) {
      case 'click':
        return createStep('click', `Click on ${this.describeElement(event)}`, {
          selector: event.selector,
        });

      case 'dblclick':
        return createStep('click', `Double-click on ${this.describeElement(event)}`, {
          selector: event.selector,
        });

      case 'input':
      case 'change':
        if (event.attributes?.['type'] === 'file') {
          return createStep('upload', `Upload file to ${this.describeElement(event)}`, {
            selector: event.selector,
            filePath: event.value || 'test-file.txt',
          });
        }
        return createStep('fill', `Fill ${this.describeElement(event)}`, {
          selector: event.selector,
          value: event.value || '',
        });

      case 'select':
        return createStep('select', `Select option in ${this.describeElement(event)}`, {
          selector: event.selector,
          value: event.value || '',
        });

      case 'check':
        return createStep('check', `Check ${this.describeElement(event)}`, {
          selector: event.selector,
        });

      case 'uncheck':
        return createStep('uncheck', `Uncheck ${this.describeElement(event)}`, {
          selector: event.selector,
        });

      case 'submit':
        return createStep('click', `Submit form`, {
          selector: event.selector,
        });

      case 'keydown':
      case 'keyup':
        if (event.key) {
          return createStep('press_key', `Press ${event.key}`, {
            key: event.key,
            selector: event.selector,
          });
        }
        return null;

      case 'navigation':
        // Navigation events are side effects, not actions
        return null;

      default:
        return null;
    }
  }

  /**
   * Creates a human-readable element description.
   */
  private describeElement(event: RecordedEvent): string {
    if (event.attributes?.['name']) {
      return `"${event.attributes['name']}" field`;
    }
    if (event.attributes?.['id']) {
      return `#${event.attributes['id']}`;
    }
    if (event.text) {
      return `"${event.text.slice(0, 30)}${event.text.length > 30 ? '...' : ''}"`;
    }
    if (event.tagName) {
      return `${event.tagName} element`;
    }
    return 'element';
  }

  /**
   * Generates assertions from flow assertions.
   */
  private generateAssertions(flow: AnalyzedFlow): TestAssertion[] {
    const assertions: TestAssertion[] = [];

    for (const flowAssertion of flow.assertions) {
      const assertion = this.convertFlowAssertion(flowAssertion);
      if (assertion) {
        assertions.push(assertion);
      }
    }

    // Add URL assertion if flow ends on different page
    if (flow.endUrl && flow.endUrl !== flow.startUrl) {
      assertions.push(
        createAssertion('url_contains', `Should navigate to ${flow.endUrl}`, {
          expected: flow.endUrl,
        })
      );
    }

    // Ensure at least one assertion
    if (assertions.length === 0) {
      assertions.push(
        createAssertion('visible', 'Page should be visible and loaded', {
          selector: 'body',
        })
      );
    }

    return assertions;
  }

  /**
   * Converts a flow assertion to a test assertion.
   */
  private convertFlowAssertion(
    flowAssertion: GeneratedAssertion
  ): TestAssertion | null {
    const buildOptions = (
      selector?: string,
      expected?: string | number | boolean
    ): Partial<Omit<TestAssertion, 'type' | 'description'>> => {
      const opts: Partial<Omit<TestAssertion, 'type' | 'description'>> = {};
      if (selector) opts.selector = selector;
      if (expected !== undefined) opts.expected = expected;
      return opts;
    };

    switch (flowAssertion.type) {
      case 'element_visible':
        return createAssertion(
          'visible',
          flowAssertion.description || 'Element should be visible',
          buildOptions(flowAssertion.selector)
        );

      case 'element_hidden':
        return createAssertion(
          'hidden',
          flowAssertion.description || 'Element should be hidden',
          buildOptions(flowAssertion.selector)
        );

      case 'text_content':
        return createAssertion(
          'text_contains',
          flowAssertion.description || 'Text should match',
          buildOptions(flowAssertion.selector, flowAssertion.expected)
        );

      case 'url_change':
        return createAssertion(
          'url_contains',
          flowAssertion.description || 'URL should change',
          buildOptions(undefined, flowAssertion.expected)
        );

      default:
        return null;
    }
  }
}
