/**
 * VibeTesting CLI - Intent Detector
 *
 * Detects user intent patterns from recorded events.
 * Identifies form submissions, searches, navigation, authentication, etc.
 *
 * @license MIT
 */

import type { RecordedEvent } from '../recording/types.js';
import type { DetectedIntent, IntentType } from './types.js';

/**
 * Pattern definition for intent detection.
 */
interface IntentPattern {
  type: IntentType;
  detect: (events: RecordedEvent[], startIndex: number) => PatternMatch | null;
  priority: number;
}

interface PatternMatch {
  confidence: number;
  endIndex: number;
  metadata: Record<string, unknown>;
  triggerEventIds: string[];
}

/**
 * IntentDetector analyzes recorded events to identify user intentions.
 *
 * @example
 * ```typescript
 * const detector = new IntentDetector();
 * const intents = detector.detectIntents(recordedEvents);
 * console.log(intents[0].type); // 'form_submission'
 * ```
 */
export class IntentDetector {
  private patterns: IntentPattern[];

  constructor() {
    this.patterns = this.initializePatterns();
  }

  /**
   * Detects all intents in a sequence of recorded events.
   *
   * @param events - Array of recorded events
   * @returns Array of detected intents
   */
  detectIntents(events: RecordedEvent[]): DetectedIntent[] {
    const intents: DetectedIntent[] = [];
    let currentIndex = 0;

    while (currentIndex < events.length) {
      let bestMatch: { pattern: IntentPattern; match: PatternMatch } | null = null;

      // Try each pattern at the current position
      for (const pattern of this.patterns) {
        const match = pattern.detect(events, currentIndex);
        if (match && (!bestMatch || match.confidence > bestMatch.match.confidence)) {
          bestMatch = { pattern, match };
        }
      }

      if (bestMatch) {
        intents.push({
          type: bestMatch.pattern.type,
          confidence: bestMatch.match.confidence,
          startEventIndex: currentIndex,
          endEventIndex: bestMatch.match.endIndex,
          triggerEvents: bestMatch.match.triggerEventIds,
          metadata: bestMatch.match.metadata,
        });
        currentIndex = bestMatch.match.endIndex + 1;
      } else {
        // No pattern matched, check for single-event intents
        const singleIntent = this.detectSingleEventIntent(events[currentIndex]!);
        if (singleIntent) {
          intents.push({
            ...singleIntent,
            startEventIndex: currentIndex,
            endEventIndex: currentIndex,
          });
        }
        currentIndex++;
      }
    }

    return intents;
  }

  /**
   * Detects intent from a single event.
   */
  private detectSingleEventIntent(
    event: RecordedEvent
  ): Omit<DetectedIntent, 'startEventIndex' | 'endEventIndex'> | null {
    // Navigation via link click
    if (event.type === 'click' && event.tagName === 'a' && event.attributes?.['href']) {
      return {
        type: 'navigation',
        confidence: 0.9,
        triggerEvents: [event.id],
        metadata: { targetUrl: event.attributes['href'] },
      };
    }

    // Button click (generic)
    if (event.type === 'click' && event.tagName === 'button') {
      return {
        type: 'unknown',
        confidence: 0.5,
        triggerEvents: [event.id],
        metadata: { buttonText: event.text },
      };
    }

    return null;
  }

  /**
   * Initializes the intent detection patterns.
   */
  private initializePatterns(): IntentPattern[] {
    return [
      this.createFormSubmissionPattern(),
      this.createSearchPattern(),
      this.createAuthenticationPattern(),
      this.createCheckoutPattern(),
      this.createFilterPattern(),
      this.createPaginationPattern(),
      this.createModalPattern(),
      this.createFileUploadPattern(),
      this.createMenuNavigationPattern(),
    ];
  }

