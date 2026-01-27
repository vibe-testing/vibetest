/**
 * Semantic element analyzer that combines heuristic scoring with optional LLM analysis.
 *
 * This analyzer scores UI elements based on their semantic importance for testing.
 * In MVP mode, it uses heuristic-only scoring. LLM integration can be added later.
 */

import type { Page } from "playwright";
import type { ElementCardDto } from "../detection/elements/types.js";
import { createBatches, getElementKey } from "./batching.js";
import type {
  SemanticAnalysisConfig,
  SemanticElementScore,
  SemanticElementScoreWithWeight,
  ExplorationPriority,
} from "./types.js";
import { PRIORITY_MULTIPLIERS } from "./types.js";

const DEFAULT_CONFIG: Required<SemanticAnalysisConfig> = {
  llmWeight: 0.7,
  maxBatchSize: 20,
  includeScreenshots: true,
  heuristicThreshold: 0.1,
  maxElementsForLlm: 50,
};

export interface AnalyzeOptions {
  page?: Page;
  url?: string;
  config?: SemanticAnalysisConfig;
  useLlm?: boolean; // Default: false for MVP
}

/**
 * Analyze a collection of element cards and return semantic scores with weights.
 *
 * @param cards - Array of element cards to analyze
 * @param options - Analysis options including config and LLM toggle
 * @returns Array of scored elements sorted by final weight (descending)
 */
export async function analyzeElements(
  cards: ElementCardDto[],
  options: AnalyzeOptions = {},
): Promise<SemanticElementScoreWithWeight[]> {
  const cfg = { ...DEFAULT_CONFIG, ...options.config };

  if (cards.length === 0) return [];

  // Create batches based on heuristic scores
  const batchResult = createBatches(cards, {
    maxBatchSize: cfg.maxBatchSize,
    minScore: cfg.heuristicThreshold,
    maxElementsForLlm: cfg.maxElementsForLlm,
  });

  // For MVP: Use heuristic-only scoring
  // LLM analysis can be added later when options.useLlm is true
  const allScores: SemanticElementScore[] = [];

  // Process batched elements with heuristic-based defaults
  for (const batch of batchResult.batches) {
    for (const el of batch.elements) {
      allScores.push({
        elementId: el.elementKey,
        semanticKind: inferSemanticKind(el.card),
        domainIntent: inferDomainIntent(el.card),
        importanceScore: el.heuristicScore,
        explorationPriority: inferPriority(el.heuristicScore),
        reasoning: "Heuristic classification",
      });
    }
  }

  // Add default scores for excluded elements
  for (const el of batchResult.excludedElements) {
    allScores.push({
      elementId: el.elementKey,
      semanticKind: "decorative_or_low_value",
      domainIntent: "low_value_element",
      importanceScore: el.heuristicScore,
      explorationPriority: "ignore",
      reasoning: "Excluded due to low heuristic score",
    });
  }

  // Build heuristic score lookup
  const heuristicScores = new Map<string, number>();
  for (const batch of batchResult.batches) {
    for (const el of batch.elements) {
      heuristicScores.set(el.elementKey, el.heuristicScore);
    }
  }
  for (const el of batchResult.excludedElements) {
    heuristicScores.set(el.elementKey, el.heuristicScore);
  }

  // Calculate final weights
  return calculateFinalWeights(cards, allScores, heuristicScores, cfg.llmWeight);
}

/**
 * Infer the semantic kind of an element based on its type.
 */
function inferSemanticKind(card: ElementCardDto): SemanticElementScore["semanticKind"] {
  switch (card.elementType) {
    case "ButtonElement":
      return "primary_call_to_action";
    case "TextInputElement":
    case "PasswordInputElement":
    case "TextareaElement":
    case "SelectElement":
    case "CheckboxElement":
    case "RadioElement":
      return "form_field";
    case "HyperlinkElement":
      return "navigation";
    default:
      return "other";
  }
}

/**
 * Infer the domain intent of an element based on its text content.
 */
function inferDomainIntent(card: ElementCardDto): string {
  const text = (card.innerText ?? card.ariaLabel ?? "").toLowerCase();
  if (text.includes("login") || text.includes("sign in")) return "login";
  if (text.includes("register") || text.includes("sign up")) return "register";
  if (text.includes("search")) return "search";
  if (text.includes("submit")) return "submit";
  if (text.includes("cancel")) return "cancel";
  return card.elementType?.toLowerCase() ?? "unknown";
}

/**
 * Infer exploration priority based on heuristic score.
 */
function inferPriority(score: number): ExplorationPriority {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  if (score >= 0.15) return "low";
  return "ignore";
}

/**
 * Calculate final weights by blending heuristic and semantic scores.
 */
function calculateFinalWeights(
  cards: ElementCardDto[],
  semanticScores: SemanticElementScore[],
  heuristicScores: Map<string, number>,
  llmWeight: number,
): SemanticElementScoreWithWeight[] {
  const heuristicWeight = 1 - llmWeight;
  const results: SemanticElementScoreWithWeight[] = [];

  const scoreById = new Map<string, SemanticElementScore>();
  for (const score of semanticScores) {
    scoreById.set(score.elementId, score);
  }

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const elementId = getElementKey(card, i);
    const semantic = scoreById.get(elementId);
    const heuristic = heuristicScores.get(elementId) ?? 0;

    if (!semantic) {
      results.push({
        elementId,
        semanticKind: "other",
        domainIntent: "unknown",
        importanceScore: heuristic,
        explorationPriority: inferPriority(heuristic),
        heuristicScore: heuristic,
        finalWeight: heuristic,
      });
      continue;
    }

    const blended = llmWeight * semantic.importanceScore + heuristicWeight * heuristic;
    const multiplier = PRIORITY_MULTIPLIERS[semantic.explorationPriority];
    const finalWeight = Math.max(0, Math.min(1, blended * multiplier));

    results.push({
      ...semantic,
      heuristicScore: heuristic,
      finalWeight,
    });
  }

  return results.sort((a, b) => b.finalWeight - a.finalWeight);
}
