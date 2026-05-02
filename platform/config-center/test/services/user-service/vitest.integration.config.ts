import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.{test,spec}.ts', 'src/**/*.integration.{test,spec}.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Integration tests need real Postgres + Redis; they are not run in the
    // default `test` target. CI spins up services and runs this config.
  },
});
