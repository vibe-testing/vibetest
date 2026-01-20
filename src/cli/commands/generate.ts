import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { FlowAnalyzer } from '../../analysis/flow-analyzer.js';
import { VariationGenerator } from '../../generation/variation-generator.js';
import { SpecGenerator } from '../../codegen/spec-generator.js';
import type { RecordingSession } from '../../recording/types.js';
import type { GenerationConfig, VariationPriority } from '../../generation/types.js';
import type { CodegenOptions } from '../../codegen/types.js';

interface GenerateCommandOptions {
  output: string;
  javascript: boolean;
  timeout: string;
  variations: string;
  minPriority: string; // 'critical' | 'high' | 'medium' | 'low'
  skipMocks: boolean;
  dryRun: boolean;
}

const PRIORITY_MAP: Record<string, VariationPriority> = {
  '1': 'critical',
  '2': 'high',
  '3': 'medium',
  '4': 'low',
  'critical': 'critical',
  'high': 'high',
  'medium': 'medium',
  'low': 'low',
};

/**
 * Loads and parses a recording JSON file.
 */
function loadRecording(filePath: string): RecordingSession {
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');

  try {
    return JSON.parse(content) as RecordingSession;
  } catch {
    throw new Error(`Invalid JSON in file: ${resolvedPath}`);
  }
}

/**
 * Creates a directory if it doesn't exist.
 */
function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * The generate command handler.
 * Analyzes recordings and generates Playwright test specs.
 *
 * @param recordingPath - Path to the recording.json file
 * @param options - Command options
 */
