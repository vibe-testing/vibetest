/**
 * Element Detection Service
 *
 * Detects interactive elements on a page by querying with CSS selectors
 * and classifying them into typed element instances.
 *
 * Converted from NestJS service class to function-based API for CLI usage.
 */

import type { Frame, Page } from "playwright";

import { ELEMENTS, type ElementClass, type ElementCardDto } from "./elements/index.js";
import { AbstractElement } from "./elements/abstract.element.js";

/**
 * Options for element detection.
 */
export interface DetectionOptions {
  /**
   * Whether to traverse into iframes for element detection.
   * @default false
   */
  includeIframes?: boolean;

  /**
   * Maximum depth of iframe nesting to traverse.
   * @default 3
   */
  maxIframeDepth?: number;

  /**
   * Whether to include elements from Shadow DOM.
   * Playwright locators pierce shadow DOM by default; when false,
   * elements inside shadow roots are filtered out after detection.
   * @default true
   */
  includeShadowDom?: boolean;
}

/**
 * Detects all interactive elements on a page.
 *
 * Elements are discovered by querying with CSS selectors from registered
 * element classes, then deduplicated by their unique XPath selector.
 * When multiple element types match the same DOM element, the more specific
 * type (lower priority number) is preferred.
 *
 * @param page - Playwright Page instance
 * @param options - Detection options
 * @returns Array of detected AbstractElement instances
 */
export async function detectElements(
  page: Page,
  options: DetectionOptions = {},
): Promise<AbstractElement[]> {
  const {
    includeIframes = false,
    maxIframeDepth = 3,
    includeShadowDom = true,
  } = options;

  // Detect elements in main frame
  let mainFrameElements = await detectInFrame(page.mainFrame());

  // Filter out shadow DOM elements if not included
  if (!includeShadowDom) {
    mainFrameElements = await filterOutShadowDomElements(mainFrameElements);
  }

  // Optionally detect elements in iframes
  let iframeElements: AbstractElement[] = [];
  if (includeIframes) {
    iframeElements = await detectInFramesRecursively(
      page.frames(),
      page.mainFrame(),
      0,
      maxIframeDepth,
    );

    if (!includeShadowDom) {
      iframeElements = await filterOutShadowDomElements(iframeElements);
    }
  }

  const allElements = [...mainFrameElements, ...iframeElements];
  const uniqueElements = await deduplicateElements(allElements);

  return uniqueElements;
}

/**
 * Detects elements within a single frame.
 * Optimized with batched visibility checks for better performance.
 */
async function detectInFrame(frame: Frame): Promise<AbstractElement[]> {
  const detectionPromises = ELEMENTS.flatMap((ElementClass: ElementClass) =>
    ElementClass.cssSelectors.map(async (cssSelector) => {
      const elements = await frame.locator(cssSelector).all();

      // Get all element handles in parallel
      const handlePromises = elements.map((el) => el.elementHandle());
      const handles = await Promise.all(handlePromises);

      // Create instances for valid handles
      const instances = handles
        .filter((handle): handle is NonNullable<typeof handle> => !!handle)
        .map((handle) => new ElementClass(handle));

      // Batch: Check visibility for all instances in parallel
      const visibilityPromises = instances.map((inst) => inst.isVisible());
      const visibilities = await Promise.all(visibilityPromises);

      // Filter to only visible elements
      return instances.filter((_, index) => visibilities[index]);
    }),
  );

  const results = await Promise.all(detectionPromises);
  return results.flat();
}

/**
 * Filters out elements that are inside Shadow DOM.
 */
async function filterOutShadowDomElements(
  elements: AbstractElement[],
): Promise<AbstractElement[]> {
  const shadowDomChecks = await Promise.all(
    elements.map((el) => el.isInShadowDom()),
  );

  return elements.filter((_, index) => !shadowDomChecks[index]);
}

/**
 * Recursively detects elements in child frames (iframes).
 */
