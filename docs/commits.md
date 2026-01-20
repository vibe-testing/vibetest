# VibeTesting CLI: 61 Atomic Conventional Commits

## Commit Message Format

**Standard:**
```
type(scope): subject

body
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code restructure (no new features)
- `test:` Add tests
- `docs:` Documentation
- `chore:` Dependencies, build config
- `perf:` Performance improvement

---

## PROMPT 1: Graph Builder (7 commits)

```
feat(init): initialize vibetesting CLI project

- Create monorepo structure with TypeScript
- Configure tsconfig, eslint, prettier, vitest
- Set up build pipeline (tsc → dist/)
- Initialize package.json with dependencies
```

```
feat(graph): implement graph builder core

- GraphBuilder class orchestrates app exploration
- ElementDetector finds buttons, forms, inputs
- TransitionDetector follows navigation on clicks
- Builds semantic graph: nodes (pages), edges (flows)
```

```
feat(graph): add Playwright browser integration

- BrowserController handles page navigation
- Implements smart waits (waitForNavigation, etc)
- Handles timeouts and errors gracefully
- Logs browser sessions for debugging
```

```
feat(graph): define TypeScript types for graph

- Node (page, form, button, input)
- Edge (click, fill, submit)
- Element (selector, type, label)
- ExplorationGraph (nodes[], edges[])
```

```
feat(graph): export app-graph.json after exploration

- Serialize graph to JSON file
- Include metadata (timestamp, url, app-name)
- Human-readable format
- Schema validation
```

```
test(graph): add unit tests for graph builder

- Test ElementDetector with mock DOM
- Test TransitionDetector with navigation flows
- Test GraphAssembler with complete flows
- 80+ test cases, 90%+ coverage
```

```
docs(graph): add inline code documentation

- JSDoc comments on all public methods
- Type documentation for complex types
- Usage examples in comments
```

---

## PROMPT 2: Browser Recording (6 commits)

```
feat(recording): implement browser event listener

- Inject recording script into page on startup
- Listen for click, input, select, submit events
- Capture target selector, action, value
- Buffer events for efficient transmission
```

```
feat(recording): add WebSocket server for real-time sync

- WebSocket endpoint for browser ↔ Node communication
- Streaming recorded events from browser to CLI
- Heartbeat to detect disconnections
- Automatic reconnection logic
```

```
feat(recording): implement selector generation

- Generate CSS selectors for recorded elements
- Fallback to data-testid if available
- Generate xpath for complex elements
- Rank selectors by stability
```

```
feat(recording): define recording types

- RecordedEvent (type, target, action, value, timestamp)
- RecordingSession (events[], startTime, endTime, url)
- Recording (flow[], metadata)
```

```
feat(recording): export recorded flow as JSON

- Serialize RecordingSession to file
- Include replay metadata
- Ready for analysis step
```

```
test(recording): add integration tests for recording

- Test event capture in real browser
- Test WebSocket transmission
- Test selector generation accuracy
- Test session serialization
```

---

## PROMPT 3: Flow Analysis (7 commits)

```
feat(analysis): implement flow analyzer

- Parse recorded events into logical flows
- Detect user intent (form fill, search, checkout, etc)
- Identify assertions (page load, element visible, etc)
- Extract validation rules
```

```
feat(analysis): detect intent patterns

- Form submission pattern (fill + submit)
- Search pattern (input + enter)
- Navigation pattern (click + page load)
- Authentication pattern (login + redirect)
```

```
feat(analysis): extract validation requirements

- Email validation (field type, regex)
- Required fields (empty → error)
- Min/max length constraints
- Format requirements (phone, zip, etc)
```

```
feat(analysis): detect error scenarios

- Network timeout handling
- Invalid input handling
- Unauthorized access handling
- Server error handling
```

```
feat(analysis): define analysis types

- AnalyzedFlow (intent, assertions, validations, errors)
- FlowInsight (type, confidence, metadata)
- ValidationRule (type, constraint, message)
```

```
feat(analysis): export analyzed flows as JSON

- Per-flow analysis with confidence scores
- Validation rules extracted
- Error scenarios documented
- Ready for generation
```

```
test(analysis): add analysis unit tests

