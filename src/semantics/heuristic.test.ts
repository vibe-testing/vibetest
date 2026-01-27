import { describe, it, expect } from "bun:test";
import {
  confidenceFactor,
  locationFactor,
  sizeFactor,
  urgencyFactor,
  heuristicScore,
} from "./heuristic.js";
import type { ElementCardDto } from "../detection/elements/types.js";

/**
 * Helper to create a minimal ElementCardDto for testing.
 */
const makeCard = (overrides: Partial<ElementCardDto> = {}): ElementCardDto => ({
  elementType: "ButtonElement",
  selector: "//button",
  tagName: "button",
  visible: true,
  enabled: true,
  confidenceScore: 80,
  ...overrides,
});

describe("Heuristic Scoring", () => {
  describe("confidenceFactor", () => {
    it("returns 1.0 for 100 confidence", () => {
      expect(confidenceFactor(makeCard({ confidenceScore: 100 }))).toBe(1.0);
    });

    it("returns 0.75 for 50 confidence", () => {
      expect(confidenceFactor(makeCard({ confidenceScore: 50 }))).toBe(0.75);
    });

    it("returns 0.5 for 0 confidence", () => {
      expect(confidenceFactor(makeCard({ confidenceScore: 0 }))).toBe(0.5);
    });

    it("handles missing confidence with default of 50", () => {
      const card = makeCard();
      // @ts-expect-error Testing undefined confidence
      card.confidenceScore = undefined;
      expect(confidenceFactor(card)).toBe(0.75);
    });
  });

  describe("locationFactor", () => {
    it("returns 1.0 for top of page", () => {
      const card = makeCard({
        boundingBox: { x: 0, y: 0, width: 100, height: 40 },
      });
      expect(locationFactor(card)).toBe(1.0);
    });

    it("returns high score for above fold", () => {
      const card = makeCard({
        boundingBox: { x: 0, y: 400, width: 100, height: 40 },
      });
      expect(locationFactor(card)).toBeGreaterThan(0.8);
    });

    it("returns lower score for below fold", () => {
      const card = makeCard({
        boundingBox: { x: 0, y: 1000, width: 100, height: 40 },
      });
      expect(locationFactor(card)).toBeLessThan(0.8);
    });

    it("returns 0.3 for negative y coordinates", () => {
      const card = makeCard({
        boundingBox: { x: 0, y: -100, width: 100, height: 40 },
      });
      expect(locationFactor(card)).toBe(0.3);
    });

    it("returns 0.7 for elements without bounding box", () => {
      const card = makeCard();
      expect(locationFactor(card)).toBe(0.7);
    });

    it("returns minimum 0.3 for very deep elements", () => {
      const card = makeCard({
        boundingBox: { x: 0, y: 5000, width: 100, height: 40 },
      });
      expect(locationFactor(card)).toBeCloseTo(0.3);
    });

    it("returns 0.9 for y=400 (middle of viewport)", () => {
      const card = makeCard({
        boundingBox: { x: 0, y: 400, width: 100, height: 40 },
      });
      // y=400 is half of 800, so: 1.0 - (400/800) * 0.2 = 1.0 - 0.1 = 0.9
      expect(locationFactor(card)).toBe(0.9);
    });
  });

  describe("sizeFactor", () => {
    it("returns 1.0 for ideal size", () => {
      const card = makeCard({
        boundingBox: { x: 0, y: 0, width: 100, height: 40 },
      }); // 4000 px²
      expect(sizeFactor(card)).toBe(1.0);
    });

    it("returns lower score for tiny elements", () => {
      const card = makeCard({
        boundingBox: { x: 0, y: 0, width: 10, height: 10 },
      }); // 100 px²
      expect(sizeFactor(card)).toBeLessThan(0.7);
    });

    it("returns 0.5 for very tiny elements (<400 px²)", () => {
      const card = makeCard({
        boundingBox: { x: 0, y: 0, width: 15, height: 15 },
      }); // 225 px²
      expect(sizeFactor(card)).toBe(0.5);
    });

    it("returns 0.6 for very large elements (>100000 px²)", () => {
      const card = makeCard({
        boundingBox: { x: 0, y: 0, width: 500, height: 500 },
      }); // 250000 px²
      expect(sizeFactor(card)).toBe(0.6);
    });

    it("returns 0.7 for elements without bounding box", () => {
      const card = makeCard();
      expect(sizeFactor(card)).toBe(0.7);
    });

    it("returns 0.3 for zero-width elements", () => {
      const card = makeCard({
        boundingBox: { x: 0, y: 0, width: 0, height: 40 },
      });
      expect(sizeFactor(card)).toBe(0.3);
    });

    it("returns 0.3 for zero-height elements", () => {
      const card = makeCard({
        boundingBox: { x: 0, y: 0, width: 100, height: 0 },
      });
      expect(sizeFactor(card)).toBe(0.3);
    });

    it("returns 0.3 for negative dimensions", () => {
      const card = makeCard({
        boundingBox: { x: 0, y: 0, width: -10, height: 40 },
      });
      expect(sizeFactor(card)).toBe(0.3);
    });

    it("returns score between 0.7-1.0 for slightly small elements", () => {
      const card = makeCard({
        boundingBox: { x: 0, y: 0, width: 25, height: 25 },
      }); // 625 px² (between 400 and 1000)
      const score = sizeFactor(card);
      expect(score).toBeGreaterThan(0.7);
      expect(score).toBeLessThan(1.0);
    });

    it("returns score between 0.6-1.0 for slightly large elements", () => {
      const card = makeCard({
        boundingBox: { x: 0, y: 0, width: 250, height: 250 },
      }); // 62500 px² (between 40000 and 100000)
      const score = sizeFactor(card);
      expect(score).toBeGreaterThan(0.6);
      expect(score).toBeLessThan(1.0);
    });
  });

  describe("urgencyFactor", () => {
    it("returns 1.0 always (no urgency detection yet)", () => {
      const card = makeCard();
      expect(urgencyFactor(card)).toBe(1.0);
    });

    it("returns 1.0 regardless of element type", () => {
      const button = makeCard({ elementType: "ButtonElement" });
      const input = makeCard({ elementType: "TextInputElement" });
      const link = makeCard({ elementType: "LinkElement" });

      expect(urgencyFactor(button)).toBe(1.0);
      expect(urgencyFactor(input)).toBe(1.0);
      expect(urgencyFactor(link)).toBe(1.0);
    });
  });

  describe("heuristicScore", () => {
    it("combines all factors", () => {
      const card = makeCard({
        confidenceScore: 100,
        boundingBox: { x: 0, y: 0, width: 100, height: 40 },
      });
      const score = heuristicScore(card);
      expect(score).toBeGreaterThan(0.8);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it("returns exactly 1.0 for perfect card", () => {
      const card = makeCard({
        confidenceScore: 100,
        boundingBox: { x: 0, y: 0, width: 100, height: 40 },
      });
      // confidence=1.0, location=1.0, size=1.0, urgency=1.0
      expect(heuristicScore(card)).toBe(1.0);
    });

    it("returns lower score for low confidence", () => {
      const highConfidence = makeCard({
        confidenceScore: 100,
        boundingBox: { x: 0, y: 0, width: 100, height: 40 },
      });
      const lowConfidence = makeCard({
        confidenceScore: 20,
        boundingBox: { x: 0, y: 0, width: 100, height: 40 },
      });

      expect(heuristicScore(lowConfidence)).toBeLessThan(
        heuristicScore(highConfidence)
      );
    });

    it("returns lower score for elements below fold", () => {
      const aboveFold = makeCard({
        confidenceScore: 80,
        boundingBox: { x: 0, y: 100, width: 100, height: 40 },
      });
      const belowFold = makeCard({
        confidenceScore: 80,
        boundingBox: { x: 0, y: 2000, width: 100, height: 40 },
      });

      expect(heuristicScore(belowFold)).toBeLessThan(heuristicScore(aboveFold));
    });

    it("returns lower score for tiny elements", () => {
      const normalSize = makeCard({
        confidenceScore: 80,
        boundingBox: { x: 0, y: 0, width: 100, height: 40 },
      });
      const tinySize = makeCard({
        confidenceScore: 80,
        boundingBox: { x: 0, y: 0, width: 5, height: 5 },
      });

      expect(heuristicScore(tinySize)).toBeLessThan(heuristicScore(normalSize));
    });

    it("clamps result to maximum of 1.0", () => {
      // Even with all high factors, should never exceed 1.0
      const card = makeCard({
        confidenceScore: 100,
        boundingBox: { x: 0, y: 0, width: 100, height: 40 },
      });
      expect(heuristicScore(card)).toBeLessThanOrEqual(1.0);
    });

    it("returns score greater than 0 even for worst case", () => {
      const worstCase = makeCard({
        confidenceScore: 0,
        boundingBox: { x: 0, y: 5000, width: 5, height: 5 },
      });
      expect(heuristicScore(worstCase)).toBeGreaterThan(0);
    });
  });
});
