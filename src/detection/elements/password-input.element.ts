/**
 * PasswordInputElement - Represents password input fields.
 *
 * Handles input type="password" with secure text entry.
 */

import { AbstractElement } from "./abstract.element.js";
import { ElementAction } from "./actions.js";

export class PasswordInputElement extends AbstractElement {
  static readonly cssSelectors = [
    'input[type="password"]:not([disabled]):not([readonly])',
  ];
  static readonly priority = 4;
  static readonly description = "Password input field for secure text entry";

  getDefaultActions(): ElementAction[] {
    return [ElementAction.FILL, ElementAction.CLEAR];
  }

  async getConfidenceScore(): Promise<number> {
    const props = await this.elementHandle.evaluate((el) => {
      const tagName = el.tagName.toLowerCase();
      const type = (el as HTMLInputElement).type || "";
      const role = el.getAttribute("role");
      const autocomplete = el.getAttribute("autocomplete");
      const name = el.getAttribute("name")?.toLowerCase() || "";
      const id = el.getAttribute("id")?.toLowerCase() || "";
      const placeholder = el.getAttribute("placeholder")?.toLowerCase() || "";

      return { tagName, type, role, autocomplete, name, id, placeholder };
    });

    // Native password input is most reliable
    if (props.tagName === "input" && props.type === "password") {
      return 100;
    }

    // Check for password-related attributes on textbox role
    if (props.role === "textbox") {
      const passwordIndicators = [
        props.autocomplete?.includes("password"),
        props.name.includes("password") || props.name.includes("pass"),
        props.id.includes("password") || props.id.includes("pass"),
        props.placeholder.includes("password") ||
          props.placeholder.includes("pass"),
      ];

      if (passwordIndicators.some((indicator) => indicator)) {
        return 80;
      }
    }

    return 0;
  }

  fill(value: string): Promise<void> {
    return this.elementHandle.fill(value);
  }

  value(): Promise<string> {
    return this.elementHandle.inputValue();
  }

  async isPasswordVisible(): Promise<boolean> {
    return await this.elementHandle.evaluate((el) => {
      const input = el as HTMLInputElement;
      return input.type === "text";
    });
  }
}
