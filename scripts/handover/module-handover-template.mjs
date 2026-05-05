#!/usr/bin/env node
/**
 * Wave F7 — Generic Module Handover Template
 *
 * Per-module replication of the foundation handover sequence.
 * Reads the module's `module.manifest.json` to derive routes, perms,
 * and roles, then runs the same 4-step sequence used by Wave F4:
 *
 *   1. activation-check  (8 cells)
 *   2. role-profile-only-writer guard (always-on)
 *   3. seed-test-users <module>      (idempotent fixtures)
 *   4. rbac-matrix <module>          (role × route)
 *
 * Usage:
 *   node scripts/handover/module-handover-template.mjs <moduleCode>
 *
 * Required inputs (per module):
 *   modules/<moduleCode>/module.manifest.json
 *   tests/fixtures/<moduleCode>/role-profiles.seed.json
 *   platform/<moduleCode>/contracts/permissions/permissions.json
 *
 * If any input is missing, the step is reported as 'skipped' rather
 * than failed.
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const moduleCode = process.argv[2];
if (!moduleCode) {
  console.error('Usage: module-handover-template.mjs <moduleCode>');
  process.exit(2);
}

const today = new Date().toISOString().slice(0,10);
const outDir = join(ROOT, 'ops', 'handover', today, moduleCode);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const inputs = {
  manifest:    `modules/${moduleCode}/module.manifest.json`,
  permissions: `platform/${moduleCode}/contracts/permissions/permissions.json`,
  fixtures:    `tests/fixtures/${moduleCode}/role-profiles.seed.json`,
};

function present(rel) { return existsSync(join(ROOT, rel)); }

const steps = [
  {
    id: 'STEP1',
    name: `${moduleCode}-activation-check`,
    cmd:  `node scripts/handover/foundation-activation-check.mjs`,
    skipIf: () => moduleCode !== 'foundation', // only foundation has the 8-cell impl today
  },
  {
    id: 'STEP2',
    name: 'role-profile-only-writer-guard',
    cmd:  'node scripts/ci-guards/role-profile-only-writer.mjs',
  },
  {
    id: 'STEP3',
    name: `seed-test-users-${moduleCode}`,
    cmd:  `node scripts/fixtures/seed-test-users.mjs ${moduleCode}`,
    skipIf: () => !present(inputs.fixtures),
  },
  {
    id: 'STEP4',
    name: `${moduleCode}-rbac-matrix`,
    cmd:  `node scripts/handover/foundation-rbac-matrix.mjs`,
    skipIf: () => moduleCode !== 'foundation',
  },
];

const results = [];
for (const step of steps) {
  if (step.skipIf?.()) {
    console.log(`-- ${step.id} ${step.name}: skipped (input missing or not yet implemented for module)`);
    results.push({ ...step, ok: null, status: 'skipped' });
    continue;
  }
  console.log(`\n=== ${step.id} ${step.name} ===`);
  try {
    const out = execSync(step.cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
    process.stdout.write(out);
    results.push({ ...step, ok: true, status: 'pass' });
  } catch (e) {
    process.stdout.write(e.stdout?.toString?.() || '');
    console.error((e.stderr?.toString?.() || '').trim());
    results.push({ ...step, ok: false, status: 'fail' });
  }
}

const summary = {
  date: today, module: moduleCode,
  steps: results.map(r => ({ id: r.id, name: r.name, status: r.status })),
  passed:  results.filter(r => r.status==='pass').length,
  failed:  results.filter(r => r.status==='fail').length,
  skipped: results.filter(r => r.status==='skipped').length,
};

writeFileSync(join(outDir, `${moduleCode}-handover.json`), JSON.stringify(summary, null, 2)+'\n');
console.log(`\n[F7] module=${moduleCode} pass=${summary.passed} fail=${summary.failed} skip=${summary.skipped}`);
process.exit(summary.failed ? 1 : 0);
