# VibeTesting CLI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone CLI tool that explores web applications, builds semantic graphs, and generates Playwright tests - extracting core logic from `original-idea/` with full code review.

**Architecture:** Bun CLI using Commander for subcommands, Playwright for browser automation, Graphology for graph structure, BAML for LLM integration. Each module extracted from `original-idea/api/src/` is reviewed, stripped of NestJS dependencies, and adapted for CLI context.

**Tech Stack:** Bun 1.1+, TypeScript 5, Playwright 1.50, Graphology 0.26, BAML 0.218, Commander, Chalk

**Existing Foundation:**

- ✅ Bun project setup (package.json, tsconfig.json, bunfig.toml)
- ✅ Config system (src/config/) with tests
- ✅ BAML client setup (baml_src/clients.baml, src/baml_client/)
- ⚠️ Basic CLI (src/index.ts) - needs rewrite for Commander

---

## Phase 1: CLI Framework

### Task 1.1: Add Commander and Graphology Dependencies

**Files:**

- Modify: `package.json`

**Step 1: Install dependencies**

Run: `bun add commander graphology graphology-types`

**Step 2: Verify installation**

Run: `bun run dev --help`

**Step 3: Commit**

Run: `git add package.json bun.lockb`
Run: `git commit -m "chore: add commander and graphology dependencies"`

---

### Task 1.2: Rewrite CLI with Commander Subcommands

**Files:**

- Rewrite: `src/index.ts`
- Create: `src/cli/commands/explore.ts`
- Create: `src/cli/commands/generate.ts`
- Create: `src/cli/commands/diff.ts`
- Create: `src/cli/index.ts`

**Step 1: Write test for CLI**

Create: `src/cli/cli.spec.ts`

```typescript
import { describe, it, expect } from "bun:test";
import { spawnSync } from "child_process";

describe("CLI", () => {
  it("shows help with --help flag", () => {
    const result = spawnSync("bun", ["run", "src/index.ts", "--help"], {
      encoding: "utf-8",
    });
    expect(result.stdout).toContain("vibetest");
    expect(result.stdout).toContain("explore");
    expect(result.stdout).toContain("generate");
    expect(result.stdout).toContain("diff");
  });

  it("shows version with --version flag", () => {
    const result = spawnSync("bun", ["run", "src/index.ts", "--version"], {
      encoding: "utf-8",
    });
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it("explore command accepts URL argument", () => {
    const result = spawnSync(
      "bun",
      ["run", "src/index.ts", "explore", "--help"],
      { encoding: "utf-8" },
    );
    expect(result.stdout).toContain("<url>");
    expect(result.stdout).toContain("--depth");
    expect(result.stdout).toContain("--output");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/cli/cli.spec.ts`

Expected: FAIL - commands not defined

**Step 3: Create explore command**

Create: `src/cli/commands/explore.ts`

```typescript
import { Command } from "commander";
import chalk from "chalk";

export function createExploreCommand(): Command {
  return new Command("explore")
    .description("Explore a web application and build a semantic graph")
    .argument("<url>", "URL to explore")
    .option("-d, --depth <n>", "How deep to crawl", "3")
    .option("-o, --output <dir>", "Output directory", ".vibetest")
    .option("--no-headless", "Run browser with visible window")
    .option(
      "--strategy <preset>",
      "Page ready strategy: spa|ssr|static",
      "auto",
    )
    .action(async (url: string, options) => {
      console.log(chalk.bold("Exploring:"), url);
      console.log(chalk.dim("Options:"), options);
      // TODO: Implement exploration
      console.log(chalk.yellow("\nNot yet implemented."));
    });
}
```

**Step 4: Create generate command**

Create: `src/cli/commands/generate.ts`

```typescript
import { Command } from "commander";
import chalk from "chalk";

export function createGenerateCommand(): Command {
  return new Command("generate")
    .description("Generate Playwright tests from an existing graph")
    .option(
      "-g, --graph <path>",
      "Path to app-graph.json",
      ".vibetest/app-graph.json",
    )
    .option("-o, --output <dir>", "Output directory for tests", "./tests")
    .action(async (options) => {
      console.log(chalk.bold("Generating tests"));
      console.log(chalk.dim("Options:"), options);
      // TODO: Implement generation
      console.log(chalk.yellow("\nNot yet implemented."));
    });
}
```

