# VibeTesting CLI

Graph-based web application exploration and automated Playwright test generation.

VibeTesting CLI records your browser interactions, analyzes user flows, and generates comprehensive Playwright test suites with 15+ test variations per flow—including happy path, validation, error handling, edge cases, and security tests.

## Features

- **Browser Recording**: Record user interactions via WebSocket-based event capture
- **Flow Analysis**: Automatically detect user intents (form submission, authentication, search, etc.)
- **Test Generation**: Generate 15+ test variations per flow with semantic naming
- **LLM Integration**: Smart test naming using BAML with AWS Bedrock (Claude) or other providers
- **Playwright Output**: Ready-to-run TypeScript Playwright spec files
- **Graph Exploration**: Explore web applications and build semantic graphs

## Quick Start

### Installation

```bash
# Clone and install
git clone https://github.com/your-org/vibetest.git
cd vibetest
pnpm install

# Build the CLI
pnpm build
```

### Record a User Flow

```bash
# Start recording (opens browser)
npx vibetest listen https://example.com

# Interact with the application...
# Press Ctrl+C to stop recording
```

This creates `./vibetest-output/recording.json` with your captured events.

### Generate Playwright Tests

```bash
# Generate tests from recording
npx vibetest generate ./vibetest-output/recording.json -o ./tests/generated

# Run generated tests
npx playwright test
```

## CLI Commands

### `vibetest listen <url>`

Record user interactions in a browser.

```bash
vibetest listen https://example.com [options]

Options:
  -o, --output <dir>     Output directory (default: ./vibetest-output)
  --headless             Run browser in headless mode
  --no-headless          Run browser with UI (default)
  -t, --timeout <ms>     Navigation timeout (default: 30000)
  --screenshots          Capture screenshots on events
  --network              Capture network requests
```

### `vibetest generate <recording>`

Generate Playwright tests from a recording.

```bash
vibetest generate ./recording.json [options]

Options:
  -o, --output <dir>       Output directory (default: ./tests/generated)
  --javascript             Generate JavaScript instead of TypeScript
  -t, --timeout <ms>       Test timeout (default: 30000)
  -v, --variations <n>     Max variations per flow (default: 15)
  -p, --min-priority <n>   Minimum priority 1-4 (default: 3)
  --skip-mocks             Skip generating API mocks
  --dry-run                Preview without writing files
```

### `vibetest explore <url>`

Explore a web application and build its graph.

```bash
vibetest explore https://example.com [options]

Options:
  -o, --output <dir>     Output directory (default: ./vibetest-output)
  -d, --max-depth <n>    Maximum exploration depth (default: 3)
  -p, --max-pages <n>    Maximum pages to explore (default: 50)
  --headless             Run browser in headless mode (default)
  --no-headless          Run browser with UI
  -t, --timeout <ms>     Navigation timeout (default: 30000)
  --click-buttons        Click buttons to discover transitions
```

### `vibetest diff <graph1> <graph2>`

Compare two exploration graphs.

```bash
vibetest diff ./graph1.json ./graph2.json [options]

Options:
  -o, --output <file>    Output diff to file
```

## Test Variations Generated

For each recorded flow, VibeTesting generates multiple test variations:

| Category | Examples |
|----------|----------|
| **Happy Path** | Successful form submission, valid login |
| **Validation** | Empty fields, invalid email, password too short |
| **Error Handling** | Server errors (5xx), timeouts, rate limiting |
| **Edge Cases** | Rapid submission, back button, page refresh |
| **Security** | XSS attempts, SQL injection |

## LLM-Powered Test Naming

VibeTesting uses BAML with AWS Bedrock (Claude 3.5 Haiku) for semantic test naming:

```typescript
// LLM-generated test names follow the pattern:
"should submit form successfully when all fields are valid"
"should show validation error when email field is empty"
"should display timeout error when server does not respond"
```

### Configuring LLM

Set AWS credentials for Bedrock:

```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1
```

Or use other providers:

```bash
# OpenAI
export OPENAI_API_KEY=your-key

# Anthropic
export ANTHROPIC_API_KEY=your-key
```

When no LLM is available, VibeTesting falls back to template-based naming.

## Project Structure

```
vibetest/
├── src/
│   ├── cli/              # CLI commands
│   ├── exploration/      # Graph builder, element detector
│   ├── recording/        # Event listener, WebSocket server
│   ├── analysis/         # Flow analyzer, intent detection
│   ├── generation/       # Test variation generator
│   ├── codegen/          # Playwright spec generator
│   ├── llm/              # LLM integration (BAML)
│   └── baml_client/      # Generated BAML client
├── baml_src/             # BAML schema definitions
├── __tests__/            # Unit tests (359 tests)
└── docs/                 # Documentation
```

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Build
pnpm build
```

## Requirements

- Node.js 18+
- pnpm (recommended) or npm
- Playwright browsers (`npx playwright install`)

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
