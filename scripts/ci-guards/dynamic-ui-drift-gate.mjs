#!/usr/bin/env node
/**
 * dynamic-ui-drift-gate.mjs — Phase 1 CI gate
 *
 * Enforces zero NEW violations across the 5 dynamic-ui drift classes
 * (D1..D5) tracked by ops/scripts/dynamic-ui-drift-report.mjs.
 *
 *   D1  signature widget permission mismatch      (routes.permission_key vs widgets.permission)
 *   D2  routes.component_key vs SPA COMPONENT_MAP
 *   D3  widgets.widget_key   vs SPA WIDGET_KEY_MAP
 *   D4  permission strings   vs canonical-permissions.ts
 *   D5  permission strings   vs role-permission-map.ts
 *
 * Baseline at scripts/ci-guards/baselines/dynamic-ui-drift-gate.json
 * grandfathers existing debt. Any violation NOT in baseline fails CI.
 *
 * Regenerate explicitly:
 *   UI_GUARD_UPDATE_BASELINE=1 node scripts/ci-guards/dynamic-ui-drift-gate.mjs
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
process.chdir(repoRoot);

const BASELINE_PATH = 'scripts/ci-guards/baselines/dynamic-ui-drift-gate.json';
const SEED_DIRS = ['platform/dynamic-ui/db/public/seeds'];
const MODULE_GLOB_ROOT = 'modules';
const WIDGET_KEY_MAP_FILE =
  'products/shahin-ai/app/src/app/blueprint/shared/dynamic-ui/registry/widget-key-map.ts';
const COMPONENT_MAP_FILE =
  'products/shahin-ai/app/src/app/blueprint/core/dos/registry/component-map.ts';
const CANONICAL_PERMS_FILE = 'ops/scripts/seed-data/canonical-permissions.ts';
const ROLE_PERM_MAP_FILE = 'ops/scripts/seed-data/role-permission-map.ts';

// ─── Helpers (shared with drift-report) ───────────────────────────────────
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
      walk(p, out);
    } else if (st.isFile()) out.push(p);
  }
  return out;
}
function readSafe(p) { try { return readFileSync(p, 'utf8'); } catch { return ''; } }

function extractStringKeys(tsSrc) {
  const out = new Set();
  const re = /(?:^|[\{,\s])['"]([a-zA-Z0-9_.\-:/]+)['"]\s*:/g;
  let m; while ((m = re.exec(tsSrc))) out.add(m[1]);
  return out;
}

function splitCsv(s) {
  const out = []; let buf = ''; let depth = 0; let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) { buf += ch; if (ch === "'" && s[i - 1] !== '\\') inStr = false; continue; }
    if (ch === "'") { buf += ch; inStr = true; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(buf.trim()); buf = ''; continue; }
    buf += ch;
  }
  if (buf.trim().length) out.push(buf.trim());
  return out;
}
function stripQuotes(v) {
  if (!v) return v;
  const t = v.trim().replace(/::[a-zA-Z_]+(\[\])?$/, '').trim();
  if (t === 'NULL' || t === 'null') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) return t.slice(1, -1);
  return t;
}
function parseRouteInserts(sql) {
  const rows = [];
  const stmtRe = /INSERT\s+INTO\s+dos\.dynamic_ui_routes\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
  let m; while ((m = stmtRe.exec(sql))) {
    const cols = m[1].split(',').map(c => c.trim().toLowerCase());
    const tupleRe = /\(([\s\S]*?)\)/g; let t;
    while ((t = tupleRe.exec(m[2]))) {
      const parts = splitCsv(t[1]);
      if (parts.length !== cols.length) continue;
      const row = {}; cols.forEach((c, i) => { row[c] = stripQuotes(parts[i]); });
      rows.push(row);
    }
  }
  return rows;
}
function parseWidgetInserts(sql) {
  const rows = [];
  const stmtRe = /INSERT\s+INTO\s+dos\.dynamic_ui_widgets\s*\(([^)]+)\)\s*(?:VALUES|SELECT)([\s\S]*?);/gi;
  let m; while ((m = stmtRe.exec(sql))) {
    const cols = m[1].split(',').map(c => c.trim().toLowerCase());
    const tail = m[2];
    if (!tail.trimStart().startsWith('SELECT')) {
      const tupleRe = /\(([\s\S]*?)\)/g; let t;
      while ((t = tupleRe.exec(tail))) {
        const parts = splitCsv(t[1]);
        if (parts.length !== cols.length) continue;
        const row = {}; cols.forEach((c, i) => { row[c] = stripQuotes(parts[i]); });
        rows.push(row);
      }
    }
  }
  return rows;
}
function parseUpdateRouteSignatureWidget(sql) {
  const out = [];
  const re = /UPDATE\s+dos\.dynamic_ui_routes\s+SET\s+signature_widget\s*=\s*'([^']+)'[\s\S]*?path_pattern\s*=\s*'([^']+)'/gi;
  let m; while ((m = re.exec(sql))) out.push({ path_pattern: m[2], signature_widget: m[1] });
  return out;
}
function extractPermissionCodes(src) {
  const re = /code:\s*['"]([^'"]+)['"]/g; const out = new Set();
  let m; while ((m = re.exec(src))) out.add(m[1]);
  return out;
}
function extractPermissionsFromRoleMap(src) {
  const re = /['"]([a-z][a-zA-Z0-9_]*[:.][a-zA-Z0-9_:.]+)['"]/g; const out = new Set();
  let m; while ((m = re.exec(src))) out.add(m[1]);
  return out;
}

// ─── Collect ──────────────────────────────────────────────────────────────
const allFiles = []; for (const d of SEED_DIRS) walk(d, allFiles); walk(MODULE_GLOB_ROOT, allFiles);
const sqlFiles = allFiles.filter(p => p.endsWith('.sql') &&
  /dynamic[_-]ui|dynamic_ui_/i.test(p + readSafe(p).slice(0, 600)));

const widgetMapKeys = extractStringKeys(readSafe(WIDGET_KEY_MAP_FILE));
const componentMapKeys = extractStringKeys(readSafe(COMPONENT_MAP_FILE));
const canonicalPerms = extractPermissionCodes(readSafe(CANONICAL_PERMS_FILE));
const grantedPerms = extractPermissionsFromRoleMap(readSafe(ROLE_PERM_MAP_FILE));

const routes = new Map(); const widgets = [];
for (const file of sqlFiles) {
  const sql = readSafe(file); const relFile = relative(repoRoot, file);
  for (const r of parseRouteInserts(sql)) {
    const key = `${r.module_code}|${r.path_pattern}`;
    const cur = routes.get(key) ?? { module: r.module_code, path: r.path_pattern };
    if (r.permission_key !== undefined) cur.permission_key = r.permission_key;
    if (r.component_key !== undefined) cur.component_key = r.component_key;
    if (r.signature_widget !== undefined) cur.signature_widget = r.signature_widget;
    routes.set(key, cur);
  }
  for (const u of parseUpdateRouteSignatureWidget(sql)) {
    const matchKey = [...routes.keys()].find(k => k.endsWith('|' + u.path_pattern));
    if (matchKey) routes.get(matchKey).signature_widget = u.signature_widget;
  }
  for (const w of parseWidgetInserts(sql)) {
    widgets.push({
      module: w.module_code, route: w.route, widget_key: w.widget_key,
      permission: w.permission,
      is_signature: w.is_signature === true || w.is_signature === 'true',
      _file: relFile,
    });
  }
}

// ─── Cross-check ──────────────────────────────────────────────────────────
const found = []; // [{class, key, detail}]
const fp = (cls, key, detail) => found.push({ class: cls, key, detail });

for (const w of widgets) {
  if (!w.is_signature) continue;
  const route = routes.get(`${w.module}|${w.route}`);
  if (!route) continue;
  if (route.permission_key && w.permission && route.permission_key !== w.permission) {
    fp('D1', `${w.module}|${w.route}|${w.widget_key}`, {
      route_perm: route.permission_key, widget_perm: w.permission, file: w._file,
    });
  }
}
for (const r of routes.values()) {
  if (r.component_key && !componentMapKeys.has(r.component_key)) {
    fp('D2', `${r.module}|${r.path}|${r.component_key}`, { route: r.path, component_key: r.component_key });
  }
}
for (const w of widgets) {
  if (w.widget_key && !widgetMapKeys.has(w.widget_key)) {
    fp('D3', `${w.module}|${w.route}|${w.widget_key}`, { route: w.route, widget_key: w.widget_key });
  }
}
for (const r of routes.values()) {
  if (r.signature_widget && !widgetMapKeys.has(r.signature_widget)) {
    fp('D3', `${r.module}|${r.path}|${r.signature_widget}|sig`, {
      route: r.path, widget_key: r.signature_widget, from: 'routes.signature_widget',
    });
  }
}
const allPerms = new Set();
for (const r of routes.values()) if (r.permission_key) allPerms.add(r.permission_key);
for (const w of widgets) if (w.permission) allPerms.add(w.permission);
for (const p of allPerms) {
  if (!canonicalPerms.has(p)) fp('D4', `perm|${p}`, { permission: p });
  if (!grantedPerms.has(p)) fp('D5', `perm|${p}`, { permission: p });
}

// ─── Baseline diff ────────────────────────────────────────────────────────
const updateBaseline = process.env.UI_GUARD_UPDATE_BASELINE === '1';
const currentKeys = found.map(f => `${f.class}::${f.key}`).sort();

if (updateBaseline) {
  const payload = {
    updated_at: new Date().toISOString(),
    summary: countsByClass(found),
    keys: currentKeys,
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log(`[drift-gate] baseline regenerated · ${currentKeys.length} keys · ${BASELINE_PATH}`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error(`[drift-gate] FAIL — no baseline at ${BASELINE_PATH}. Run with UI_GUARD_UPDATE_BASELINE=1 to seed.`);
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
const allowed = new Set(baseline.keys ?? []);
const newViolations = found.filter(f => !allowed.has(`${f.class}::${f.key}`));
const removed = (baseline.keys ?? []).filter(k => !currentKeys.includes(k));

console.log(`[drift-gate] current=${found.length} baseline=${allowed.size} new=${newViolations.length} removed=${removed.length}`);

if (newViolations.length) {
  console.error('[drift-gate] FAIL — new dynamic-ui drift introduced:');
  for (const v of newViolations.slice(0, 50)) {
    console.error(`  - [${v.class}] ${v.key}  ${JSON.stringify(v.detail)}`);
  }
  if (newViolations.length > 50) console.error(`  ...and ${newViolations.length - 50} more.`);
  console.error('\nFix the drift OR (only with reviewer sign-off) regenerate baseline:');
  console.error('  UI_GUARD_UPDATE_BASELINE=1 node scripts/ci-guards/dynamic-ui-drift-gate.mjs');
  process.exit(1);
}

if (removed.length) {
  console.log(`[drift-gate] PASS — ${removed.length} prior violation(s) cleared. Consider regenerating baseline.`);
} else {
  console.log('[drift-gate] PASS — no new drift.');
}
process.exit(0);

function countsByClass(list) {
  const out = { D1: 0, D2: 0, D3: 0, D4: 0, D5: 0 };
  for (const v of list) out[v.class] = (out[v.class] ?? 0) + 1;
  return out;
}