**Step 5: Create diff command**

Create: `src/cli/commands/diff.ts`

```typescript
import { Command } from "commander";
import chalk from "chalk";

export function createDiffCommand(): Command {
  return new Command("diff")
    .description("Compare two graphs to show what changed")
    .argument("<old-graph>", "Path to old graph")
    .argument("<new-graph>", "Path to new graph")
    .option(
      "-f, --format <type>",
      "Output format: summary|json|markdown",
      "summary",
    )
    .action(async (oldGraph: string, newGraph: string, options) => {
      console.log(chalk.bold("Comparing graphs:"));
      console.log(chalk.dim(`  Old: ${oldGraph}`));
      console.log(chalk.dim(`  New: ${newGraph}`));
      // TODO: Implement diff
      console.log(chalk.yellow("\nNot yet implemented."));
    });
}
```

**Step 6: Create CLI index**

Create: `src/cli/index.ts`

```typescript
export { createExploreCommand } from "./commands/explore.js";
export { createGenerateCommand } from "./commands/generate.js";
export { createDiffCommand } from "./commands/diff.js";
```

**Step 7: Rewrite main entry point**

Rewrite: `src/index.ts`

```typescript
#!/usr/bin/env bun

import { Command } from "commander";
import {
  createExploreCommand,
  createGenerateCommand,
  createDiffCommand,
} from "./cli/index.js";

const program = new Command();

program
  .name("vibetest")
  .description("AI-powered web application exploration and test generation")
  .version("0.1.0");

program.addCommand(createExploreCommand());
program.addCommand(createGenerateCommand());
program.addCommand(createDiffCommand());

program.parse();
```

**Step 8: Run test to verify it passes**

Run: `bun test src/cli/cli.spec.ts`

Expected: PASS

**Step 9: Commit**

Run: `git add src/`
Run: `git commit -m "feat: rewrite CLI with Commander subcommands (explore, generate, diff)"`

---

## Phase 2: Browser Infrastructure

### Task 2.1: Extract and Review page-ready Module

**Source:** `original-idea/api/src/page-ready/`
**Destination:** `src/browser/page-ready/`

**Step 1: Code review of original**

Read and review these files from `original-idea/api/src/page-ready/`:

- `page-ready.service.ts` - Main service
- `page-ready.config.ts` - Configuration
- `page-ready.dto.ts` - Types

**Review checklist:**

- [ ] Identify all `@nestjs/common` imports (to remove)
- [ ] Identify Logger usage patterns (replace with console)
- [ ] Check for security issues
- [ ] Document public API surface

**Step 2: Write test**

Create: `src/browser/page-ready/page-ready.spec.ts`

```typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "bun:test";
import { chromium, type Browser, type Page } from "playwright";
import { waitForPageReady } from "./page-ready.js";

describe("PageReady", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  it("detects ready state on simple HTML page", async () => {
    await page.setContent("<html><body><h1>Hello</h1></body></html>");
    const result = await waitForPageReady(page);
    expect(result.ready).toBe(true);
    expect(result.timeMs).toBeGreaterThan(0);
  });

  it("respects timeout", async () => {
    await page.setContent(`
      <html><body>
        <script>
          setInterval(() => {
            document.body.appendChild(document.createElement('div'));
          }, 100);
        </script>
      </body></html>
    `);
    const result = await waitForPageReady(page, { timeoutMs: 500 });
    expect(result.ready).toBe(false);
    expect(result.reason).toContain("timeout");
  });
});
```

**Step 3: Run test to verify it fails**

Run: `bun test src/browser/page-ready/page-ready.spec.ts`

Expected: FAIL - module not found

**Step 4: Extract and adapt**

Create: `src/browser/page-ready/types.ts` - Types from original
Create: `src/browser/page-ready/page-ready.ts` - Extract from original, remove NestJS
Create: `src/browser/page-ready/index.ts` - Exports