  /**
   * Form submission pattern: input events followed by submit.
   */
  private createFormSubmissionPattern(): IntentPattern {
    return {
      type: 'form_submission',
      priority: 10,
      detect: (events, startIndex) => {
        const inputEvents: RecordedEvent[] = [];
        let submitEvent: RecordedEvent | null = null;
        let i = startIndex;

        // Collect input events
        while (i < events.length) {
          const event = events[i];
          if (!event) break;

          if (['input', 'change', 'check', 'uncheck', 'select'].includes(event.type)) {
            inputEvents.push(event);
            i++;
          } else if (event.type === 'submit' || this.isSubmitButton(event)) {
            submitEvent = event;
            break;
          } else if (event.type === 'click' && inputEvents.length === 0) {
            // Click before any inputs - not a form submission
            return null;
          } else {
            i++;
          }
        }

        if (submitEvent && inputEvents.length > 0) {
          const triggerEventIds = [
            ...inputEvents.map((e) => e.id),
            submitEvent.id,
          ];

          return {
            confidence: Math.min(0.95, 0.6 + inputEvents.length * 0.1),
            endIndex: i,
            triggerEventIds,
            metadata: {
              fieldCount: inputEvents.length,
              formAction: submitEvent.attributes?.['action'],
              inputTypes: [...new Set(inputEvents.map((e) => e.attributes?.['type'] || 'text'))],
            },
          };
        }

        return null;
      },
    };
  }

  /**
   * Search pattern: input + Enter or search button click.
   */
  private createSearchPattern(): IntentPattern {
    return {
      type: 'search',
      priority: 9,
      detect: (events, startIndex) => {
        const event = events[startIndex];
        if (!event) return null;

        // Look for search input + Enter or click
        if (event.type === 'input' && this.isSearchInput(event)) {
          // Check if next event is Enter or search button
          const nextEvent = events[startIndex + 1];
          if (
            nextEvent &&
            ((nextEvent.type === 'keydown' && nextEvent.key === 'Enter') ||
              (nextEvent.type === 'click' && this.isSearchButton(nextEvent)))
          ) {
            return {
              confidence: 0.9,
              endIndex: startIndex + 1,
              triggerEventIds: [event.id, nextEvent.id],
              metadata: { searchQuery: event.value },
            };
          }

          // Single input might still be a search
          if (this.isSearchInput(event)) {
            return {
              confidence: 0.6,
              endIndex: startIndex,
              triggerEventIds: [event.id],
              metadata: { searchQuery: event.value },
            };
          }
        }

        return null;
      },
    };
  }

  /**
   * Authentication pattern: username/password inputs + submit.
   */
  private createAuthenticationPattern(): IntentPattern {
    return {
      type: 'authentication',
      priority: 10,
      detect: (events, startIndex) => {
        const relevantEvents: RecordedEvent[] = [];
        let hasUsername = false;
        let hasPassword = false;
        let submitEvent: RecordedEvent | null = null;
        let submitIndex = -1;

        for (let i = startIndex; i < Math.min(startIndex + 10, events.length); i++) {
          const event = events[i];
          if (!event) continue;

          if (this.isUsernameField(event)) {
            hasUsername = true;
            relevantEvents.push(event);
          } else if (this.isPasswordField(event)) {
            hasPassword = true;
            relevantEvents.push(event);
          } else if (event.type === 'submit' || this.isSubmitButton(event)) {
            submitEvent = event;
            submitIndex = i;
            break;
          }
        }

        if (hasPassword && submitEvent && submitIndex >= 0) {
          relevantEvents.push(submitEvent);
          return {
            confidence: hasUsername ? 0.95 : 0.8,
            endIndex: submitIndex,
            triggerEventIds: relevantEvents.map((e) => e.id),
            metadata: {
              hasUsername,
              hasRememberMe: relevantEvents.some(
                (e) => e.type === 'check' && this.isRememberMeField(e)
              ),
            },
          };
        }

        return null;
      },
    };
  }

