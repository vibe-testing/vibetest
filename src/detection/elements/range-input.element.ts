/**
 * RangeInputElement - Represents range slider input fields.
 *
 * Handles input type="range" and role="slider" for numeric value selection.
 */

import { AbstractElement } from "./abstract.element.js";
import { ElementAction } from "./actions.js";
import { calculateRoleBasedScore } from "./aria.js";

const NATIVE_INPUT_SCORE = 100;

export class RangeInputElement extends AbstractElement {
  static readonly cssSelectors = [
    'input[type="range"]:not([disabled])',
    "[role=\"slider\"]:not([disabled])",
  ];
  static readonly priority = 2;
  static readonly description = "Range slider input for numeric values";

  getDefaultActions(): ElementAction[] {
    return [
      ElementAction.FILL,
      ElementAction.INCREMENT,
      ElementAction.DECREMENT,
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

    // Native range input is most reliable
    if (props.tagName === "input" && props.type === "range") {
      return NATIVE_INPUT_SCORE;
    }

    // Use unified ARIA scoring for role-based detection
    if (props.role === "slider") {
      return calculateRoleBasedScore("slider", props.tagName, {
        hasTabindex: Boolean(props.tabindex && props.tabindex !== "-1"),
        hasAriaLabel: Boolean(props.ariaLabel),
        // Boost if aria-valuenow is present (indicates proper slider implementation)
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
    try {
      const val = await this.value();
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    } catch {
      return null;
    }
  }

  async getMin(): Promise<number> {
    try {
      return await this.elementHandle.evaluate((el) => {
        const input = el as HTMLInputElement;
        const min = input.min;
        return min ? parseFloat(min) : 0;
      });
    } catch {
      return 0;
    }
  }

  async getMax(): Promise<number> {
    try {
      return await this.elementHandle.evaluate((el) => {
        const input = el as HTMLInputElement;
        const max = input.max;
        return max ? parseFloat(max) : 100;
      });
    } catch {
      return 100;
    }
  }

  async getStep(): Promise<number> {
    try {
      return await this.elementHandle.evaluate((el) => {
        const input = el as HTMLInputElement;
        const step = input.step;
        return step && step !== "any" ? parseFloat(step) : 1;
      });
    } catch {
      return 1;
    }
  }

  async setValueByPercentage(percent: number): Promise<void> {
    if (percent < 0 || percent > 100) {
      throw new Error("Percentage must be between 0 and 100");
    }

    try {
      const [min, max] = await Promise.all([this.getMin(), this.getMax()]);
      const range = max - min;
      const targetValue = min + (range * percent) / 100;
      await this.fill(targetValue.toString());
    } catch (error) {
      throw error;
    }
  }
}
