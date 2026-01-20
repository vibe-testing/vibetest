import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import type { ExplorationGraphData, GraphDiff, GraphNodeAttributes } from '../../graph/types.js';

interface DiffCommandOptions {
  output?: string;
}

/**
 * Loads and parses a graph JSON file.
 * @param filePath - Path to the graph JSON file
 * @returns The parsed graph data
 * @throws Error if file cannot be read or parsed
 */
function loadGraph(filePath: string): ExplorationGraphData {
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');

  try {
    return JSON.parse(content) as ExplorationGraphData;
  } catch {
    throw new Error(`Invalid JSON in file: ${resolvedPath}`);
  }
}

/**
 * Creates a map of nodes by their key for quick lookup.
 * @param nodes - Array of nodes
 * @returns Map of node key to node
 */
function createNodeMap(
  nodes: Array<{ key: string; attributes: GraphNodeAttributes }>
): Map<string, { key: string; attributes: GraphNodeAttributes }> {
  return new Map(nodes.map((n) => [n.key, n]));
}

/**
 * Creates a unique key for an edge.
 * @param source - Source node key
 * @param target - Target node key
 * @returns Edge key string
 */
function edgeKey(source: string, target: string): string {
  return `${source}::${target}`;
}

/**
 * Compares two exploration graphs and returns the differences.
 * @param graph1 - First (baseline) graph
 * @param graph2 - Second (comparison) graph
 * @returns GraphDiff object containing all differences
 */
function compareGraphs(
  graph1: ExplorationGraphData,
  graph2: ExplorationGraphData
): GraphDiff {
  const nodeMap1 = createNodeMap(graph1.nodes);
  const nodeMap2 = createNodeMap(graph2.nodes);

  // Find added and removed nodes
  const addedNodes: GraphDiff['addedNodes'] = [];
  const removedNodes: GraphDiff['removedNodes'] = [];
  const modifiedNodes: GraphDiff['modifiedNodes'] = [];

  // Check for removed and modified nodes
  for (const [key, node] of nodeMap1) {
    if (!nodeMap2.has(key)) {
      removedNodes.push(node);
    } else {
      const node2 = nodeMap2.get(key)!;
      // Simple comparison - check if stringified versions differ
      if (JSON.stringify(node.attributes) !== JSON.stringify(node2.attributes)) {
        modifiedNodes.push({
          key,
          before: node.attributes,
          after: node2.attributes,
        });
      }
    }
  }

  // Check for added nodes
  for (const [key, node] of nodeMap2) {
    if (!nodeMap1.has(key)) {
      addedNodes.push(node);
    }
  }

  // Compare edges
  const edgeMap1 = new Map(
    graph1.edges.map((e) => [edgeKey(e.source, e.target), e])
  );
  const edgeMap2 = new Map(
    graph2.edges.map((e) => [edgeKey(e.source, e.target), e])
  );

  const addedEdges: GraphDiff['addedEdges'] = [];
  const removedEdges: GraphDiff['removedEdges'] = [];

  for (const [key, edge] of edgeMap1) {
    if (!edgeMap2.has(key)) {
      removedEdges.push({
        source: edge.source,
        target: edge.target,
        attributes: edge.attributes,
      });
    }
  }

  for (const [key, edge] of edgeMap2) {
    if (!edgeMap1.has(key)) {
      addedEdges.push({
        source: edge.source,
        target: edge.target,
        attributes: edge.attributes,
      });
    }
  }

  // Calculate coverage
  const totalNodes1 = graph1.nodes.length;
  const totalNodes2 = graph2.nodes.length;
  const coverageBefore = totalNodes1;
  const coverageAfter = totalNodes2;
  const coverageDelta = coverageAfter - coverageBefore;

  // Build summary
  const newPages = addedNodes
    .filter((n) => n.attributes.nodeType === 'PAGE')
    .map((n) => (n.attributes as { url?: string }).url || n.key);

  const removedPages = removedNodes
    .filter((n) => n.attributes.nodeType === 'PAGE')
    .map((n) => (n.attributes as { url?: string }).url || n.key);

  const newElements = addedNodes.filter(
    (n) => n.attributes.nodeType === 'ELEMENT'
  ).length;

  const removedElements = removedNodes.filter(
    (n) => n.attributes.nodeType === 'ELEMENT'
  ).length;

  // Find uncovered transitions (edges in graph1 not in graph2)
  const uncoveredTransitions = removedEdges
    .filter((e) => 'transitionType' in e.attributes)
    .map((e) => ({
      from: e.source,
      to: e.target,
    }));

  return {
    addedNodes,
    removedNodes,
    modifiedNodes,
    addedEdges,
    removedEdges,
    coverageChange: {
      before: coverageBefore,
      after: coverageAfter,
      delta: coverageDelta,
    },
    summary: {
      newPages,
      removedPages,
      newElements,
      removedElements,
      uncoveredTransitions,
    },
  };
}

/**
 * Prints a formatted diff summary to the console.
 * @param diff - The GraphDiff to display
 * @param graph1Path - Path to the first graph (for display)
 * @param graph2Path - Path to the second graph (for display)
 */
