import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/contract/**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
    environment: 'node',
    globals: true,
    testTimeout: 15000,
    setupFiles: ['./test-setup.ts'],
  },
});
