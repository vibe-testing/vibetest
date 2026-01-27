/**
 * Batching utilities for grouping elements for LLM analysis.
 *
 * Elements are scored using heuristics and grouped into batches
 * to optimize LLM processing. Low-scoring elements are excluded
 * to focus analysis on the most important UI elements.
 */

import type { ElementCardDto } from "../detection/elements/types.js";
import { heuristicScore } from "./heuristic.js";

export const MAX_ELEMENTS_PER_BATCH = 20;
export const MIN_HEURISTIC_SCORE = 0.1;

export interface ScoredElement {
  card: ElementCardDto;
  heuristicScore: number;
  elementKey: string;
  originalIndex: number;
}

export interface ElementBatch {
  batchIndex: number;
  elements: ScoredElement[];
  isHighPriority: boolean;
}

export interface BatchingResult {
  batches: ElementBatch[];
  excludedElements: ScoredElement[];
  totalElements: number;
  batchCount: number;
}

export interface BatchingOptions {
  maxBatchSize?: number;
  minScore?: number;
  maxElementsForLlm?: number;
}

/**
 * Generate a unique key for an element based on its selector and position.
 */
export function getElementKey(card: ElementCardDto, originalIndex: number): string {
  const x = card.boundingBox?.x ?? 0;
  const y = card.boundingBox?.y ?? 0;
  return `${card.selector}-${x}-${y}-${originalIndex}`;
}

/**
 * Create batches of elements for LLM analysis.
 *
 * Elements are:
 * 1. Scored using heuristics
 * 2. Filtered by minimum score threshold
 * 3. Sorted by score (highest first)
 * 4. Optionally limited to a max count
 * 5. Grouped into batches of maxBatchSize
 *
 * @param cards - Array of element cards to batch
 * @param options - Batching configuration
 * @returns Batching result with batches and excluded elements
 */
export function createBatches(
  cards: ElementCardDto[],
  options: BatchingOptions = {},
): BatchingResult {
  const maxBatchSize = options.maxBatchSize ?? MAX_ELEMENTS_PER_BATCH;
  const minScore = options.minScore ?? MIN_HEURISTIC_SCORE;
  const maxElementsForLlm = options.maxElementsForLlm;

  const aboveThreshold: ScoredElement[] = [];
  const belowThreshold: ScoredElement[] = [];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const score = heuristicScore(card);
    const elementKey = getElementKey(card, i);
    const scored: ScoredElement = {
      card,
      heuristicScore: score,
      elementKey,
      originalIndex: i,
    };

    if (score >= minScore) {
      aboveThreshold.push(scored);
    } else {
      belowThreshold.push(scored);
    }
  }

  aboveThreshold.sort((a, b) => b.heuristicScore - a.heuristicScore);

  let forLlm: ScoredElement[];
  let beyondLimit: ScoredElement[];

  if (maxElementsForLlm !== undefined && aboveThreshold.length > maxElementsForLlm) {
    forLlm = aboveThreshold.slice(0, maxElementsForLlm);
    beyondLimit = aboveThreshold.slice(maxElementsForLlm);
  } else {
    forLlm = aboveThreshold;
    beyondLimit = [];
  }

  const excluded = [...belowThreshold, ...beyondLimit];

  const batches: ElementBatch[] = [];
  for (let i = 0; i < forLlm.length; i += maxBatchSize) {
    batches.push({
      batchIndex: batches.length,
      elements: forLlm.slice(i, i + maxBatchSize),
      isHighPriority: batches.length === 0,
    });
  }

  return {
    batches,
    excludedElements: excluded,
    totalElements: cards.length,
    batchCount: batches.length,
  };
}
