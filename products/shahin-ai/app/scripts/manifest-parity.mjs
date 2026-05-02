#!/usr/bin/env node
/**
 * Non-authoritative manifest parity gate (CI / nightly).
 * Delegates to Vitest cross-registry tests; extend with more suites as manifests grow.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Force ESM resolution so Vitest does not load `std-env` via CommonJS `require()` (Node ERR_REQUIRE_ESM).
const r = spawnSync(
  'node',
  [
    '--experimental-require-module',
    '--experimental-vm-modules',
    './node_modules/vitest/vitest.mjs',
    'run',
    '--environment',
    'node',
    'src/app/blueprint/registries/registry-crosswalk.test.ts',
  ],
  { cwd: root, stdio: 'inherit', shell: false },
);
process.exit(r.status ?? 1);
