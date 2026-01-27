/**
 * Code Generation Module
 *
 * Generates Playwright test files from exploration graphs using BAML-powered
 * LLM prompts for intelligent test case creation.
 *
 * ## Architecture
 *
 * The code generation pipeline:
 * 1. Load exploration graph from disk
 * 2. Extract graph summary and user flows
 * 3. Call BAML to generate test cases
 * 4. Call BAML to generate Playwright code
 * 5. Write test files to disk
 *
 * ## Usage
 *
 * ```typescript
 * import { generateTests } from './codegen';
 * import { loadGraph } from './graph';
 *
 * const graph = await loadGraph('.vibetest/app-graph.json');
 * const result = await generateTests(graph, {
 *   outputDir: 'tests/e2e',
 *   projectName: 'my-app'
 * });
 * console.log(`Generated ${result.testFiles.length} test files`);
 * ```
 */

// Core utilities
export {
  generateFilename,
  groupTestsByCategory,
  writeTestFiles,
  createGraphSummary,
  identifyUserFlows,
  type GeneratedTest,
  type WriteResult,
  type GraphSummaryInput,
  type FlowInfo,
  DEFAULT_OUTPUT_DIR,
} from "./generator.js";
