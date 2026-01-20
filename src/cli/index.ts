#!/usr/bin/env node
import { Command } from 'commander';
import { exploreCommand } from './commands/explore.js';
import { diffCommand } from './commands/diff.js';

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
  .command('diff')
  .description('Compare two exploration graphs')
  .argument('<graph1>', 'Path to first graph JSON')
  .argument('<graph2>', 'Path to second graph JSON')
  .option('-o, --output <file>', 'Output diff to file')
  .action(diffCommand);

program.parse();
