/**
 * Type definitions for semantic element analysis.
 *
 * These types define how elements are classified semantically
 * and scored for exploration priority.
 */

/**
 * Semantic classification of UI elements based on their purpose and behavior.
 */
export type SemanticElementKind =
  | 'primary_call_to_action'
  | 'secondary_action'
  | 'navigation'
  | 'form_field'
  | 'search'
  | 'filter_or_sort'
  | 'pagination'
  | 'dangerous_action'
  | 'dismiss_or_close'
  | 'decorative_or_low_value'
  | 'other';

/**
 * Priority level for element exploration during testing.
 */
export type ExplorationPriority = 'high' | 'medium' | 'low' | 'ignore';

/**
 * Semantic score for an element, containing classification and importance.
 */
export interface SemanticElementScore {
  elementId: string;
  semanticKind: SemanticElementKind;
  domainIntent: string;
  importanceScore: number;
  explorationPriority: ExplorationPriority;
  reasoning?: string;
}

/**
 * Extended semantic score that includes heuristic score and final weight.
 */
export interface SemanticElementScoreWithWeight extends SemanticElementScore {
  heuristicScore: number;
  finalWeight: number;
}

/**
 * Configuration options for semantic analysis.
 */
export interface SemanticAnalysisConfig {
  /** Weight for LLM scores vs heuristic scores (0-1). Default: 0.7 */
  llmWeight?: number;
  /** Maximum elements per batch for LLM analysis. Default: 20 */
  maxBatchSize?: number;
  /** Whether to include screenshots in LLM analysis. Default: true */
  includeScreenshots?: boolean;
  /** Minimum heuristic score threshold for inclusion. Default: 0.1 */
  heuristicThreshold?: number;
  /** Maximum elements to send for LLM analysis. Default: 50 */
  maxElementsForLlm?: number;
}

/**
 * Multipliers applied to final scores based on exploration priority.
 */
export const PRIORITY_MULTIPLIERS: Record<ExplorationPriority, number> = {
  high: 1.2,
  medium: 1.0,
  low: 0.7,
  ignore: 0.1,
};
