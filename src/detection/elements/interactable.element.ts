/**
 * InteractableElement - Catch-all for elements with JavaScript event listeners.
 *
 * This detects elements that have dynamically attached event listeners,
 * discovered via BrowserService's trackEventListeners and patchInlineHandlers
 * utilities which inject a data attribute on elements with handlers.
 *
 * Priority: 10 (highest) - Interactive elements with explicit handlers
 * are most likely to be important for testing.
 */

import {
  AbstractElement,
  type EventTypesProvider,
} from "./abstract.element.js";
import { ElementAction } from "./actions.js";
import { INTERACTIVE_DATA_ATTRIBUTE } from "../../browser/constants.js";

export class InteractableElement
  extends AbstractElement
  implements EventTypesProvider
{
  static readonly cssSelectors = [`[${INTERACTIVE_DATA_ATTRIBUTE}]`];
  static readonly priority = 10;
  static readonly description =
    "Element with dynamically attached JavaScript event listeners";

  getDefaultActions(): ElementAction[] {
    return [ElementAction.CLICK];
  }

  async getConfidenceScore(runValidation = true): Promise<number> {
    if (runValidation) {
      const isValid = await InteractableElement.validate(this.elementHandle);
      if (!isValid) {
        return 0;
      }
    }

    const events = await this.elementHandle.getAttribute(
      INTERACTIVE_DATA_ATTRIBUTE,
    );
    if (!events) {
      return 0;
    }

    return 100;
  }

  /**
   * Returns the list of event types attached to this element.
   * Handles both addEventListener handlers and inline handlers.
   */
  async getEventTypes(): Promise<string[]> {
    const events = await this.elementHandle.getAttribute(
      INTERACTIVE_DATA_ATTRIBUTE,
    );
    if (!events) {
      return [];
    }

    try {
      const uniqueEventTypes = new Set(
        (JSON.parse(events) as string[]).map((val) =>
          val.replace(/^(event-listener|inline)::/, ""),
        ),
      );
      return Array.from(uniqueEventTypes);
    } catch {
      return [];
    }
  }
}
