/**
 * Minimal types for element detection.
 * These are simplified versions needed for the detection module.
 * Full DTOs with validation may be added in later tasks.
 */

/**
 * Bounding box information for an element.
 */
export interface BoundingBoxDto {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Element card containing all metadata about a detected element.
 * This is a simplified version - full implementation in Task 3.3.
 */
export interface ElementCardDto {
  /** Type of element (e.g., "ButtonElement", "TextInputElement") */
  elementType: string;

  /** XPath selector for the element */
  selector: string;

  /** HTML tag name (lowercase) */
  tagName: string;

  /** ARIA role if present */
  role?: string;

  /** Inner text content */
  innerText?: string;

  /** aria-label attribute value */
  ariaLabel?: string;

  /** title attribute value */
  title?: string;

  /** placeholder attribute value */
  placeholder?: string;

  /** input type attribute value */
  type?: string;

  /** href attribute value (for links) */
  href?: string;

  /** input value */
  value?: string;

  /** Whether the element is visible */
  visible: boolean;

  /** Whether the element is enabled */
  enabled: boolean;

  /** Bounding box coordinates */
  boundingBox?: BoundingBoxDto;

  /** Local DOM context HTML snippet */
  localDomContext?: string;

  /** Event types attached to the element */
  eventTypes?: string[];

  /** Confidence score (0-100) for element classification */
  confidenceScore: number;

  /** Base64 encoded screenshot crop of the element */
  screenshotCrop?: string;
}
