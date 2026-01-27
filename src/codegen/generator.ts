/**
 * Playwright Test Code Generator
 *
 * Generates Playwright test files from exploration graphs using BAML-powered
 * LLM prompts. Handles file writing, naming, and organization.
 *
 * ## Architecture
 *
 * This module focuses on file operations and utility functions. The actual
 * test case generation is done via BAML (see baml_src/generate_code.baml).
 *
 * ## Usage
 *
 * ```typescript
 * import { generateFilename, writeTestFiles, type GeneratedTest } from './generator';
 *
 * // Generate test files from BAML output
 * const tests: GeneratedTest[] = [
 *   { filename: 'auth.spec.ts', code: '...', category: 'auth' }
 * ];
 *
 * const result = await writeTestFiles(tests, './tests/e2e');
 * console.log(`Wrote ${result.writtenFiles.length} test files`);
 * ```
 */

import { mkdir, writeFile, access } from "fs/promises";
import { join, dirname } from "path";
import type { ExplorationGraph } from "../graph/index.js";

/**
 * Represents a generated Playwright test file.
 */
export interface GeneratedTest {
  /** The filename (e.g., "login.spec.ts") */
  filename: string;
  /** The complete Playwright test code */
  code: string;
  /** Optional category for grouping (e.g., "auth", "commerce") */
  category?: string;
}

/**
 * Result of writing test files to disk.
 */
export interface WriteResult {
  /** Full paths of successfully written files */
  writtenFiles: string[];
  /** Error messages for any failures */
  errors: string[];
}

/**
 * Generate a valid spec filename from a test case name.
 *
 * Converts arbitrary text into a kebab-case filename suitable for
 * Playwright test files.
 *
 * @param testName - The human-readable test name
 * @returns A valid filename with .spec.ts extension
 *
 * @example
 * generateFilename("User login with email") // -> "user-login-with-email.spec.ts"
 * generateFilename("Test: Login & Reset!") // -> "test-login-reset.spec.ts"
 */
export function generateFilename(testName: string): string {
  const slug = testName
    .toLowerCase()
    // Replace non-alphanumeric with hyphens
    .replace(/[^a-z0-9]+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "")
    // Collapse multiple hyphens
    .replace(/-+/g, "-");

  // Handle empty result
  if (!slug) {
    return "test.spec.ts";
  }

  return `${slug}.spec.ts`;
}

/**
 * Group generated tests by their category.
 *
 * Tests without a category are grouped under "general".
 *
 * @param tests - Array of generated tests
 * @returns Map of category -> tests
 */
export function groupTestsByCategory(
  tests: GeneratedTest[],
): Map<string, GeneratedTest[]> {
  const grouped = new Map<string, GeneratedTest[]>();

  for (const test of tests) {
    const category = test.category || "general";
    const existing = grouped.get(category) || [];
    existing.push(test);
    grouped.set(category, existing);
  }

  return grouped;
}

/**
 * Check if a file exists.
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a unique filename by appending a number if the file already exists.
 */
async function getUniqueFilename(
  basePath: string,
  filename: string,
  existingInBatch: Set<string>,
): Promise<string> {
  const ext = ".spec.ts";
  const base = filename.replace(ext, "");

  let candidate = filename;
  let counter = 1;

  // Check both disk and batch
  while (
    existingInBatch.has(candidate) ||
    (await fileExists(join(basePath, candidate)))
  ) {
    candidate = `${base}-${counter}${ext}`;
    counter++;
  }

  return candidate;
}

/**
 * Write generated test files to disk.
 *
 * Creates the output directory if it doesn't exist. Handles duplicate
 * filenames by appending a number suffix.
 *
 * @param tests - Array of generated tests to write
 * @param outputDir - Directory to write files to
 * @returns Result with list of written files and any errors
 *
 * @example
 * const result = await writeTestFiles(tests, './tests/e2e');
 * if (result.errors.length > 0) {
 *   console.error('Some tests failed to write:', result.errors);
 * }
 */
