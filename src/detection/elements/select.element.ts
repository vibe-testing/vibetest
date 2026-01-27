/**
 * SelectElement - Represents dropdown/select elements.
 *
 * Detects:
 * - Native <select> elements
 * - Elements with role="listbox" or role="combobox"
 */

import { AbstractElement, type CustomValueProvider } from "./abstract.element.js";
import { ElementAction } from "./actions.js";
import { calculateRoleBasedScore } from "./aria.js";

const NATIVE_SELECT_SCORE = 100;

export class SelectElement
  extends AbstractElement
  implements CustomValueProvider
{
  static readonly cssSelectors = [
    "select:not([disabled])",
    '[role="listbox"]:not([disabled])',
    '[role="combobox"]:not([disabled])',
  ];
  static readonly priority = 2;
  static readonly description = "Dropdown selection element";

  getDefaultActions(): ElementAction[] {
    return [ElementAction.SELECT_OPTION];
  }

  async getConfidenceScore(): Promise<number> {
    const props = await this.elementHandle.evaluate((el: Element) => {
      const tagName = el.tagName.toLowerCase();
      const role = el.getAttribute("role");
      const tabindex = el.getAttribute("tabindex");
      const ariaLabel = el.getAttribute("aria-label");
      const ariaExpanded = el.hasAttribute("aria-expanded");
      return { tagName, role, tabindex, ariaLabel, ariaExpanded };
    });

    // Native select is most reliable
    if (props.tagName === "select") {
      return NATIVE_SELECT_SCORE;
    }

    // Use unified ARIA scoring for role-based detection
    if (props.role === "listbox" || props.role === "combobox") {
      return calculateRoleBasedScore(props.role, props.tagName, {
        hasTabindex: Boolean(props.tabindex && props.tabindex !== "-1"),
        hasAriaLabel: Boolean(props.ariaLabel),
        hasMatchingClasses: props.ariaExpanded,
      });
    }

    return 0;
  }

  async select(
    {
      value,
      label,
      index,
    }: {
      value?: string;
      label?: string;
      index?: number;
    },
    timeout = 100,
  ): Promise<string[]> {
    try {
      return await this.elementHandle.selectOption(
        { value, label, index },
        { timeout },
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("Timeout")) {
        throw new Error("Option not found");
      }
      throw error;
    }
  }

  async getValue(): Promise<string | null> {
    try {
      return await this.elementHandle.inputValue();
    } catch {
      return null;
    }
  }
}
