/**
 * VibeTesting CLI - Code Generation Module
 *
 * Generates Playwright spec files from test suites.
 *
 * @license MIT
 */

// Types
export type {
  CodegenOptions,
  GeneratedSpec,
  CodegenResult,
  PlaywrightStep,
  PlaywrightAssertion,
  PlaywrightMock,
  GeneratedTest,
} from './types.js';

export { DEFAULT_CODEGEN_OPTIONS } from './types.js';

// Generators
export { SpecGenerator } from './spec-generator.js';
export { StepGenerator } from './step-generator.js';
export { AssertionGenerator } from './assertion-generator.js';
