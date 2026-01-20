/**
 * VibeTesting CLI - Spec Generator
 *
 * Generates complete Playwright spec files from test suites.
 *
 * @license MIT
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TestSuite, TestVariation } from '../generation/types.js';
import {
  DEFAULT_CODEGEN_OPTIONS,
  type CodegenOptions,
  type GeneratedSpec,
  type CodegenResult,
  type GeneratedTest,
  type PlaywrightMock,
} from './types.js';
import { StepGenerator } from './step-generator.js';
import { AssertionGenerator } from './assertion-generator.js';

const DEFAULT_OPTIONS = DEFAULT_CODEGEN_OPTIONS;

/**
 * Generates Playwright spec files from test suites.
 *
 * @example
 * ```typescript
 * const generator = new SpecGenerator();
 * const result = generator.generateSpecs(suites, { outputDir: './tests' });
 *
 * console.log(result.totalTests); // Number of tests generated
 * console.log(result.specs[0].fileName); // First spec file name
 * ```
 */
export class SpecGenerator {
  private options: CodegenOptions;
  private stepGenerator: StepGenerator;
  private assertionGenerator: AssertionGenerator;

  constructor(options: Partial<CodegenOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.stepGenerator = new StepGenerator();
    this.assertionGenerator = new AssertionGenerator();
  }

  /**
   * Generates spec files for multiple test suites.
   *
   * @param suites - Test suites to generate specs for
   * @param options - Optional generation options override
   * @returns Code generation result
   */
  generateSpecs(
    suites: TestSuite[],
    options?: Partial<CodegenOptions>
  ): CodegenResult {
    const opts = { ...this.options, ...options };
    const specs: GeneratedSpec[] = [];
    const warnings: string[] = [];

    for (const suite of suites) {
      try {
        const spec = this.generateSpec(suite, opts);
        specs.push(spec);
        warnings.push(...spec.warnings);
      } catch (error) {
        warnings.push(`Failed to generate spec for suite ${suite.id}: ${error}`);
      }
    }

    const totalTests = specs.reduce((sum, spec) => sum + spec.testCount, 0);

    return {
      specs,
      totalTests,
      generatedAt: Date.now(),
      warnings,
    };
  }

  /**
   * Generates a single spec file from a test suite.
   */
  private generateSpec(suite: TestSuite, options: CodegenOptions): GeneratedSpec {
    const warnings: string[] = [];
    const fileName = this.generateFileName(suite, options);
    const filePath = path.join(options.outputDir, fileName);

    // Generate test blocks
    const tests: GeneratedTest[] = [];
    for (const variation of suite.variations) {
      try {
        const test = this.generateTest(variation, options);
        tests.push(test);
      } catch (error) {
        warnings.push(`Failed to generate test for variation ${variation.id}: ${error}`);
      }
    }

    // Generate complete spec content
    const content = this.generateSpecContent(suite, tests, options);

    return {
      fileName,
      filePath,
      content,
      sourceSuite: suite,
      testCount: tests.length,
      warnings,
    };
  }

  /**
   * Generates a test block from a variation.
   */
  private generateTest(
    variation: TestVariation,
    _options: CodegenOptions
  ): GeneratedTest {
    const body: string[] = [];

    // Extract mocks from steps
    const mocks = this.stepGenerator.extractMocks(variation.steps);

    // Add mock setup if needed
    if (mocks.length > 0) {
      body.push(...this.generateMockSetup(mocks));
      body.push('');
    }

    // Convert steps to Playwright code
    const stepLines = this.stepGenerator.convertSteps(
      variation.steps.filter((s) => s.type !== 'mock_response')
    );
    body.push(...stepLines);

    // Add assertions
    if (variation.assertions.length > 0) {
      body.push('');
      const assertionLines = this.assertionGenerator.convertAssertions(variation.assertions);
      body.push(...assertionLines);
    }

    const result: GeneratedTest = {
      name: variation.name,
      body,
      tags: variation.tags,
      requiresMocking: mocks.length > 0,
      mocks,
    };

    if (variation.timeout !== undefined) {
      result.timeout = variation.timeout;
    }

    return result;
  }

  /**
   * Generates mock setup code.
   */
  private generateMockSetup(mocks: PlaywrightMock[]): string[] {
    const lines: string[] = [];

    for (const mock of mocks) {
      lines.push(`// Mock API response`);
      lines.push(`await page.route('${mock.urlPattern}', async (route) => {`);

      if (mock.delay) {
        lines.push(`  await new Promise(r => setTimeout(r, ${mock.delay}));`);
      }

      lines.push(`  await route.fulfill({`);
      lines.push(`    status: ${mock.status},`);
      lines.push(`    contentType: '${mock.contentType}',`);
      lines.push(`    body: ${this.escapeMultilineString(mock.body)},`);
      lines.push(`  });`);
      lines.push(`});`);
    }

    return lines;
  }

