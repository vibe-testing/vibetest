/**
 * Screenshot overlay service for adding colored bounding boxes to screenshots.
 *
 * This service generates visual overlays with numbered colored boxes around
 * detected elements, making it easier for LLMs to reference specific UI elements
 * during visual analysis.
 */

import type { Page } from "playwright";
import * as sharp from "sharp";
import type { ScoredElement } from "./batching.js";

interface ColorEntry {
  hex: string;
  name: string;
  red: number;
  green: number;
  blue: number;
}

/**
 * Color palette for overlay boxes.
 * Each color is distinct and easily visible against most backgrounds.
 */
const OVERLAY_COLORS: ColorEntry[] = [
  { hex: "#FF6B6B", name: "red", red: 255, green: 107, blue: 107 },
  { hex: "#4ECDC4", name: "teal", red: 78, green: 205, blue: 196 },
  { hex: "#45B7D1", name: "blue", red: 69, green: 183, blue: 209 },
  { hex: "#96CEB4", name: "green", red: 150, green: 206, blue: 180 },
  { hex: "#FFEAA7", name: "yellow", red: 255, green: 234, blue: 167 },
  { hex: "#DDA0DD", name: "plum", red: 221, green: 160, blue: 221 },
  { hex: "#98D8C8", name: "mint", red: 152, green: 216, blue: 200 },
  { hex: "#F7DC6F", name: "gold", red: 247, green: 220, blue: 111 },
  { hex: "#BB8FCE", name: "purple", red: 187, green: 143, blue: 206 },
  { hex: "#85C1E9", name: "light blue", red: 133, green: 193, blue: 233 },
  { hex: "#F8B500", name: "orange", red: 248, green: 181, blue: 0 },
  { hex: "#58D68D", name: "lime", red: 88, green: 214, blue: 141 },
  { hex: "#EC7063", name: "coral", red: 236, green: 112, blue: 99 },
  { hex: "#5DADE2", name: "sky blue", red: 93, green: 173, blue: 226 },
  { hex: "#AF7AC5", name: "violet", red: 175, green: 122, blue: 197 },
  { hex: "#48C9B0", name: "turquoise", red: 72, green: 201, blue: 176 },
  { hex: "#F5B041", name: "amber", red: 245, green: 176, blue: 65 },
  { hex: "#7FB3D5", name: "steel blue", red: 127, green: 179, blue: 213 },
  { hex: "#E59866", name: "peach", red: 229, green: 152, blue: 102 },
  { hex: "#76D7C4", name: "aqua", red: 118, green: 215, blue: 196 },
];

export const MAX_OVERLAY_ELEMENTS = OVERLAY_COLORS.length;

export interface LegendEntry {
  elementId: string;
  color: ColorEntry;
  labelIndex: number;
}

export interface OverlayResult {
  screenshotBase64: string;
  legend: LegendEntry[];
  elementCount: number;
}

/**
 * Generate an SVG overlay with colored bounding boxes around elements.
 */
function generateSvgOverlay(
  elements: ScoredElement[],
  legend: LegendEntry[],
  width: number,
  height: number,
): string {
  const strokeWidth = 3;
  const labelFontSize = 14;
  const labelPadding = 4;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const legendEntry = legend[i];
    const box = element.card.boundingBox;

    if (!box) continue;

    const { x, y, width: boxWidth, height: boxHeight } = box;
    const color = legendEntry.color.hex;
    const labelText = String(legendEntry.labelIndex);

    // Draw bounding box rectangle
    svg += `<rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" `;
    svg += `fill="none" stroke="${color}" stroke-width="${strokeWidth}" />`;

    // Calculate label background dimensions
    const labelWidth = labelText.length * labelFontSize * 0.7 + labelPadding * 2;
    const labelHeight = labelFontSize + labelPadding * 2;

    // Position label at top-left corner of the box
    const labelX = x;
    const labelY = Math.max(0, y - labelHeight);

    // Draw label background
    svg += `<rect x="${labelX}" y="${labelY}" width="${labelWidth}" height="${labelHeight}" `;
    svg += `fill="${color}" rx="2" ry="2" />`;

    // Draw label text
    svg += `<text x="${labelX + labelPadding}" y="${labelY + labelFontSize}" `;
    svg += `font-family="Arial, sans-serif" font-size="${labelFontSize}" `;
    svg += `font-weight="bold" fill="white">${labelText}</text>`;
  }

  svg += "</svg>";
  return svg;
}

/**
 * Generate a screenshot with colored overlay boxes around elements.
 *
 * Takes a page screenshot and composites an SVG overlay with numbered
 * colored boxes around each element. Returns the composited image and
 * a legend mapping element IDs to colors.
 *
 * @param page - Playwright page to screenshot
 * @param elements - Elements to highlight with overlay boxes
 * @returns Overlay result with base64 screenshot and legend
 * @throws Error if too many elements are provided
 */
export async function generateOverlay(
  page: Page,
  elements: ScoredElement[],
): Promise<OverlayResult> {
  if (elements.length > MAX_OVERLAY_ELEMENTS) {
    throw new Error(
      `Too many elements (received=${elements.length}, max=${MAX_OVERLAY_ELEMENTS})`,
    );
  }

  const screenshotBuffer = await page.screenshot({ fullPage: true });

  const validElements = elements.filter(
    (el) =>
      el.card.boundingBox &&
      el.card.boundingBox.width > 0 &&
      el.card.boundingBox.height > 0,
  );

  if (validElements.length === 0) {
    return {
      screenshotBase64: screenshotBuffer.toString("base64"),
      legend: [],
      elementCount: 0,
    };
  }

  const legend: LegendEntry[] = validElements.map((el, index) => ({
    elementId: el.elementKey,
    color: OVERLAY_COLORS[index % OVERLAY_COLORS.length],
    labelIndex: index + 1,
  }));

  try {
    const metadata = await sharp(screenshotBuffer).metadata();
    const svgOverlay = generateSvgOverlay(
      validElements,
      legend,
      metadata.width!,
      metadata.height!,
    );

    const composited = await sharp(screenshotBuffer)
      .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
      .png()
      .toBuffer();

    return {
      legend,
      elementCount: validElements.length,
      screenshotBase64: composited.toString("base64"),
    };
  } catch {
    // If overlay fails, return original screenshot without overlay
    return {
      screenshotBase64: screenshotBuffer.toString("base64"),
      legend: [],
      elementCount: 0,
    };
  }
}

/**
 * Get the color entry for a given index.
 * Useful for external legend rendering.
 */
export function getOverlayColor(index: number): ColorEntry {
  return OVERLAY_COLORS[index % OVERLAY_COLORS.length];
}

/**
 * Get all available overlay colors.
 */
export function getOverlayColors(): readonly ColorEntry[] {
  return OVERLAY_COLORS;
}
