#!/usr/bin/env node
/**
 * props-coverage.mjs — Phase F-F6 H5 customer-gate.
 *
 * For every route in dos.ui_route_template_binding whose archetype lives in
 * one of the 14 archetype-props tables, assert that at least one row exists
 * in the matching dos.ui_route_* table. Fails the customer-gate if any
 * customer-bound route is empty (i.e. would render an empty-state to a real
 * tenant).
 *
 * Read-only static check: parses every migration in
 * platform/dos/migrations/public/ and reconciles bindings ↔ inserts. Live DB
 * is NOT consulted (CI-friendly). The DB integrity is enforced by the
 * archetype-props table UNIQUE constraints + chk_archetype.
 *
 * Set PROPS_COVERAGE_ENFORCE=1 to fail CI; otherwise SHADOW.
 *
 * Allow-list (PROPS_COVERAGE_ALLOWED_EMPTY) lets a route declare "intentionally
 * empty in test fixtures" — used during early waves before all 14 archetype
 * tables are seeded.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARCHETYPE_PROPS_SCHEMA } from '../ui-registry/lib/props-schema.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG_DIR = join(REPO, 'platform/dos/migrations/public');

const ARCHETYPE_TO_TABLES = (() => {
  const m = new Map();
  for (const [a, s] of Object.entries(ARCHETYPE_PROPS_SCHEMA)) {
    const key = a.split('.')[0];
    if (!m.has(key)) m.set(key, new Set());
    m.get(key).add(s.table);
  }
  return m;
})();

const ALLOW_EMPTY = new Set(
  (process.env.PROPS_COVERAGE_ALLOWED_EMPTY ?? '').split(',').map(s => s.trim()).filter(Boolean),
);

if (!existsSync(MIG_DIR)) {
  console.error('[props-coverage] no migrations dir — skipping'); process.exit(0);
}

// Load every migration once.
const allSql = readdirSync(MIG_DIR)
  .filter(f => f.endsWith('.sql') && !f.includes('_down'))
  .sort()
  .map(f => readFileSync(join(MIG_DIR, f), 'utf8'))
  .join('\n');

// Parse template-binding routes + their (last-write-wins) archetype.
// Scope strictly to INSERT/UPDATE blocks targeting ui_route_template_binding;
// other archetype-props INSERTs share column shapes that would otherwise
// poison the regex.
function collectBindings(sql) {
  const out = new Map();
  // INSERT INTO dos.ui_route_template_binding (...) VALUES (...) [up to next semicolon]
  const insertBlocks = sql.matchAll(
    /INSERT\s+INTO\s+dos\.ui_route_template_binding[\s\S]*?;/gi,
  );
  for (const blk of insertBlocks) {
    for (const m of blk[0].matchAll(
      /\(\s*'(\/[^']+)'\s*,\s*'([a-z\-]+)'\s*,\s*'([A-Za-z][A-Za-z0-9_]*)'/g,
    )) {
      out.set(m[1], { archetype: m[2], template_export: m[3] });
    }
  }
  // UPDATE dos.ui_route_template_binding SET archetype='X' WHERE ...
  for (const blk of sql.split(/\n(?=UPDATE\s+dos\.ui_route_template_binding)/i).slice(1)) {
    const am = /SET\s+archetype\s*=\s*'([a-z\-]+)'/i.exec(blk);
    if (!am) continue;
    const arch = am[1];
    const where = blk.split(/\bWHERE\b/i)[1] ?? '';
    for (const r of where.matchAll(/'(\/[^']+)'/g)) {
      if (out.has(r[1])) out.set(r[1], { ...out.get(r[1]), archetype: arch });
    }
  }
  return out;
}

// Parse: which (table, route) pairs have at least one INSERT row?
function collectPropsInserts(sql) {
  const out = new Map(); // table -> Set<route>
  const tables = new Set([...ARCHETYPE_TO_TABLES.values()].flatMap(s => [...s]));
  for (const tbl of tables) {
    const seen = new Set();
    const re = new RegExp(`INSERT\\s+INTO\\s+${tbl.replace('.', '\\.')}[\\s\\S]*?(?=;\\s*\\n)`, 'gi');
    for (const m of sql.matchAll(re)) {
      // Pull the FIRST string literal from each VALUES row → that's the route column.
      const block = m[0];
      for (const v of block.matchAll(/\(\s*'([^']+)'/g)) seen.add(v[1]);
    }
    out.set(tbl, seen);
  }
  return out;
}

const bindings = collectBindings(allSql);
const propsByTable = collectPropsInserts(allSql);

// Routes that need props
const failures = [];
for (const [route, { archetype }] of bindings) {
  if (ALLOW_EMPTY.has(route)) continue;
  const tables = ARCHETYPE_TO_TABLES.get(archetype);
  if (!tables) continue; // archetype has no props table — nothing to seed
  const ok = [...tables].some(t => propsByTable.get(t)?.has(route));
  if (!ok) failures.push({ route, archetype, tables: [...tables] });
}

const enforce = process.env.PROPS_COVERAGE_ENFORCE === '1';
console.log(`[props-coverage] bindings=${bindings.size} archetypes-with-props=${ARCHETYPE_TO_TABLES.size} failures=${failures.length} allow-empty=${ALLOW_EMPTY.size}`);
if (failures.length) {
  for (const f of failures.slice(0, 30)) {
    console.error(`  ✗ ${f.route} (${f.archetype}) — needs row in [${f.tables.join(' | ')}]`);
  }
  if (failures.length > 30) console.error(`    … (${failures.length - 30} more)`);
  if (enforce) process.exit(1);
  console.error('[props-coverage] SHADOW (set PROPS_COVERAGE_ENFORCE=1 to fail CI).');
  process.exit(0);
}
console.log('[props-coverage] PASS — every customer-bound route has at least one props row.');
process.exit(0);
