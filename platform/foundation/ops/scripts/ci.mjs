#!/usr/bin/env node
/**
 * Foundation module local CI: typecheck (strict), build, verify permissions, smoke tests.
 * Exits non-zero on first failure. No external services required.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const steps = [
  ['typecheck (strict)', 'npx', ['tsc', '-p', 'tsconfig.json', '--noEmit']],
  ['build', 'npx', ['tsc', '-p', 'tsconfig.build.json']],
  ['verify-permissions', 'node', ['ops/scripts/verify-permissions.mjs']],
  ['smoke', 'node', ['--test', 'tests/smoke/foundation.smoke.test.mjs']],
];

let failed = 0;
for (const [name, cmd, args] of steps) {
  process.stdout.write(`[ci] ${name} ... `);
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
  const dt = Date.now() - t0;
  if (r.status !== 0) {
    console.error(`[ci] FAILED: ${name} (${dt}ms)`);
    failed++;
    break;
  }
  console.log(`OK (${dt}ms)`);
}
if (failed) process.exit(1);
console.log('[ci] ALL OK');
