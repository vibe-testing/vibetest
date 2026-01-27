/**
 * Abstract base class for all detected interactive elements.
 *
 * This provides common functionality for element interaction:
 * - XPath generation for unique identification
 * - Visibility and enabled state checking
 * - Basic actions (click, hover, focus, blur)
 * - Confidence scoring for element classification
 *
 * Simplified from original for CLI usage - removed NestJS Logger and DTOs.
 */

import type {
  ElementHandle,
  LocatorScreenshotOptions,
  Page,
} from "playwright";

import { ElementAction } from "./actions.js";
import type { BoundingBoxDto, ElementCardDto } from "./types.js";
import {
  getBrowserBundle,
  getDefaultConfig,
  type SelectorResult,
} from "../xpath/index.js";

/**
 * Interface for elements that provide custom value extraction.
 */
export interface CustomValueProvider {
  getValue?(): Promise<string | null>;
}

/**
 * Interface for elements that provide custom href extraction.
 */
export interface CustomHrefProvider {
  getHref?(): Promise<string | null>;
}

/**
 * Interface for elements that provide event types (e.g., InteractableElement).
 */
export interface EventTypesProvider {
  getEventTypes?(): Promise<string[]>;
}

/**
 * Abstract base class for interactive elements.
 * Subclasses must implement static properties and abstract methods.
 */
export abstract class AbstractElement {
  // Static properties that subclasses should implement
  static readonly priority: number;
  static readonly cssSelectors: string[];
  static readonly description: string;

  // Abstract methods that subclasses must implement
  abstract getDefaultActions(): ElementAction[];

  /**
   * Returns a confidence score (0-100) indicating how certain we are that this
   * element matches its declared type. For example, a <button> tag would score
   * 100 for ButtonElement, while a div with role="button" might score 70-80.
   */
  abstract getConfidenceScore(): Promise<number>;

  // Internal properties
  protected cachedXPath: string | null = null;

  constructor(
    public readonly elementHandle: ElementHandle<HTMLElement | SVGElement>,
  ) {}

  /**
   * Static validation method to check if an element matches this element type.
   */
  static async validate(
    this: { cssSelectors: string[] },
    elementHandle: ElementHandle<HTMLElement | SVGElement>,
  ): Promise<boolean> {
    for (const cssSelector of this.cssSelectors) {
      const matches = await elementHandle.evaluate(
        (el, selector) => el.matches(selector),
        cssSelector,
      );
      if (matches) {
        return true;
      }
    }
    return false;
  }

  /**
   * Disposes of the element handle to release browser resources.
   */
  async dispose(): Promise<void> {
    try {
      await this.elementHandle.dispose();
    } catch {
      // Element may already be disposed or detached - ignore
    }
    this.cachedXPath = null;
  }

  /**
   * Disposes of multiple elements in parallel.
   */
  static async disposeAll(elements: AbstractElement[]): Promise<void> {
    await Promise.all(elements.map((el) => el.dispose()));
  }

  // ==========================================================================
  // State Checking Methods
  // ==========================================================================

  async isVisible(): Promise<boolean> {
    try {
      return await this.elementHandle.isVisible();
    } catch {
      return false;
    }
  }

  async isEnabled(): Promise<boolean> {
    try {
      return await this.elementHandle.isEnabled();
    } catch {
      return false;
    }
  }

  async isHidden(): Promise<boolean> {
    return !(await this.isVisible());
  }

  async isDisabled(): Promise<boolean> {
    return !(await this.isEnabled());
  }

  // ==========================================================================
  // Basic Actions
  // ==========================================================================

  click(button: "left" | "right" | "middle" = "left"): Promise<void> {
    return this.elementHandle.click({ button });
  }

  text(): Promise<string> {
    return this.elementHandle.innerText();
  }

  hover(): Promise<void> {
    return this.elementHandle.hover();
  }

  focus(): Promise<void> {
    return this.elementHandle.focus();
  }

  blur(): Promise<void> {
    return this.elementHandle.evaluate((el) => el.blur());
  }

  screenshot(options?: LocatorScreenshotOptions): Promise<Buffer> {
    return this.elementHandle.screenshot(options);
  }

