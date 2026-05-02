import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bp = (...segments: string[]) => path.resolve(__dirname, 'src/app/blueprint', ...segments);
const platform = (...segments: string[]) => path.resolve(__dirname, '..', '..', ...segments);

/** Barrel paths — must precede catch-all `@app` (same order as root tsconfig, blueprint first). */
const appBlueprintBarrelAliases: Record<string, string> = {
  '@app/dashboard': bp('features/dashboard/index.ts'),
  '@app/reports': bp('features/reports/index.ts'),
  '@app/widgets': bp('shared/widgets/index.ts'),
  '@app/infrastructure': bp('core/infrastructure/index.ts'),
  '@app/api': bp('core/services/api/index.ts'),
  '@app/admin': bp('core/admin/index.ts'),
  '@app/ai': bp('core/ai/index.ts'),
  '@app/grc': bp('core/grc/index.ts'),
  '@app/modules': bp('core/modules/index.ts'),
  '@app/portals': bp('core/portals/index.ts'),
  '@app/reporting': bp('core/reporting/index.ts'),
  '@app/websocket': bp('core/websocket/index.ts'),
  '@app/workspace': bp('core/workspace/index.ts'),
};

export default defineConfig({
  resolve: {
    alias: [
      // Subpath wildcards (must be before bare keys that share prefix)
      { find: /^@foundation-module\/ui\/(.+)$/, replacement: platform('platform/foundation/ui/$1') },
      { find: /^@workflow-module\/ui\/(.+)$/, replacement: platform('modules/workflow/ui/$1') },
      { find: /^@dynamic-ui-module\/ui\/(.+)$/, replacement: platform('platform/dynamic-ui/ui/$1') },
      { find: /^@risk-module\/ui\/(.+)$/, replacement: platform('Risk Module/ui/$1') },
      { find: /^@compliance-module\/ui\/(.+)$/, replacement: platform('modules/compliance/ui/$1') },
      { find: /^@app\/reports\/(.+)$/, replacement: bp('features/reports/$1') },
      { find: /^@app\/infrastructure\/(.+)$/, replacement: bp('core/infrastructure/$1') },
      { find: /^@app\/workspace\/(.+)$/, replacement: bp('core/workspace/$1') },
      ...Object.entries(appBlueprintBarrelAliases).map(([find, replacement]) => ({ find, replacement })),
      { find: '@foundation-module/ui', replacement: platform('platform/foundation/ui/index.ts') },
      { find: '@workflow-module/ui', replacement: platform('modules/workflow/ui/index.ts') },
      { find: '@dynamic-ui-module/ui', replacement: platform('platform/dynamic-ui/ui/index.ts') },
      { find: '@risk-module/ui', replacement: platform('Risk Module/ui/index.ts') },
      { find: '@compliance-module/ui', replacement: platform('modules/compliance/ui/index.ts') },
      { find: '@app', replacement: bp() },
      { find: '@env', replacement: path.resolve(__dirname, 'src/environments') },
      { find: '@mobile', replacement: path.resolve(__dirname, 'src/app/mobile') },
    ],
  },
  test: {
    globals: true,
    setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
    // jsdom: document/getComputedStyle + Angular TestBed specs; file reads still work via Node fs
    environment: 'jsdom',
    // Property-based tests (*.pbt.ts) are run via `pnpm exec tsx` / dedicated scripts — not Vitest loaders.
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'src/**/*.pbt.ts', 'src/environments/**'],
      thresholds: {
        lines: 50,
        branches: 40,
        functions: 50,
        statements: 50,
      },
    },
  },
});
