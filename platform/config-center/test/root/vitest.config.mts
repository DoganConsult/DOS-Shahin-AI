import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/*/src/**/*.test.ts',
      'services/*/src/**/*.test.ts',
      'tests/*.test.ts',
      'platform/*/packages/*/**/*.test.ts',
      'platform/*/services/*/src/**/*.test.ts',
      'platform/*/migrations/__tests__/*.test.ts',
      'frontend/products/shahin/src/app/blueprint/features/onboarding-os/**/*.test.ts',
      'frontend/products/shahin/src/app/blueprint/core/platform/navigation/*.test.ts',
      'frontend/products/shahin/src/app/blueprint/core/routing/*.test.ts',
      'frontend/products/shahin/src/app/blueprint/features/foundation/pages/*.test.ts',
      'frontend/products/shahin/src/app/blueprint/pages/register/*.test.ts',
      'frontend/products/shahin/src/app/__tests__/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/integration/**',
      'tests/e2e/**',
      'tests/contract/**',
      'services/ai-engine-service/**',
      'services/auth-service/src/middleware/**',
      'packages/dos-platform-core/src/package-boundary.integration.test.ts',
    ],
    environment: 'node',
    globals: true,
    setupFiles: ['./test-setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html', 'json'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
      include: [
        'packages/*/src/**/*.ts',
        'services/*/src/**/*.ts',
        'platform/*/packages/*/**/*.ts',
        'platform/*/services/*/src/**/*.ts',
        'modules/*/source/backend/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/__tests__/**',
        '**/dist/**',
        '**/node_modules/**',
        '**/*.d.ts',
        '**/migrations/**',
        '**/*.migration.ts',
        '**/seed.ts',
        '**/test-setup.ts',
      ],
      perFile: true,
      skipFull: false,
    },

    reporters: ['default', 'verbose'],
    outputFile: {
      json: './coverage/test-results.json',
    },
  },
  optimizeDeps: {
    include: ['vitest', '@vitest/coverage-v8'],
  },
});