  // ==========================================================================
  // XPath Generation
  // ==========================================================================

  async getXPath(): Promise<string | null> {
    if (this.cachedXPath) {
      return this.cachedXPath;
    }

    // Use the pre-built generator bundle from the xpath module
    const bundleScript = await getBrowserBundle();
    const config = getDefaultConfig();

    const result = await this.elementHandle.evaluate(
      (el, args: { bundleScript: string; config: unknown }) => {
        // Type for the xpath bundle that gets injected into window
        interface XPathBundleWindow {
          __xpathBundle?: {
            browserXPathGenerator: (
              el: Element,
              config: unknown,
            ) => SelectorResult;
          };
        }

        const win = window as unknown as XPathBundleWindow;
        if (!win.__xpathBundle) {
          // Execute bundle and assign to window
          const FunctionConstructor = Function;
          win.__xpathBundle = FunctionConstructor(
            args.bundleScript + "; return __xpathBundle;",
          )() as XPathBundleWindow["__xpathBundle"];
        }

        return win.__xpathBundle!.browserXPathGenerator(el, args.config);
      },
      { bundleScript, config },
    );

    this.cachedXPath = result ? result.selector : null;
    return this.cachedXPath;
  }

  // ==========================================================================
  // Shadow DOM Support
  // ==========================================================================

