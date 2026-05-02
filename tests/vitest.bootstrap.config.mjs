import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const include = [
  'tests/integration/**/*.test.ts',
  'tests/contract/**/*.test.ts',
  'tests/migration/**/*.test.ts',
];
if (process.env.RUN_NONRELEASE_TESTS === 'true') {
  include.push('tests/service-boot/**/*.test.ts', 'tests/e2e/**/*.test.ts');
}

export default defineConfig({
  resolve: {
    alias: [
      { find: '@dos/platform-core/resilience/resilient-catch', replacement: path.resolve(__dirname, 'packages/dos-platform-core/dist/resilience/resilient-catch.js') },
      { find: '@dos/platform-core/http', replacement: path.resolve(__dirname, 'packages/dos-platform-core/dist/http/index.js') },
      { find: '@dos/platform-core/events', replacement: path.resolve(__dirname, 'packages/dos-platform-core/dist/events/index.js') },
      { find: '@dos/platform-core/observability', replacement: path.resolve(__dirname, 'packages/dos-platform-core/dist/observability/index.js') },
      { find: '@dos/platform-core/lifecycle', replacement: path.resolve(__dirname, 'packages/dos-platform-core/dist/lifecycle/index.js') },
      { find: '@dos/platform-core', replacement: path.resolve(__dirname, 'packages/dos-platform-core/dist/index.js') },
      { find: '@dos/contracts', replacement: path.resolve(__dirname, 'packages/dos-contracts/dist/index.js') },
      { find: '@dos/module-sdk', replacement: path.resolve(__dirname, 'packages/dos-module-sdk/dist/index.js') },
      { find: '@dos/types', replacement: path.resolve(__dirname, 'packages/dos-types/dist/index.js') },
    ],
  },
  test: {
    include,
    environment: 'node',
    globals: true,
    setupFiles: ['./test-setup.ts'],
    globalSetup: ['./tests/integration/_ratelimit-flush.globalsetup.ts'],
    passWithNoTests: false,
    env: {
      // Inherit DATABASE_URL from the ambient shell env so the test
      // runner picks up whatever credential the staging deployment
      // actually uses. Fall back to the platform DB owner credential
      // (shahin) so local test runs that don't export DATABASE_URL still
      // have read access across public + dos schemas. The per-role
      // credentials (dos_user, dos_auth, …) are scoped-readers by design
      // and the integration suite needs cross-schema visibility.
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://shahin:shahin_grc_2024@localhost:5432/shahin_grc',
      SOAK_DURATION_MS: '500',
    }
  }
});