Key changes from original:

- Remove `@Injectable()` decorator
- Remove NestJS Logger → use `console.debug` when debug mode
- Convert class to standalone `waitForPageReady()` function

**Step 5: Run test to verify it passes**

Run: `bun test src/browser/page-ready/page-ready.spec.ts`

**Step 6: Code review**

Use code-reviewer agent to review extracted code.

**Step 7: Commit**

Run: `git add src/browser/page-ready/`
Run: `git commit -m "feat: extract page-ready module from original-idea"`

---

### Task 2.2: Extract Browser Service

**Source:** `original-idea/api/src/browser/`
**Destination:** `src/browser/`

**Step 1: Code review of original**

Review:

- `browser.service.ts` - Main service
- `utils/` - DOM/event tracking utilities
- `types.ts`, `constants.ts`

**Review checklist:**

- [ ] Identify NestJS lifecycle hooks (OnModuleInit, OnModuleDestroy)
- [ ] Check URL validation for security
- [ ] Document initialization/cleanup requirements

**Step 2: Write test**

Create: `src/browser/browser-service.spec.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { BrowserService } from "./browser-service.js";

describe("BrowserService", () => {
  let browserService: BrowserService;

  beforeAll(async () => {
    browserService = new BrowserService();
    await browserService.initialize();
  });

  afterAll(async () => {
    await browserService.cleanup();
  });

  it("creates a new page", async () => {
    const page = await browserService.newPage();
    expect(page).toBeDefined();
    expect(page.url()).toBe("about:blank");
    await page.close();
  });

  it("navigates to a URL", async () => {
    const page = await browserService.newPage();
    await page.goto("https://example.com");
    expect(page.url()).toContain("example.com");
    await page.close();
  });
});
```

**Step 3-7: Standard TDD flow**

Extract from original, remove NestJS lifecycle hooks → explicit `initialize()`/`cleanup()` methods.

---

## Phase 3: Element Detection

### Task 3.1: Extract Element Types and ARIA Mappings

**Source:** `original-idea/api/src/element-detection/elements/`
**Destination:** `src/detection/elements/`

**Step 1: Code review**

Review:

- `aria.ts` - 60+ ARIA role mappings (pure data)
- `actions.enum.ts` - Element action types
- `abstract.element.ts` - Base class (has Logger)
- Concrete element classes (ButtonElement, TextInputElement, etc.)

**Step 2: Write test**

Create: `src/detection/elements/elements.spec.ts`

```typescript
import { describe, it, expect } from "bun:test";
import { ARIA_ROLE_MAP, ElementAction, ELEMENTS } from "./index.js";

describe("Element Types", () => {
  it("has comprehensive ARIA role mappings", () => {
    expect(Object.keys(ARIA_ROLE_MAP).length).toBeGreaterThan(50);
    expect(ARIA_ROLE_MAP["button"]).toBeDefined();
    expect(ARIA_ROLE_MAP["textbox"]).toBeDefined();
  });

  it("defines standard element actions", () => {
    expect(ElementAction.CLICK).toBeDefined();
    expect(ElementAction.TYPE).toBeDefined();
  });

  it("exports all element classes", () => {
    expect(ELEMENTS.length).toBeGreaterThan(10);
  });
});
```

**Step 3-7: Standard TDD flow**

Copy pure data files, remove Logger from classes.

---

### Task 3.2: Extract XPath Generation

**Source:** `original-idea/api/src/element-detection/xpath/`
**Destination:** `src/detection/xpath/`

Extract XPath generation utilities. Review for injection safety.

---

### Task 3.3: Extract Element Detection Service

**Source:** `original-idea/api/src/element-detection/element-detection.service.ts`
**Destination:** `src/detection/detector.ts`

Convert to function-based API.

---

## Phase 4: Semantic Analysis

### Task 4.1: Extend BAML with Element Analysis

**Source:** `original-idea/api/baml_src/analyze_elements.baml`
**Destination:** `baml_src/analyze_elements.baml`

**Step 1: Code review original BAML**

