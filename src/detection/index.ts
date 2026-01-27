/**
 * Detection Module
 *
 * Provides element detection capabilities for finding and classifying
 * interactive elements on web pages.
 *
 * ## Usage
 *
 * ```typescript
 * import { detectElements, AbstractElement } from './detection';
 *
 * const elements = await detectElements(page);
 * for (const element of elements) {
 *   console.log(element.constructor.name, await element.getXPath());
 * }
 * ```
 */

// Main detection functions
export {
  detectElements,
  detectElementsAsCards,
  type DetectionOptions,
} from "./detector.js";

// Element classes and types
export {
  // Base class
  AbstractElement,
  type CustomValueProvider,
  type CustomHrefProvider,
  type EventTypesProvider,

  // Concrete element classes
  ButtonElement,
  TextInputElement,
  TextareaElement,
  CheckboxElement,
  RadioElement,
  SelectElement,
  HyperlinkElement,
  InteractableElement,
  PasswordInputElement,
  NumberInputElement,
  DateInputElement,
  FileInputElement,
  RangeInputElement,
  ColorInputElement,

  // Element registry
  ELEMENTS,
  type ElementClass,

  // Actions enum
  ElementAction,

  // Type definitions
  type BoundingBoxDto,
  type ElementCardDto,

  // ARIA utilities
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
} from "./elements/index.js";

// XPath utilities
export {
  escapeXPathAttribute,
  scopeXPath,
  getBrowserBundle,
  getDefaultConfig,
  type XPathGeneratorConfig,
  type SelectorResult,
} from "./xpath/index.js";
