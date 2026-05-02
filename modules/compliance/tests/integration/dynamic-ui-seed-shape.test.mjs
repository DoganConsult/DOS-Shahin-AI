/**
 * Dynamic UI seed contract validator.
 *
 * Static SQL parsing — no live DB required. Confirms:
 *   - manifest order matches the on-disk file list
 *   - module-enrollment seed targets dos.dynamic_ui_modules with module_code='compliance'
 *   - nav/routes seed inserts the catch-all and uses tenant_id NULL templates
 *   - every component_key in the routes seed is declared in index.json#componentKeys
 *   - readiness seed marks rows as STUB
 *
 * Run: node --test tests/integration/dynamic-ui-seed-shape.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const seedDir = path.resolve(here, '..', '..', 'db', 'seeds', 'dynamic-ui');
const manifestPath = path.join(seedDir, 'index.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const read = (f) => fs.readFileSync(path.join(seedDir, f), 'utf8');

test('manifest order matches the SQL files on disk', () => {
  const onDisk = fs.readdirSync(seedDir).filter((f) => f.endsWith('.sql')).sort();
  assert.deepEqual(manifest.order.slice().sort(), onDisk);
});

test('module enrollment seed targets dos.dynamic_ui_modules with compliance', () => {
  const sql = read('001_seed_compliance_module.sql');
  assert.match(sql, /INSERT INTO dos\.dynamic_ui_modules/);
  assert.match(sql, /'compliance'/);
  assert.match(sql, /'shahin-ai'/);
  assert.match(sql, /'\/compliance\/overview'/);
});

test('nav/routes seed inserts catch-all and uses tenant_id NULL templates', () => {
  const sql = read('002_seed_compliance_nav_routes_shell.sql');
  assert.match(sql, /INSERT INTO dos\.dynamic_ui_navigation/);
  assert.match(sql, /INSERT INTO dos\.dynamic_ui_routes/);
  assert.match(sql, /INSERT INTO dos\.dynamic_ui_shells/);
  assert.match(sql, /'\/compliance\/\*\*'/);
  assert.match(sql, /'ComplianceCatchAll'/);
  assert.match(sql, /'ComplianceHome'/);
  assert.ok(sql.includes('SELECT NULL, \'compliance\''), 'nav must seed tenant_id NULL template');
});

test('every component_key referenced in route seed is in manifest componentKeys', () => {
  const sql = read('002_seed_compliance_nav_routes_shell.sql');
  // Find quoted component_key tokens in the VALUES tuples (col 2).
  const re = /\(\s*'\/compliance[^']*?'\s*,\s*'([A-Za-z][A-Za-z0-9_]*)'\s*,/g;
  const found = new Set();
  let m;
  while ((m = re.exec(sql)) !== null) found.add(m[1]);
  assert.ok(found.size > 0, 'no component_keys parsed from VALUES tuples');
  const declared = new Set(manifest.componentKeys);
  for (const key of found) {
    assert.ok(declared.has(key), `component_key ${key} missing from manifest.componentKeys`);
  }
});

test('readiness seed marks compliance rows as STUB', () => {
  const sql = read('004_seed_compliance_readiness.sql');
  assert.match(sql, /UPDATE dos\.dynamic_ui_navigation/);
  assert.match(sql, /UPDATE dos\.dynamic_ui_routes/);
  assert.match(sql, /readiness\s*=\s*'STUB'/);
  assert.match(sql, /module_code\s*=\s*'compliance'/);
});

test('route permissions seed scopes to compliance and uses ON CONFLICT DO NOTHING', () => {
  const sql = read('003_seed_compliance_route_permissions.sql');
  assert.match(sql, /INSERT INTO dos\.dynamic_ui_route_permissions/);
  assert.match(sql, /module_code\s*=\s*'compliance'/);
  assert.match(sql, /ON CONFLICT \(route_id, permission_key\) DO NOTHING/);
});
