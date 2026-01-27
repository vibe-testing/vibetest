/**
 * Code Generator Tests
 *
 * Tests for the test code generation service that converts exploration
 * graphs into Playwright test files.
 */

import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdir, rm, readFile, writeFile } from "fs/promises";
import { join } from "path";
import {
  generateFilename,
  groupTestsByCategory,
  writeTestFiles,
  createGraphSummary,
  identifyUserFlows,
  type GeneratedTest,
  type GraphSummaryInput,
  type FlowInfo,
} from "./generator.js";
import { ExplorationGraph } from "../graph/index.js";

describe("generateFilename", () => {
  test("converts spaces to hyphens", () => {
    const filename = generateFilename("User login with email");
    expect(filename).toBe("user-login-with-email.spec.ts");
  });

  test("removes special characters", () => {
    const filename = generateFilename("Test: Login & Password Reset!");
    expect(filename).toBe("test-login-password-reset.spec.ts");
  });

  test("removes leading and trailing hyphens", () => {
    const filename = generateFilename("!!! Test Case !!!");
    expect(filename).toBe("test-case.spec.ts");
  });

  test("collapses multiple hyphens", () => {
    const filename = generateFilename("Test   with   spaces");
    expect(filename).toBe("test-with-spaces.spec.ts");
  });

  test("handles empty string", () => {
    const filename = generateFilename("");
    expect(filename).toBe("test.spec.ts");
  });

  test("handles only special characters", () => {
    const filename = generateFilename("!@#$%^&*()");
    expect(filename).toBe("test.spec.ts");
  });
});

describe("groupTestsByCategory", () => {
  test("groups tests by their tags", () => {
    const tests: GeneratedTest[] = [
      {
        filename: "login.spec.ts",
        code: "test1",
        category: "auth",
      },
      {
        filename: "signup.spec.ts",
        code: "test2",
        category: "auth",
      },
      {
        filename: "checkout.spec.ts",
        code: "test3",
        category: "commerce",
      },
    ];

    const grouped = groupTestsByCategory(tests);

    expect(grouped.get("auth")).toHaveLength(2);
    expect(grouped.get("commerce")).toHaveLength(1);
  });

  test("uses default category for tests without category", () => {
    const tests: GeneratedTest[] = [
      {
        filename: "test1.spec.ts",
        code: "test1",
        category: undefined,
      },
    ];

    const grouped = groupTestsByCategory(tests);

    expect(grouped.get("general")).toHaveLength(1);
  });

  test("returns empty map for empty input", () => {
    const grouped = groupTestsByCategory([]);
    expect(grouped.size).toBe(0);
  });
});

