#!/usr/bin/env bun

import chalk from "chalk";
import { loadConfig } from "./config/index.js";

const VERSION = "0.1.0";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--version") || args.includes("-v")) {
    console.log(VERSION);
    process.exit(0);
  }

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  console.log(chalk.bold("vibetest") + chalk.dim(` v${VERSION}`));
  console.log(chalk.dim("AI-powered E2E test generation\n"));

  // Load configuration
  const config = await loadConfig();
  console.log(chalk.dim(`Provider: ${config.llmProvider}`));

  // Get URL from args
  const url = args.find((arg) => arg.startsWith("http"));
  if (!url) {
    console.log(chalk.yellow("Usage: vibetest <url>"));
    process.exit(1);
  }

  console.log(chalk.dim(`Target: ${url}\n`));

  // TODO: Implement main flow
  console.log(chalk.yellow("Not yet implemented."));
}

function printHelp(): void {
  console.log(`
${chalk.bold("vibetest")} - AI-powered E2E test generation

${chalk.dim("Usage:")}
  vibetest <url> [options]

${chalk.dim("Options:")}
  -h, --help              Show this help message
  -v, --version           Show version number
  --reset-endpoint <url>  API endpoint to reset app state

${chalk.dim("Examples:")}
  vibetest http://localhost:3000
  vibetest https://example.com --reset-endpoint http://localhost:3000/api/reset
`);
}

main().catch((err) => {
  console.error(chalk.red("Error:"), err.message);
  process.exit(1);
});