  /**
   * Checkout pattern: multiple form inputs with payment-related fields.
   */
  private createCheckoutPattern(): IntentPattern {
    return {
      type: 'checkout',
      priority: 8,
      detect: (events, startIndex) => {
        const relevantEvents: RecordedEvent[] = [];
        let hasPaymentField = false;
        let hasAddressField = false;

        for (let i = startIndex; i < Math.min(startIndex + 30, events.length); i++) {
          const event = events[i];
          if (!event) continue;

          if (this.isPaymentField(event)) {
            hasPaymentField = true;
            relevantEvents.push(event);
          } else if (this.isAddressField(event)) {
            hasAddressField = true;
            relevantEvents.push(event);
          } else if (['input', 'select'].includes(event.type)) {
            relevantEvents.push(event);
          } else if (event.type === 'submit' || this.isSubmitButton(event)) {
            relevantEvents.push(event);
            break;
          }
        }

        if (hasPaymentField || (hasAddressField && relevantEvents.length >= 5)) {
          return {
            confidence: hasPaymentField ? 0.9 : 0.7,
            endIndex: startIndex + relevantEvents.length - 1,
            triggerEventIds: relevantEvents.map((e) => e.id),
            metadata: { hasPayment: hasPaymentField, hasAddress: hasAddressField },
          };
        }

        return null;
      },
    };
  }

  /**
   * Filter pattern: select or checkbox changes that filter content.
   */
  private createFilterPattern(): IntentPattern {
    return {
      type: 'filter',
      priority: 6,
      detect: (events, startIndex) => {
        const event = events[startIndex];
        if (!event) return null;

        if (
          (event.type === 'select' || event.type === 'change') &&
          this.isFilterElement(event)
        ) {
          return {
            confidence: 0.75,
            endIndex: startIndex,
            triggerEventIds: [event.id],
            metadata: { filterValue: event.value },
          };
        }

        return null;
      },
    };
  }

  /**
   * Pagination pattern: clicks on page numbers or next/prev buttons.
   */
  private createPaginationPattern(): IntentPattern {
    return {
      type: 'pagination',
      priority: 5,
      detect: (events, startIndex) => {
        const event = events[startIndex];
        if (!event) return null;

        if (event.type === 'click' && this.isPaginationElement(event)) {
          return {
            confidence: 0.85,
            endIndex: startIndex,
            triggerEventIds: [event.id],
            metadata: { pageIndicator: event.text || event.attributes?.['aria-label'] },
          };
        }

        return null;
      },
    };
  }

  /**
   * Modal interaction pattern: open modal -> interact -> close.
   */
  private createModalPattern(): IntentPattern {
    return {
      type: 'modal_interaction',
      priority: 4,
      detect: (events, startIndex) => {
        const event = events[startIndex];
        if (!event) return null;

        // Look for modal trigger
        if (event.type === 'click' && this.isModalTrigger(event)) {
          const modalEvents: RecordedEvent[] = [event];

          // Collect events until modal close
          for (let i = startIndex + 1; i < Math.min(startIndex + 20, events.length); i++) {
            const nextEvent = events[i];
            if (!nextEvent) continue;
            modalEvents.push(nextEvent);

            if (this.isModalClose(nextEvent)) {
              return {
                confidence: 0.8,
                endIndex: i,
                triggerEventIds: modalEvents.map((e) => e.id),
                metadata: { eventCount: modalEvents.length },
              };
            }
          }
        }

        return null;
      },
    };
  }

  /**
   * File upload pattern: input type=file interaction.
   */
  private createFileUploadPattern(): IntentPattern {
    return {
      type: 'file_upload',
      priority: 7,
      detect: (events, startIndex) => {
        const event = events[startIndex];
        if (!event) return null;

        if (
          event.type === 'change' &&
          event.attributes?.['type'] === 'file'
        ) {
          return {
            confidence: 0.95,
            endIndex: startIndex,
            triggerEventIds: [event.id],
            metadata: { fieldName: event.attributes['name'] },
          };
        }

        return null;
      },
    };
  }

  /**
   * Menu navigation pattern: click on menu item.
   */
  private createMenuNavigationPattern(): IntentPattern {
    return {
      type: 'menu_navigation',
      priority: 3,
      detect: (events, startIndex) => {
        const event = events[startIndex];
        if (!event) return null;

        if (event.type === 'click' && this.isMenuElement(event)) {
          return {
            confidence: 0.7,
            endIndex: startIndex,
            triggerEventIds: [event.id],
            metadata: { menuItem: event.text },
          };
        }

        return null;
      },
    };
  }

  // Helper methods for element classification

