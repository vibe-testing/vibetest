import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { Explorer } from '../../graph/explorer.js';
import type { ExplorerOptions } from '../../graph/explorer.js';

interface ExploreCommandOptions {
  output: string;
  maxDepth: string;
  maxPages: string;
  headless: boolean;
  timeout: string;
  clickButtons: boolean;
}

/**
 * Validates a URL string.
 * @param url - The URL to validate
 * @returns true if the URL is valid
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Creates a directory if it doesn't exist.
 * @param dirPath - The directory path to create
 */
function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * The explore command handler.
 * Explores a web application starting from the given URL and builds an exploration graph.
 *
 * @param url - The starting URL for exploration
 * @param options - Command options
 */
export async function exploreCommand(
  url: string,
  options: ExploreCommandOptions
): Promise<void> {
  // Validate URL
  if (!isValidUrl(url)) {
    console.error(chalk.red('Error: Invalid URL provided.'));
    console.error(chalk.yellow('URL must start with http:// or https://'));
    process.exit(1);
  }

  // Parse numeric options
  const maxDepth = parseInt(options.maxDepth, 10);
  const maxPages = parseInt(options.maxPages, 10);
  const timeout = parseInt(options.timeout, 10);

  if (isNaN(maxDepth) || maxDepth < 1) {
    console.error(chalk.red('Error: --max-depth must be a positive integer'));
    process.exit(1);
  }

  if (isNaN(maxPages) || maxPages < 1) {
    console.error(chalk.red('Error: --max-pages must be a positive integer'));
    process.exit(1);
  }

  if (isNaN(timeout) || timeout < 1000) {
    console.error(chalk.red('Error: --timeout must be at least 1000ms'));
    process.exit(1);
  }

  // Resolve output directory
  const outputDir = path.resolve(options.output);

  // Display configuration
  console.log(chalk.bold('\nVibeTest Explorer'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(chalk.cyan('Start URL:    ') + url);
  console.log(chalk.cyan('Output:       ') + outputDir);
  console.log(chalk.cyan('Max Depth:    ') + maxDepth);
  console.log(chalk.cyan('Max Pages:    ') + maxPages);
  console.log(chalk.cyan('Headless:     ') + (options.headless ? 'Yes' : 'No'));
  console.log(chalk.cyan('Timeout:      ') + timeout + 'ms');
  console.log(chalk.cyan('Click Buttons:') + (options.clickButtons ? 'Yes' : 'No'));
  console.log(chalk.gray('─'.repeat(40)) + '\n');

  // Create output directory
  try {
    ensureDirectory(outputDir);
  } catch (error) {
    console.error(chalk.red('Error: Failed to create output directory'));
    console.error(chalk.yellow((error as Error).message));
    process.exit(1);
  }

  // Create explorer
  const explorerOptions: ExplorerOptions = {
    maxDepth,
    maxPages,
    headless: options.headless,
    timeout,
    clickButtons: options.clickButtons,
  };
  const explorer = new Explorer(explorerOptions);

  // Start exploration with spinner
  const spinner = ora({
    text: 'Starting exploration...',
    color: 'cyan',
  }).start();

  const startTime = Date.now();

  try {
    const graphData = await explorer.explore(url, (progress) => {
      spinner.text = chalk.cyan(
        `Exploring: ${progress.currentUrl.slice(0, 60)}${progress.currentUrl.length > 60 ? '...' : ''}\n` +
        `           Pages: ${progress.pagesVisited} | Depth: ${progress.currentDepth}/${maxDepth} | Elements: ${progress.elementsFound}`
      );
    });

    spinner.succeed(chalk.green('Exploration complete!'));

    // Calculate statistics
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const pageNodes = graphData.nodes.filter((n) => n.attributes.nodeType === 'PAGE');
    const elementNodes = graphData.nodes.filter((n) => n.attributes.nodeType === 'ELEMENT');
    const navigationEdges = graphData.edges.filter((e) => 'transitionType' in e.attributes);

    // Save graph to file
    const outputPath = path.join(outputDir, 'app-graph.json');
    fs.writeFileSync(outputPath, JSON.stringify(graphData, null, 2));

    // Print summary
    console.log(chalk.bold('\nExploration Summary'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.green('Pages discovered:     ') + pageNodes.length);
    console.log(chalk.green('Elements detected:    ') + elementNodes.length);
    console.log(chalk.green('Transitions found:    ') + navigationEdges.length);
    console.log(chalk.green('Duration:             ') + duration + 's');
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.cyan('\nGraph saved to: ') + chalk.underline(outputPath));

    // Close browser
    await explorer.close();

  } catch (error) {
    spinner.fail(chalk.red('Exploration failed'));

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Provide helpful error messages
    if (errorMessage.includes('net::ERR_NAME_NOT_RESOLVED')) {
      console.error(chalk.yellow('\nCould not resolve the hostname. Please check the URL.'));
    } else if (errorMessage.includes('net::ERR_CONNECTION_REFUSED')) {
      console.error(chalk.yellow('\nConnection refused. Is the server running?'));
    } else if (errorMessage.includes('Timeout')) {
      console.error(chalk.yellow('\nNavigation timed out. Try increasing --timeout.'));
    } else if (errorMessage.includes('browser') || errorMessage.includes('chromium')) {
      console.error(chalk.yellow('\nBrowser error. Make sure Playwright browsers are installed:'));
      console.error(chalk.gray('  npx playwright install chromium'));
    } else {
      console.error(chalk.yellow('\n' + errorMessage));
    }

    // Attempt cleanup
    try {
      await explorer.close();
    } catch {
      // Ignore cleanup errors
    }

    process.exit(1);
  }
}
