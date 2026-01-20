/**
 * VibeTesting CLI - Edge Case Generator
 *
 * Generates edge case test variations.
 *
 * @license MIT
 */

import type { AnalyzedFlow } from '../analysis/types.js';
import type {
  TestVariation,
  TestStep,
  GenerationConfig,
} from './types.js';
import { createStep, createAssertion } from './variation-generator.js';

/**
 * Generates edge case test variations.
 */
export class EdgeCaseGenerator {
  /**
   * Generates edge case variations for a flow.
   *
   * @param flow - Analyzed flow to generate tests for
   * @param config - Generation configuration
   * @returns Array of edge case test variations
   */
  generate(flow: AnalyzedFlow, config: GenerationConfig): TestVariation[] {
    const variations: TestVariation[] = [];

    // Rapid repeated submission test
    if (this.hasSubmitAction(flow)) {
      variations.push(this.generateDoubleSubmitTest(flow, config));
    }

    // Back button after submission
    if (flow.endUrl && flow.endUrl !== flow.startUrl) {
      variations.push(this.generateBackButtonTest(flow, config));
    }

    // Refresh during flow
    if (flow.events.length >= 3) {
      variations.push(this.generateRefreshDuringFlowTest(flow, config));
    }

    // Empty form submission (for forms)
    if (flow.intent.type === 'form_submission') {
      variations.push(this.generateEmptySubmissionTest(flow, config));
    }

    // Long input values
    if (this.hasTextInputs(flow)) {
      variations.push(this.generateLongInputTest(flow, config));
    }

    // Unicode input
    if (this.hasTextInputs(flow)) {
      variations.push(this.generateUnicodeInputTest(flow, config));
    }

    return variations;
  }

  /**
   * Generates test for double/rapid submission.
   */
  private generateDoubleSubmitTest(
    flow: AnalyzedFlow,
    config: GenerationConfig
  ): TestVariation {
    const steps = this.createFlowSteps(flow);

    // Add a second submit click
    const submitStep = steps.find((s) => s.type === 'click' && s.description.includes('Submit'));
    if (submitStep && submitStep.selector) {
      steps.push(
        createStep('click', 'Click submit again immediately', {
          selector: submitStep.selector,
        })
      );
    }

    return {
      id: `${flow.id}_double_submit`,
      name: '',
      description: 'Verifies protection against double form submission',
      category: 'edge_case',
      priority: 'high',
      steps,
      assertions: [
        createAssertion('visible', 'Should prevent duplicate submission or handle gracefully', {
          selector: 'body',
        }),
      ],
      tags: ['edge-case', 'double-submit', flow.intent.type],
      sourceFlowId: flow.id,
      timeout: config.defaultTimeout,
    };
  }

  /**
   * Generates test for back button behavior after submission.
   */
  private generateBackButtonTest(
    flow: AnalyzedFlow,
    config: GenerationConfig
  ): TestVariation {
    const steps = this.createFlowSteps(flow);

    // Add wait for navigation then back button
    steps.push(
      createStep('wait', 'Wait for navigation to complete', { duration: 1000 })
    );
    steps.push(
      createStep('press_key', 'Press browser back button', { key: 'Alt+ArrowLeft' })
    );

    return {
      id: `${flow.id}_back_button`,
      name: '',
      description: 'Verifies behavior when using browser back button after flow completion',
      category: 'edge_case',
      priority: 'medium',
      steps,
      assertions: [
        createAssertion('visible', 'Should handle back navigation gracefully', {
          selector: 'body',
        }),
        createAssertion('text_contains', 'Should not show duplicate submission warnings', {
          selector: 'body',
          expected: 'already submitted',
          not: true,
        }),
      ],
      tags: ['edge-case', 'navigation', 'back-button', flow.intent.type],
      sourceFlowId: flow.id,
      timeout: config.defaultTimeout,
    };
  }

  /**
   * Generates test for page refresh during flow.
   */
  private generateRefreshDuringFlowTest(
    flow: AnalyzedFlow,
    config: GenerationConfig
  ): TestVariation {
    const steps: TestStep[] = [];

    // Navigate first
    if (flow.startUrl) {
      steps.push(createStep('navigate', `Navigate to ${flow.startUrl}`, { url: flow.startUrl }));
    }

    // Add some steps from the flow (partial completion)
    const halfwayPoint = Math.floor(flow.events.length / 2);
    for (let i = 0; i < halfwayPoint; i++) {
      const step = this.eventToStep(flow.events[i]!);
      if (step) {
        steps.push(step);
      }
    }

    // Add refresh (navigate to same URL)
    steps.push(
      createStep('press_key', 'Refresh the page', { key: 'F5' })
    );

    return {
      id: `${flow.id}_refresh_during`,
      name: '',
      description: 'Verifies behavior when page is refreshed during the flow',
      category: 'edge_case',
      priority: 'low',
      steps,
      assertions: [
        createAssertion('visible', 'Page should recover gracefully after refresh', {
          selector: 'body',
        }),
      ],
      tags: ['edge-case', 'refresh', flow.intent.type],
      sourceFlowId: flow.id,
      timeout: config.defaultTimeout,
    };
  }

