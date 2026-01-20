/**
 * VibeTesting CLI - Variation Generator
 *
 * Generates test variations from analyzed flows.
 * Creates happy path, validation, error, and edge case tests.
 *
 * @license MIT
 */

import type { AnalyzedFlow } from '../analysis/types.js';
import type {
  TestVariation,
  TestStep,
  TestAssertion,
  TestSuite,
  GenerationConfig,
  GenerationResult,
  GenerationInput,
  VariationCategory,
  VariationPriority,
} from './types.js';
import { HappyPathGenerator } from './happy-path-generator.js';
import { ValidationVariationGenerator } from './validation-variation-generator.js';
import { ErrorVariationGenerator } from './error-variation-generator.js';
import { EdgeCaseGenerator } from './edge-case-generator.js';
import { TestNamer } from './test-namer.js';

const DEFAULT_CONFIG: GenerationConfig = {
  includeHappyPath: true,
  includeValidation: true,
  includeErrorHandling: true,
  includeEdgeCases: true,
  includeSecurity: true,
  minPriority: 'low',
  maxVariationsPerFlow: 25,
  defaultTimeout: 30000,
};

const PRIORITY_ORDER: Record<VariationPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * VariationGenerator creates multiple test variations from analyzed flows.
 *
 * @example
 * ```typescript
 * const generator = new VariationGenerator();
 * const result = generator.generateFromFlows(analyzedFlows);
 *
 * console.log(result.totalVariations); // 15+ variations per flow
 * console.log(result.suites[0].variations[0].name); // Semantic test name
 * ```
 */
export class VariationGenerator {
  private config: GenerationConfig;
  private happyPathGenerator: HappyPathGenerator;
  private validationGenerator: ValidationVariationGenerator;
  private errorGenerator: ErrorVariationGenerator;
  private edgeCaseGenerator: EdgeCaseGenerator;
  private testNamer: TestNamer;

  constructor(config: Partial<GenerationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.happyPathGenerator = new HappyPathGenerator();
    this.validationGenerator = new ValidationVariationGenerator();
    this.errorGenerator = new ErrorVariationGenerator();
    this.edgeCaseGenerator = new EdgeCaseGenerator();
    this.testNamer = new TestNamer();
  }

  /**
   * Generates test variations for multiple analyzed flows.
   *
   * @param input - Generation input with flows and optional config
   * @returns Generation result with all test suites
   */
  generateFromFlows(input: GenerationInput): GenerationResult {
    const config = { ...this.config, ...input.config };
    const suites: TestSuite[] = [];
    const warnings: string[] = [];
    const variationsByCategory: Record<VariationCategory, number> = {
      happy_path: 0,
      validation: 0,
      error_handling: 0,
      edge_case: 0,
      security: 0,
      accessibility: 0,
      performance: 0,
    };

    for (const flow of input.flows) {
      try {
        const suite = this.generateSuiteForFlow(flow, config);

        // Count variations by category
        for (const variation of suite.variations) {
          variationsByCategory[variation.category]++;
        }

        suites.push(suite);
      } catch (error) {
        warnings.push(`Failed to generate tests for flow ${flow.id}: ${error}`);
      }
    }

    const totalVariations = suites.reduce(
      (sum, suite) => sum + suite.variations.length,
      0
    );

    return {
      suites,
      totalVariations,
      variationsByCategory,
      generatedAt: Date.now(),
      warnings,
    };
  }

  /**
   * Generates a test suite for a single flow.
   */
  private generateSuiteForFlow(
    flow: AnalyzedFlow,
    config: GenerationConfig
  ): TestSuite {
    const variations: TestVariation[] = [];

    // Generate happy path variations
    if (config.includeHappyPath) {
      const happyPath = this.happyPathGenerator.generate(flow, config);
      variations.push(...happyPath);
    }

    // Generate validation variations
    if (config.includeValidation && flow.validations.length > 0) {
      const validationTests = this.validationGenerator.generate(flow, config);
      variations.push(...validationTests);
    }

    // Generate error handling variations
    if (config.includeErrorHandling && flow.errorScenarios.length > 0) {
      const errorTests = this.errorGenerator.generate(flow, config);
      variations.push(...errorTests);
    }

    // Generate edge case variations
    if (config.includeEdgeCases) {
      const edgeCases = this.edgeCaseGenerator.generate(flow, config);
      variations.push(...edgeCases);
    }

    // Filter by minimum priority
    const filteredVariations = this.filterByPriority(
      variations,
      config.minPriority
    );

    // Limit variations per flow
    const limitedVariations = this.limitVariations(
      filteredVariations,
      config.maxVariationsPerFlow
    );

    // Apply semantic naming
    const namedVariations = limitedVariations.map((v) =>
      this.testNamer.applyNaming(v, flow)
    );

    return {
      id: `suite_${flow.id}`,
      name: this.generateSuiteName(flow),
      description: `Test suite for ${flow.name}`,
      sourceFlow: flow,
      variations: namedVariations,
      generatedAt: Date.now(),
      config,
    };
  }

  /**
   * Filters variations by minimum priority level.
   */
  private filterByPriority(
    variations: TestVariation[],
    minPriority: VariationPriority
  ): TestVariation[] {
    const minOrder = PRIORITY_ORDER[minPriority];
    return variations.filter(
      (v) => PRIORITY_ORDER[v.priority] <= minOrder
    );
  }

  /**
   * Limits variations to max count, prioritizing higher priority tests.
   */
  private limitVariations(
    variations: TestVariation[],
    maxCount: number
  ): TestVariation[] {
    if (variations.length <= maxCount) {
      return variations;
    }

    // Sort by priority (critical first) and take top N
    const sorted = [...variations].sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    );

    return sorted.slice(0, maxCount);
  }

  /**
   * Generates a suite name from the flow.
   */
  private generateSuiteName(flow: AnalyzedFlow): string {
    const intentName = flow.intent.type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return `${intentName} Tests`;
  }

  /**
   * Gets the current configuration.
   */
  getConfig(): GenerationConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration.
   */
  updateConfig(config: Partial<GenerationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Utility function to create a test step.
 */
export function createStep(
  type: TestStep['type'],
  description: string,
  options?: Partial<Omit<TestStep, 'type' | 'description'>>
): TestStep {
  const step: TestStep = { type, description };
  if (options?.selector) step.selector = options.selector;
  if (options?.value !== undefined) step.value = options.value;
  if (options?.url) step.url = options.url;
  if (options?.key) step.key = options.key;
  if (options?.duration !== undefined) step.duration = options.duration;
  if (options?.filePath) step.filePath = options.filePath;
  if (options?.mockResponse) step.mockResponse = options.mockResponse;
  return step;
}

/**
 * Utility function to create a test assertion.
 */
export function createAssertion(
  type: TestAssertion['type'],
  description: string,
  options?: Partial<Omit<TestAssertion, 'type' | 'description'>>
): TestAssertion {
  const assertion: TestAssertion = { type, description };
  if (options?.selector) assertion.selector = options.selector;
  if (options?.expected !== undefined) assertion.expected = options.expected;
  if (options?.not) assertion.not = options.not;
  return assertion;
}
