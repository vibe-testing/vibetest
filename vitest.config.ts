import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', '__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/graph/types.ts',
        'src/graph/builder.ts',
        'src/graph/element-detector.ts',
        'src/graph/transition-detector.ts',
      ],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/index.ts'],
      thresholds: {
        // Note: element-detector.ts has browser-context code (inside page.evaluate)
        // that cannot be unit tested, requiring integration tests with real browser.
        // Per-file thresholds ensure testable files meet 80%+ coverage.
        'src/graph/builder.ts': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        'src/graph/types.ts': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        'src/graph/transition-detector.ts': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
  },
});