  /**
   * Generates test for empty form submission.
   */
  private generateEmptySubmissionTest(
    flow: AnalyzedFlow,
    config: GenerationConfig
  ): TestVariation {
    const steps: TestStep[] = [];

    // Navigate
    if (flow.startUrl) {
      steps.push(createStep('navigate', `Navigate to ${flow.startUrl}`, { url: flow.startUrl }));
    }

    // Find and click submit without filling anything
    const submitEvent = flow.events.find(
      (e) => e.type === 'submit' || (e.type === 'click' && e.tagName === 'button')
    );

    if (submitEvent) {
      steps.push(
        createStep('click', 'Submit form without filling any fields', {
          selector: submitEvent.selector,
        })
      );
    }

    return {
      id: `${flow.id}_empty_submit`,
      name: '',
      description: 'Verifies validation when submitting completely empty form',
      category: 'edge_case',
      priority: 'high',
      steps,
      assertions: [
        createAssertion('visible', 'Should show validation errors for required fields', {
          selector: '.error, .invalid, [aria-invalid="true"], .alert',
        }),
      ],
      tags: ['edge-case', 'empty-form', flow.intent.type],
      sourceFlowId: flow.id,
      timeout: config.defaultTimeout,
    };
  }

  /**
   * Generates test with very long input values.
   */
  private generateLongInputTest(
    flow: AnalyzedFlow,
    config: GenerationConfig
  ): TestVariation {
    const longValue = 'x'.repeat(10000); // 10K characters
    const steps: TestStep[] = [];

    if (flow.startUrl) {
      steps.push(createStep('navigate', `Navigate to ${flow.startUrl}`, { url: flow.startUrl }));
    }

    // Find first text input and fill with long value
    const textInput = flow.events.find(
      (e) =>
        ['input', 'change'].includes(e.type) &&
        e.attributes?.['type'] !== 'file' &&
        e.attributes?.['type'] !== 'checkbox' &&
        e.attributes?.['type'] !== 'radio'
    );

    if (textInput) {
      steps.push(
        createStep('fill', 'Fill field with very long value (10K chars)', {
          selector: textInput.selector,
          value: longValue,
        })
      );
    }

    // Add remaining steps
    const textInputIndex = flow.events.indexOf(textInput!);
    for (let i = textInputIndex + 1; i < flow.events.length; i++) {
      const step = this.eventToStep(flow.events[i]!);
      if (step) {
        steps.push(step);
      }
    }

    return {
      id: `${flow.id}_long_input`,
      name: '',
      description: 'Verifies handling of extremely long input values',
      category: 'edge_case',
      priority: 'low',
      steps,
      assertions: [
        createAssertion('visible', 'Should handle long input without crashing', {
          selector: 'body',
        }),
      ],
      tags: ['edge-case', 'long-input', 'performance', flow.intent.type],
      sourceFlowId: flow.id,
      timeout: config.defaultTimeout,
    };
  }

  /**
   * Generates test with unicode/emoji input.
   */
  private generateUnicodeInputTest(
    flow: AnalyzedFlow,
    config: GenerationConfig
  ): TestVariation {
    const unicodeValues = [
      '\u00e9\u00e8\u00ea', // French accents
      '\u4e2d\u6587', // Chinese
      '\ud83d\ude00\ud83d\udc4d\ud83c\udf89', // Emojis
      '\u0627\u0644\u0639\u0631\u0628\u064a\u0629', // Arabic
    ];
    const unicodeValue = unicodeValues.join(' ');

    const steps: TestStep[] = [];

    if (flow.startUrl) {
      steps.push(createStep('navigate', `Navigate to ${flow.startUrl}`, { url: flow.startUrl }));
    }

    // Replace text input values with unicode
    for (const event of flow.events) {
      if (
        ['input', 'change'].includes(event.type) &&
        event.attributes?.['type'] !== 'file' &&
        event.attributes?.['type'] !== 'checkbox' &&
        event.attributes?.['type'] !== 'radio'
      ) {
        steps.push(
          createStep('fill', 'Fill field with unicode/emoji characters', {
            selector: event.selector,
            value: unicodeValue,
          })
        );
      } else {
        const step = this.eventToStep(event);
        if (step) {
          steps.push(step);
        }
      }
    }

    return {
      id: `${flow.id}_unicode_input`,
      name: '',
      description: 'Verifies handling of unicode and emoji characters in inputs',
      category: 'edge_case',
      priority: 'medium',
      steps,
      assertions: [
        createAssertion('visible', 'Should handle unicode input correctly', {
          selector: 'body',
        }),
      ],
      tags: ['edge-case', 'unicode', 'internationalization', flow.intent.type],
      sourceFlowId: flow.id,
      timeout: config.defaultTimeout,
    };
  }

  /**
   * Creates the standard flow steps.
   */
  private createFlowSteps(flow: AnalyzedFlow): TestStep[] {
    const steps: TestStep[] = [];

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
        return createStep('click', `Click on element`, { selector: event.selector });

      case 'submit':
        return createStep('click', `Submit form`, { selector: event.selector });

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
   * Checks if the flow has a submit action.
   */
  private hasSubmitAction(flow: AnalyzedFlow): boolean {
    return flow.events.some(
      (e) => e.type === 'submit' || (e.type === 'click' && e.tagName === 'button')
    );
  }

  /**
   * Checks if the flow has text input fields.
   */
  private hasTextInputs(flow: AnalyzedFlow): boolean {
    return flow.events.some(
      (e) =>
        ['input', 'change'].includes(e.type) &&
        e.attributes?.['type'] !== 'file' &&
        e.attributes?.['type'] !== 'checkbox' &&
        e.attributes?.['type'] !== 'radio'
    );
  }
}