  async isInShadowDom(): Promise<boolean> {
    try {
      return await this.elementHandle.evaluate((el) => {
        return el.getRootNode() instanceof ShadowRoot;
      });
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Form Context
  // ==========================================================================

  isInForm(): Promise<boolean> {
    return this.elementHandle.evaluate((el) => el.closest("form") !== null);
  }

  async getAssociatedLabel(): Promise<string | null> {
    try {
      return await this.elementHandle.evaluate((el) => {
        // Check for explicit label via 'for' attribute
        const id = el.id;
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label) {
            return label.textContent?.trim() || null;
          }
        }

        // Check for implicit label (element wrapped in label)
        const parentLabel = el.closest("label");
        if (parentLabel) {
          const clone = parentLabel.cloneNode(true) as HTMLElement;
          const inputs = clone.querySelectorAll(
            "input, select, textarea, button",
          );
          inputs.forEach((input) => input.remove());
          return clone.textContent?.trim() || null;
        }

        // Check aria-labelledby
        const labelledBy = el.getAttribute("aria-labelledby");
        if (labelledBy) {
          const labelIds = labelledBy.split(/\s+/);
          const labelTexts = labelIds
            .map((labelId) => {
              const labelEl = document.getElementById(labelId);
              return labelEl?.textContent?.trim() || "";
            })
            .filter(Boolean);
          if (labelTexts.length > 0) {
            return labelTexts.join(" ");
          }
        }

        // Check aria-label as fallback
        const ariaLabel = el.getAttribute("aria-label");
        if (ariaLabel) {
          return ariaLabel.trim();
        }

        return null;
      });
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // Element Card Generation
  // ==========================================================================

  /**
   * Generates a comprehensive "card" with all metadata about this element.
   */
  async getElementCard(
    includeScreenshotCrop = false,
    cropPadding = 5,
    page?: Page,
  ): Promise<ElementCardDto> {
    const [
      xpath,
      visible,
      enabled,
      innerText,
      tagName,
      role,
      ariaLabel,
      title,
      placeholder,
      type,
      href,
      value,
      boundingBox,
      eventTypes,
      confidenceScore,
    ] = await Promise.all([
      this.getXPath(),
      this.isVisible(),
      this.isEnabled(),
      this.getInnerText(),
      this.getTagName(),
      this.getRole(),
      this.getAriaLabel(),
      this.getTitle(),
      this.getPlaceholder(),
      this.getType(),
      this.getHrefAttribute(),
      this.getValueAttribute(),
      this.getBoundingBox(),
      this.getEventTypesAttribute(),
      this.getConfidenceScore(),
    ]);

    const elementCard: ElementCardDto = {
      elementType: this.constructor.name,
      selector: xpath || "",
      tagName,
      role,
      innerText: innerText?.trim(),
      ariaLabel,
      title,
      placeholder,
      type,
      href,
      value,
      visible,
      enabled,
      boundingBox,
      eventTypes,
      confidenceScore,
    };

    if (includeScreenshotCrop && visible && boundingBox && page) {
      try {
        const viewportSize = page.viewportSize();
        const safePadding = Math.max(0, cropPadding);
        const cropX = Math.max(0, boundingBox.x - safePadding);
        const cropY = Math.max(0, boundingBox.y - safePadding);
        const maxWidth = viewportSize
          ? viewportSize.width - cropX
          : boundingBox.width + safePadding * 2;
        const maxHeight = viewportSize
          ? viewportSize.height - cropY
          : boundingBox.height + safePadding * 2;

        const cropWidth = Math.min(
          boundingBox.width + safePadding * 2,
          maxWidth,
        );
        const cropHeight = Math.min(
          boundingBox.height + safePadding * 2,
          maxHeight,
        );

        const screenshotBuffer = await page.screenshot({
          clip: {
            x: cropX,
            y: cropY,
            width: cropWidth,
            height: cropHeight,
          },
        });

        elementCard.screenshotCrop = screenshotBuffer.toString("base64");
      } catch {
        // Screenshot failed - proceed without it
      }
    }

    return elementCard;
  }

  // Private helper methods for getElementCard

  private async getInnerText(): Promise<string | undefined> {
    try {
      const text = await this.elementHandle.innerText();
      return text || undefined;
    } catch {
      return undefined;
    }
  }

  private async getTagName(): Promise<string> {
    try {
      return await this.elementHandle.evaluate((el) =>
        el.tagName.toLowerCase(),
      );
    } catch {
      return "unknown";
    }
  }

  private async getRole(): Promise<string | undefined> {
    try {
      return (await this.elementHandle.getAttribute("role")) || undefined;
    } catch {
      return undefined;
    }
  }

  private async getAriaLabel(): Promise<string | undefined> {
    try {
      return (
        (await this.elementHandle.getAttribute("aria-label")) || undefined
      );
    } catch {
      return undefined;
    }
  }

  private async getTitle(): Promise<string | undefined> {
    try {
      return (await this.elementHandle.getAttribute("title")) || undefined;
    } catch {
      return undefined;
    }
  }

  private async getPlaceholder(): Promise<string | undefined> {
    try {
      return (
        (await this.elementHandle.getAttribute("placeholder")) || undefined
      );
    } catch {
      return undefined;
    }
  }

  private async getType(): Promise<string | undefined> {
    try {
      return (await this.elementHandle.getAttribute("type")) || undefined;
    } catch {
      return undefined;
    }
  }

  private async getHrefAttribute(): Promise<string | undefined> {
    try {
      // Check if this element implements CustomHrefProvider
      if (this.constructor !== AbstractElement) {
        const provider = this as unknown as CustomHrefProvider;
        if (provider.getHref) {
          return (await provider.getHref()) || undefined;
        }
      }
      return (await this.elementHandle.getAttribute("href")) || undefined;
    } catch {
      return undefined;
    }
  }

  private async getValueAttribute(): Promise<string | undefined> {
    try {
      // Check if this element implements CustomValueProvider
      if (this.constructor !== AbstractElement) {
        const provider = this as unknown as CustomValueProvider;
        if (provider.getValue) {
          return (await provider.getValue()) || undefined;
        }
      }
      return (await this.elementHandle.inputValue()) || undefined;
    } catch {
      // Not all elements support inputValue
      return undefined;
    }
  }

  private async getEventTypesAttribute(): Promise<string[] | undefined> {
    try {
      if (this.constructor !== AbstractElement) {
        const provider = this as unknown as EventTypesProvider;
        if (provider.getEventTypes) {
          const eventTypes = await provider.getEventTypes();
          return eventTypes.length > 0 ? eventTypes : undefined;
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private async getBoundingBox(): Promise<BoundingBoxDto | undefined> {
    try {
      const box = await this.elementHandle.boundingBox();
      if (!box) return undefined;

      return {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      };
    } catch {
      return undefined;
    }
  }
}
