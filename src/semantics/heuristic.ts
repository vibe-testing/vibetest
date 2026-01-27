/**
 * Heuristic scoring utilities for element importance.
 *
 * These functions calculate scores based on various factors like confidence,
 * position, and size to help prioritize elements during analysis.
 */

import type { ElementCardDto } from "../detection/elements/types.js";

/**
 * Default viewport height assumption for above-the-fold calculations.
 */
const ASSUMED_VIEWPORT_HEIGHT = 800;

/**
 * Maximum page depth to consider for scoring.
 * Elements below this are considered far down the page.
 */
const MAX_PAGE_DEPTH = 3_000;

/**
 * Ideal element size range for interactive elements (in pixels).
 */
const IDEAL_MIN_AREA = 1_000; // ~32x32
const IDEAL_MAX_AREA = 40_000; // ~200x200

/**
 * Calculate confidence factor from element detection score.
 * Normalizes 0-100 confidence to 0.5-1.0 multiplier.
 *
 * - 100 confidence -> 1.0
 * - 50 confidence -> 0.75
 * - 0 confidence -> 0.5
 */
export function confidenceFactor(card: ElementCardDto): number {
  const confidence = card.confidenceScore ?? 50;
  return 0.5 + confidence / 200;
}

/**
 * Calculate location factor based on vertical position.
 * Elements higher on the page score higher.
 *
 * - Top of page (y=0) -> 1.0
 * - Above fold (y<800) -> 0.8-1.0
 * - Below fold -> decreasing to 0.3 minimum
 * - Negative coordinates -> 0.3 (likely off-screen or hidden)
 * - Very deep (y > MAX_PAGE_DEPTH) -> 0.3 minimum
 */
export function locationFactor(card: ElementCardDto): number {
  const box = card.boundingBox;
  if (!box) {
    return 0.7; // Default for elements without position
  }

  const y = box.y;

  // Negative coordinates suggest off-screen or hidden elements
  if (y < 0) {
    return 0.3;
  }

  // Above the fold gets highest score
  if (y < ASSUMED_VIEWPORT_HEIGHT) {
    return 1.0 - (y / ASSUMED_VIEWPORT_HEIGHT) * 0.2; // 1.0 to 0.8
  }

  // Below fold: gradual decrease, clamped to minimum of 0.3
  const depthRatio = Math.min(y / MAX_PAGE_DEPTH, 1);
  return Math.max(0.3, 0.8 - depthRatio * 0.5); // 0.8 to 0.3
}

/**
 * Calculate size factor based on element area.
 * Elements in the ideal size range score highest.
 *
 * - Ideal size (1000-40000 px²) -> 1.0
 * - Too small (<400 px²) -> 0.5
 * - Too large (>100000 px²) -> 0.6
 * - Zero or negative dimensions -> 0.3 (likely hidden or invalid)
 */
export function sizeFactor(card: ElementCardDto): number {
  const box = card.boundingBox;

  // Default for elements without dimensions
  if (!box) {
    return 0.7;
  }

  // Handle zero or negative dimensions (hidden or invalid elements)
  if (box.width <= 0 || box.height <= 0) {
    return 0.3;
  }

  const area = box.width * box.height;

  // Tiny elements are likely icons or decorative
  if (area < 400) {
    return 0.5;
  }

  // Very large elements are likely containers, not controls
  if (area > 100_000) {
    return 0.6;
  }

  // Ideal range gets full score
  if (area >= IDEAL_MIN_AREA && area <= IDEAL_MAX_AREA) {
    return 1.0;
  }

  // Slightly outside ideal range
  if (area < IDEAL_MIN_AREA) {
    return 0.7 + (area / IDEAL_MIN_AREA) * 0.3;
  }

  // Larger than ideal but not huge
  const sizeRatio = Math.min((area - IDEAL_MAX_AREA) / 60_000, 1);
  return 1.0 - sizeRatio * 0.4; // 1.0 to 0.6
}

/**
 * Calculate urgency factor based on visual prominence.
 * Elements with urgent styling (bright colors, CTAs) get a boost.
 *
 * NOTE: Currently always returns 1.0 as urgency detection is not yet implemented.
 * When hasUrgentStyling is added to ElementCardDto, this will return:
 * - No urgent styling -> 1.0 (neutral)
 * - Has urgent styling -> 1.2 (20% boost)
 */
export function urgencyFactor(_card: ElementCardDto): number {
  // TODO: Implement urgency detection when hasUrgentStyling is added to ElementCardDto
  return 1.0;
}

/**
 * Calculate the heuristic score for an element.
 *
 * Score is the product of four factors:
 * - Confidence (0.5-1.0): How reliably the element matches its type
 * - Location (0.3-1.0): Vertical position on page
 * - Size (0.3-1.0): Element dimensions
 * - Urgency (1.0-1.2): Visual prominence boost for CTAs
 *
 * Final score is clamped to 0.0-1.0 range.
 */
export function heuristicScore(card: ElementCardDto): number {
  const confidence = confidenceFactor(card);
  const location = locationFactor(card);
  const size = sizeFactor(card);
  const urgency = urgencyFactor(card);
  return Math.min(1.0, confidence * location * size * urgency);
}
