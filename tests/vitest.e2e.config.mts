/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/e2e/**/*.test.ts',
      'tests/e2e/**/*.test.js'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**'
    ],
    environment: 'node',
    globals: true,
    testTimeout: 30000, // 30 seconds per test
    hookTimeout: 30000, // 30 seconds for hooks
    reporters: ['verbose'],
    // Enable retries for flaky E2E tests
    retry: 1
  },
  resolve: {
    alias: {
      '@': '/root/DOS-AIO'
    }
  }
});
