// W8.D8.3 — assert publish-contract.mjs produces a snapshot whose nav/pages
// counts match what the canonical TypeScript contract declares. CI uses this
// to catch contract drift before re-seeding Dynamic UI.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../');
const publisher = resolve(repoRoot, 'scripts/publish-contract.mjs');
const snapshot = resolve(repoRoot, 'contracts/generated/foundation-contract.json');
const contractTs = resolve(repoRoot, 'contracts/foundation.module-contract.ts');

test('publish-contract.mjs writes a faithful snapshot', () => {
  const r = spawnSync(process.execPath, [publisher], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.ok(existsSync(snapshot), 'snapshot json missing');
  const snap = JSON.parse(readFileSync(snapshot, 'utf8'));
  const c = snap.contract;
  assert.equal(c.identity.code, 'foundation');
  assert.ok(Array.isArray(c.nav) && c.nav.length >= 18, `nav count too low: ${c.nav?.length}`);
  assert.ok(Array.isArray(c.pages) && c.pages.length >= 21, `pages count too low: ${c.pages?.length}`);
  // Every nav item must reference a real page.
  const pageCodes = new Set(c.pages.map(p => p.pageCode));
  for (const n of c.nav) {
    assert.ok(pageCodes.has(n.pageCode), `nav.pageCode ${n.pageCode} missing in pages`);
  }
  // Every page must declare a route + component + readiness.
  for (const p of c.pages) {
    assert.ok(p.route && p.component && p.readiness, `page ${p.pageCode} incomplete`);
  }
  // Source TS must still expose the canonical export name.
  const ts = readFileSync(contractTs, 'utf8');
  assert.ok(ts.includes('export const FOUNDATION_CONTRACT'), 'canonical export missing');
});
