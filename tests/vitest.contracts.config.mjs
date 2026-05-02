import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/contract/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@dos/platform-core/http': path.resolve('packages/dos-platform-core/src/http/index.ts'),
      '@dos/platform-core/observability': path.resolve('packages/dos-platform-core/src/observability/index.ts'),
      '@dos/platform-core': path.resolve('packages/dos-platform-core/src/index.ts'),
      '@dos/types/errors': path.resolve('packages/dos-types/src/errors.ts'),
      '@dos/types': path.resolve('packages/dos-types/src/index.ts'),
    },
  },
});
