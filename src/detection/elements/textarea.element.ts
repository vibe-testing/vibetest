/**
 * TextareaElement - Represents multi-line text input areas.
 *
 * Detects:
 * - Native <textarea> elements
 */

import { AbstractElement, type CustomValueProvider } from "./abstract.element.js";
import { ElementAction } from "./actions.js";

export class TextareaElement
  extends AbstractElement
  implements CustomValueProvider
{
  static readonly cssSelectors = ["textarea:not([disabled]):not([readonly])"];
  static readonly priority = 2;
  static readonly description = "Multi-line text input area";

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
      const role = el.getAttribute("role");
      const isReadonly = el.hasAttribute("readonly");
      const isDisabled = el.hasAttribute("disabled");
      return { tagName, role, isReadonly, isDisabled };
    });

    // Native textarea element is most reliable
    if (props.tagName === "textarea") {
      if (!props.isReadonly && !props.isDisabled) {
        return 100;
      }
      return 60;
    }

    // Role=textbox with multiline is less common but valid
    if (props.role === "textbox") {
      return 70;
    }

    return 0;
  }

  fill(value: string): Promise<void> {
    return this.elementHandle.fill(value);
  }

  async getValue(): Promise<string | null> {
    try {
      return await this.elementHandle.inputValue();
    } catch {
      return null;
    }
  }

  async clear(): Promise<void> {
    await this.elementHandle.fill("");
  }
}
