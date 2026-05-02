import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@env': path.resolve(__dirname, 'src/environments'),
      '@mobile': path.resolve(__dirname, 'src/app/mobile'),
    },
  },
  test: {
    globals: true,
    // jsdom: document/getComputedStyle + Angular TestBed specs; file reads still work via Node fs
    environment: 'jsdom',
    // Property-based tests (*.pbt.ts) are run via `pnpm exec tsx` / dedicated scripts — not Vitest loaders.
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'src/**/*.pbt.ts', 'src/environments/**'],
      thresholds: {
        lines: 50,
        branches: 40,
        functions: 50,
        statements: 50,
      },
    },
  },
});
