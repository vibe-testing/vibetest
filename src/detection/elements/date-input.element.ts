/**
 * DateInputElement - Represents date/time picker input fields.
 *
 * Handles input types: date, datetime-local, time, month, week
 */

import { AbstractElement } from "./abstract.element.js";
import { ElementAction } from "./actions.js";

export class DateInputElement extends AbstractElement {
  static readonly cssSelectors = [
    'input[type="date"]:not([disabled]):not([readonly])',
    'input[type="datetime-local"]:not([disabled]):not([readonly])',
    'input[type="time"]:not([disabled]):not([readonly])',
    'input[type="month"]:not([disabled]):not([readonly])',
    'input[type="week"]:not([disabled]):not([readonly])',
  ];
  static readonly priority = 3;
  static readonly description = "Date/time picker input field";

  getDefaultActions(): ElementAction[] {
    return [
      ElementAction.FILL,
      ElementAction.OPEN_PICKER,
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
      // Feature detection for custom date pickers (combobox/textbox with popup)
      const hasPopup = el.getAttribute("aria-haspopup");
      const hasExpanded = el.hasAttribute("aria-expanded");
      const hasControls = el.hasAttribute("aria-controls");
      // Check for common date picker patterns in data attributes or classes
      const className =
        el instanceof HTMLElement ? el.className.toLowerCase() : "";
      const hasDatePattern =
        el.hasAttribute("data-date") ||
        el.hasAttribute("data-datepicker") ||
        el.hasAttribute("data-datetime") ||
        className.includes("date") ||
        className.includes("calendar");
      return {
        tagName,
        type,
        role,
        hasPopup,
        hasExpanded,
        hasControls,
        hasDatePattern,
      };
    });

    // Native date/time input types - highest confidence
    if (
      props.tagName === "input" &&
      ["date", "datetime-local", "time", "month", "week"].includes(props.type)
    ) {
      return 100;
    }

    // Custom date picker detection via features (combobox/textbox with date-related popup)
    // These are typically implemented as combobox or textbox with aria-haspopup
    if (
      (props.role === "combobox" || props.role === "textbox") &&
      (props.hasPopup === "dialog" ||
        props.hasPopup === "grid" ||
        props.hasPopup === "listbox") &&
      props.hasDatePattern
    ) {
      return 65; // Lower confidence - custom widget
    }

    // Data attribute or class-based detection (least reliable)
    if (props.hasDatePattern && (props.hasExpanded || props.hasControls)) {
      return 55;
    }

    return 0;
  }

  fill(value: string): Promise<void> {
    return this.elementHandle.fill(value);
  }

  value(): Promise<string> {
    return this.elementHandle.inputValue();
  }

  async getInputType(): Promise<string> {
    return await this.elementHandle.evaluate((el) => {
      return (el as HTMLInputElement).type || "text";
    });
  }

  async getMin(): Promise<string | null> {
    return await this.elementHandle.evaluate((el) => {
      return (el as HTMLInputElement).min || null;
    });
  }

  async getMax(): Promise<string | null> {
    return await this.elementHandle.evaluate((el) => {
      return (el as HTMLInputElement).max || null;
    });
  }
}
