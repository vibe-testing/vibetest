import { describe, it, expect } from "bun:test";
import {
  getElementKey,
  createBatches,
  MAX_ELEMENTS_PER_BATCH,
  MIN_HEURISTIC_SCORE,
} from "./batching.js";
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

describe("Batching Utilities", () => {
  describe("getElementKey", () => {
    it("generates key from selector and position", () => {
      const card = makeCard({
        selector: "//button[@id='submit']",
        boundingBox: { x: 100, y: 200, width: 50, height: 30 },
      });
      const key = getElementKey(card, 0);
      expect(key).toBe("//button[@id='submit']-100-200-0");
    });

    it("uses 0,0 when no bounding box", () => {
      const card = makeCard({ selector: "//input" });
      const key = getElementKey(card, 5);
      expect(key).toBe("//input-0-0-5");
    });

    it("includes original index in key", () => {
      const card = makeCard({
        selector: "//div",
        boundingBox: { x: 10, y: 20, width: 100, height: 50 },
      });
      expect(getElementKey(card, 0)).toBe("//div-10-20-0");
      expect(getElementKey(card, 10)).toBe("//div-10-20-10");
    });
  });

  describe("createBatches", () => {
    it("returns empty batches for empty input", () => {
      const result = createBatches([]);
      expect(result.batches).toHaveLength(0);
      expect(result.excludedElements).toHaveLength(0);
      expect(result.totalElements).toBe(0);
      expect(result.batchCount).toBe(0);
    });

    it("creates a single batch for small number of elements", () => {
      const cards = [
        makeCard({
          selector: "//button[1]",
          confidenceScore: 90,
          boundingBox: { x: 0, y: 0, width: 100, height: 40 },
        }),
        makeCard({
          selector: "//button[2]",
          confidenceScore: 85,
          boundingBox: { x: 0, y: 50, width: 100, height: 40 },
        }),
      ];

      const result = createBatches(cards);
      expect(result.batches).toHaveLength(1);
      expect(result.batches[0].elements).toHaveLength(2);
      expect(result.batches[0].isHighPriority).toBe(true);
      expect(result.batchCount).toBe(1);
    });

    it("excludes elements below minimum score", () => {
      const cards = [
        makeCard({
          selector: "//button[1]",
          confidenceScore: 90,
          boundingBox: { x: 0, y: 0, width: 100, height: 40 },
        }),
        makeCard({
          selector: "//button[2]",
          confidenceScore: 0, // Very low score
          boundingBox: { x: 0, y: 5000, width: 5, height: 5 }, // Bad position and size
        }),
      ];

      const result = createBatches(cards, { minScore: 0.5 });
      expect(result.batches[0].elements).toHaveLength(1);
      expect(result.excludedElements).toHaveLength(1);
    });

    it("sorts elements by heuristic score descending", () => {
      const cards = [
        makeCard({
          selector: "//button[1]",
          confidenceScore: 50,
          boundingBox: { x: 0, y: 500, width: 100, height: 40 },
        }),
        makeCard({
          selector: "//button[2]",
          confidenceScore: 100,
          boundingBox: { x: 0, y: 0, width: 100, height: 40 },
        }),
        makeCard({
          selector: "//button[3]",
          confidenceScore: 75,
          boundingBox: { x: 0, y: 100, width: 100, height: 40 },
        }),
      ];

      const result = createBatches(cards);
      const scores = result.batches[0].elements.map((e) => e.heuristicScore);

      // Should be sorted descending
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
      }
    });

    it("creates multiple batches when exceeding max size", () => {
      const cards: ElementCardDto[] = [];
      for (let i = 0; i < 45; i++) {
        cards.push(
          makeCard({
            selector: `//button[${i}]`,
            confidenceScore: 90,
            boundingBox: { x: 0, y: i * 10, width: 100, height: 40 },
          }),
        );
      }

      const result = createBatches(cards, { maxBatchSize: 20 });
      expect(result.batches).toHaveLength(3);
      expect(result.batches[0].elements).toHaveLength(20);
      expect(result.batches[1].elements).toHaveLength(20);
      expect(result.batches[2].elements).toHaveLength(5);
    });

    it("marks only first batch as high priority", () => {
      const cards: ElementCardDto[] = [];
      for (let i = 0; i < 25; i++) {
        cards.push(
          makeCard({
            selector: `//button[${i}]`,
            confidenceScore: 90,
            boundingBox: { x: 0, y: i * 10, width: 100, height: 40 },
          }),
        );
      }

      const result = createBatches(cards, { maxBatchSize: 10 });
      expect(result.batches[0].isHighPriority).toBe(true);
      expect(result.batches[1].isHighPriority).toBe(false);
      expect(result.batches[2].isHighPriority).toBe(false);
    });

    it("limits total elements when maxElementsForLlm is set", () => {
      const cards: ElementCardDto[] = [];
      for (let i = 0; i < 50; i++) {
        cards.push(
          makeCard({
            selector: `//button[${i}]`,
            confidenceScore: 90 - i, // Descending confidence
            boundingBox: { x: 0, y: i * 10, width: 100, height: 40 },
          }),
        );
      }

      const result = createBatches(cards, { maxElementsForLlm: 30 });

      const elementsInBatches = result.batches.reduce(
        (sum, batch) => sum + batch.elements.length,
        0,
      );
      expect(elementsInBatches).toBe(30);
      expect(result.excludedElements.length).toBeGreaterThan(0);
    });

    it("assigns correct batch indices", () => {
      const cards: ElementCardDto[] = [];
      for (let i = 0; i < 35; i++) {
        cards.push(
          makeCard({
            selector: `//button[${i}]`,
            confidenceScore: 90,
            boundingBox: { x: 0, y: i * 10, width: 100, height: 40 },
          }),
        );
      }

      const result = createBatches(cards, { maxBatchSize: 20 });
      expect(result.batches[0].batchIndex).toBe(0);
      expect(result.batches[1].batchIndex).toBe(1);
    });

    it("preserves original index in scored elements", () => {
      const cards = [
        makeCard({
          selector: "//button[1]",
          confidenceScore: 50,
          boundingBox: { x: 0, y: 500, width: 100, height: 40 },
        }),
        makeCard({
          selector: "//button[2]",
          confidenceScore: 100,
          boundingBox: { x: 0, y: 0, width: 100, height: 40 },
        }),
      ];

      const result = createBatches(cards);

      // Even though sorted, original indices should be preserved
      const indices = result.batches[0].elements.map((e) => e.originalIndex);
      expect(indices).toContain(0);
      expect(indices).toContain(1);
    });

    it("uses default options when not specified", () => {
      expect(MAX_ELEMENTS_PER_BATCH).toBe(20);
      expect(MIN_HEURISTIC_SCORE).toBe(0.1);

      const cards = [
        makeCard({
          selector: "//button",
          confidenceScore: 80,
          boundingBox: { x: 0, y: 0, width: 100, height: 40 },
        }),
      ];

      const result = createBatches(cards);
      expect(result.batches).toHaveLength(1);
    });
  });
});
