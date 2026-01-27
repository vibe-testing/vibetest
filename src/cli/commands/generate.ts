import { Command } from "commander";
import chalk from "chalk";
import { mkdir } from "fs/promises";

import { loadGraph, DEFAULT_GRAPH_PATH } from "../../graph/index.js";
import {
  createGraphSummary,
  identifyUserFlows,
  writeTestFiles,
  type GeneratedTest,
  DEFAULT_OUTPUT_DIR,
} from "../../codegen/index.js";

export function createGenerateCommand(): Command {
  return new Command("generate")
    .description("Generate Playwright tests from exploration graph")
    .option("-i, --input <file>", "Path to graph file", DEFAULT_GRAPH_PATH)
    .option("-o, --output <dir>", "Output directory for tests", DEFAULT_OUTPUT_DIR)
    .option("--dry-run", "Show what would be generated without writing files")
    .action(async (options) => {
      console.log(chalk.bold.blue("\n🧪 VibeTesting Generator\n"));

      const startTime = Date.now();

      try {
        // Load graph
        console.log(chalk.dim(`Loading graph from: ${options.input}`));
        const graph = await loadGraph(options.input);

        const analytics = graph.getAnalytics();
        console.log(chalk.dim(`Found ${analytics.totalNodes} pages, ${analytics.totalEdges} transitions\n`));

        // Create summary and identify flows
        console.log(chalk.dim("Analyzing graph structure..."));
        const summary = createGraphSummary(graph);
        const flows = identifyUserFlows(graph);

        console.log(chalk.green("✓") + ` Identified ${flows.length} user flows`);

        if (flows.length === 0) {
          console.log(chalk.yellow("\n⚠ No user flows detected in the graph."));
          console.log(chalk.dim("Try running explore with --depth 2 or more to discover more pages."));
          return;
        }

        // Show identified flows
        console.log(chalk.dim("\nIdentified flows:"));
        flows.slice(0, 5).forEach((flow, i) => {
          const authBadge = flow.hasAuthentication ? chalk.red(" [AUTH]") : "";
          const criticalBadge = flow.hasCriticalActions ? chalk.yellow(" [CRITICAL]") : "";
          console.log(`  ${i + 1}. ${flow.name}${authBadge}${criticalBadge} (score: ${flow.score})`);
        });

        // Generate test code (MVP: simple placeholder tests)
        console.log(chalk.dim("\nGenerating Playwright tests..."));
        const tests = generatePlaceholderTests(flows, summary);

        if (options.dryRun) {
          console.log(chalk.cyan("\n[Dry run] Would generate:"));
          tests.forEach((test) => {
            console.log(`  - ${test.filename} (${test.category})`);
          });
          return;
        }

        // Create output directory
        await mkdir(options.output, { recursive: true });

        // Write test files
        const result = await writeTestFiles(tests, options.output);

        // Summary
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(chalk.bold.green(`\n✨ Generation complete in ${duration}s\n`));
        console.log(chalk.dim("Generated files:"));
        result.writtenFiles.forEach((file) => {
          console.log(`  ${chalk.green("✓")} ${file}`);
        });

        if (result.errors.length > 0) {
          console.log(chalk.yellow("\nWarnings:"));
          result.errors.forEach((err) => {
            console.log(`  ${chalk.yellow("⚠")} ${err}`);
          });
        }

        console.log(chalk.dim(`\nRun ${chalk.cyan("npx playwright test")} to execute the tests.\n`));

      } catch (error) {
        console.error(chalk.red("\n❌ Generation failed:"));
        if (error instanceof Error) {
          console.error(chalk.red(error.message));
          if (error.message.includes("ENOENT") || error.message.includes("not found")) {
            console.error(chalk.yellow("\nNo exploration graph found."));
            console.error(chalk.yellow(`Run ${chalk.cyan("vibetest explore <url>")} first.`));
          }
        }
        process.exit(1);
      }
    });
}

/**
 * Generate placeholder Playwright tests from identified flows.
 *
 * This is an MVP implementation that creates basic navigation tests.
 * Full BAML-powered generation will add intelligent assertions and
 * element interactions based on semantic analysis.
 */
function generatePlaceholderTests(
  flows: ReturnType<typeof identifyUserFlows>,
  _summary: ReturnType<typeof createGraphSummary>,
): GeneratedTest[] {
  const tests: GeneratedTest[] = [];

  // Group flows by category
  const flowsByCategory = new Map<string, typeof flows>();
  for (const flow of flows) {
    const category = flow.category || "general";
    const existing = flowsByCategory.get(category) || [];
    existing.push(flow);
    flowsByCategory.set(category, existing);
  }

  // Generate a test file per category
  for (const [category, categoryFlows] of flowsByCategory) {
    const testCode = generateCategoryTestFile(category, categoryFlows);
    tests.push({
      filename: `${category}.spec.ts`,
      code: testCode,
      category,
    });
  }

  return tests;
}

/**
 * Generate a Playwright test file for a category of flows.
 */
function generateCategoryTestFile(
  category: string,
  flows: ReturnType<typeof identifyUserFlows>,
): string {
  const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);

  const testCases = flows.map((flow) => {
    const steps = flow.urls
      .map((url, i) => {
        if (i === 0) {
          return `    // Navigate to starting page
    await page.goto('${url}');
    await expect(page).toHaveURL(/.*${extractPath(url)}.*/);`;
        }
        return `    // Navigate to next step
    // TODO: Add interaction to reach ${url}
    await expect(page.locator('body')).toBeVisible();`;
      })
      .join("\n\n");

    const authComment = flow.hasAuthentication
      ? "\n    // Note: This flow includes authentication - may need credentials"
      : "";
    const criticalComment = flow.hasCriticalActions
      ? "\n    // Warning: This flow includes critical actions - test carefully"
      : "";

    return `  test('${escapeTestName(flow.name)}', async ({ page }) => {${authComment}${criticalComment}
${steps}
  });`;
  }).join("\n\n");

  return `import { test, expect } from '@playwright/test';

/**
 * ${categoryTitle} Tests
 *
 * Generated by VibeTesting from exploration graph.
 * Review and customize these tests for your application.
 */
test.describe('${categoryTitle}', () => {
${testCases}
});
`;
}

/**
 * Extract the path portion of a URL for regex matching.
 */
function extractPath(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\//g, "\\/");
    return path || "\\/";
  } catch {
    return "\\/";
  }
}

/**
 * Escape test name for use in test() call.
 */
function escapeTestName(name: string): string {
  return name.replace(/'/g, "\\'");
}
