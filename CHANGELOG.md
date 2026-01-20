# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-21

### Added

#### Graph Exploration
- Graph builder for web application exploration
- Element detector for buttons, forms, and inputs
- Transition detector for navigation flows
- Export exploration results as `app-graph.json`

#### Browser Recording
- WebSocket-based event listener for real-time recording
- Capture click, input, select, and submit events
- Selector generation with CSS, data-testid, and XPath fallbacks
- Session manager for recording lifecycle

#### Flow Analysis
- Flow analyzer to parse recorded events into logical flows
- Intent detection (form submission, authentication, search, etc.)
- Validation rule extraction (required, email, min/max length)
- Error scenario identification

#### Test Generation
- Generate 15+ test variations per flow
- Happy path, validation, error handling, and edge case tests
- Security tests (XSS, SQL injection attempts)
- Smart test naming with semantic patterns

#### Playwright Code Generation
- Convert test variations to Playwright `.spec.ts` files
- Generate proper async/await TypeScript code
- Include fixtures and helpers
- Mock response injection for error testing

#### CLI Commands
- `vibetest explore <url>` - Explore web application
- `vibetest listen <url>` - Record user interactions
- `vibetest generate <recording>` - Generate Playwright tests
- `vibetest diff <graph1> <graph2>` - Compare exploration graphs

#### LLM Integration
- BAML-based LLM integration for semantic test naming
- AWS Bedrock (Claude 3.5 Haiku) support
- OpenAI and Anthropic API support
- Caching to avoid redundant API calls
- Template-based fallback when LLM unavailable

### Known Limitations

- Playwright browsers must be installed separately (`npx playwright install`)
- LLM naming requires API credentials (falls back to templates if unavailable)
- Recording requires browser UI (headless mode not fully supported for listen)

### Roadmap

- [ ] Visual diff for graph comparisons
- [ ] Configuration file support (`vibetest.config.ts`)
- [ ] Custom test templates
- [ ] Parallel test execution optimization
- [ ] Integration with CI/CD pipelines
- [ ] Visual test report generation