describe("writeTestFiles", () => {
  const testDir = "/tmp/vibetest-codegen-test";

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("writes a single test file", async () => {
    const tests: GeneratedTest[] = [
      {
        filename: "login.spec.ts",
        code: `import { test, expect } from '@playwright/test';

test('login works', async ({ page }) => {
  await page.goto('/login');
});
`,
        category: "auth",
      },
    ];

    const result = await writeTestFiles(tests, testDir);

    expect(result.writtenFiles).toHaveLength(1);
    expect(result.writtenFiles[0]).toContain("login.spec.ts");

    const content = await readFile(result.writtenFiles[0], "utf-8");
    expect(content).toContain("import { test, expect }");
    expect(content).toContain("login works");
  });

  test("writes multiple test files", async () => {
    const tests: GeneratedTest[] = [
      {
        filename: "login.spec.ts",
        code: "// login test",
        category: "auth",
      },
      {
        filename: "checkout.spec.ts",
        code: "// checkout test",
        category: "commerce",
      },
    ];

    const result = await writeTestFiles(tests, testDir);

    expect(result.writtenFiles).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  test("creates output directory if it does not exist", async () => {
    const nestedDir = join(testDir, "nested", "tests");
    const tests: GeneratedTest[] = [
      {
        filename: "test.spec.ts",
        code: "// test",
        category: "general",
      },
    ];

    const result = await writeTestFiles(tests, nestedDir);

    expect(result.writtenFiles).toHaveLength(1);
    expect(result.writtenFiles[0]).toContain(nestedDir);
  });

  test("handles duplicate filenames by appending number", async () => {
    const tests: GeneratedTest[] = [
      {
        filename: "test.spec.ts",
        code: "// first",
        category: "general",
      },
      {
        filename: "test.spec.ts",
        code: "// second",
        category: "general",
      },
    ];

    const result = await writeTestFiles(tests, testDir);

    expect(result.writtenFiles).toHaveLength(2);
    // Second file should have a number appended
    expect(result.writtenFiles.some((f) => f.includes("test-1.spec.ts"))).toBe(
      true,
    );
  });

  test("returns errors for invalid content", async () => {
    const tests: GeneratedTest[] = [
      {
        filename: "", // Invalid filename
        code: "// test",
        category: "general",
      },
    ];

    const result = await writeTestFiles(tests, testDir);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("filename");
  });
});

describe("createGraphSummary", () => {
  function createTestGraph(): ExplorationGraph {
    const graph = new ExplorationGraph();
    graph.initialize("test-workspace", "https://example.com", {
      maxDepth: 3,
      maxPages: 10,
    });

    // Add some pages
    graph.addPageNode("page-1", {
      url: "https://example.com/",
      title: "Home",
      depth: 0,
      status: "visited",
    });

    graph.addPageNode("page-2", {
      url: "https://example.com/login",
      title: "Login",
      depth: 1,
      status: "visited",
    });

    graph.addPageNode("page-3", {
      url: "https://example.com/dashboard",
      title: "Dashboard",
      depth: 2,
      status: "visited",
    });

    // Add navigation edges
    graph.addNavigationEdge("edge-1", "page-1", "page-2", {
      transitionType: "link_click",
      status: "completed",
    });

    graph.addNavigationEdge("edge-2", "page-2", "page-3", {
      transitionType: "form_submit",
      status: "completed",
    });

    return graph;
  }

  test("creates summary with correct total pages", () => {
    const graph = createTestGraph();
    const summary = createGraphSummary(graph);

    expect(summary.totalPages).toBe(3);
  });

  test("calculates correct max depth", () => {
    const graph = createTestGraph();
    const summary = createGraphSummary(graph);

    expect(summary.maxDepth).toBe(2);
  });

  test("identifies hub pages by connection count", () => {
    const graph = createTestGraph();
    const summary = createGraphSummary(graph);

    // Home page should be identified as a hub (most connected)
    expect(summary.hubPageUrls.length).toBeGreaterThanOrEqual(1);
  });

  test("returns empty arrays for empty graph", () => {
    const graph = new ExplorationGraph();
    const summary = createGraphSummary(graph);

    expect(summary.totalPages).toBe(0);
    expect(summary.hubPageUrls).toHaveLength(0);
    expect(summary.clusterSummaries).toHaveLength(0);
  });
});

describe("identifyUserFlows", () => {
  function createTestGraphWithFlows(): ExplorationGraph {
    const graph = new ExplorationGraph();
    graph.initialize("test-workspace", "https://example.com");

    // Create an auth flow
    graph.addPageNode("home", {
      url: "https://example.com/",
      title: "Home",
      depth: 0,
      status: "visited",
    });

    graph.addPageNode("login", {
      url: "https://example.com/login",
      title: "Login",
      depth: 1,
      status: "visited",
    });

    graph.addPageNode("dashboard", {
      url: "https://example.com/dashboard",
      title: "Dashboard",
      depth: 2,
      status: "visited",
    });

    graph.addNavigationEdge("edge-1", "home", "login", {
      transitionType: "link_click",
      status: "completed",
    });

    graph.addNavigationEdge("edge-2", "login", "dashboard", {
      transitionType: "form_submit",
      status: "completed",
    });

    return graph;
  }

  test("identifies linear flows", () => {
    const graph = createTestGraphWithFlows();
    const flows = identifyUserFlows(graph);

    expect(flows.length).toBeGreaterThan(0);
  });

  test("assigns authentication category to login flows", () => {
    const graph = createTestGraphWithFlows();
    const flows = identifyUserFlows(graph);

    const authFlow = flows.find((f) => f.category === "authentication");
    expect(authFlow).toBeDefined();
  });

  test("returns empty array for empty graph", () => {
    const graph = new ExplorationGraph();
    const flows = identifyUserFlows(graph);

    expect(flows).toHaveLength(0);
  });

  test("sets hasAuthentication flag for auth pages", () => {
    const graph = createTestGraphWithFlows();
    const flows = identifyUserFlows(graph);

    const authFlow = flows.find((f) => f.hasAuthentication);
    expect(authFlow).toBeDefined();
  });
});
