import { Command } from "commander";
import chalk from "chalk";

export function createDiffCommand(): Command {
  return new Command("diff")
    .description("Compare two graphs to show what changed")
    .argument("<old-graph>", "Path to old graph")
    .argument("<new-graph>", "Path to new graph")
    .option("-f, --format <type>", "Output format: summary|json|markdown", "summary")
    .action(async (oldGraph: string, newGraph: string, options) => {
      console.log(chalk.bold("Comparing graphs:"));
      console.log(chalk.dim(`  Old: ${oldGraph}`));
      console.log(chalk.dim(`  New: ${newGraph}`));
      console.log(chalk.yellow("\nNot yet implemented."));
    });
}