Review prompts for quality and safety.

**Step 2: Copy and adapt**

Copy analysis prompts, ensure they work with existing clients.baml.

**Step 3: Regenerate client**

Run: `bun run baml:generate`

**Step 4: Commit**

---

### Task 4.2: Extract Heuristic Scoring

**Source:** `original-idea/api/src/element-semantics/heuristic-score.utils.ts`
**Destination:** `src/semantics/heuristic.ts`

Pure utility code - should extract cleanly.

---

### Task 4.3: Extract Screenshot Overlay Service

**Source:** `original-idea/api/src/element-semantics/screenshot-overlay.service.ts`
**Destination:** `src/semantics/screenshot-overlay.ts`

**Step 1: Install sharp**

Run: `bun add sharp`

**Step 2-7: Standard TDD flow**

---

### Task 4.4: Extract Semantic Analysis Service

**Source:** `original-idea/api/src/element-semantics/element-semantics.service.ts`
**Destination:** `src/semantics/analyzer.ts`

Combine heuristic + LLM analysis.

---

## Phase 5: Graph Construction

### Task 5.1: Extract Graph Core

**Source:** `original-idea/api/src/site-exploration/graph/exploration-graph.ts`
**Destination:** `src/graph/exploration-graph.ts`

Graphology wrapper - should be clean extraction.

---

### Task 5.2: Implement Graph Serialization

**Files:**

- Create: `src/graph/serialize.ts`

New code - serialize graph to/from JSON (app-graph.json format).

---

### Task 5.3: Implement Mermaid Export

**Files:**

- Create: `src/graph/mermaid.ts`

New code - generate Mermaid diagrams for visualization.

---

## Phase 6: Site Exploration

### Task 6.1: Extract Exploration Orchestration

**Source:** `original-idea/api/src/site-exploration/`
**Destination:** `src/exploration/`

**Key adaptations:**

- Remove TypeORM/database dependencies
- Use in-memory graph
- Keep crawling and link-following logic

---

## Phase 7: Test Generation

### Task 7.1: Extract Code Generator

**Source:** `original-idea/api/src/code-generator/`
**Destination:** `src/codegen/`

**Key adaptations:**

- Remove database dependencies
- Remove GitHub integration
- Keep BAML-based Playwright code generation

---

## Phase 8: Wire Up Commands

### Task 8.1: Implement explore Command

Wire together all modules:

1. Load config (existing)
2. Initialize BrowserService
3. Navigate to URL
4. Wait for page ready
5. Detect elements
6. Analyze semantics
7. Build graph
8. Follow links (up to depth)
9. Serialize to `.vibetest/app-graph.json`

---

### Task 8.2: Implement generate Command

1. Load graph from JSON
2. Initialize LLM via BAML
3. Generate Playwright tests
4. Write to `tests/*.spec.ts`

---

### Task 8.3: Implement diff Command

1. Load two graphs
2. Compare nodes and edges
3. Output structural summary
4. Generate Mermaid diff diagram

---

## Phase 9: Polish

### Task 9.1: Add Progress Indicators

Use Chalk for colors, simple progress output.

---

### Task 9.2: Error Handling

User-friendly messages for:

- Missing API key
- Invalid URL
- Network failures
- LLM errors

---

### Task 9.3: Documentation

Update README.md with usage examples.

---

## Phase 10: Cleanup

### Task 10.1: Final Verification

Run: `bun test`
Run: `bun run dev explore https://example.com`
Run: `bun run dev generate`

---

### Task 10.2: Remove original-idea Directory

Run: `rm -rf original-idea/`
Run: `git add -A`
Run: `git commit -m "chore: remove original-idea reference directory"`

---

## Execution Notes

- **Runtime:** Bun (not Node.js/npm)
- **Test command:** `bun test` (not vitest)
- **Run command:** `bun run dev` or `bun run src/index.ts`
- **Install packages:** `bun add <package>`
- **Each task follows TDD:** Write failing test → Implement → Pass → Review → Commit
- **Code review after each extraction:** Use code-reviewer agent
- **Review original before adapting:** Understand before copying
