/**
 * RadioElement - Represents radio button input elements.
 *
 * Detects:
 * - Native <input type="radio"> elements
 * - Elements with role="radio"
 */

import { AbstractElement, type CustomValueProvider } from "./abstract.element.js";
import { ElementAction } from "./actions.js";
import { calculateRoleBasedScore } from "./aria.js";

const NATIVE_INPUT_WITH_NAME_SCORE = 100;
const NATIVE_INPUT_WITHOUT_NAME_SCORE = 90;

export class RadioElement
  extends AbstractElement
  implements CustomValueProvider
{
  static readonly cssSelectors = [
    'input[type="radio"]:not([disabled])',
    '[role="radio"]:not([disabled])',
  ];
  static readonly priority = 5;
  static readonly description = "Radio button for single selection from group";

  getDefaultActions(): ElementAction[] {
    return [ElementAction.CHECK];
  }

  async getConfidenceScore(): Promise<number> {
    const props = await this.elementHandle.evaluate((el: Element) => {
      const tagName = el.tagName.toLowerCase();
      const type = el.getAttribute("type");
      const role = el.getAttribute("role");
      const name = el.getAttribute("name");
      const tabindex = el.getAttribute("tabindex");
      const ariaLabel = el.getAttribute("aria-label");
      const ariaChecked = el.getAttribute("aria-checked");
      return { tagName, type, role, name, tabindex, ariaLabel, ariaChecked };
    });

    // Native radio input is most reliable
    if (props.tagName === "input" && props.type === "radio") {
      return props.name
        ? NATIVE_INPUT_WITH_NAME_SCORE
        : NATIVE_INPUT_WITHOUT_NAME_SCORE;
    }

    // Use unified ARIA scoring for role-based detection
    if (props.role === "radio") {
      return calculateRoleBasedScore("radio", props.tagName, {
        hasTabindex: Boolean(props.tabindex && props.tabindex !== "-1"),
        hasAriaLabel: Boolean(props.ariaLabel),
        hasMatchingClasses: props.ariaChecked !== null,
      });
    }

    return 0;
  }

  check(): Promise<void> {
    return this.elementHandle.check();
  }

  isChecked(): Promise<boolean> {
    return this.elementHandle.isChecked();
  }

  async getValue(): Promise<string | null> {
    try {
      return await this.elementHandle.inputValue();
    } catch {
      return null;
    }
  }

  getName(): Promise<string | null> {
    return this.elementHandle.getAttribute("name");
  }
}
