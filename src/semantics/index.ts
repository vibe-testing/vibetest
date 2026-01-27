/**
 * Semantics module - Element analysis and scoring utilities.
 */

export {
  confidenceFactor,
  locationFactor,
  sizeFactor,
  urgencyFactor,
  heuristicScore,
} from "./heuristic.js";

export {
  MAX_ELEMENTS_PER_BATCH,
  MIN_HEURISTIC_SCORE,
  type ScoredElement,
  type ElementBatch,
  type BatchingResult,
  type BatchingOptions,
  getElementKey,
  createBatches,
} from "./batching.js";

export {
  MAX_OVERLAY_ELEMENTS,
  type LegendEntry,
  type OverlayResult,
  generateOverlay,
  getOverlayColor,
  getOverlayColors,
} from "./screenshot-overlay.js";

export {
  type SemanticElementKind,
  type ExplorationPriority,
  type SemanticElementScore,
  type SemanticElementScoreWithWeight,
  type SemanticAnalysisConfig,
  PRIORITY_MULTIPLIERS,
} from "./types.js";

export { type AnalyzeOptions, analyzeElements } from "./analyzer.js";
