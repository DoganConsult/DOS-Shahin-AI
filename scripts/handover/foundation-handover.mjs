#!/usr/bin/env node
/**
 * Wave F4 — Foundation Handover Orchestrator
 *
 * Sequences the production-handover proofs for the foundation module:
 *
 *   F0  scripts/handover/foundation-activation-check.mjs    (8/8 cells)
 *   F1  contract guard (role-profile-only writer)           (CI guard)
 *   F2  scripts/fixtures/seed-test-users.mjs foundation     (4 users)
 *   F3  scripts/handover/foundation-rbac-matrix.mjs         (64 cells)
 *
 * Writes `ops/handover/<date>/foundation-handover.json` summarising the
 * sequence outcome, and `ops/handover/<date>/foundation-handover.md`
 * for the human reviewer.
 *
 * Exit: 0 all green / 1 any step failed / 2 error
 */

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT  = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const today = new Date().toISOString().slice(0,10);
const outDir = join(ROOT, 'ops', 'handover', today);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const STEPS = [
  { id: 'F0', name: 'foundation-activation-check', cmd: 'node scripts/handover/foundation-activation-check.mjs' },
  { id: 'F1', name: 'role-profile-only-writer-guard', cmd: 'node scripts/ci-guards/role-profile-only-writer.mjs' },
  { id: 'F2', name: 'seed-test-users-foundation', cmd: 'node scripts/fixtures/seed-test-users.mjs foundation' },
  { id: 'F3', name: 'foundation-rbac-matrix', cmd: 'node scripts/handover/foundation-rbac-matrix.mjs' },
];

const results = [];
for (const step of STEPS) {
  console.log(`\n=== ${step.id} ${step.name} ===`);
  let ok = true, output = '';
  try {
    output = execSync(step.cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
    process.stdout.write(output);
  } catch (e) {
    ok = false;
    output = (e.stdout?.toString?.() || '') + (e.stderr?.toString?.() || '');
    process.stdout.write(output);
    console.error(`✗ ${step.id} failed (exit ${e.status})`);
  }
  results.push({ id: step.id, name: step.name, ok, lines: output.split('\n').length });
}

const failed = results.filter(r => !r.ok);
const summary = {
  date: today,
  module: 'foundation',
  steps: results,
  passed: results.filter(r=>r.ok).length,
  failed: failed.length,
};

writeFileSync(join(outDir, 'foundation-handover.json'),
  JSON.stringify(summary, null, 2) + '\n');

const md = [
  `# Foundation Production Handover — ${today}`,
  '',
  `| Step | Name | Status |`,
  `|------|------|--------|`,
  ...results.map(r => `| ${r.id} | ${r.name} | ${r.ok?'✅ pass':'❌ fail'} |`),
  '',
  `**${summary.passed}/${results.length} steps green**`,
  '',
].join('\n');
writeFileSync(join(outDir, 'foundation-handover.md'), md);

console.log(`\n[F4] ${summary.passed}/${results.length} steps green`);
console.log(`[F4] reports → ${outDir.replace(ROOT+'/','')}`);
process.exit(failed.length ? 1 : 0);
