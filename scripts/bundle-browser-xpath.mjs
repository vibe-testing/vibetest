#!/usr/bin/env node
/**
 * Bundle browser-side XPath generator into a single file.
 *
 * This bundles all browser/*.ts files into browser-generator.bundle.js,
 * which can be serialized and passed to Playwright's page.evaluate().
 *
 * Run: bun run scripts/bundle-browser-xpath.mjs
 */

import * as esbuild from "esbuild";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

await esbuild.build({
  entryPoints: [join(rootDir, "src/detection/xpath/browser/index.ts")],
  bundle: true,
  format: "iife",
  globalName: "__xpathBundle",
  outfile: join(rootDir, "src/detection/xpath/browser-generator.bundle.js"),
  platform: "browser",
  target: "es2020",
  minify: false, // Keep readable for debugging
  sourcemap: false,
  // Don't include any external dependencies
  external: [],
  // Footer to export for both browser and Node (tests)
  footer: {
    js: `
// Export for browser globals (window.__xpathBundle)
if (typeof window !== 'undefined') {
  window.__xpathBundle = __xpathBundle;
}
// Export for Node.js (tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = __xpathBundle;
}
`,
  },
});

console.log(
  "Browser XPath bundle built: src/detection/xpath/browser-generator.bundle.js",
);