export async function writeTestFiles(
  tests: GeneratedTest[],
  outputDir: string,
): Promise<WriteResult> {
  const writtenFiles: string[] = [];
  const errors: string[] = [];
  const usedFilenames = new Set<string>();

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  for (const test of tests) {
    // Validate filename
    if (!test.filename || test.filename.trim() === "") {
      errors.push(`Invalid filename: empty or missing filename`);
      continue;
    }

    try {
      // Get unique filename
      const uniqueFilename = await getUniqueFilename(
        outputDir,
        test.filename,
        usedFilenames,
      );
      usedFilenames.add(uniqueFilename);

      const filePath = join(outputDir, uniqueFilename);

      // Write the file
      await writeFile(filePath, test.code, "utf-8");
      writtenFiles.push(filePath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      errors.push(`Failed to write ${test.filename}: ${message}`);
    }
  }

  return { writtenFiles, errors };
}

/**
 * Default output directory for generated tests.
 */
export const DEFAULT_OUTPUT_DIR = "tests/e2e";

// =============================================================================
// GRAPH TO BAML CONVERSION
// =============================================================================

/**
 * Input type for BAML GraphSummary.
 */
export interface GraphSummaryInput {
  totalPages: number;
  maxDepth: number;
  hubPageUrls: string[];
  clusterSummaries: string[];
  topPaths: FlowInfo[];
  unexploredCategories: string[];
}

/**
 * Represents a user flow through the application.
 */
export interface FlowInfo {
  name: string;
  urls: string[];
  score: number;
  category: string;
  hasAuthentication: boolean;
  hasCriticalActions: boolean;
  keyElements: string[];
}

/**
 * Keywords that indicate authentication-related pages.
 */
const AUTH_KEYWORDS = [
  "login",
  "signin",
  "sign-in",
  "signup",
  "sign-up",
  "register",
  "auth",
  "password",
  "reset",
  "forgot",
  "verify",
  "confirm",
  "logout",
  "signout",
];

/**
 * Keywords that indicate critical/dangerous actions.
 */
const CRITICAL_KEYWORDS = [
  "checkout",
  "payment",
  "pay",
  "order",
  "purchase",
  "delete",
  "remove",
  "cancel",
  "unsubscribe",
  "deactivate",
  "close-account",
  "cart",
  "basket",
];

/**
 * Check if a URL contains authentication-related keywords.
 */
function isAuthUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return AUTH_KEYWORDS.some((kw) => lowerUrl.includes(kw));
}

/**
 * Check if a URL contains critical action keywords.
 */
function isCriticalUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return CRITICAL_KEYWORDS.some((kw) => lowerUrl.includes(kw));
}

/**
 * Categorize a flow based on its URLs.
 */
function categorizeFlow(urls: string[]): string {
  const allUrls = urls.join(" ").toLowerCase();

  if (AUTH_KEYWORDS.some((kw) => allUrls.includes(kw))) {
    return "authentication";
  }
  if (CRITICAL_KEYWORDS.some((kw) => allUrls.includes(kw))) {
    return "transaction";
  }
  if (allUrls.includes("search") || allUrls.includes("filter")) {
    return "search";
  }
  if (allUrls.includes("profile") || allUrls.includes("settings")) {
    return "account";
  }
  if (allUrls.includes("product") || allUrls.includes("item")) {
    return "commerce";
  }

  return "navigation";
}

/**
 * Create a BAML-compatible graph summary from an ExplorationGraph.
 *
 * Extracts analytics from the graph and formats them for the
 * GenerateTestCasesFromGraph BAML function.
 *
 * @param graph - The exploration graph
 * @returns Graph summary ready for BAML input
 */
export function createGraphSummary(graph: ExplorationGraph): GraphSummaryInput {
  const analytics = graph.getAnalytics();

  // Hub pages are the most connected pages
  const hubPageUrls = analytics.mostConnectedPages
    .filter((p) => p.totalDegree >= 2)
    .map((p) => p.url);

  // Create cluster summaries from the graph structure
  const clusterSummaries: string[] = [];

  // Group pages by URL path prefix
  const pages = graph.getAllPageNodes();
  const pathGroups = new Map<string, string[]>();

  for (const page of pages) {
    try {
      const url = new URL(page.attributes.url);
      const pathParts = url.pathname.split("/").filter(Boolean);
      const prefix = pathParts[0] || "root";

      const existing = pathGroups.get(prefix) || [];
      existing.push(page.attributes.url);
      pathGroups.set(prefix, existing);
    } catch {
      // Invalid URL, skip
    }
  }

  for (const [prefix, urls] of pathGroups) {
    if (urls.length >= 2) {
      clusterSummaries.push(`${prefix}: ${urls.length} pages`);
    }
  }

  // Identify top paths
  const topPaths = identifyUserFlows(graph);

  // Determine unexplored categories
  const exploredCategories = new Set(topPaths.map((p) => p.category));
  const allCategories = [
    "authentication",
    "transaction",
    "search",
    "account",
    "commerce",
    "navigation",
  ];
  const unexploredCategories = allCategories.filter(
    (c) => !exploredCategories.has(c),
  );

  return {
    totalPages: analytics.totalNodes,
    maxDepth: analytics.maxDepth,
    hubPageUrls,
    clusterSummaries,
    topPaths: topPaths.slice(0, 5), // Top 5 paths for BAML
    unexploredCategories,
  };
}

