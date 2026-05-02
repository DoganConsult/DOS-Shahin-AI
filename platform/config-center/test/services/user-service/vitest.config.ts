import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['src/**/*.integration.{test,spec}.ts', 'dist/**', 'node_modules/**'],
    environment: 'node',
    globals: true,
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: 'junit.xml' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/__tests__/**',
        'src/server.ts',               // integration-tested separately
        'src/types.d.ts',
        'src/adapters/**',             // re-exports only
        'src/domain/_test-utils.ts',   // test helper (not runtime code)
        // Dead entity-stub files and barrel re-exports — no logic to cover
        'src/domain/user.ts',
        'src/domain/team.ts',
        'src/domain/role.ts',
        'src/domain/department.ts',
        'src/routes/index.ts',
        'src/routes/user.ts',
        'src/routes/team.ts',
        'src/routes/role.ts',
        'src/routes/department.ts',
        'src/events/user.ts',
        'src/events/user.publishers.ts', // re-export shim
        // Foundation domain is extracted to modules/foundation/. The only
        // local file is the thin adapter index.ts that re-exports from the
        // built module — excluded because it has no branching logic.
        'src/domain/foundation/index.ts',
        'src/observability/metrics.ts', // requires prom-client at runtime — verified by integration smoke, not unit
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 85,
      },
    },
  },
});