async function detectInFramesRecursively(
  frames: Frame[],
  mainFrame: Frame,
  currentDepth: number,
  maxDepth: number,
): Promise<AbstractElement[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  const allElements: AbstractElement[] = [];

  for (const frame of frames) {
    // Skip the main frame (already processed)
    if (frame === mainFrame) {
      continue;
    }

    try {
      // Check if frame is accessible and not detached
      const url = frame.url();
      if (!url || url === "about:blank") {
        continue;
      }

      // Detect elements in this frame
      const frameElements = await detectInFrame(frame);
      allElements.push(...frameElements);

      // Recursively process child frames
      const childFrames = frame.childFrames();
      if (childFrames.length > 0) {
        const childElements = await detectInFramesRecursively(
          childFrames,
          mainFrame,
          currentDepth + 1,
          maxDepth,
        );
        allElements.push(...childElements);
      }
    } catch {
      // Frame may have been detached or become inaccessible - skip it
    }
  }

  return allElements;
}

/**
 * Deduplicates elements by XPath, preferring more specific element types.
 *
 * When multiple element types match the same DOM element (same XPath),
 * we prefer the element type with lower priority number (more specific).
 * For example, a <button onclick="..."> matches both ButtonElement (priority 9)
 * and InteractableElement (priority 10). We prefer ButtonElement as it's more
 * semantically specific.
 */
async function deduplicateElements(
  elements: AbstractElement[],
): Promise<AbstractElement[]> {
  // Get XPaths and shadow DOM status in parallel
  const [xpaths, shadowDomStatuses] = await Promise.all([
    Promise.all(elements.map((el) => el.getXPath())),
    Promise.all(elements.map((el) => el.isInShadowDom())),
  ]);

  // Deduplicate using Map, preferring lower priority (more specific)
  const elementsByKey = new Map<string, AbstractElement>();
  let shadowDomCounter = 0;

  for (let index = 0; index < elements.length; index++) {
    const element = elements[index];
    const xpath = xpaths[index];
    const isInShadowDom = shadowDomStatuses[index];

    // Generate a unique key: use XPath for light DOM, or a unique shadow DOM key
    let key: string;
    if (xpath !== null) {
      key = xpath;
    } else if (isInShadowDom) {
      // Shadow DOM elements don't have XPath; use a unique identifier
      key = `__shadow_dom_element_${shadowDomCounter++}`;
    } else {
      // Element has no XPath and is not in shadow DOM - skip it
      continue;
    }

    const existing = elementsByKey.get(key);
    if (!existing) {
      elementsByKey.set(key, element);
    } else {
      // Prefer more specific element type (lower priority number)
      const existingPriority = (existing.constructor as typeof AbstractElement)
        .priority;
      const newPriority = (element.constructor as typeof AbstractElement)
        .priority;
      if (newPriority < existingPriority) {
        elementsByKey.set(key, element);
      }
    }
  }

  return Array.from(elementsByKey.values());
}

/**
 * Detects all interactive elements on a page and returns them as ElementCardDto objects.
 *
 * This is a convenience wrapper around detectElements that converts each element
 * to a card format with all metadata. Optionally includes screenshot crops of
 * each element.
 *
 * @param page - Playwright Page instance
 * @param options - Detection options plus card-specific options
 * @returns Array of ElementCardDto objects
 */
export async function detectElementsAsCards(
  page: Page,
  options: DetectionOptions & {
    includeScreenshotCrops?: boolean;
    cropPadding?: number;
  } = {},
): Promise<ElementCardDto[]> {
  const {
    includeScreenshotCrops = false,
    cropPadding = 5,
    ...detectionOptions
  } = options;
  const safeCropPadding = Math.max(0, cropPadding ?? 5);

  const elements = await detectElements(page, detectionOptions);

  const cardPromises = elements.map(async (element) => {
    try {
      return await element.getElementCard(
        includeScreenshotCrops,
        safeCropPadding,
        page,
      );
    } catch {
      return null;
    }
  });

  const results = await Promise.all(cardPromises);
  return results.filter((card): card is ElementCardDto => card !== null);
}
