# VibeTesting CLI Design

## Overview

VibeTesting is an AI-powered CLI tool that explores web applications, builds semantic graphs of user flows, and generates Playwright tests. The tool understands entire application workflows rather than isolated components.

## Business Model

**Open Source CLI (this repo):** Fully functional, MIT licensed, requires BYOK (bring your own API key for Anthropic/OpenAI).

**Cloud Service (separate, future):** Automated exploration + test maintenance via PRs. Connects to GitHub repo + staging URL, runs nightly exploration, opens PRs with new/updated tests when the app changes.

**Target users:**

- Solo developers: Use CLI free forever
- Startup teams (5-20 devs): CLI locally + Cloud service for automation

## CLI Commands

### `vibetest explore <url>`

Crawls the application and builds a semantic graph.

```bash
vibetest explore https://staging.myapp.com
  --depth <n>           # How deep to crawl (default: 3)
  --output <dir>        # Where to save results (default: ./.vibetest)
  --headless            # Run browser headless (default: true)
  --strategy <preset>   # Page ready strategy: spa|ssr|static (default: auto)
```

**Output:**

- `.vibetest/app-graph.json` - The semantic graph
- `.vibetest/coverage.json` - Flow coverage analysis

### `vibetest generate`

Generates Playwright tests from an existing graph.

```bash
vibetest generate
  --graph <path>        # Path to app-graph.json (default: ./.vibetest/app-graph.json)
  --output <dir>        # Where to write tests (default: ./tests)
```

**Output:**

- `tests/*.spec.ts` - Generated Playwright test files

### `vibetest diff <old-graph> <new-graph>`

Compares two graphs to show what changed in the application.

```bash
vibetest diff .vibetest/app-graph.json .vibetest/app-graph-prev.json
  --format <type>       # Output: summary|json|markdown (default: summary)
```

**Output:**

```
Comparing graphs: 2024-01-25 → 2024-01-27

STRUCTURAL CHANGES
──────────────────
Pages:     +2 added, -1 removed, 4 modified
Elements:  +18 added, -7 removed, 12 modified
Edges:     +5 new paths, -2 removed paths

Added pages:
  • /settings/notifications (12 elements)
  • /checkout/confirmation (8 elements)

Removed pages:
  • /legacy/profile

Modified pages:
  • /dashboard - 3 elements added, 1 removed
  • /checkout - form restructured (5 element changes)

VISUAL DIFF
──────────────────
See: .vibetest/diff-2024-01-27.md
```

The visual diff is a Mermaid diagram with color-coded nodes (green=added, red=removed, yellow=modified) that renders in GitHub.

## Configuration

`vibetest.config.js` or `.vibetestrc`:

```js
{
  "baseUrl": "https://staging.myapp.com",
  "llm": {
    "provider": "anthropic",  // or "openai"
    "model": "claude-sonnet-4-20250514"
  },
  "exploration": {
    "depth": 3,
    "ignorePatterns": ["/admin/*", "/api/*"]
  }
}
```

## LLM Integration

LLM is required - this is an AI-powered tool.

**Environment variables (user provides their own keys):**

```bash
ANTHROPIC_API_KEY=sk-ant-...
# or
OPENAI_API_KEY=sk-...
```

If no key is set, the CLI fails with: `"API key required. Set ANTHROPIC_API_KEY or OPENAI_API_KEY."`

The LLM analyzes screenshots and element context to determine semantic meaning: is this button a primary CTA? A cancel button? A dangerous delete action? This powers intelligent test prioritization.

## Tech Stack

- **Runtime:** Node.js
- **Browser automation:** Playwright
- **CLI framework:** Commander or Yargs
- **Graph data structure:** Graphology
- **LLM structured outputs:** BAML
- **Terminal formatting:** Chalk + Ora
- **Language:** TypeScript
- **Distribution:** npm (`npx vibetest explore <url>`)

## Repository Structure

```
/home/ubuntu/vibetest/
├── src/
│   ├── cli/           # Command definitions (explore, generate, diff)
│   ├── browser/       # Playwright wrapper
│   ├── detection/     # Element detection (15 element types)
│   ├── semantics/     # LLM-powered semantic analysis
│   ├── exploration/   # Crawling orchestration
│   ├── graph/         # Graphology wrapper
│   └── codegen/       # Playwright test generation
├── package.json
├── tsconfig.json
└── vibetest.config.example.js
```

## Reference Material: original-idea/