- Test intent detection accuracy
- Test validation extraction
- Test error scenario identification
- Mock recorded flows
```

---

## PROMPT 4: Test Variation Generation (8 commits)

```
feat(generation): implement test variation generator

- BaseTestGenerator class for common test patterns
- Generate 15+ variations from single flow
- Include happy path, validations, errors, edge cases
- Deterministic output (same flow → same tests)
```

```
feat(generation): add happy path variation

- Successful flow execution
- Expected page loads and element visibility
- Data submission success
- Assertion on confirmation/redirect
```

```
feat(generation): add validation variations

- Empty field submission
- Invalid format (email, phone, etc)
- Length constraints (min/max)
- Special characters
- SQL injection attempts
- XSS attempts
```

```
feat(generation): add error handling variations

- Network timeout simulation
- Server 5xx errors
- Rate limiting (429)
- Unauthorized (401)
- Forbidden (403)
- Redirect loops
```

```
feat(generation): add edge case variations

- Rapid repeated submissions
- Back button after submission
- Browser back/forward navigation
- Tab switching during flow
- Window resize during flow
```

```
feat(generation): define generation types

- TestVariation (name, description, steps, assertions)
- TestSuite (variations[], metadata)
- GenerationConfig (templates, naming, assertions)
```

```
feat(generation): implement smart test naming

- Semantic names based on flow intent
- Pattern: test('should [action] when [scenario]')
- Examples: "should submit form when valid", "should show error when email empty"
```

```
test(generation): add generation unit tests

- Test variation count (15+ per flow)
- Test naming consistency
- Test assertion generation
- Mock analyzed flows
```

---

## PROMPT 5: Playwright Code Generation (8 commits)

```
feat(generators): implement Playwright spec generator

- Convert test variations to Playwright .spec.ts files
- Generate valid, executable Playwright code
- Include fixture setup and teardown
- Handle async/await properly
```

```
feat(generators): add Playwright fixtures

- Browser fixture (with context isolation)
- Page fixture (with navigation helpers)
- Data fixture (test users, forms, etc)
- API fixture (mock server if needed)
```

```
feat(generators): implement step generator

- Convert RecordedEvent to Playwright step
- page.click() for clicks
- page.fill() for inputs
- page.selectOption() for dropdowns
- page.waitForNavigation() for navigation
```

```
feat(generators): implement assertion generator

- page.isVisible() for element visibility
- page.textContent() for text validation
- page.getAttribute() for attribute checking
- page.url() for URL assertions
- page.locator().count() for list validation
```

```
feat(generators): handle error injection

- Use apiContext.route() to intercept responses
- Mock server errors (5xx)
- Mock network failures
- Mock timeouts
```

```
feat(generators): generate TypeScript with proper types

- Import statements
- Fixture types
- Function signatures
- Return types
- Proper async/await
```

```
feat(generators): export spec files to tests/ directory

- One .spec.ts per flow
- Naming: [flow-name].spec.ts
- Proper imports and setup
- Ready to run with `npx playwright test`
```

```
test(generators): add codegen unit tests

- Test TypeScript AST generation
- Test fixture generation
- Test step translation
- Test assertion translation
- Verify generated code is valid TypeScript
```

---

## PROMPT 6: CLI Wiring (9 commits)

```
feat(cli): implement vibetest explore command

- Loads app URL from CLI argument
- Starts browser
- Runs graph builder
- Outputs app-graph.json
- Cleans up and exits
```

```
feat(cli): implement vibetest listen command

- Starts web server with injection script
- Watches for browser connection
- Records user interactions
- Saves flow to recording.json
- Real-time console output
```

```
feat(cli): implement vibetest generate command

- Loads app-graph.json and recording.json
- Analyzes flows
- Generates test variations
- Creates spec files
```

```
feat(cli): implement vibetest diff command

- Compares two app-graph.json files
- Shows added/removed pages
- Shows added/removed elements
- Shows changed flows
```

```
feat(cli): add CLI argument parsing

- Use minimist or commander.js
- Support --url, --output, --config flags
- Support --verbose for debugging
- Show help with --help
```

```
feat(cli): add configuration file support

