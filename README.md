# vibetest

Graph-based web application exploration and test generation CLI.

## What it does

vibetest automatically explores your web application, builds a graph of pages and interactions, and generates end-to-end tests. It uses Playwright to navigate through your app, discovering routes, forms, buttons, and other interactive elements.

## Installation

```bash
npm install -g vibetest
```

## Usage

```bash
vibetest explore --url http://localhost:3000
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url` | The URL to start exploring from | Required |
| `--max-depth` | Maximum depth to explore from the starting page | `5` |
| `--max-pages` | Maximum number of pages to explore | `100` |
| `--headless` | Run browser in headless mode | `true` |
| `--output` | Output file path for the generated graph | `app-graph.json` |

## Output

The exploration generates an `app-graph.json` file containing:

- Nodes representing pages and states in your application
- Edges representing navigation paths and user interactions
- Metadata about elements, forms, and interactive components discovered

This graph can be used to generate tests, visualize your application structure, or analyze user flows.

## License

MIT
