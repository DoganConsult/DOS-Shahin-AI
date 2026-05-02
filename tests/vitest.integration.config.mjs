import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    exclude: [
      'tests/integration/service-boot/**',
      'tests/integration/e2e/**',
    ],
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./test-setup.ts'],
    globalSetup: ['./tests/integration/_ratelimit-flush.globalsetup.ts'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      reportsDirectory: './coverage/integration',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      include: [
        'services/*/src/**/*.ts',
        'platform/*/services/*/src/**/*.ts',
        'modules/*/source/backend/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/dist/**',
        '**/node_modules/**',
        '**/migrations/**',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@dos/platform-core/http': path.resolve('packages/dos-platform-core/src/http/index.ts'),
      '@dos/platform-core/observability': path.resolve('packages/dos-platform-core/src/observability/index.ts'),
      '@dos/platform-core': path.resolve('packages/dos-platform-core/src/index.ts'),
      '@dos/contracts': path.resolve('packages/dos-contracts/src/index.ts'),
      '@dos/module-sdk': path.resolve('packages/dos-module-sdk/src/index.ts'),
      '@dos/types': path.resolve('packages/dos-types/src/index.ts'),
    },
  },
});
