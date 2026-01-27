import { ElementAction } from './actions.js';

/**
 * ARIA Roles as defined by WAI-ARIA specification.
 * This is a comprehensive list of roles that can be used to describe
 * the semantic purpose of an element.
 *
 * @see https://www.w3.org/TR/wai-aria-1.2/#role_definitions
 */
export type AriaRole =
  // Widget roles (interactive elements)
  | 'button'
  | 'checkbox'
  | 'gridcell'
  | 'link'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'option'
  | 'progressbar'
  | 'radio'
  | 'scrollbar'
  | 'searchbox'
  | 'slider'
  | 'spinbutton'
  | 'switch'
  | 'tab'
  | 'tabpanel'
  | 'textbox'
  | 'treeitem'
  // Composite widget roles
  | 'combobox'
  | 'grid'
  | 'listbox'
  | 'menu'
  | 'menubar'
  | 'radiogroup'
  | 'tablist'
  | 'tree'
  | 'treegrid'
  // Document structure roles
  | 'alertdialog'
  | 'application'
  | 'article'
  | 'blockquote'
  | 'caption'
  | 'cell'
  | 'columnheader'
  | 'definition'
  | 'deletion'
  | 'dialog'
  | 'directory'
  | 'document'
  | 'emphasis'
  | 'feed'
  | 'figure'
  | 'generic'
  | 'group'
  | 'heading'
  | 'img'
  | 'insertion'
  | 'list'
  | 'listitem'
  | 'math'
  | 'meter'
  | 'none'
  | 'note'
  | 'paragraph'
  | 'presentation'
  | 'row'
  | 'rowgroup'
  | 'rowheader'
  | 'separator'
  | 'strong'
  | 'subscript'
  | 'superscript'
  | 'table'
  | 'term'
  | 'time'
  | 'toolbar'
  | 'tooltip'
  // Landmark roles
  | 'banner'
  | 'complementary'
  | 'contentinfo'
  | 'form'
  | 'main'
  | 'navigation'
  | 'region'
  | 'search'
  // Live region roles
  | 'alert'
  | 'log'
  | 'marquee'
  | 'status'
  | 'timer';

/**
 * Information about an ARIA role including its default actions,
 * implicit HTML tags, and base confidence score.
 */
export interface AriaRoleInfo {
  /**
   * Semantic actions this role implies.
   * Used as a fallback when you only know the role but not the tag.
   */
  defaultActions: ElementAction[];

  /**
   * Typical HTML tags that map naturally to this role.
   * Used to boost confidence when tag matches implicit role.
   */
  implicitTags: string[];

  /**
   * Rough base confidence score (0-100) if all you know is the role.
   * Higher scores indicate more reliable role mappings.
   */
  baseScore: number;

  /**
   * Whether this role indicates an interactive element.
   * Interactive elements can receive focus and respond to user input.
   */
  isInteractive: boolean;

  /**
   * Brief description of the role's purpose.
   */
  description: string;
}

/**
 * Centralized map of ARIA role semantics.
 *
 * This module provides a single source of truth for ARIA role information,
 * eliminating duplicated logic across element classes. Each element class
 * can leverage this map instead of hardcoding role-specific checks.
 *
 * Usage example:
 * ```ts
 * import { ARIA_ROLE_MAP, getAriaRoleInfo } from './aria';
 *
 * // Direct access
 * const buttonInfo = ARIA_ROLE_MAP.button;
 *
 * // Safe access with type checking
 * const info = getAriaRoleInfo('button');
 * if (info) {
 *   console.log(info.defaultActions);
 * }
 * ```
 */
