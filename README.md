# vibetest

AI test generation from your clicks. Record. Generate. Test. Stop writing tests manually.

## Installation

### Quick install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/vibe-testing/vibetest/refs/heads/main/install.sh | bash
```

### Install specific version

```bash
curl -fsSL https://raw.githubusercontent.com/vibe-testing/vibetest/refs/heads/main/install.sh | bash -s -- --version 0.1.0
```

### Install from local binary

```bash
./install.sh --binary /path/to/vibetest
```

### Build from source

Requires [Bun](https://bun.sh) v1.0+

```bash
git clone https://github.com/vibe-testing/vibetest.git
cd vibetest
bun install
bun run build
```

Binary will be at `dist/vibetest`. Move it to your PATH or use the install script:

```bash
./install.sh --binary dist/vibetest
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

```bash
# Basic usage
vibetest https://your-app.com

# With reset endpoint (for stateful apps)
vibetest https://your-app.com --reset-endpoint https://your-app.com/api/reset

# Show help
vibetest --help

# Show version
vibetest --version
```

## How it works

1. You provide a URL
2. vibetest launches Playwright and explores the page
3. It builds an internal graph of DOM, interactions, and accessibility info
4. The LLM suggests test cases based on the analysis
5. You approve/reject suggested tests
6. vibetest generates Playwright test code for approved tests

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- Node.js 18+ (for some tooling)

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
bun run dev -- https://example.com
bun run dev -- --help
```

### Build

```bash
bun run build
```

Creates a standalone binary at `dist/vibetest`.

### Testing

Tests are co-located with source files using `.spec.ts` suffix.

```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# Run specific test file
bun test src/config/config-loader.service.spec.ts
```

### Type checking

```bash
bunx tsc --noEmit
```

### Project structure

```
vibetest/
├── src/
│   ├── index.ts                 # CLI entry point
│   └── config/
│       ├── config.interface.ts           # Config type definitions
│       ├── config-loader.service.ts      # XDG-compliant config loading
│       ├── config-loader.service.spec.ts # Tests (co-located)
│       └── index.ts                      # Barrel export
│   └── baml_client/             # Generated BAML client (committed)
├── baml_src/
│   └── clients.baml             # LLM provider configuration
├── dist/                        # Build output (git-ignored)
├── install.sh                   # Cross-platform install script
├── package.json
├── tsconfig.json
└── bunfig.toml
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality (co-located `.spec.ts` files)
5. Run tests (`bun test`)
6. Run type checking (`bunx tsc --noEmit`)
7. Commit your changes (`git commit -m 'feat: add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

### Commit convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `chore:` maintenance tasks
- `refactor:` code change that neither fixes a bug nor adds a feature
