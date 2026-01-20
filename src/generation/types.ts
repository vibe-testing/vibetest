/**
 * VibeTesting CLI - Test Generation Types
 *
 * Type definitions for test variation generation.
 *
 * @license MIT
 */

import type { RecordedEvent } from '../recording/types.js';
import type { AnalyzedFlow, ValidationRule, ErrorScenario } from '../analysis/types.js';

/**
 * Categories of test variations.
 */
export type VariationCategory =
  | 'happy_path'
  | 'validation'
  | 'error_handling'
  | 'edge_case'
  | 'security'
  | 'accessibility'
  | 'performance';

/**
 * Priority levels for test variations.
 */
export type VariationPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Types of test steps.
 */
export type TestStepType =
  | 'navigate'
  | 'click'
  | 'fill'
  | 'select'
  | 'check'
  | 'uncheck'
  | 'upload'
  | 'press_key'
  | 'wait'
  | 'screenshot'
  | 'mock_response'
  | 'intercept_request';

/**
 * Types of assertions.
 */
export type AssertionType =
  | 'visible'
  | 'hidden'
  | 'text_contains'
  | 'text_equals'
  | 'attribute_equals'
  | 'url_contains'
  | 'url_equals'
  | 'element_count'
  | 'enabled'
  | 'disabled'
  | 'checked'
  | 'focused'
  | 'has_class'
  | 'response_status'
  | 'response_body';

/**
 * A single step in a test case.
 */
export interface TestStep {
  /** Step type */
  type: TestStepType;
  /** Target element selector */
  selector?: string;
  /** Value to input or select */
  value?: string;
  /** URL for navigation */
  url?: string;
  /** Key to press */
  key?: string;
  /** Wait duration in ms */
  duration?: number;
  /** File path for upload */
  filePath?: string;
  /** Mock response configuration */
  mockResponse?: MockResponse;
  /** Human-readable description */
  description: string;
}

/**
 * Mock response for error injection.
 */
export interface MockResponse {
  /** URL pattern to intercept */
  urlPattern: string;
  /** HTTP status code */
  status: number;
  /** Response body */
  body?: string;
  /** Response headers */
  headers?: Record<string, string>;
  /** Delay before responding (ms) */
  delay?: number;
}

/**
 * An assertion to validate test expectations.
 */
export interface TestAssertion {
  /** Assertion type */
  type: AssertionType;
  /** Target element selector */
  selector?: string;
  /** Expected value */
  expected?: string | number | boolean;
  /** Negation flag */
  not?: boolean;
  /** Human-readable description */
  description: string;
}

/**
 * A complete test variation.
 */
export interface TestVariation {
  /** Unique identifier */
  id: string;
  /** Test name (semantic, readable) */
  name: string;
  /** Test description */
  description: string;
  /** Category of this variation */
  category: VariationCategory;
  /** Priority level */
  priority: VariationPriority;
  /** Steps to execute */
  steps: TestStep[];
  /** Assertions to validate */
  assertions: TestAssertion[];
  /** Tags for filtering */
  tags: string[];
  /** Source flow ID */
  sourceFlowId: string;
  /** Related validation rule (if applicable) */
  validationRule?: ValidationRule;
  /** Related error scenario (if applicable) */
  errorScenario?: ErrorScenario;
  /** Test timeout in ms */
  timeout?: number;
  /** Whether this test requires network mocking */
  requiresMocking?: boolean;
}

/**
 * A collection of test variations for a flow.
 */
export interface TestSuite {
  /** Suite identifier */
  id: string;
  /** Suite name */
  name: string;
  /** Suite description */
  description: string;
  /** Source analyzed flow */
  sourceFlow: AnalyzedFlow;
  /** Generated test variations */
  variations: TestVariation[];
  /** Generation timestamp */
  generatedAt: number;
  /** Configuration used */
  config: GenerationConfig;
}

/**
 * Configuration for test generation.
 */
export interface GenerationConfig {
  /** Include happy path tests */
  includeHappyPath: boolean;
  /** Include validation tests */
  includeValidation: boolean;
  /** Include error handling tests */
  includeErrorHandling: boolean;
  /** Include edge case tests */
  includeEdgeCases: boolean;
  /** Include security tests */
  includeSecurity: boolean;
  /** Minimum priority to include */
  minPriority: VariationPriority;
  /** Maximum variations per flow */
  maxVariationsPerFlow: number;
  /** Custom test name prefix */
  testNamePrefix?: string;
  /** Default timeout for tests (ms) */
  defaultTimeout: number;
  /** Base URL for tests */
  baseUrl?: string;
}

/**
 * Result of generating tests for multiple flows.
 */
export interface GenerationResult {
  /** Generated test suites */
  suites: TestSuite[];
  /** Total variations generated */
  totalVariations: number;
  /** Variations by category */
  variationsByCategory: Record<VariationCategory, number>;
  /** Generation timestamp */
  generatedAt: number;
  /** Warnings during generation */
  warnings: string[];
}

/**
 * Input data for test generation.
 */
export interface GenerationInput {
  /** Analyzed flows to generate tests for */
  flows: AnalyzedFlow[];
  /** Original recorded events (for reference) */
  events?: RecordedEvent[];
  /** Generation configuration */
  config?: Partial<GenerationConfig>;
}
