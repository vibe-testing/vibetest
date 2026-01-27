/**
 * HyperlinkElement - Represents anchor/link elements.
 *
 * Detects:
 * - Native <a> elements
 * - Elements with role="link"
 * - Elements with .link class (lower confidence)
 */

import { AbstractElement, type CustomHrefProvider } from "./abstract.element.js";
import { ElementAction } from "./actions.js";
import { calculateRoleBasedScore } from "./aria.js";

const NATIVE_TAG_SCORE = 100;
const TAG_WITHOUT_HREF_SCORE = 90;
const CLASS_ONLY_SCORE = 40;

export class HyperlinkElement
  extends AbstractElement
  implements CustomHrefProvider
{
  static readonly cssSelectors = ["a", '[role="link"]', ".link"];
  static readonly priority = 8;
  static readonly description = "Hyperlink element";

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
      const href = el.getAttribute("href");
      const role = el.getAttribute("role");
      const tabindex = el.getAttribute("tabindex");
      const ariaLabel = el.getAttribute("aria-label");
      const classList = Array.from(el.classList);
      const computedStyle = window.getComputedStyle(el);
      const hasPointerCursor = computedStyle.cursor === "pointer";
      return {
        classList,
        tagName,
        href,
        role,
        tabindex,
        ariaLabel,
        hasPointerCursor,
      };
    });

    // Native anchor tag is most reliable
    if (props.tagName === "a") {
      return props.href ? NATIVE_TAG_SCORE : TAG_WITHOUT_HREF_SCORE;
    }

    // Use unified ARIA scoring for role-based detection
    if (props.role === "link") {
      return calculateRoleBasedScore("link", props.tagName, {
        hasTabindex: Boolean(props.tabindex && props.tabindex !== "-1"),
        hasAriaLabel: Boolean(props.ariaLabel),
        hasMatchingClasses: props.classList.includes("link"),
      });
    }

    // Class-based detection only
    if (props.classList.includes("link")) {
      if (props.hasPointerCursor && props.tabindex) {
        return CLASS_ONLY_SCORE + 15;
      }
      return CLASS_ONLY_SCORE;
    }

    return 0;
  }

  async getHref(): Promise<string | null> {
    return (await this.elementHandle.getAttribute("href")) || null;
  }

  async getTarget(): Promise<string> {
    return (await this.elementHandle.getAttribute("target")) || "_self";
  }

  async getText(): Promise<string> {
    const ariaLabel = await this.elementHandle.getAttribute("aria-label");
    if (ariaLabel) {
      return ariaLabel;
    }
    return (await this.elementHandle.innerText()).trim();
  }
}
