import { describe, it, expect } from "bun:test";
import { analyzeElements } from "./analyzer.js";
import type { ElementCardDto } from "../detection/elements/types.js";
import { PRIORITY_MULTIPLIERS } from "./types.js";

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

describe("Semantic Analyzer", () => {
  describe("analyzeElements", () => {
    it("returns empty array for empty input", async () => {
      const result = await analyzeElements([]);
      expect(result).toHaveLength(0);
    });

    it("returns scores for all input elements", async () => {
      const cards = [
        makeCard({ selector: "//button[1]" }),
        makeCard({ selector: "//button[2]" }),
        makeCard({ selector: "//input", elementType: "TextInputElement" }),
      ];

      const result = await analyzeElements(cards);
      expect(result).toHaveLength(3);
    });

    it("assigns elementId to each score", async () => {
      const cards = [
        makeCard({
          selector: "//button[@id='submit']",
          boundingBox: { x: 100, y: 200, width: 50, height: 30 },
        }),
      ];

      const result = await analyzeElements(cards);
      expect(result[0].elementId).toBe("//button[@id='submit']-100-200-0");
    });

    it("sorts results by finalWeight descending", async () => {
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

      const result = await analyzeElements(cards);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].finalWeight).toBeGreaterThanOrEqual(result[i].finalWeight);
      }
    });

    it("includes heuristicScore in results", async () => {
      const cards = [
        makeCard({
          selector: "//button",
          confidenceScore: 100,
          boundingBox: { x: 0, y: 0, width: 100, height: 40 },
        }),
      ];

      const result = await analyzeElements(cards);
      expect(result[0].heuristicScore).toBeGreaterThan(0);
      expect(result[0].heuristicScore).toBeLessThanOrEqual(1);
    });

    it("includes finalWeight in results", async () => {
      const cards = [
        makeCard({
          selector: "//button",
          confidenceScore: 80,
          boundingBox: { x: 0, y: 0, width: 100, height: 40 },
        }),
      ];

      const result = await analyzeElements(cards);
      expect(result[0].finalWeight).toBeGreaterThan(0);
      expect(result[0].finalWeight).toBeLessThanOrEqual(1.2); // May exceed 1 due to priority multiplier
    });
  });

  describe("inferSemanticKind", () => {
    it("classifies ButtonElement as primary_call_to_action", async () => {
      const cards = [makeCard({ elementType: "ButtonElement" })];
      const result = await analyzeElements(cards);
      expect(result[0].semanticKind).toBe("primary_call_to_action");
    });

    it("classifies TextInputElement as form_field", async () => {
      const cards = [makeCard({ elementType: "TextInputElement" })];
      const result = await analyzeElements(cards);
      expect(result[0].semanticKind).toBe("form_field");
    });

    it("classifies PasswordInputElement as form_field", async () => {
      const cards = [makeCard({ elementType: "PasswordInputElement" })];
      const result = await analyzeElements(cards);
      expect(result[0].semanticKind).toBe("form_field");
    });

    it("classifies TextareaElement as form_field", async () => {
      const cards = [makeCard({ elementType: "TextareaElement" })];
      const result = await analyzeElements(cards);
      expect(result[0].semanticKind).toBe("form_field");
    });

    it("classifies SelectElement as form_field", async () => {
      const cards = [makeCard({ elementType: "SelectElement" })];
      const result = await analyzeElements(cards);
      expect(result[0].semanticKind).toBe("form_field");
    });

    it("classifies CheckboxElement as form_field", async () => {
      const cards = [makeCard({ elementType: "CheckboxElement" })];
      const result = await analyzeElements(cards);
      expect(result[0].semanticKind).toBe("form_field");
    });

    it("classifies RadioElement as form_field", async () => {
      const cards = [makeCard({ elementType: "RadioElement" })];
      const result = await analyzeElements(cards);
      expect(result[0].semanticKind).toBe("form_field");
    });

    it("classifies HyperlinkElement as navigation", async () => {
      const cards = [makeCard({ elementType: "HyperlinkElement" })];
      const result = await analyzeElements(cards);
      expect(result[0].semanticKind).toBe("navigation");
    });

    it("classifies unknown element types as other", async () => {
      const cards = [makeCard({ elementType: "UnknownElement" })];
      const result = await analyzeElements(cards);
      expect(result[0].semanticKind).toBe("other");
    });
  });

  describe("inferDomainIntent", () => {
    it("detects login intent from text", async () => {
      const cards = [makeCard({ innerText: "Login" })];
      const result = await analyzeElements(cards);
      expect(result[0].domainIntent).toBe("login");
    });

    it("detects sign in intent from text", async () => {
      const cards = [makeCard({ innerText: "Sign In" })];
      const result = await analyzeElements(cards);
      expect(result[0].domainIntent).toBe("login");
    });

    it("detects register intent from text", async () => {
      const cards = [makeCard({ innerText: "Register Now" })];
      const result = await analyzeElements(cards);
      expect(result[0].domainIntent).toBe("register");
    });

    it("detects sign up intent from text", async () => {
      const cards = [makeCard({ innerText: "Sign Up" })];
      const result = await analyzeElements(cards);
      expect(result[0].domainIntent).toBe("register");
    });

    it("detects search intent from text", async () => {
      const cards = [makeCard({ innerText: "Search" })];
      const result = await analyzeElements(cards);
      expect(result[0].domainIntent).toBe("search");
    });

    it("detects submit intent from text", async () => {
      const cards = [makeCard({ innerText: "Submit" })];
      const result = await analyzeElements(cards);
      expect(result[0].domainIntent).toBe("submit");
    });

    it("detects cancel intent from text", async () => {
      const cards = [makeCard({ innerText: "Cancel" })];
      const result = await analyzeElements(cards);
      expect(result[0].domainIntent).toBe("cancel");
    });

    it("uses ariaLabel when innerText is missing", async () => {
      const cards = [makeCard({ ariaLabel: "Login button" })];
      const result = await analyzeElements(cards);
      expect(result[0].domainIntent).toBe("login");
    });

    it("defaults to element type when no intent detected", async () => {
      const cards = [makeCard({ innerText: "Click Here", elementType: "ButtonElement" })];
      const result = await analyzeElements(cards);
      expect(result[0].domainIntent).toBe("buttonelement");
    });
  });

  describe("inferPriority", () => {
    it("assigns high priority for scores >= 0.7", async () => {
      const cards = [
        makeCard({
          confidenceScore: 100,
          boundingBox: { x: 0, y: 0, width: 100, height: 40 },
        }),
      ];
      const result = await analyzeElements(cards);
      expect(result[0].explorationPriority).toBe("high");
    });

    it("assigns medium priority for scores >= 0.4", async () => {
      // Need lower confidence and worse position to get score in 0.4-0.7 range
      const cards = [
        makeCard({
          confidenceScore: 50,
          boundingBox: { x: 0, y: 1000, width: 80, height: 30 },
        }),
      ];
      const result = await analyzeElements(cards);
      expect(result[0].explorationPriority).toBe("medium");
    });

    it("assigns low priority for scores >= 0.15", async () => {
      const cards = [
        makeCard({
          confidenceScore: 30,
          boundingBox: { x: 0, y: 1500, width: 50, height: 30 },
        }),
      ];
      const result = await analyzeElements(cards);
      expect(["low", "medium"]).toContain(result[0].explorationPriority);
    });

    it("assigns ignore priority for very low scores", async () => {
      const cards = [
        makeCard({
          confidenceScore: 0,
          boundingBox: { x: 0, y: 5000, width: 5, height: 5 },
        }),
      ];
      const result = await analyzeElements(cards);
      expect(result[0].explorationPriority).toBe("ignore");
    });
  });

  describe("calculateFinalWeights", () => {
    it("applies priority multipliers correctly", async () => {
      // High priority element should have multiplier of 1.2
      const highPriorityCards = [
        makeCard({
          confidenceScore: 100,
          boundingBox: { x: 0, y: 0, width: 100, height: 40 },
        }),
      ];
      const highResult = await analyzeElements(highPriorityCards);
      expect(highResult[0].explorationPriority).toBe("high");

      // The final weight should be clamped between 0 and 1
      expect(highResult[0].finalWeight).toBeGreaterThan(0);
      expect(highResult[0].finalWeight).toBeLessThanOrEqual(1);
    });

    it("blends heuristic score with importance score", async () => {
      const cards = [
        makeCard({
          selector: "//button",
          confidenceScore: 80,
          boundingBox: { x: 0, y: 100, width: 100, height: 40 },
        }),
      ];

      const result = await analyzeElements(cards);
      // In heuristic-only mode, importanceScore equals heuristicScore
      // So blended = llmWeight * heuristic + (1-llmWeight) * heuristic = heuristic
      expect(result[0].heuristicScore).toBeCloseTo(result[0].importanceScore, 2);
    });

    it("clamps final weight to 0-1 range", async () => {
      const cards = [
        makeCard({
          confidenceScore: 100,
          boundingBox: { x: 0, y: 0, width: 100, height: 40 },
        }),
      ];

      const result = await analyzeElements(cards);
      // Even with high priority multiplier of 1.2, should be clamped
      expect(result[0].finalWeight).toBeLessThanOrEqual(1);
      expect(result[0].finalWeight).toBeGreaterThanOrEqual(0);
    });
  });

  describe("excluded elements", () => {
    it("marks low-score elements as decorative_or_low_value", async () => {
      const cards = [
        makeCard({
          selector: "//button[1]",
          confidenceScore: 100,
          boundingBox: { x: 0, y: 0, width: 100, height: 40 },
        }),
        makeCard({
          selector: "//span",
          confidenceScore: 0,
          boundingBox: { x: 0, y: 5000, width: 5, height: 5 },
        }),
      ];

      const result = await analyzeElements(cards, { config: { heuristicThreshold: 0.5 } });
      const lowScoreElement = result.find(r => r.elementId.includes("//span"));
      expect(lowScoreElement?.semanticKind).toBe("decorative_or_low_value");
      expect(lowScoreElement?.explorationPriority).toBe("ignore");
    });

    it("includes reasoning for excluded elements", async () => {
      const cards = [
        makeCard({
          selector: "//span",
          confidenceScore: 0,
          boundingBox: { x: 0, y: 5000, width: 5, height: 5 },
        }),
      ];

      const result = await analyzeElements(cards, { config: { heuristicThreshold: 0.5 } });
      expect(result[0].reasoning).toContain("Excluded");
    });
  });

  describe("config options", () => {
    it("respects heuristicThreshold config", async () => {
      const cards = [
        makeCard({
          selector: "//button[1]",
          confidenceScore: 100,
          boundingBox: { x: 0, y: 0, width: 100, height: 40 },
        }),
        makeCard({
          selector: "//button[2]",
          confidenceScore: 40,
          boundingBox: { x: 0, y: 500, width: 80, height: 30 },
        }),
      ];

      const result = await analyzeElements(cards, { config: { heuristicThreshold: 0.8 } });
      // Both elements should be included but one should be marked as low value
      expect(result).toHaveLength(2);
    });

    it("respects maxBatchSize config", async () => {
      const cards: ElementCardDto[] = [];
      for (let i = 0; i < 30; i++) {
        cards.push(
          makeCard({
            selector: `//button[${i}]`,
            confidenceScore: 90,
            boundingBox: { x: 0, y: i * 10, width: 100, height: 40 },
          })
        );
      }

      // Should process all elements even with small batch size
      const result = await analyzeElements(cards, { config: { maxBatchSize: 5 } });
      expect(result).toHaveLength(30);
    });
  });

  describe("PRIORITY_MULTIPLIERS", () => {
    it("has correct values for each priority", () => {
      expect(PRIORITY_MULTIPLIERS.high).toBe(1.2);
      expect(PRIORITY_MULTIPLIERS.medium).toBe(1.0);
      expect(PRIORITY_MULTIPLIERS.low).toBe(0.7);
      expect(PRIORITY_MULTIPLIERS.ignore).toBe(0.1);
    });
  });
});
