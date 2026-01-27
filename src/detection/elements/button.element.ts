/**
 * ButtonElement - Represents interactive button elements.
 *
 * Detects:
 * - Native <button> elements
 * - Input elements with type button/submit/reset
 * - Elements with role="button"
 * - Elements with button-like CSS classes (.btn, .button)
 */

import { AbstractElement } from "./abstract.element.js";
import { ElementAction } from "./actions.js";
import { calculateRoleBasedScore } from "./aria.js";

const NATIVE_TAG_SCORE = 100;
const INPUT_TAG_SCORE = 95;
const CLASS_ONLY_SCORE = 50;

export class ButtonElement extends AbstractElement {
  static readonly cssSelectors = [
    // Native button elements
    "button:not([disabled])",
    // Input elements that act as buttons
    'input[type="button"]:not([disabled])',
    'input[type="submit"]:not([disabled])',
    'input[type="reset"]:not([disabled])',
    '[role="button"]:not([disabled])',
    // Class-based button selectors
    ".btn:not([disabled])",
    ".button:not([disabled])",
  ];
  static readonly priority = 9;
  static readonly description = "Standard button element for user interactions";

  getDefaultActions(): ElementAction[] {
    return [
      ElementAction.CLICK,
      ElementAction.HOVER,
      ElementAction.FOCUS,
      ElementAction.BLUR,
    ];
  }

  async getConfidenceScore(): Promise<number> {
    const props = await this.elementHandle.evaluate((el) => {
      const tagName = el.tagName.toLowerCase();
      const role = el.getAttribute("role");
      const tabindex = el.getAttribute("tabindex");
      const classList = Array.from(el.classList).map((v) => v.toLowerCase());
      return { tagName, role, tabindex, classList };
    });

    // Native button tag is most reliable
    if (props.tagName === "button") {
      return NATIVE_TAG_SCORE;
    }

    // Input elements acting as buttons
    if (props.tagName === "input") {
      return INPUT_TAG_SCORE;
    }

    const hasButtonClass =
      props.classList.includes("btn") || props.classList.includes("button");

    // Use ARIA module for role-based scoring
    if (props.role === "button") {
      return calculateRoleBasedScore("button", props.tagName, {
        hasTabindex: Boolean(props.tabindex && props.tabindex !== "-1"),
        hasMatchingClasses: hasButtonClass,
      });
    }

    // Class-based detection only
    if (hasButtonClass) {
      return CLASS_ONLY_SCORE;
    }

    return 0;
  }
}
