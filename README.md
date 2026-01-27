# vibetest

AI test generation from your clicks. Record. Generate. Test. Stop writing tests manually.

## Installation

Requires [Bun](https://bun.sh) v1.0+

```bash
git clone https://github.com/vibe-testing/vibetest.git
cd vibetest
bun install
bunx playwright install chromium
```

## Configuration

vibetest loads configuration from (in order of precedence):

1. `.env` in current directory
2. `.env` at git repository root
3. `~/.config/vibetest/config`
4. Environment variables

### Required

Set at least one LLM provider API key:

```bash
# Anthropic (default)
export ANTHROPIC_API_KEY=sk-ant-...

# Or OpenAI
export OPENAI_API_KEY=sk-...
```

### Optional

```bash
# Switch provider (default: anthropic)
export VIBETEST_LLM_PROVIDER=openai

# Override model
export VIBETEST_MODEL=claude-sonnet-4-20250514
```

### Example .env file

```bash
# Copy .env.example to .env and fill in your values
cp .env.example .env
```

## Usage

### Explore a web application

```bash
# Explore and build a semantic graph
bun run dev explore https://your-app.com

# Explore with custom depth and page limits
bun run dev explore https://your-app.com --depth 5 --pages 100

# Run with visible browser (for debugging)
bun run dev explore https://your-app.com --no-headless

# Export Mermaid diagram
bun run dev explore https://your-app.com --mermaid
```

### Generate Playwright tests

```bash
# Generate tests from exploration graph
bun run dev generate

# Preview without writing files
bun run dev generate --dry-run

# Custom output directory
bun run dev generate --output tests/e2e

# Use a specific graph file
bun run dev generate --input .vibetest/app-graph.json
```

### Other commands

```bash
# Show help
bun run dev -- --help

# Show version
bun run dev -- --version
```

## How it works

1. **Explore**: `vibetest explore <url>` launches Playwright and crawls your app
2. **Graph**: Builds a semantic graph of pages, elements, and navigation flows
3. **Analyze**: Identifies authentication, transaction, and critical user flows
4. **Generate**: Creates Playwright test files organized by flow category
5. **Customize**: Review and enhance generated tests for your specific needs

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+

### Setup

```bash
git clone https://github.com/vibe-testing/vibetest.git
cd vibetest
bun install
```

### Install Playwright browsers

```bash
bunx playwright install chromium
```

### Generate BAML client

After modifying `baml_src/*.baml` files:

```bash
bun run baml:generate
```

### Run in development

```bash
bun run dev
bun run dev explore https://example.com
bun run dev -- --help
```

### Build

```bash
bun run build
```

Creates a compiled binary at `dist/vibetest` (requires `node_modules` at runtime for Playwright).

### Testing

Tests are co-located with source files using `.test.ts` suffix.

```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# Run specific test file
bun test src/graph/exploration-graph.test.ts
```

### Type checking

```bash
bunx tsc --noEmit
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality (co-located `.test.ts` files)
5. Run tests (`bun test`)
6. Run type checking (`bunx tsc --noEmit`)
7. Commit your changes (`git commit -m 'feat: add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

### Commit convention

We use [Conventional Commits](https://www.conventionalcommits.org/).
