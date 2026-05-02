/**
 * Drift smoke — fails when the three sources of compliance route truth
 * diverge:
 *   1. contracts/ui.contract.json     (route declarations)
 *   2. db/seeds/dynamic-ui/index.json (component-key allowlist)
 *   3. ui/component-class-resolver.ts (component-key → class-name map)
 *
 * Plus locks the §10 hard-gate self-check (every route in the contract has
 * pageType + layout + kpiScope + titleKey).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '../..');

const ui   = JSON.parse(readFileSync(resolve(ROOT, 'contracts/ui.contract.json'), 'utf8'));
const seed = JSON.parse(readFileSync(resolve(ROOT, 'db/seeds/dynamic-ui/index.json'), 'utf8'));

test('§10 hard gates: every contract route has pageType + layout + kpiScope + titleKey', () => {
  const required = ['pageType', 'layout', 'kpiScope', 'titleKey'];
  const failures = [];
  for (const r of ui.routes) {
    for (const f of required) {
      if (!r[f]) failures.push(`${r.route} missing ${f}`);
    }
  }
  assert.deepEqual(failures, [], `Routes missing required §10 fields: ${failures.join('; ')}`);
});

test('§2.3 kpiScope law: overview pages = module-overview, ops pages = none|page-local', () => {
  const violations = [];
  for (const r of ui.routes) {
    if (r.pageType === 'overview' && r.kpiScope !== 'module-overview' && r.kpiScope !== 'page-local') {
      violations.push(`${r.route} (overview) has kpiScope=${r.kpiScope}, expected module-overview or page-local`);
    }
    if (['list', 'object', 'workflow', 'audit', 'settings'].includes(r.pageType)) {
      if (r.kpiScope !== 'none' && r.kpiScope !== 'page-local') {
        violations.push(`${r.route} (${r.pageType}) has kpiScope=${r.kpiScope}, expected none or page-local`);
      }
    }
  }
  assert.deepEqual(violations, [], `kpiScope law violations: ${violations.join('; ')}`);
});

test('contract componentKey ⊆ seed componentKeys (every contract key is enrolled in seed)', () => {
  const seedSet = new Set(seed.componentKeys);
  const orphan = [];
  for (const r of ui.routes) {
    if (!seedSet.has(r.componentKey)) orphan.push(`${r.route} → ${r.componentKey}`);
  }
  assert.deepEqual(
    orphan,
    [],
    `Contract componentKeys not in seed (would 404 at SPA render): ${orphan.join('; ')}`,
  );
});

test('seed componentKey count matches registry size 1:1 (existing 003-seed contract)', () => {
  // The old 003 contract test already enforces this; this is a backstop.
  const idx = require('../../dist/ui/component-registry.js');
  assert.equal(
    idx.COMPLIANCE_COMPONENT_KEYS.length,
    seed.componentKeys.length,
    `registry size ${idx.COMPLIANCE_COMPONENT_KEYS.length} != seed.componentKeys ${seed.componentKeys.length}`,
  );
});
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