  /**
   * Generates the complete spec file content.
   */
  private generateSpecContent(
    suite: TestSuite,
    tests: GeneratedTest[],
    options: CodegenOptions
  ): string {
    const lines: string[] = [];

    // File header
    lines.push(`/**`);
    lines.push(` * Generated by VibeTesting CLI`);
    lines.push(` * Source flow: ${suite.sourceFlow.id}`);
    lines.push(` * Generated at: ${new Date().toISOString()}`);
    lines.push(` */`);
    lines.push('');

    // Imports
    lines.push(`import { test, expect } from '@playwright/test';`);
    lines.push('');

    // Test configuration
    if (options.timeout !== DEFAULT_OPTIONS.timeout) {
      lines.push(`test.setTimeout(${options.timeout});`);
      lines.push('');
    }

    // Describe block
    lines.push(`test.describe('${this.escapeSingleQuote(suite.name)}', () => {`);

    // Before each hook if there's a common start URL
    if (suite.sourceFlow.startUrl) {
      lines.push(`  test.beforeEach(async ({ page }) => {`);
      lines.push(`    await page.goto('${this.escapeSingleQuote(suite.sourceFlow.startUrl)}');`);
      lines.push(`  });`);
      lines.push('');
    }

    // Generate each test
    for (const test of tests) {
      lines.push(...this.formatTestBlock(test, options));
      lines.push('');
    }

    // Close describe block
    lines.push(`});`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Formats a test block.
   */
  private formatTestBlock(test: GeneratedTest, options: CodegenOptions): string[] {
    const lines: string[] = [];

    // Build test annotation tags
    const annotations: string[] = [];
    if (test.tags.includes('skip')) {
      annotations.push('.skip');
    }
    if (test.tags.includes('only')) {
      annotations.push('.only');
    }

    // Test declaration
    const annotationStr = annotations.join('');
    lines.push(`  test${annotationStr}('${this.escapeSingleQuote(test.name)}', async ({ page }) => {`);

    // Custom timeout if specified
    if (test.timeout && test.timeout !== options.timeout) {
      lines.push(`    test.setTimeout(${test.timeout});`);
    }

    // Test body
    for (const line of test.body) {
      lines.push(`    ${line}`);
    }

    lines.push(`  });`);

    return lines;
  }

  /**
   * Generates a file name for a spec.
   */
  private generateFileName(suite: TestSuite, options: CodegenOptions): string {
    const baseName = suite.sourceFlow.intent.type.replace(/_/g, '-');
    const id = suite.id.split('_').pop() || Date.now().toString(36);
    const extension = options.typescript ? '.spec.ts' : '.spec.js';
    return `${baseName}-${id}${extension}`;
  }

  /**
   * Escapes a string for use in single quotes.
   */
  private escapeSingleQuote(str: string): string {
    return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
  }

  /**
   * Escapes a multiline string for code generation.
   */
  private escapeMultilineString(str: string): string {
    // For JSON or simple strings, just escape and wrap in quotes
    const escaped = str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
    return `'${escaped}'`;
  }

  /**
   * Writes generated specs to the file system.
   *
   * @param result - Code generation result
   * @returns Array of written file paths
   */
  writeSpecs(result: CodegenResult): string[] {
    const writtenPaths: string[] = [];

    // Ensure output directory exists
    const outputDir = this.options.outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write each spec file
    for (const spec of result.specs) {
      const fullPath = path.resolve(spec.filePath);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, spec.content, 'utf-8');
      writtenPaths.push(fullPath);
    }

    // Write fixture file if generated
    if (result.fixtureFile) {
      const fullPath = path.resolve(result.fixtureFile.filePath);
      fs.writeFileSync(fullPath, result.fixtureFile.content, 'utf-8');
      writtenPaths.push(fullPath);
    }

    // Write helpers file if generated
    if (result.helpersFile) {
      const fullPath = path.resolve(result.helpersFile.filePath);
      fs.writeFileSync(fullPath, result.helpersFile.content, 'utf-8');
      writtenPaths.push(fullPath);
    }

    return writtenPaths;
  }

  /**
   * Gets the current options.
   */
  getOptions(): CodegenOptions {
    return { ...this.options };
  }

  /**
   * Updates the options.
   */
  updateOptions(options: Partial<CodegenOptions>): void {
    this.options = { ...this.options, ...options };
  }
}
