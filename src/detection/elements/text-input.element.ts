/**
 * TextInputElement - Represents text-based input fields.
 *
 * Handles input types: text, email, tel, url, search
 * These share similar interaction patterns (fill, clear, type).
 */

import { AbstractElement } from "./abstract.element.js";
import { ElementAction } from "./actions.js";

export class TextInputElement extends AbstractElement {
  static readonly cssSelectors = [
    // Standard text inputs
    'input[type="text"]:not([disabled]):not([readonly])',
    "input:not([type]):not([disabled]):not([readonly])",
    // Email, tel, url, search - same interaction pattern as text
    'input[type="email"]:not([disabled]):not([readonly])',
    'input[type="tel"]:not([disabled]):not([readonly])',
    'input[type="url"]:not([disabled]):not([readonly])',
    'input[type="search"]:not([disabled]):not([readonly])',
    // ARIA roles
    '[role="textbox"]:not([disabled]):not([readonly])',
    '[role="searchbox"]:not([disabled]):not([readonly])',
  ];
  static readonly priority = 3;
  static readonly description =
    "Text input field for text, email, tel, url, and search entry";

  getDefaultActions(): ElementAction[] {
    return [
      ElementAction.TYPE,
      ElementAction.FILL,
      ElementAction.CLEAR,
      ElementAction.FOCUS,
      ElementAction.BLUR,
    ];
  }

  async getConfidenceScore(): Promise<number> {
    const props = await this.elementHandle.evaluate((el) => {
      const tagName = el.tagName.toLowerCase();
      const type = (el as HTMLInputElement).type || "";
      const role = el.getAttribute("role");
      return { tagName, type, role };
    });

    // Native text-like input types
    const textLikeTypes = ["text", "", "email", "tel", "url", "search"];
    if (props.tagName === "input" && textLikeTypes.includes(props.type)) {
      return 100;
    }

    // ARIA textbox/searchbox roles
    if (props.role === "textbox" || props.role === "searchbox") {
      return 80;
    }

    return 0;
  }

  fill(value: string): Promise<void> {
    return this.elementHandle.fill(value);
  }

  value(): Promise<string> {
    return this.elementHandle.inputValue();
  }

  async clear(): Promise<void> {
    await this.elementHandle.fill("");
  }

  async submitByEnter(): Promise<void> {
    await this.elementHandle.press("Enter");
  }
}
