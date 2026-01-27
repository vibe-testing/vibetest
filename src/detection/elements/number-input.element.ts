/**
 * NumberInputElement - Represents numeric input fields.
 *
 * Handles input type="number" and role="spinbutton" with
 * increment/decrement controls.
 */

import { AbstractElement } from "./abstract.element.js";
import { ElementAction } from "./actions.js";
import { calculateRoleBasedScore } from "./aria.js";

const NATIVE_INPUT_SCORE = 100;

export class NumberInputElement extends AbstractElement {
  static readonly cssSelectors = [
    'input[type="number"]:not([disabled]):not([readonly])',
    "[role=\"spinbutton\"]:not([disabled])",
  ];
  static readonly priority = 3;
  static readonly description =
    "Numeric input field with increment/decrement controls";

  getDefaultActions(): ElementAction[] {
    return [
      ElementAction.FILL,
      ElementAction.INCREMENT,
      ElementAction.DECREMENT,
      ElementAction.CLEAR,
      ElementAction.FOCUS,
      ElementAction.BLUR,
    ];
  }

  async getConfidenceScore(): Promise<number> {
    const props = await this.elementHandle.evaluate((el: Element) => {
      const tagName = el.tagName.toLowerCase();
      const type = (el as HTMLInputElement).type || "";
      const role = el.getAttribute("role");
      const tabindex = el.getAttribute("tabindex");
      const ariaLabel = el.getAttribute("aria-label");
      const ariaValueNow = el.hasAttribute("aria-valuenow");
      return { tagName, type, role, tabindex, ariaLabel, ariaValueNow };
    });

    // Native number input is most reliable
    if (props.tagName === "input" && props.type === "number") {
      return NATIVE_INPUT_SCORE;
    }

    // Use unified ARIA scoring for role-based detection
    if (props.role === "spinbutton") {
      return calculateRoleBasedScore("spinbutton", props.tagName, {
        hasTabindex: Boolean(props.tabindex && props.tabindex !== "-1"),
        hasAriaLabel: Boolean(props.ariaLabel),
        // Boost if aria-valuenow is present (indicates proper spinbutton implementation)
        hasMatchingClasses: props.ariaValueNow,
      });
    }

    return 0;
  }

  fill(value: string): Promise<void> {
    return this.elementHandle.fill(value);
  }

  value(): Promise<string> {
    return this.elementHandle.inputValue();
  }

  async numericValue(): Promise<number | null> {
    const val = await this.value();
    if (!val || val.trim() === "") {
      return null;
    }
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
  }

  async increment(): Promise<void> {
    await this.elementHandle.press("ArrowUp");
  }

  async decrement(): Promise<void> {
    await this.elementHandle.press("ArrowDown");
  }

  async getMin(): Promise<number | null> {
    const minAttr = await this.elementHandle.getAttribute("min");
    if (!minAttr) {
      return null;
    }
    const parsed = parseFloat(minAttr);
    return isNaN(parsed) ? null : parsed;
  }

  async getMax(): Promise<number | null> {
    const maxAttr = await this.elementHandle.getAttribute("max");
    if (!maxAttr) {
      return null;
    }
    const parsed = parseFloat(maxAttr);
    return isNaN(parsed) ? null : parsed;
  }

  async getStep(): Promise<number> {
    const stepAttr = await this.elementHandle.getAttribute("step");
    if (!stepAttr) {
      return 1;
    }
    const parsed = parseFloat(stepAttr);
    return isNaN(parsed) || parsed <= 0 ? 1 : parsed;
  }
}