/**
 * Identify user flows (paths through the graph) for test generation.
 *
 * Performs simple path detection from the start URL to identify
 * common user journeys through the application.
 *
 * @param graph - The exploration graph
 * @returns Array of identified flows
 */
export function identifyUserFlows(graph: ExplorationGraph): FlowInfo[] {
  const flows: FlowInfo[] = [];
  const pages = graph.getAllPageNodes();

  if (pages.length === 0) {
    return flows;
  }

  // Find root pages (depth 0 or 1)
  const rootPages = pages.filter((p) => p.attributes.depth <= 1);

  // For each root, follow paths through the graph
  for (const root of rootPages) {
    const visited = new Set<string>();
    const paths = findPathsFromNode(graph, root.id, visited, [], 5);

    for (const path of paths) {
      if (path.length >= 2) {
        const urls = path.map((nodeId) => {
          const node = graph.getPageNode(nodeId);
          return node?.url || nodeId;
        });

        const category = categorizeFlow(urls);
        const hasAuthentication = urls.some(isAuthUrl);
        const hasCriticalActions = urls.some(isCriticalUrl);

        // Score based on flow characteristics
        let score = 50;
        if (hasAuthentication) score += 30;
        if (hasCriticalActions) score += 20;
        score = Math.min(100, score);

        // Generate flow name
        const flowName = generateFlowName(urls, category);

        flows.push({
          name: flowName,
          urls,
          score,
          category,
          hasAuthentication,
          hasCriticalActions,
          keyElements: [], // Elements would come from element detection
        });
      }
    }
  }

  // Deduplicate and sort by score
  const uniqueFlows = deduplicateFlows(flows);
  return uniqueFlows.sort((a, b) => b.score - a.score);
}

/**
 * Find paths from a node using DFS with depth limit.
 */
function findPathsFromNode(
  graph: ExplorationGraph,
  nodeId: string,
  visited: Set<string>,
  currentPath: string[],
  maxDepth: number,
): string[][] {
  if (visited.has(nodeId) || currentPath.length >= maxDepth) {
    return currentPath.length > 0 ? [currentPath] : [];
  }

  visited.add(nodeId);
  const newPath = [...currentPath, nodeId];

  const successors = graph.getNodeSuccessors(nodeId);
  if (successors.length === 0) {
    return [newPath];
  }

  const paths: string[][] = [newPath];
  for (const successor of successors) {
    const subPaths = findPathsFromNode(
      graph,
      successor,
      visited,
      newPath,
      maxDepth,
    );
    paths.push(...subPaths);
  }

  // Allow node to be visited again in other paths
  visited.delete(nodeId);

  return paths;
}

/**
 * Generate a human-readable name for a flow.
 */
function generateFlowName(urls: string[], category: string): string {
  // Extract meaningful parts from URLs
  const parts = urls
    .map((url) => {
      try {
        const parsed = new URL(url);
        const pathParts = parsed.pathname.split("/").filter(Boolean);
        return pathParts[pathParts.length - 1] || "home";
      } catch {
        return "page";
      }
    })
    .filter(Boolean);

  const uniqueParts = [...new Set(parts)];
  const description = uniqueParts.slice(0, 3).join(" to ");

  return `${category}: ${description}`;
}

/**
 * Remove duplicate flows (same URL sequence).
 */
function deduplicateFlows(flows: FlowInfo[]): FlowInfo[] {
  const seen = new Set<string>();
  const unique: FlowInfo[] = [];

  for (const flow of flows) {
    const key = flow.urls.join("->>");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(flow);
    }
  }

  return unique;
}
