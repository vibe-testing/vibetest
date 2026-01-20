#!/usr/bin/env node
import { Command } from 'commander';
import { exploreCommand } from './commands/explore.js';
import { diffCommand } from './commands/diff.js';
import { listenCommand } from './commands/listen.js';
import { generateCommand } from './commands/generate.js';

const program = new Command();

program
  .name('vibetest')
  .description('Graph-based web application exploration and test generation')
  .version('0.1.0');

program
  .command('explore')
  .description('Explore a web application and build its graph')
  .argument('<url>', 'URL to start exploration')
  .option('-o, --output <dir>', 'Output directory', './vibetest-output')
  .option('-d, --max-depth <n>', 'Maximum exploration depth', '3')
  .option('-p, --max-pages <n>', 'Maximum pages to explore', '50')
  .option('--headless', 'Run browser in headless mode', true)
  .option('--no-headless', 'Run browser with UI')
  .option('-t, --timeout <ms>', 'Navigation timeout in ms', '30000')
  .option('--click-buttons', 'Click buttons to discover transitions', false)
  .action(exploreCommand);

program
  .command('listen')
  .description('Record user interactions in a browser')
  .argument('<url>', 'URL to open and record')
  .option('-o, --output <dir>', 'Output directory', './vibetest-output')
  .option('--headless', 'Run browser in headless mode', false)
  .option('--no-headless', 'Run browser with UI (default)')
  .option('-t, --timeout <ms>', 'Navigation timeout in ms', '30000')
  .option('--screenshots', 'Capture screenshots on events', false)
  .option('--network', 'Capture network requests', false)
  .action(listenCommand);

program
  .command('generate')
  .description('Generate Playwright tests from recordings')
  .argument('<recording>', 'Path to recording.json file')
  .option('-o, --output <dir>', 'Output directory for generated tests', './tests/generated')
  .option('--javascript', 'Generate JavaScript instead of TypeScript', false)
  .option('-t, --timeout <ms>', 'Test timeout in ms', '30000')
  .option('-v, --variations <n>', 'Maximum variations per flow', '15')
  .option('-p, --min-priority <n>', 'Minimum priority (1=critical, 2=high, 3=medium)', '3')
  .option('--skip-mocks', 'Skip generating API mocks', false)
  .option('--dry-run', 'Preview generation without writing files', false)
  .action(generateCommand);

program
  .command('diff')
  .description('Compare two exploration graphs')
  .argument('<graph1>', 'Path to first graph JSON')
  .argument('<graph2>', 'Path to second graph JSON')
  .option('-o, --output <file>', 'Output diff to file')
  .action(diffCommand);

program.parse();
