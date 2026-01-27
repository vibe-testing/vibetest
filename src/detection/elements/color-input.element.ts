/**
 * ColorInputElement - Represents color picker input fields.
 *
 * Handles input type="color" for color selection.
 */

import { AbstractElement, type CustomValueProvider } from "./abstract.element.js";
import { ElementAction } from "./actions.js";

export class ColorInputElement
  extends AbstractElement
  implements CustomValueProvider
{
  static readonly cssSelectors = ['input[type="color"]:not([disabled])'];
  static readonly priority = 2;
  static readonly description = "Color picker input field";

  getDefaultActions(): ElementAction[] {
    return [ElementAction.FILL, ElementAction.CLICK, ElementAction.FOCUS];
  }

  async getConfidenceScore(): Promise<number> {
    const props = await this.elementHandle.evaluate((el) => {
      const tagName = el.tagName.toLowerCase();
      const type = (el as HTMLInputElement).type || "";
      const name = (el as HTMLInputElement).name || "";
      const ariaLabel = el.getAttribute("aria-label") || "";
      return { tagName, type, name, ariaLabel };
    });

    // Native color input
    if (props.tagName === "input" && props.type === "color") {
      return 100;
    }

    // Check for color-related attributes
    const colorPattern = /color|colour|hex/i;
    if (
      props.tagName === "input" &&
      (colorPattern.test(props.name) || colorPattern.test(props.ariaLabel))
    ) {
      return 60;
    }

    return 0;
  }

  /**
   * Set the color value. Accepts hex color strings (e.g., '#ff0000').
   */
  fill(value: string): Promise<void> {
    return this.elementHandle.fill(value);
  }

  /**
   * Get the current color value as hex string.
   */
  async getValue(): Promise<string> {
    return this.elementHandle.inputValue();
  }

  /**
   * Get the color as RGB components.
   */
  async getRgb(): Promise<{ r: number; g: number; b: number } | null> {
    const hex = await this.getValue();
    if (!hex || !hex.startsWith("#") || hex.length !== 7) {
      return null;
    }

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return null;
    }

    return { r, g, b };
  }

  /**
   * Get the color as HSL components.
   */
  async getHsl(): Promise<{ h: number; s: number; l: number } | null> {
    const rgb = await this.getRgb();
    if (!rgb) {
      return null;
    }

    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
      return { h: 0, s: 0, l: Math.round(l * 100) };
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h: number;
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }
}
