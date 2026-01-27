/**
 * Element detection module exports.
 *
 * This module provides:
 * - AbstractElement base class and concrete element classes
 * - ElementAction enum for all possible element interactions
 * - ARIA role mappings and helper functions
 * - Type definitions for element cards and bounding boxes
 * - ELEMENTS array sorted by priority for detection
 */

// Element action types
export { ElementAction } from "./actions.js";

// ARIA knowledge module
export {
  ARIA_ROLE_MAP,
  type AriaRole,
  type AriaRoleInfo,
  isSupportedAriaRole,
  isAriaRole,
  getAriaRoleInfo,
  getDefaultActionsForRole,
  getBaseScoreForRole,
  isRoleInteractive,
  getInteractiveRoles,
  isTagImplicitForRole,
  calculateRoleBasedScore,
  getImplicitRoleForTag,
} from "./aria.js";

// Type definitions
export type { BoundingBoxDto, ElementCardDto } from "./types.js";

// Abstract element base class
export {
  AbstractElement,
  type CustomValueProvider,
  type CustomHrefProvider,
  type EventTypesProvider,
} from "./abstract.element.js";

// Concrete element classes
export { ButtonElement } from "./button.element.js";
export { TextInputElement } from "./text-input.element.js";
export { TextareaElement } from "./textarea.element.js";
export { CheckboxElement } from "./checkbox.element.js";
export { RadioElement } from "./radio.element.js";
export { SelectElement } from "./select.element.js";
export { HyperlinkElement } from "./hyperlink.element.js";
export { InteractableElement } from "./interactable.element.js";
// New element classes
export { PasswordInputElement } from "./password-input.element.js";
export { NumberInputElement } from "./number-input.element.js";
export { DateInputElement } from "./date-input.element.js";
export { FileInputElement } from "./file-input.element.js";
export { RangeInputElement } from "./range-input.element.js";
export { ColorInputElement } from "./color-input.element.js";

// Import for ELEMENTS array
import { AbstractElement } from "./abstract.element.js";
import { ButtonElement } from "./button.element.js";
import { TextInputElement } from "./text-input.element.js";
import { TextareaElement } from "./textarea.element.js";
import { CheckboxElement } from "./checkbox.element.js";
import { RadioElement } from "./radio.element.js";
import { SelectElement } from "./select.element.js";
import { HyperlinkElement } from "./hyperlink.element.js";
import { InteractableElement } from "./interactable.element.js";
import { PasswordInputElement } from "./password-input.element.js";
import { NumberInputElement } from "./number-input.element.js";
import { DateInputElement } from "./date-input.element.js";
import { FileInputElement } from "./file-input.element.js";
import { RangeInputElement } from "./range-input.element.js";
import { ColorInputElement } from "./color-input.element.js";

/**
 * Type for element class constructors with required static properties.
 */
export interface ElementClass {
  readonly cssSelectors: string[];
  readonly priority: number;
  readonly description: string;
  new (
    elementHandle: import("playwright").ElementHandle<HTMLElement | SVGElement>,
  ): AbstractElement;
}

/**
 * Array of all element classes sorted by priority (lowest to highest).
 *
 * Lower priority numbers are more specific (e.g., ButtonElement with priority 9
 * is more specific than InteractableElement with priority 10). During deduplication,
 * when multiple element types match the same DOM element, we prefer the one with
 * lower priority (more specific classification).
 *
 * Priority values (14 element types total):
 * - 10: InteractableElement (catch-all for elements with event listeners)
 * - 9: ButtonElement, CheckboxElement (primary interactive elements)
 * - 8: HyperlinkElement (navigation)
 * - 5: RadioElement (radio button selection)
 * - 4: PasswordInputElement (secure text entry)
 * - 3: TextInputElement, NumberInputElement, DateInputElement (text/numeric inputs)
 * - 2: SelectElement, TextareaElement, FileInputElement, RangeInputElement, ColorInputElement (specialized inputs)
 */
export const ELEMENTS: ElementClass[] = [
  // Sorted by priority (lowest first = most specific)
  // Priority 2 - Specialized input elements
  SelectElement,
  TextareaElement,
  FileInputElement,
  RangeInputElement,
  ColorInputElement,
  // Priority 3 - Text and numeric inputs
  TextInputElement,
  NumberInputElement,
  DateInputElement,
  // Priority 4 - Password inputs
  PasswordInputElement,
  // Priority 5 - Radio buttons
  RadioElement,
  // Priority 8 - Navigation
  HyperlinkElement,
  // Priority 9 - Primary interactive elements
  ButtonElement,
  CheckboxElement,
  // Priority 10 - Catch-all
  InteractableElement,
];