function printDiffSummary(
  diff: GraphDiff,
  graph1Path: string,
  graph2Path: string
): void {
  console.log(chalk.bold('\nGraph Comparison'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.cyan('Baseline: ') + graph1Path);
  console.log(chalk.cyan('Compare:  ') + graph2Path);
  console.log(chalk.gray('─'.repeat(50)));

  // Pages section
  console.log(chalk.bold('\nPages'));
  if (diff.summary.newPages.length > 0) {
    console.log(chalk.green(`  + ${diff.summary.newPages.length} added`));
    diff.summary.newPages.slice(0, 5).forEach((page) => {
      console.log(chalk.green(`    + ${page}`));
    });
    if (diff.summary.newPages.length > 5) {
      console.log(chalk.gray(`    ... and ${diff.summary.newPages.length - 5} more`));
    }
  }
  if (diff.summary.removedPages.length > 0) {
    console.log(chalk.red(`  - ${diff.summary.removedPages.length} removed`));
    diff.summary.removedPages.slice(0, 5).forEach((page) => {
      console.log(chalk.red(`    - ${page}`));
    });
    if (diff.summary.removedPages.length > 5) {
      console.log(chalk.gray(`    ... and ${diff.summary.removedPages.length - 5} more`));
    }
  }
  if (diff.summary.newPages.length === 0 && diff.summary.removedPages.length === 0) {
    console.log(chalk.gray('  No changes'));
  }

  // Elements section
  console.log(chalk.bold('\nElements'));
  if (diff.summary.newElements > 0) {
    console.log(chalk.green(`  + ${diff.summary.newElements} added`));
  }
  if (diff.summary.removedElements > 0) {
    console.log(chalk.red(`  - ${diff.summary.removedElements} removed`));
  }
  if (diff.summary.newElements === 0 && diff.summary.removedElements === 0) {
    console.log(chalk.gray('  No changes'));
  }

  // Transitions section
  console.log(chalk.bold('\nTransitions'));
  const addedTransitions = diff.addedEdges.filter(
    (e) => 'transitionType' in e.attributes
  ).length;
  const removedTransitions = diff.removedEdges.filter(
    (e) => 'transitionType' in e.attributes
  ).length;

  if (addedTransitions > 0) {
    console.log(chalk.green(`  + ${addedTransitions} added`));
  }
  if (removedTransitions > 0) {
    console.log(chalk.red(`  - ${removedTransitions} removed`));
  }
  if (addedTransitions === 0 && removedTransitions === 0) {
    console.log(chalk.gray('  No changes'));
  }

  // Coverage section
  console.log(chalk.bold('\nCoverage'));
  const { before, after, delta } = diff.coverageChange;
  const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
  const deltaColor = delta >= 0 ? chalk.green : chalk.red;
  console.log(`  Nodes: ${before} -> ${after} (${deltaColor(deltaStr)})`);

  // Modified nodes
  if (diff.modifiedNodes.length > 0) {
    console.log(chalk.bold('\nModified Nodes'));
    console.log(chalk.yellow(`  ~ ${diff.modifiedNodes.length} nodes modified`));
  }

  // Uncovered transitions warning
  if (diff.summary.uncoveredTransitions.length > 0) {
    console.log(chalk.bold('\nWarning: Uncovered Transitions'));
    console.log(
      chalk.yellow(
        `  ${diff.summary.uncoveredTransitions.length} transitions from baseline are no longer present`
      )
    );
    diff.summary.uncoveredTransitions.slice(0, 3).forEach((t) => {
      console.log(chalk.yellow(`    ${t.from} -> ${t.to}`));
    });
    if (diff.summary.uncoveredTransitions.length > 3) {
      console.log(
        chalk.gray(
          `    ... and ${diff.summary.uncoveredTransitions.length - 3} more`
        )
      );
    }
  }

  console.log(chalk.gray('\n' + '─'.repeat(50)));
}

/**
 * The diff command handler.
 * Compares two exploration graphs and displays the differences.
 *
 * @param graph1Path - Path to the first (baseline) graph JSON file
 * @param graph2Path - Path to the second (comparison) graph JSON file
 * @param options - Command options
 */
export async function diffCommand(
  graph1Path: string,
  graph2Path: string,
  options: DiffCommandOptions
): Promise<void> {
  // Load graphs
  let graph1: ExplorationGraphData;
  let graph2: ExplorationGraphData;

  try {
    graph1 = loadGraph(graph1Path);
  } catch (error) {
    console.error(chalk.red(`Error loading first graph: ${(error as Error).message}`));
    process.exit(1);
  }

  try {
    graph2 = loadGraph(graph2Path);
  } catch (error) {
    console.error(chalk.red(`Error loading second graph: ${(error as Error).message}`));
    process.exit(1);
  }

  // Compare graphs
  const diff = compareGraphs(graph1, graph2);

  // Print summary
  printDiffSummary(diff, graph1Path, graph2Path);

  // Save to file if requested
  if (options.output) {
    const outputPath = path.resolve(options.output);

    try {
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify(diff, null, 2));
      console.log(chalk.cyan('Diff saved to: ') + chalk.underline(outputPath));
    } catch (error) {
      console.error(chalk.red(`Error saving diff: ${(error as Error).message}`));
      process.exit(1);
    }
  }
}
