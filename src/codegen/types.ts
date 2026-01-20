/**
 * VibeTesting CLI - Code Generation Types
 *
 * Type definitions for Playwright test code generation.
 *
 * @license MIT
 */

import type { TestSuite } from '../generation/types.js';

/**
 * Options for code generation.
 */
export interface CodegenOptions {
  /** Output directory for generated spec files */
  outputDir: string;
  /** Base URL for tests (uses relative URLs if not specified) */
  baseUrl?: string;
  /** Whether to generate TypeScript (.ts) or JavaScript (.js) */
  typescript: boolean;
  /** Include fixture setup in each file */
  includeFixtures: boolean;
  /** Include helper utilities in each file */
  includeHelpers: boolean;
  /** Test timeout in milliseconds */
  timeout: number;
  /** Retry count for flaky tests */
  retries: number;
  /** Browser to target (chromium, firefox, webkit) */
  browser: 'chromium' | 'firefox' | 'webkit';
  /** Whether to run tests in headless mode */
  headless: boolean;
  /** Whether to include screenshots on failure */
  screenshotOnFailure: boolean;
  /** Whether to include video recording */
  videoRecording: boolean;
  /** Custom fixture imports */
  customFixtures?: string[];
}

/**
 * Result of generating a spec file.
 */
export interface GeneratedSpec {
  /** File name (e.g., "login-flow.spec.ts") */
  fileName: string;
  /** Full file path */
  filePath: string;
  /** Generated code content */
  content: string;
  /** Source test suite */
  sourceSuite: TestSuite;
  /** Number of tests in the spec */
  testCount: number;
  /** Warnings during generation */
  warnings: string[];
}

/**
 * Result of code generation for multiple suites.
 */
export interface CodegenResult {
  /** Generated spec files */
  specs: GeneratedSpec[];
  /** Total number of tests generated */
  totalTests: number;
  /** Fixture file (if generated separately) */
  fixtureFile?: GeneratedSpec;
  /** Helper utilities file (if generated separately) */
  helpersFile?: GeneratedSpec;
  /** Generation timestamp */
  generatedAt: number;
  /** Warnings during generation */
  warnings: string[];
}

/**
 * Playwright step representation.
 */
export interface PlaywrightStep {
  /** Playwright method call (e.g., "page.click", "page.fill") */
  method: string;
  /** Arguments to the method */
  args: string[];
  /** Comment describing the step */
  comment?: string;
  /** Whether this step needs await */
  needsAwait: boolean;
}

/**
 * Playwright assertion representation.
 */
export interface PlaywrightAssertion {
  /** Expect expression (e.g., "expect(page)") */
  expect: string;
  /** Matcher to call (e.g., "toHaveURL", "toBeVisible") */
  matcher: string;
  /** Arguments to the matcher */
  args: string[];
  /** Comment describing the assertion */
  comment?: string;
  /** Whether to negate the assertion */
  not?: boolean;
}

/**
 * Mock route configuration for Playwright.
 */
export interface PlaywrightMock {
  /** URL pattern to intercept */
  urlPattern: string;
  /** Response status code */
  status: number;
  /** Response body */
  body: string;
  /** Response content type */
  contentType: string;
  /** Optional delay before responding */
  delay?: number;
}

/**
 * Generated test block.
 */
export interface GeneratedTest {
  /** Test name */
  name: string;
  /** Test body as array of code lines */
  body: string[];
  /** Tags for the test */
  tags: string[];
  /** Whether the test requires mocking */
  requiresMocking: boolean;
  /** Mock configurations */
  mocks: PlaywrightMock[];
  /** Custom timeout for this test */
  timeout?: number;
}

/**
 * Default code generation options.
 */
export const DEFAULT_CODEGEN_OPTIONS: CodegenOptions = {
  outputDir: './tests/generated',
  typescript: true,
  includeFixtures: true,
  includeHelpers: true,
  timeout: 30000,
  retries: 0,
  browser: 'chromium',
  headless: true,
  screenshotOnFailure: true,
  videoRecording: false,
};
