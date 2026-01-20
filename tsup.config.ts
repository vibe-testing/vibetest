import { defineConfig } from 'tsup';

export default defineConfig([
  // Library build
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    target: 'es2022',
    outDir: 'dist',
  },
  // CLI build
  {
    entry: ['src/cli/index.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    target: 'es2022',
    outDir: 'dist/cli',
    // Don't add banner - source file already has shebang
  },
]);
