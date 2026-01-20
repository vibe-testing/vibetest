/**
 * VibeTesting CLI - LLM Integration Types
 *
 * Type definitions for LLM-based test naming.
 *
 * @license MIT
 */

import type { IntentType } from '../analysis/types.js';
import type { VariationCategory } from '../generation/types.js';

/**
 * Context for generating a test name.
 */
export interface TestNamingContext {
  /** Flow name */
  flowName: string;
  /** Flow description */
  flowDescription: string;
  /** Detected intent type */
  intentType: IntentType;
  /** Variation category */
  variationCategory: VariationCategory;
  /** Variation description */
  variationDescription: string;
  /** Field name (for validation tests) */
  fieldName?: string;
  /** Constraint type (required, email, etc.) */
  constraintType?: string;
  /** Error type (for error handling tests) */
  errorType?: string;
  /** Input value being tested */
  inputValue?: string;
  /** Expected behavior */
  expectedBehavior?: string;
}

/**
 * Generated test name result.
 */
export interface GeneratedTestName {
  /** The semantic test name */
  name: string;
  /** Brief description of the test's purpose */
  description: string;
}

/**
 * Configuration for the LLM naming service.
 */
export interface LLMNamingConfig {
  /** Enable LLM-based naming (default: true if API key available) */
  enabled?: boolean;
  /** Maximum concurrent requests */
  maxConcurrent?: number;
  /** Request timeout in ms */
  timeout?: number;
  /** Enable response caching */
  cacheEnabled?: boolean;
  /** Cache TTL in ms */
  cacheTtl?: number;
  /** Batch size for batch requests */
  batchSize?: number;
}

/**
 * Default configuration values.
 */
export const DEFAULT_LLM_CONFIG: Required<LLMNamingConfig> = {
  enabled: true,
  maxConcurrent: 5,
  timeout: 30000,
  cacheEnabled: true,
  cacheTtl: 24 * 60 * 60 * 1000, // 24 hours
  batchSize: 10,
};