export const ARIA_ROLE_MAP: Partial<Record<AriaRole, AriaRoleInfo>> = {
  // ============================================================================
  // Widget Roles (Interactive Elements)
  // ============================================================================

  button: {
    defaultActions: [
      ElementAction.CLICK,
      ElementAction.HOVER,
      ElementAction.FOCUS,
      ElementAction.BLUR,
    ],
    implicitTags: ['button', 'input'],
    baseScore: 70,
    isInteractive: true,
    description: 'A clickable button that triggers an action',
  },

  checkbox: {
    defaultActions: [ElementAction.CHECK, ElementAction.UNCHECK],
    implicitTags: ['input'],
    baseScore: 80,
    isInteractive: true,
    description: 'A checkable input (supports mixed state via aria-checked)',
  },

  link: {
    defaultActions: [
      ElementAction.CLICK,
      ElementAction.HOVER,
      ElementAction.FOCUS,
      ElementAction.BLUR,
    ],
    implicitTags: ['a'],
    baseScore: 70,
    isInteractive: true,
    description: 'A hyperlink to another resource',
  },

  menuitem: {
    defaultActions: [
      ElementAction.CLICK,
      ElementAction.HOVER,
      ElementAction.FOCUS,
    ],
    implicitTags: [],
    baseScore: 65,
    isInteractive: true,
    description: 'An option in a menu or menubar',
  },

  menuitemcheckbox: {
    defaultActions: [ElementAction.CHECK, ElementAction.UNCHECK],
    implicitTags: [],
    baseScore: 65,
    isInteractive: true,
    description: 'A checkable menu item',
  },

  menuitemradio: {
    defaultActions: [ElementAction.CHECK],
    implicitTags: [],
    baseScore: 65,
    isInteractive: true,
    description: 'A menu item that is part of a radio group',
  },

  option: {
    defaultActions: [ElementAction.SELECT_OPTION],
    implicitTags: ['option'],
    baseScore: 75,
    isInteractive: true,
    description: 'A selectable option in a listbox',
  },

  radio: {
    defaultActions: [ElementAction.CHECK],
    implicitTags: ['input'],
    baseScore: 70,
    isInteractive: true,
    description: 'A radio button in a group of mutually exclusive options',
  },

  searchbox: {
    defaultActions: [
      ElementAction.FILL,
      ElementAction.TYPE,
      ElementAction.CLEAR,
      ElementAction.FOCUS,
      ElementAction.BLUR,
    ],
    implicitTags: ['input'],
    baseScore: 75,
    isInteractive: true,
    description: 'A text box for entering search queries',
  },

  slider: {
    defaultActions: [
      ElementAction.FILL,
      ElementAction.INCREMENT,
      ElementAction.DECREMENT,
      ElementAction.FOCUS,
      ElementAction.BLUR,
    ],
    implicitTags: ['input'],
    baseScore: 80,
    isInteractive: true,
    description: 'A slider for selecting a value from a range',
  },

  spinbutton: {
    defaultActions: [
      ElementAction.FILL,
      ElementAction.INCREMENT,
      ElementAction.DECREMENT,
      ElementAction.CLEAR,
      ElementAction.FOCUS,
      ElementAction.BLUR,
    ],
    implicitTags: ['input'],
    baseScore: 80,
    isInteractive: true,
    description: 'A numeric input with increment/decrement buttons',
  },

  switch: {
    defaultActions: [ElementAction.TOGGLE],
    implicitTags: [],
    baseScore: 75,
    isInteractive: true,
    description: 'A toggle switch representing on/off states',
  },

  tab: {
    defaultActions: [ElementAction.CLICK, ElementAction.FOCUS],
    implicitTags: [],
    baseScore: 70,
    isInteractive: true,
    description: 'A tab in a tablist',
  },

  textbox: {
    defaultActions: [
      ElementAction.FILL,
      ElementAction.TYPE,
      ElementAction.CLEAR,
      ElementAction.APPEND,
      ElementAction.SELECT_ALL,
      ElementAction.FOCUS,
      ElementAction.BLUR,
    ],
    implicitTags: ['input', 'textarea'],
    baseScore: 75,
    isInteractive: true,
    description: 'A text input field',
  },

  treeitem: {
    defaultActions: [
      ElementAction.CLICK,
      ElementAction.EXPAND,
      ElementAction.COLLAPSE,
      ElementAction.FOCUS,
    ],
    implicitTags: [],
    baseScore: 65,
    isInteractive: true,
    description: 'An item in a tree view',
  },

  // ============================================================================
  // Composite Widget Roles
  // ============================================================================

  combobox: {
    defaultActions: [
      ElementAction.SELECT_OPTION,
      ElementAction.FILL,
      ElementAction.FOCUS,
      ElementAction.BLUR,
    ],
    implicitTags: ['select', 'input'],
    baseScore: 80,
    isInteractive: true,
    description: 'A composite widget with a text input and popup listbox',
  },

  listbox: {
    defaultActions: [
      ElementAction.SELECT_OPTION,
      ElementAction.FOCUS,
      ElementAction.KEYBOARD_NAV,
    ],
    implicitTags: ['select'],
    baseScore: 80,
    isInteractive: true,
    description: 'A widget for selecting one or more items from a list',
  },

  menu: {
    defaultActions: [ElementAction.CLICK, ElementAction.KEYBOARD_NAV],
    implicitTags: [],
    baseScore: 65,
    isInteractive: true,
    description: 'A list of choices or commands',
  },

  menubar: {
    defaultActions: [ElementAction.KEYBOARD_NAV],
    implicitTags: [],
    baseScore: 60,
    isInteractive: true,
    description: 'A horizontal menu bar',
  },

  radiogroup: {
    defaultActions: [ElementAction.CHECK, ElementAction.KEYBOARD_NAV],
    implicitTags: [],
    baseScore: 65,
    isInteractive: true,
    description: 'A group of radio buttons',
  },

  tablist: {
    defaultActions: [ElementAction.KEYBOARD_NAV],
    implicitTags: [],
    baseScore: 60,
    isInteractive: true,
    description: 'A container for tabs',
  },

  tree: {
    defaultActions: [
      ElementAction.KEYBOARD_NAV,
      ElementAction.EXPAND,
      ElementAction.COLLAPSE,
    ],
    implicitTags: [],
    baseScore: 60,
    isInteractive: true,
    description: 'A hierarchical tree view',
  },

  treegrid: {
    defaultActions: [
      ElementAction.KEYBOARD_NAV,
      ElementAction.EXPAND,
      ElementAction.COLLAPSE,
    ],
    implicitTags: [],
    baseScore: 60,
    isInteractive: true,
    description: 'A grid that can be navigated like a tree',
  },

  grid: {
    defaultActions: [ElementAction.KEYBOARD_NAV, ElementAction.FOCUS],
    implicitTags: ['table'],
    baseScore: 60,
    isInteractive: true,
    description: 'An interactive grid or table',
  },

  gridcell: {
    defaultActions: [ElementAction.CLICK, ElementAction.FOCUS],
    implicitTags: ['td', 'th'],
    baseScore: 55,
    isInteractive: true,
    description: 'A cell in a grid or treegrid',
  },

  // ============================================================================
  // Document Structure Roles (Non-interactive or limited interaction)
  // ============================================================================

  dialog: {
    defaultActions: [ElementAction.FOCUS, ElementAction.KEYBOARD_NAV],
    implicitTags: ['dialog'],
    baseScore: 75,
    isInteractive: true,
    description: 'A dialog or modal window',
  },

  alertdialog: {
    defaultActions: [ElementAction.FOCUS],
    implicitTags: [],
    baseScore: 70,
    isInteractive: true,
    description: 'An alert dialog requiring user acknowledgment',
  },

  separator: {
    defaultActions: [],
    implicitTags: ['hr'],
    baseScore: 50,
    isInteractive: false,
    description: 'A visual or thematic separator',
  },

  progressbar: {
    defaultActions: [],
    implicitTags: ['progress'],
    baseScore: 60,
    isInteractive: false,
    description: 'An element showing task completion progress',
  },

  scrollbar: {
    defaultActions: [ElementAction.SCROLL],
    implicitTags: [],
    baseScore: 60,
    isInteractive: true,
    description: 'A graphical scrollbar control',
  },

  meter: {
    defaultActions: [],
    implicitTags: ['meter'],
    baseScore: 55,
    isInteractive: false,
    description: 'A scalar measurement within a known range',
  },

  tooltip: {
    defaultActions: [],
    implicitTags: [],
    baseScore: 50,
    isInteractive: false,
    description: 'A contextual popup with additional information',
  },

  tabpanel: {
    defaultActions: [],
    implicitTags: [],
    baseScore: 50,
    isInteractive: false,
    description: 'A container for tab content',
  },

  toolbar: {
    defaultActions: [ElementAction.KEYBOARD_NAV],
    implicitTags: [],
    baseScore: 55,
    isInteractive: true,
    description: 'A container for grouped controls',
  },

  // ============================================================================
  // Landmark Roles
  // ============================================================================

  banner: {
    defaultActions: [],
    implicitTags: ['header'],
    baseScore: 40,
    isInteractive: false,
    description: 'Site-oriented content at the beginning of a page',
  },

  complementary: {
    defaultActions: [],
    implicitTags: ['aside'],
    baseScore: 40,
    isInteractive: false,
    description: 'Supporting content related to the main content',
  },

  contentinfo: {
    defaultActions: [],
    implicitTags: ['footer'],
    baseScore: 40,
    isInteractive: false,
    description: 'Information about the page content',
  },

  form: {
    defaultActions: [ElementAction.SUBMIT, ElementAction.RESET],
    implicitTags: ['form'],
    baseScore: 60,
    isInteractive: true,
    description: 'A form container',
  },

  main: {
    defaultActions: [],
    implicitTags: ['main'],
    baseScore: 40,
    isInteractive: false,
    description: 'The main content of the document',
  },

  navigation: {
    defaultActions: [],
    implicitTags: ['nav'],
    baseScore: 40,
    isInteractive: false,
    description: 'A collection of navigation links',
  },

  region: {
    defaultActions: [],
    implicitTags: ['section'],
    baseScore: 40,
    isInteractive: false,
    description: 'A generic landmark region',
  },

  search: {
    defaultActions: [],
    implicitTags: [],
    baseScore: 50,
    isInteractive: false,
    description: 'A search section of the page',
  },

  // ============================================================================
  // Live Region Roles
  // ============================================================================

  alert: {
    defaultActions: [],
    implicitTags: [],
    baseScore: 50,
    isInteractive: false,
    description: 'An important message that requires attention',
  },

  log: {
    defaultActions: [],
    implicitTags: [],
    baseScore: 40,
    isInteractive: false,
    description: 'A region containing logged information',
  },

  status: {
    defaultActions: [],
    implicitTags: ['output'],
    baseScore: 45,
    isInteractive: false,
    description: 'A status message or notification',
  },

  timer: {
    defaultActions: [],
    implicitTags: [],
    baseScore: 45,
    isInteractive: false,
    description: 'A numerical counter showing elapsed time',
  },

  // ============================================================================
  // Additional Document Structure Roles
  // ============================================================================

  article: {
    defaultActions: [],
    implicitTags: ['article'],
    baseScore: 35,
    isInteractive: false,
    description: 'An independent section of content',
  },

  heading: {
    defaultActions: [],
    implicitTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    baseScore: 35,
    isInteractive: false,
    description: 'A heading for a section',
  },

  img: {
    defaultActions: [],
    implicitTags: ['img'],
    baseScore: 30,
    isInteractive: false,
    description: 'An image or graphic',
  },

  list: {
    defaultActions: [],
    implicitTags: ['ul', 'ol'],
    baseScore: 30,
    isInteractive: false,
    description: 'A list of items',
  },

  listitem: {
    defaultActions: [],
    implicitTags: ['li'],
    baseScore: 30,
    isInteractive: false,
    description: 'An item in a list',
  },

  table: {
    defaultActions: [],
    implicitTags: ['table'],
    baseScore: 35,
    isInteractive: false,
    description: 'A data table',
  },

  row: {
    defaultActions: [],
    implicitTags: ['tr'],
    baseScore: 30,
    isInteractive: false,
    description: 'A row in a table or grid',
  },

  cell: {
    defaultActions: [],
    implicitTags: ['td'],
    baseScore: 30,
    isInteractive: false,
    description: 'A cell in a table',
  },

  columnheader: {
    defaultActions: [ElementAction.CLICK],
    implicitTags: ['th'],
    baseScore: 40,
    isInteractive: true,
    description: 'A column header cell (often sortable)',
  },

  rowheader: {
    defaultActions: [],
    implicitTags: ['th'],
    baseScore: 35,
    isInteractive: false,
    description: 'A row header cell',
  },

  group: {
    defaultActions: [],
    implicitTags: ['fieldset', 'optgroup'],
    baseScore: 35,
    isInteractive: false,
    description: 'A group of related elements',
  },

  figure: {
    defaultActions: [],
    implicitTags: ['figure'],
    baseScore: 30,
    isInteractive: false,
    description: 'A figure with optional caption',
  },

  // ============================================================================
  // Presentational/None Roles
  // ============================================================================

  none: {
    defaultActions: [],
    implicitTags: [],
    baseScore: 0,
    isInteractive: false,
    description: 'Element has no semantic meaning',
  },

  presentation: {
    defaultActions: [],
    implicitTags: [],
    baseScore: 0,
    isInteractive: false,
    description: 'Element is purely presentational',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Type guard to check if a string is a supported AriaRole in our map.
 * Note: This checks if the role is in our implementation, not if it's a valid WAI-ARIA role.
 * Some valid ARIA roles may not be in our map if we don't support them yet.
 */
export function isSupportedAriaRole(role: string): role is AriaRole {
  return role in ARIA_ROLE_MAP;
}

/**
 * @deprecated Use isSupportedAriaRole() instead - clearer naming about what it checks
 */
export function isAriaRole(role: string): role is AriaRole {
  return isSupportedAriaRole(role);
}

/**
 * Safely get AriaRoleInfo for a role string.
 * Returns undefined if the role is not in our map.
 */
export function getAriaRoleInfo(role: string): AriaRoleInfo | undefined {
  if (isAriaRole(role)) {
    return ARIA_ROLE_MAP[role];
  }
  return undefined;
}

/**
 * Get the default actions for a given ARIA role.
 * Returns an empty array if the role is unknown.
 */
export function getDefaultActionsForRole(role: string): ElementAction[] {
  const info = getAriaRoleInfo(role);
  return info?.defaultActions ?? [];
}

/**
 * Get the base confidence score for a given ARIA role.
 * Returns 0 if the role is unknown.
 */
export function getBaseScoreForRole(role: string): number {
  const info = getAriaRoleInfo(role);
  return info?.baseScore ?? 0;
}

/**
 * Check if an ARIA role indicates an interactive element.
 * Returns false if the role is unknown.
 */
export function isRoleInteractive(role: string): boolean {
  const info = getAriaRoleInfo(role);
  return info?.isInteractive ?? false;
}

/**
 * Get all interactive ARIA roles.
 * Useful for filtering elements that can be interacted with.
 */
export function getInteractiveRoles(): AriaRole[] {
  return (
    Object.entries(ARIA_ROLE_MAP) as [AriaRole, AriaRoleInfo | undefined][]
  )
    .filter(
      (entry): entry is [AriaRole, AriaRoleInfo] => entry[1] !== undefined,
    )
    .filter(([, info]) => info.isInteractive)
    .map(([role]) => role);
}

/**
 * Check if a tag is implicitly associated with a given role.
 * For example, 'button' tag is implicitly a 'button' role.
 */
export function isTagImplicitForRole(tag: string, role: string): boolean {
  const info = getAriaRoleInfo(role);
  return info?.implicitTags.includes(tag.toLowerCase()) ?? false;
}

/**
 * Calculate a confidence score adjustment based on ARIA role and tag match.
 * Returns a confidence score from 0-100.
 */
export function calculateRoleBasedScore(
  role: string,
  tagName: string,
  additionalFactors?: {
    hasTabindex?: boolean;
    hasAriaLabel?: boolean;
    hasMatchingClasses?: boolean;
  },
): number {
  const info = getAriaRoleInfo(role);
  if (!info) {
    return 0;
  }

  let score = info.baseScore;

  // Boost score if the tag is implicit for this role
  if (isTagImplicitForRole(tagName, role)) {
    score += 10;
  }

  // Apply additional factor bonuses
  if (additionalFactors) {
    if (additionalFactors.hasTabindex) {
      score += 10;
    }
    if (additionalFactors.hasAriaLabel) {
      score += 5;
    }
    if (additionalFactors.hasMatchingClasses) {
      score += 5;
    }
  }

  // Cap at 95 for role-based detection (100 reserved for native elements)
  return Math.min(score, 95);
}

/**
 * Maps a tag name to its implicit ARIA role.
 * Based on ARIA in HTML specification.
 *
 * @see https://www.w3.org/TR/html-aria/#docconformance
 */
export function getImplicitRoleForTag(
  tagName: string,
  type?: string,
): AriaRole | undefined {
  const tag = tagName.toLowerCase();

  // Input elements have role based on type
  if (tag === 'input') {
    switch (type?.toLowerCase()) {
      case 'button':
      case 'submit':
      case 'reset':
      case 'image':
        return 'button';
      case 'checkbox':
        return 'checkbox';
      case 'radio':
        return 'radio';
      case 'range':
        return 'slider';
      case 'number':
        return 'spinbutton';
      case 'search':
        return 'searchbox';
      // Text-like inputs that map to textbox
      case 'email':
      case 'tel':
      case 'text':
      case 'url':
      case 'password':
        return 'textbox';
      // Types that have no implicit role or are handled by specific element classes
      case 'hidden': // No semantic role
      case 'file': // Handled by FileInputElement
      case 'date': // Handled by DateInputElement
      case 'time': // Handled by DateInputElement
      case 'datetime-local': // Handled by DateInputElement
      case 'month': // Handled by DateInputElement
      case 'week': // Handled by DateInputElement
      case 'color': // Handled by ColorInputElement
        return undefined;
      default:
        // Per HTML spec, input elements without a type attribute (or with
        // an invalid/unknown type) default to type="text", which has
        // implicit role of textbox
        return 'textbox';
    }
  }

  // Map for simple tag -> role mappings
  const tagToRole: Record<string, AriaRole> = {
    a: 'link',
    article: 'article',
    aside: 'complementary',
    button: 'button',
    dialog: 'dialog',
    footer: 'contentinfo',
    form: 'form',
    h1: 'heading',
    h2: 'heading',
    h3: 'heading',
    h4: 'heading',
    h5: 'heading',
    h6: 'heading',
    header: 'banner',
    hr: 'separator',
    img: 'img',
    li: 'listitem',
    main: 'main',
    meter: 'meter',
    nav: 'navigation',
    ol: 'list',
    option: 'option',
    output: 'status',
    progress: 'progressbar',
    section: 'region',
    select: 'listbox',
    table: 'table',
    tbody: 'rowgroup',
    td: 'cell',
    textarea: 'textbox',
    tfoot: 'rowgroup',
    th: 'columnheader',
    thead: 'rowgroup',
    tr: 'row',
    ul: 'list',
  };

  return tagToRole[tag];
}
