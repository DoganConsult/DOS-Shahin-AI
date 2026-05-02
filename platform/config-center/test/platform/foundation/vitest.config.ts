import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'application/**/*.test.ts',
      'domain/**/*.test.ts',
      'infrastructure/**/*.test.ts',
      'interface/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', 'ui/**'],
    testTimeout: 10_000,
  },
});
