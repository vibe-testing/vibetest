/**
 * CheckboxElement - Represents checkbox input elements.
 *
 * Detects:
 * - Native <input type="checkbox"> elements
 * - Elements with role="checkbox"
 */

import { AbstractElement } from "./abstract.element.js";
import { ElementAction } from "./actions.js";
import { calculateRoleBasedScore } from "./aria.js";

const NATIVE_INPUT_SCORE = 100;

export class CheckboxElement extends AbstractElement {
  static readonly cssSelectors = [
    'input[type="checkbox"]:not([disabled])',
    '[role="checkbox"]:not([disabled])',
  ];
  static readonly priority = 9;
  static readonly description = "Checkbox element for user interactions";

  getDefaultActions(): ElementAction[] {
    return [ElementAction.CHECK, ElementAction.UNCHECK];
  }

  async getConfidenceScore(): Promise<number> {
    const props = await this.elementHandle.evaluate((el) => {
      const tagName = el.tagName.toLowerCase();
      const type = (el as HTMLInputElement).type || "";
      const role = el.getAttribute("role");
      const tabindex = el.getAttribute("tabindex");
      const ariaLabel = el.getAttribute("aria-label");
      const ariaChecked = el.getAttribute("aria-checked");
      return { tagName, type, role, tabindex, ariaLabel, ariaChecked };
    });

    // Native checkbox input is most reliable
    if (props.tagName === "input" && props.type === "checkbox") {
      return NATIVE_INPUT_SCORE;
    }

    // Use unified ARIA scoring for role-based detection
    if (props.role === "checkbox") {
      return calculateRoleBasedScore("checkbox", props.tagName, {
        hasTabindex: Boolean(props.tabindex && props.tabindex !== "-1"),
        hasAriaLabel: Boolean(props.ariaLabel),
        // Boost if aria-checked is present (indicates proper implementation)
        hasMatchingClasses: props.ariaChecked !== null,
      });
    }

    return 0;
  }

  check(): Promise<void> {
    return this.elementHandle.check();
  }

  uncheck(): Promise<void> {
    return this.elementHandle.uncheck();
  }

  isChecked(): Promise<boolean> {
    return this.elementHandle.isChecked();
  }
}
