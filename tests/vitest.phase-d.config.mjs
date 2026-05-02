import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Phase D release-gate suite. Unlike vitest.bootstrap.config.mjs this config
// does NOT load test-setup.ts (which globally mocks safeQuery). Phase D must
// hit the real Postgres instance so the tests genuinely prove the runtime
// contract rather than a mocked surface.
export default defineConfig({
  resolve: {
    alias: [
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
    include: ['tests/phase-d/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    passWithNoTests: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ||
        'postgresql://dos_user:dos_user_pass_2026@localhost:5432/shahin_grc',
      // Force inline dispatch path (Temporal absent) so the gate proves the
      // real executors run against the real DB rather than a mocked RPC.
      ONBOARDING_INLINE_EXECUTORS_DISABLED: 'false',
      ONBOARDING_TEMPORAL_DISPATCH_REQUIRED: 'false',
    },
  },
});