  private isSubmitButton(event: RecordedEvent): boolean {
    if (event.type !== 'click') return false;
    const text = (event.text || '').toLowerCase();
    const type = event.attributes?.['type'];
    return (
      type === 'submit' ||
      ['submit', 'send', 'save', 'confirm', 'continue', 'next', 'login', 'sign in', 'register']
        .some((word) => text.includes(word))
    );
  }

  private isSearchInput(event: RecordedEvent): boolean {
    const type = event.attributes?.['type'];
    const name = (event.attributes?.['name'] || '').toLowerCase();
    const placeholder = (event.attributes?.['placeholder'] || '').toLowerCase();
    return (
      type === 'search' ||
      name.includes('search') ||
      name.includes('query') ||
      placeholder.includes('search')
    );
  }

  private isSearchButton(event: RecordedEvent): boolean {
    const text = (event.text || '').toLowerCase();
    const ariaLabel = (event.attributes?.['aria-label'] || '').toLowerCase();
    return text.includes('search') || ariaLabel.includes('search');
  }

  private isUsernameField(event: RecordedEvent): boolean {
    if (!['input', 'change'].includes(event.type)) return false;
    const name = (event.attributes?.['name'] || '').toLowerCase();
    const type = event.attributes?.['type'];
    const placeholder = (event.attributes?.['placeholder'] || '').toLowerCase();
    return (
      type === 'email' ||
      name.includes('user') ||
      name.includes('email') ||
      name.includes('login') ||
      placeholder.includes('email') ||
      placeholder.includes('username')
    );
  }

  private isPasswordField(event: RecordedEvent): boolean {
    if (!['input', 'change'].includes(event.type)) return false;
    return event.attributes?.['type'] === 'password';
  }

  private isRememberMeField(event: RecordedEvent): boolean {
    const name = (event.attributes?.['name'] || '').toLowerCase();
    return name.includes('remember') || name.includes('keep');
  }

  private isPaymentField(event: RecordedEvent): boolean {
    const name = (event.attributes?.['name'] || '').toLowerCase();
    return (
      name.includes('card') ||
      name.includes('cvv') ||
      name.includes('cvc') ||
      name.includes('expir') ||
      name.includes('payment')
    );
  }

  private isAddressField(event: RecordedEvent): boolean {
    const name = (event.attributes?.['name'] || '').toLowerCase();
    return (
      name.includes('address') ||
      name.includes('city') ||
      name.includes('state') ||
      name.includes('zip') ||
      name.includes('postal') ||
      name.includes('country')
    );
  }

  private isFilterElement(event: RecordedEvent): boolean {
    const name = (event.attributes?.['name'] || '').toLowerCase();
    const selector = event.selector.toLowerCase();
    return (
      name.includes('filter') ||
      name.includes('sort') ||
      selector.includes('filter') ||
      selector.includes('facet')
    );
  }

  private isPaginationElement(event: RecordedEvent): boolean {
    const text = (event.text || '').toLowerCase();
    const ariaLabel = (event.attributes?.['aria-label'] || '').toLowerCase();
    const selector = event.selector.toLowerCase();
    return (
      /^\d+$/.test(text) ||
      text.includes('next') ||
      text.includes('prev') ||
      text.includes('page') ||
      ariaLabel.includes('page') ||
      selector.includes('pagination') ||
      selector.includes('pager')
    );
  }

  private isModalTrigger(event: RecordedEvent): boolean {
    const ariaHasPopup = event.attributes?.['aria-haspopup'];
    const dataToggle = event.attributes?.['data-toggle'];
    return ariaHasPopup === 'dialog' || dataToggle === 'modal';
  }

  private isModalClose(event: RecordedEvent): boolean {
    if (event.type !== 'click') return false;
    const ariaLabel = (event.attributes?.['aria-label'] || '').toLowerCase();
    const text = (event.text || '').toLowerCase();
    return (
      ariaLabel.includes('close') ||
      text === '×' ||
      text === 'x' ||
      text.includes('cancel') ||
      text.includes('close')
    );
  }

  private isMenuElement(event: RecordedEvent): boolean {
    const role = event.attributes?.['role'];
    const selector = event.selector.toLowerCase();
    return (
      role === 'menuitem' ||
      selector.includes('nav') ||
      selector.includes('menu')
    );
  }
}
