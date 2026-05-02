import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    environment: 'node',
    globals: true,
    setupFiles: ['./test-setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    passWithNoTests: false,
  },
});