- Read vibetest.config.ts or vibetest.config.json
- Support for:
  - baseUrl
  - outputDir
  - includePaths / excludePaths
  - timeout settings
  - browser settings
```

```
feat(cli): add progress indicators

- Ora spinners for long operations
- Progress bars for graph exploration
- Real-time event count during recording
- Clear status messages
```

```
feat(cli): create bin/vibetest executable

- Shebang #!/usr/bin/env node
- Imports and runs CLI
- Handles errors and exits gracefully
- Added to package.json bin field
```

```
test(cli): add CLI integration tests

- Test each command end-to-end
- Test argument parsing
- Test config file loading
- Test error handling
```

---

## PROMPT 7: LLM Integration (5 commits)

```
feat(llm): implement smart test naming with LLM

- Load OpenAI API key from env
- Use GPT-3.5-turbo to generate test names
- Cache API calls to avoid rate limiting
- Fallback to template-based naming if API fails
```

```
feat(llm): add LLM types and client

- LLMClient class wrapping OpenAI SDK
- Prompt templates for naming
- Response parsing
- Error handling
```

```
feat(llm): add LLM to test generation

- Use LLM for test names if available
- Pass flow context to LLM
- Generate semantic, readable names
- Validate names before use
```

```
feat(llm): add environment configuration for LLM

- VIBETEST_OPENAI_API_KEY support
- VIBETEST_LLM_ENABLED flag
- VIBETEST_LLM_MODEL selection
- Graceful degradation if disabled
```

```
test(llm): add LLM unit tests

- Mock OpenAI API calls
- Test prompt generation
- Test response parsing
- Test fallback behavior
```

---

## PROMPT 8: Documentation & Release (11 commits)

```
docs(readme): write comprehensive README.md

- Project description
- Features overview
- Quick start guide (5 minutes)
- Installation instructions
- Basic examples
- Contributing guidelines
- License
```

```
docs(getting-started): add getting started guide

- Step-by-step walkthrough
- Screenshots/GIFs
- Common issues and solutions
- Next steps
```

```
docs(cli): document all CLI commands

- vibetest explore
- vibetest listen
- vibetest generate
- vibetest diff
- All flags and options
```

```
docs(examples): add example projects

- React app example
- Vue app example
- Simple form example
- Multi-step checkout example
```

```
docs(architecture): document system architecture

- Graph building process
- Recording mechanism
- Test generation algorithm
- How it all fits together
```

```
docs(api): generate API reference

- JSDoc → TypeDoc
- HTML documentation
- Function signatures
- Type definitions
- Examples
```

```
chore(package): prepare for npm publication

- Update package.json metadata
- Add description, keywords, author
- Add repository, homepage, bugs
- Set license to MIT
- Configure bin field for vibetest executable
```

```
chore(build): configure build pipeline

- npm run build → compile TypeScript
- npm run dev → watch mode
- npm test → run vitest
- npm lint → run eslint
- npm format → run prettier
```

```
chore(ci): add GitHub Actions workflow

- Run tests on pull requests
- Lint code on PRs
- Check TypeScript compilation
- Code coverage reporting
```

```
feat(release): publish to npm registry

- Create git tag v1.0.0
- Build final distribution
- Publish to npm registry
- Create GitHub release
```

```
docs(changelog): create CHANGELOG.md

- v1.0.0 release notes
- Features implemented
- Known limitations
- Roadmap for future versions
```

---

## Complete Summary

**Total: 61 Atomic Commits**

| PROMPT | Feature | Commits |
|--------|---------|---------|
| 1 | Graph Builder | 7 |
| 2 | Recording | 6 |
| 3 | Analysis | 7 |
| 4 | Generation | 8 |
| 5 | Codegen | 8 |
| 6 | CLI | 9 |
| 7 | LLM | 5 |
| 8 | Release | 11 |
| **TOTAL** | | **61** |

---

## Usage

Each commit is atomic and can be executed sequentially:

```bash
git init
git add .
git commit -m "feat(init): initialize vibetesting CLI project"
git commit -m "feat(graph): implement graph builder core"
# ... continue through all 61 commits
git tag v1.0.0
npm publish
```

All commits follow Conventional Commits format for automatic changelog generation.