The `original-idea/` directory at `/home/ubuntu/vibetest/original-idea/` contains a full platform implementation that serves as reference and source for extraction. This directory will be removed after implementation is complete.

### Code to Extract

| Source (original-idea/)      | Destination        | Purpose                            |
| ---------------------------- | ------------------ | ---------------------------------- |
| `api/src/element-detection/` | `src/detection/`   | Element discovery & classification |
| `api/src/element-semantics/` | `src/semantics/`   | Semantic analysis & prioritization |
| `api/src/page-ready/`        | `src/browser/`     | Page readiness detection           |
| `api/src/site-exploration/`  | `src/exploration/` | Crawling orchestration             |
| `api/src/graph-core/`        | `src/graph/`       | Graph representation               |
| `api/src/code-generator/`    | `src/codegen/`     | Playwright test generation         |
| `api/baml_src/`              | `baml_src/`        | LLM prompts                        |

### Do Not Extract (cloud-service concerns)

- `api/src/auth/` - Authentication
- `api/src/subscription/` - Payments
- `api/src/queue/` - BullMQ job queue
- `api/src/redis/` - Redis caching
- `web/` - Web frontend

## Key Capabilities (from original-idea)

### Element Detection

- Detects 15 interactive element types (buttons, inputs, forms, checkboxes, radios, selects, etc.)
- XPath generation with 6 fallback strategies
- Shadow DOM support with iframe traversal
- ARIA role mapping (60+ roles)
- Confidence scoring (0-100)

### Semantic Analysis

- Hybrid scoring: heuristic-based + LLM-powered
- Classifies elements into 11 semantic kinds (primary CTA, secondary action, form fields, dangerous actions, etc.)
- Screenshot overlays for LLM context
- Exploration prioritization with multipliers

### Page Readiness

- Multi-gate detection: network idle, DOM stability, SPA hydration, animation completion
- 6 strategy presets: default, static, spa, ssr, canvas, custom
- Framework detection for React, Vue, Angular

### Graph Model

- Nodes: pages with detected elements
- Edges: navigation paths and interactions
- Graphology-based with traversal algorithms

## Future: Cloud Service Integration

The CLI will optionally connect to the cloud service for automated workflows:

1. **Change-triggered:** Push code → service detects changes → re-explores affected areas → opens PR with test updates
2. **Schedule-triggered:** Nightly exploration → compares new graph to old → opens PR with changes

**App access options:**

- Permanent staging URL
- Temporary Cloudflare tunnel from GitHub Actions

The cloud service is a separate repository and concern - this CLI works fully standalone.

## Implementation Phases

### Phase 1: Project Setup

- Initialize Node.js/TypeScript project
- Set up build tooling and npm package structure
- Configure BAML for LLM integration
- Create CLI scaffolding with Commander/Yargs

### Phase 2: Core Browser Infrastructure

- Extract and adapt browser wrapper from `original-idea/api/src/browser/`
- Extract and adapt page-ready detection from `original-idea/api/src/page-ready/`
- Set up Playwright with configurable strategies

### Phase 3: Element Detection

- Extract and adapt from `original-idea/api/src/element-detection/`
- Adapt for CLI context (remove NestJS dependencies)
- Implement confidence scoring and XPath generation

### Phase 4: Semantic Analysis

- Extract and adapt from `original-idea/api/src/element-semantics/`
- Extract BAML prompts from `original-idea/api/baml_src/`
- Implement LLM provider abstraction (Anthropic/OpenAI)

### Phase 5: Graph Construction

- Extract and adapt from `original-idea/api/src/graph-core/`
- Implement graph serialization to JSON
- Build Mermaid export for visualization

### Phase 6: Site Exploration

- Extract and adapt from `original-idea/api/src/site-exploration/`
- Implement `vibetest explore` command
- Wire together browser → detection → semantics → graph

### Phase 7: Test Generation

- Extract and adapt from `original-idea/api/src/code-generator/`
- Implement `vibetest generate` command
- Output Playwright test files

### Phase 8: Diff Command

- Implement graph comparison logic
- Build structural diff output
- Generate Mermaid visual diffs
- Implement `vibetest diff` command

### Phase 9: Polish & Documentation

- Configuration file support (vibetest.config.js)
- Error handling and user-friendly messages
- README and usage documentation
- Example outputs

### Phase 10: Cleanup

- Remove `original-idea/` directory
- Final testing and validation
- Prepare for npm publish