export async function generateCommand(
  recordingPath: string,
  options: GenerateCommandOptions
): Promise<void> {
  // Parse numeric options
  const timeout = parseInt(options.timeout, 10);
  const maxVariations = parseInt(options.variations, 10);
  const minPriority = PRIORITY_MAP[options.minPriority];

  if (isNaN(timeout) || timeout < 1000) {
    console.error(chalk.red('Error: --timeout must be at least 1000ms'));
    process.exit(1);
  }

  if (isNaN(maxVariations) || maxVariations < 1) {
    console.error(chalk.red('Error: --variations must be a positive integer'));
    process.exit(1);
  }

  if (!minPriority) {
    console.error(chalk.red('Error: --min-priority must be 1-4, or critical/high/medium/low'));
    process.exit(1);
  }

  // Resolve paths
  const outputDir = path.resolve(options.output);

  // Display configuration
  console.log(chalk.bold('\nVibeTest Generator'));
  console.log(chalk.gray('='.repeat(50)));
  console.log(chalk.cyan('Recording:      ') + recordingPath);
  console.log(chalk.cyan('Output:         ') + outputDir);
  console.log(chalk.cyan('TypeScript:     ') + (!options.javascript ? 'Yes' : 'No'));
  console.log(chalk.cyan('Max Variations: ') + maxVariations);
  console.log(chalk.cyan('Min Priority:   ') + minPriority);
  console.log(chalk.cyan('Skip Mocks:     ') + (options.skipMocks ? 'Yes' : 'No'));
  console.log(chalk.cyan('Dry Run:        ') + (options.dryRun ? 'Yes' : 'No'));
  console.log(chalk.gray('='.repeat(50)) + '\n');

  // Load recording
  const spinner = ora({
    text: 'Loading recording...',
    color: 'cyan',
  }).start();

  let recording: RecordingSession;
  try {
    recording = loadRecording(recordingPath);
    spinner.succeed(chalk.green(`Loaded recording with ${recording.events.length} events`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to load recording'));
    console.error(chalk.yellow((error as Error).message));
    process.exit(1);
  }

  // Analyze flows
  spinner.start('Analyzing user flows...');

  const analyzer = new FlowAnalyzer();
  const analysisResult = analyzer.analyzeSession(recording);
  const analyzedFlows = analysisResult.flows;

  spinner.succeed(chalk.green(`Analyzed ${analyzedFlows.length} flow(s)`));

  if (analyzedFlows.length === 0) {
    console.log(chalk.yellow('\nNo flows detected in the recording.'));
    console.log(chalk.gray('Tips:'));
    console.log(chalk.gray('  - Make sure you recorded user interactions'));
    console.log(chalk.gray('  - Try recording a complete user flow (e.g., form submission)'));
    process.exit(0);
  }

  // Print flow summary
  console.log(chalk.bold('\nDetected Flows:'));
  for (const flow of analyzedFlows) {
    const intentType = flow.intent.type.replace(/_/g, ' ');
    const confidence = (flow.intent.confidence * 100).toFixed(0);
    console.log(chalk.cyan(`  - ${flow.name}`));
    console.log(chalk.gray(`    Intent: ${intentType} (${confidence}% confidence)`));
    console.log(chalk.gray(`    Events: ${flow.events.length} | Validations: ${flow.validations.length}`));
  }

  // Generate test variations
  spinner.start('Generating test variations...');

  const generationConfig: GenerationConfig = {
    maxVariationsPerFlow: maxVariations,
    minPriority,
    includeSecurity: true,
    includeEdgeCases: true,
    includeValidation: true,
    includeErrorHandling: true,
    includeHappyPath: true,
    defaultTimeout: timeout,
  };

  const variationGenerator = new VariationGenerator(generationConfig);
  const generationResult = variationGenerator.generateFromFlows({
    flows: analyzedFlows,
  });

  spinner.succeed(
    chalk.green(`Generated ${generationResult.totalVariations} test variations in ${generationResult.suites.length} suite(s)`)
  );

  // Print variation summary
  console.log(chalk.bold('\nTest Suites:'));
  for (const suite of generationResult.suites) {
    console.log(chalk.cyan(`  - ${suite.name}`));
    console.log(chalk.gray(`    Tests: ${suite.variations.length}`));
  }

  // Generate Playwright specs
  spinner.start('Generating Playwright specs...');

  const codegenOptions: Partial<CodegenOptions> = {
    outputDir,
    typescript: !options.javascript,
    timeout,
    includeFixtures: true,
    includeHelpers: true,
  };

  const specGenerator = new SpecGenerator(codegenOptions);
  const codegenResult = specGenerator.generateSpecs(generationResult.suites);

  spinner.succeed(chalk.green(`Generated ${codegenResult.specs.length} spec file(s)`));

  // Print warnings if any
  if (codegenResult.warnings.length > 0) {
    console.log(chalk.yellow('\nWarnings:'));
    for (const warning of codegenResult.warnings.slice(0, 5)) {
      console.log(chalk.yellow(`  - ${warning}`));
    }
    if (codegenResult.warnings.length > 5) {
      console.log(chalk.gray(`  ... and ${codegenResult.warnings.length - 5} more`));
    }
  }

  // Write files (unless dry run)
  if (options.dryRun) {
    console.log(chalk.yellow('\n[Dry Run] Skipping file writes'));
    console.log(chalk.bold('\nGenerated Files (would be written):'));
    for (const spec of codegenResult.specs) {
      console.log(chalk.cyan(`  - ${spec.filePath}`));
      console.log(chalk.gray(`    Tests: ${spec.testCount}`));
    }
  } else {
    spinner.start('Writing spec files...');

    try {
      ensureDirectory(outputDir);
      const writtenPaths = specGenerator.writeSpecs(codegenResult);
      spinner.succeed(chalk.green(`Wrote ${writtenPaths.length} file(s)`));

      console.log(chalk.bold('\nGenerated Files:'));
      for (const filePath of writtenPaths) {
        console.log(chalk.green(`  + ${filePath}`));
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to write spec files'));
      console.error(chalk.yellow((error as Error).message));
      process.exit(1);
    }
  }

  // Final summary
  console.log(chalk.gray('\n' + '='.repeat(50)));
  console.log(chalk.bold('Generation Complete!'));
  console.log(chalk.gray('='.repeat(50)));
  console.log(chalk.green(`  Total tests: ${codegenResult.totalTests}`));
  console.log(chalk.green(`  Spec files:  ${codegenResult.specs.length}`));

  if (!options.dryRun) {
    console.log(chalk.cyan('\nNext steps:'));
    console.log(chalk.gray(`  1. Review generated tests in ${outputDir}`));
    console.log(chalk.gray('  2. Install Playwright if needed: npm install -D @playwright/test'));
    console.log(chalk.gray('  3. Run tests: npx playwright test'));
  }
}
