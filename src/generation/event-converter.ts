/**
 * VibeTesting CLI - Event Converter
 *
 * Shared utility for converting recorded events to test steps.
 *
 * @license MIT
 */

import type { RecordedEvent } from '../recording/types.js';
import type { TestStep } from './types.js';
import { createStep } from './variation-generator.js';

/**
 * Converts a recorded event to a test step.
 *
 * @param event - The recorded event to convert
 * @returns TestStep or null if event type is not supported
 */
export function eventToStep(event: RecordedEvent): TestStep | null {
  switch (event.type) {
    case 'click':
      return createStep('click', `Click on ${describeElement(event)}`, {
        selector: event.selector,
      });

    case 'dblclick':
      return createStep('click', `Double-click on ${describeElement(event)}`, {
        selector: event.selector,
      });

    case 'input':
    case 'change':
      if (event.attributes?.['type'] === 'file') {
        return createStep('upload', `Upload file to ${describeElement(event)}`, {
          selector: event.selector,
          filePath: event.value || 'test-file.txt',
        });
      }
      return createStep('fill', `Fill ${describeElement(event)}`, {
        selector: event.selector,
        value: event.value || '',
      });

    case 'select':
      return createStep('select', `Select option in ${describeElement(event)}`, {
        selector: event.selector,
        value: event.value || '',
      });

    case 'check':
      return createStep('check', `Check ${describeElement(event)}`, {
        selector: event.selector,
      });

    case 'uncheck':
      return createStep('uncheck', `Uncheck ${describeElement(event)}`, {
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
 * Creates a simple test step from an event (reduced detail version).
 * Used when full element descriptions are not needed.
 *
 * @param event - The recorded event to convert
 * @returns TestStep or null if event type is not supported
 */
export function eventToSimpleStep(event: RecordedEvent): TestStep | null {
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
 * Creates a human-readable element description.
 */
export function describeElement(event: RecordedEvent): string {
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
 * Converts an array of events to test steps, optionally with navigation.
 *
 * @param events - Array of recorded events
 * @param startUrl - Optional URL to navigate to first
 * @returns Array of test steps
 */
export function eventsToSteps(
  events: RecordedEvent[],
  startUrl?: string
): TestStep[] {
  const steps: TestStep[] = [];

  if (startUrl) {
    steps.push(createStep('navigate', `Navigate to ${startUrl}`, { url: startUrl }));
  }

  for (const event of events) {
    const step = eventToStep(event);
    if (step) {
      steps.push(step);
    }
  }

  return steps;
}
