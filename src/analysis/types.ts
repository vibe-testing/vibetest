/**
 * VibeTesting CLI - Analysis Types
 *
 * Type definitions for flow analysis and test generation insights.
 *
 * @license MIT
 */

import type { RecordedEvent } from '../recording/types.js';

/**
 * User intent patterns detected in recorded flows.
 */
export type IntentType =
  | 'form_submission'
  | 'search'
  | 'navigation'
  | 'authentication'
  | 'checkout'
  | 'filter'
  | 'sort'
  | 'pagination'
  | 'file_upload'
  | 'data_entry'
  | 'selection'
  | 'modal_interaction'
  | 'menu_navigation'
  | 'unknown';

/**
 * Types of assertions that can be generated.
 */
export type AssertionType =
  | 'page_load'
  | 'url_change'
  | 'element_visible'
  | 'element_hidden'
  | 'text_content'
  | 'input_value'
  | 'attribute_value'
  | 'element_count'
  | 'network_request'
  | 'cookie_set'
  | 'storage_set'
  | 'redirect';

/**
 * Validation constraint types.
 */
export type ValidationConstraint =
  | 'required'
  | 'email'
  | 'url'
  | 'phone'
  | 'number'
  | 'min_length'
  | 'max_length'
  | 'min_value'
  | 'max_value'
  | 'pattern'
  | 'date'
  | 'time'
  | 'file_type'
  | 'file_size';

/**
 * Error scenario types.
 */
export type ErrorScenarioType =
  | 'network_timeout'
  | 'server_error'
  | 'validation_error'
  | 'authentication_error'
  | 'authorization_error'
  | 'rate_limit'
  | 'not_found'
  | 'conflict'
  | 'client_error';

/**
 * Detected user intent with confidence score.
 */
export interface DetectedIntent {
  type: IntentType;
  confidence: number; // 0-1
  startEventIndex: number;
  endEventIndex: number;
  triggerEvents: string[]; // Event IDs
  metadata: Record<string, unknown>;
}

/**
 * An assertion to be generated for a test.
 */
export interface GeneratedAssertion {
  type: AssertionType;
  selector?: string;
  expected?: string | number | boolean;
  operator?: 'equals' | 'contains' | 'matches' | 'greaterThan' | 'lessThan';
  description: string;
  confidence: number;
}

/**
 * A validation rule extracted from form interactions.
 */
export interface ValidationRule {
  fieldSelector: string;
  fieldName?: string;
  constraint: ValidationConstraint;
  value?: string | number;
  errorMessage?: string;
  confidence: number;
}

/**
 * An error scenario that should be tested.
 */
export interface ErrorScenario {
  type: ErrorScenarioType;
  trigger: string; // Description of what triggers the error
  selector?: string;
  expectedBehavior: string;
  statusCode?: number;
  errorMessage?: string;
}

/**
 * A logical flow extracted from recorded events.
 */
export interface AnalyzedFlow {
  id: string;
  name: string;
  description: string;
  intent: DetectedIntent;
  events: RecordedEvent[];
  assertions: GeneratedAssertion[];
  validations: ValidationRule[];
  errorScenarios: ErrorScenario[];
  startUrl: string;
  endUrl?: string;
  duration: number;
  confidence: number;
}

/**
 * Insight about a flow or pattern.
 */
export interface FlowInsight {
  type: 'pattern' | 'warning' | 'optimization' | 'coverage';
  message: string;
  confidence: number;
  relatedEvents?: string[];
  suggestion?: string;
}

/**
 * Complete analysis result for a recording session.
 */
export interface AnalysisResult {
  sessionId: string;
  flows: AnalyzedFlow[];
  insights: FlowInsight[];
  validationRules: ValidationRule[];
  errorScenarios: ErrorScenario[];
  coverage: CoverageMetrics;
  analyzedAt: number;
}

/**
 * Coverage metrics for analyzed flows.
 */
export interface CoverageMetrics {
  totalEvents: number;
  analyzedEvents: number;
  uniquePages: number;
  uniqueSelectors: number;
  intentTypes: Record<IntentType, number>;
  assertionCount: number;
  validationCount: number;
  errorScenarioCount: number;
}

/**
 * Configuration for flow analysis.
 */
export interface AnalysisConfig {
  /** Minimum confidence threshold for intents (0-1, default: 0.5) */
  minIntentConfidence?: number;
  /** Minimum confidence for assertions (0-1, default: 0.6) */
  minAssertionConfidence?: number;
  /** Maximum events to group into a single flow */
  maxFlowEvents?: number;
  /** Time gap (ms) to split flows */
  flowSplitGap?: number;
  /** Include low-confidence validations */
  includeLowConfidenceValidations?: boolean;
  /** Generate error scenarios */
  generateErrorScenarios?: boolean;
}
