import { Command } from "commander";
import chalk from "chalk";
import { mkdir } from "fs/promises";
import { join } from "path";

import { explore, type ExploreProgress } from "../../exploration/index.js";
import { saveGraph, graphToMermaid, DEFAULT_GRAPH_PATH } from "../../graph/index.js";

export function createExploreCommand(): Command {
  return new Command("explore")
    .description("Explore a web application and build a semantic graph")
    .argument("<url>", "URL to explore")
    .option("-d, --depth <n>", "How deep to crawl", "3")
    .option("-p, --pages <n>", "Maximum pages to visit", "50")
    .option("-o, --output <dir>", "Output directory", ".vibetest")
    .option("--no-headless", "Run browser with visible window")
    .option("--mermaid", "Export Mermaid diagram")
    .action(async (url: string, options) => {
      console.log(chalk.bold.blue("\n🔍 VibeTesting Explorer\n"));
      console.log(chalk.dim(`Starting exploration of: ${url}`));
      console.log(chalk.dim(`Max depth: ${options.depth}, Max pages: ${options.pages}\n`));

      const startTime = Date.now();

      try {
        // Create output directory
        await mkdir(options.output, { recursive: true });

        // Progress callback
        const onProgress = (progress: ExploreProgress) => {
          process.stdout.write(
            `\r${chalk.cyan("⏳")} Visited: ${progress.pagesVisited}/${progress.pagesDiscovered} pages | ` +
            `Depth: ${progress.depth} | ${chalk.dim(truncateUrl(progress.currentUrl, 50))}`
          );
        };

        // Run exploration
        const graph = await explore(url, {
          maxDepth: parseInt(options.depth, 10),
          maxPages: parseInt(options.pages, 10),
          headless: options.headless,
        }, onProgress);

        // Clear progress line
        process.stdout.write("\r" + " ".repeat(100) + "\r");

        // Get analytics
        const analytics = graph.getAnalytics();

        // Save graph
        const graphPath = join(options.output, "app-graph.json");
        await saveGraph(graph, graphPath);
        console.log(chalk.green("✓") + ` Graph saved to ${chalk.cyan(graphPath)}`);

        // Export Mermaid if requested
        if (options.mermaid) {
          const mermaidPath = join(options.output, "app-graph.mermaid.md");
          const mermaid = graphToMermaid(graph);
          await Bun.write(mermaidPath, "```mermaid\n" + mermaid + "\n```");
          console.log(chalk.green("✓") + ` Mermaid diagram saved to ${chalk.cyan(mermaidPath)}`);
        }

        // Summary
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(chalk.bold.green(`\n✨ Exploration complete in ${duration}s\n`));
        console.log(chalk.dim("Summary:"));
        console.log(`  Pages discovered: ${chalk.cyan(analytics.totalNodes)}`);
        console.log(`  Navigation edges: ${chalk.cyan(analytics.totalEdges)}`);
        console.log(`  Max depth reached: ${chalk.cyan(analytics.maxDepth)}`);

        if (analytics.mostConnectedPages.length > 0) {
          console.log(chalk.dim("\nMost connected pages:"));
          analytics.mostConnectedPages.slice(0, 3).forEach((page, i) => {
            console.log(`  ${i + 1}. ${truncateUrl(page.url, 60)} (${page.totalDegree} connections)`);
          });
        }

        console.log(chalk.dim(`\nRun ${chalk.cyan("vibetest generate")} to create Playwright tests.\n`));

      } catch (error) {
        console.error(chalk.red("\n❌ Exploration failed:"));
        if (error instanceof Error) {
          console.error(chalk.red(error.message));
          if (error.message.includes("blocked") || error.message.includes("SSRF")) {
            console.error(chalk.yellow("\nThis URL may be blocked for security reasons."));
            console.error(chalk.yellow("Only public HTTP/HTTPS URLs are allowed."));
          }
        }
        process.exit(1);
      }
    });
}

function truncateUrl(url: string, maxLength: number): string {
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength - 3) + "...";
}
