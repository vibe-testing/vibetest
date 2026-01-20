/**
 * VibeTesting CLI - Test Generation Module
 *
 * Generates test variations from analyzed flows.
 *
 * @license MIT
 */

// Types - prefixed to avoid conflicts with other modules
export type {
  VariationCategory,
  VariationPriority,
  TestStepType,
  AssertionType as GenerationAssertionType,
  TestStep as GeneratedTestStep,
  MockResponse,
  TestAssertion as GeneratedTestAssertion,
  TestVariation,
  TestSuite,
  GenerationConfig,
  GenerationResult,
  GenerationInput,
} from './types.js';

// Main Generator
export {
  VariationGenerator,
  createStep,
  createAssertion,
  type VariationGeneratorOptions,
} from './variation-generator.js';

// Sub-generators
export { HappyPathGenerator } from './happy-path-generator.js';
export { ValidationVariationGenerator } from './validation-variation-generator.js';
export { ErrorVariationGenerator } from './error-variation-generator.js';
export { EdgeCaseGenerator } from './edge-case-generator.js';

// Test Naming
export { TestNamer } from './test-namer.js';

// Event Conversion
export {
  eventToStep,
  eventToSimpleStep,
  describeElement,
  eventsToSteps,
} from './event-converter.js';
