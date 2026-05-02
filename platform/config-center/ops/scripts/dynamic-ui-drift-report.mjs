#!/usr/bin/env node
// dynamic-ui-drift-report.mjs — Phase 0 baseline scanner
//
// Cross-checks the 5 drift classes (D1..D5) across:
//   D1  signature widget permission mismatch      (routes.permission_key vs widgets.permission)
//   D2  routes.component_key vs SPA COMPONENT_MAP
//   D3  widgets.widget_key   vs SPA WIDGET_KEY_MAP
//   D4  permission strings   vs canonical-permissions.ts catalogue
//   D5  permission strings   vs role-permission-map.ts (any role granting it)
//
// READ-ONLY. No mutations. Exit 0 always (use dynamic-ui-drift-gate.mjs for CI).
// Writes a markdown report to ops/reports/dynamic-ui-drift-<date>.md and prints
// a one-line summary to stdout.

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
process.chdir(repoRoot);

// ─── Locations ───────────────────────────────────────────────────────────
const SEED_DIRS = [
  'platform/dynamic-ui/db/public/seeds',
  // Other modules' dynamic-ui seeds live under their own seed dirs; we walk
  // modules/* later for any dynamic_ui_* tables encountered.
];
const MODULE_GLOB_ROOT = 'modules';
const WIDGET_KEY_MAP_FILE =
  'products/shahin-ai/app/src/app/blueprint/shared/dynamic-ui/registry/widget-key-map.ts';
const COMPONENT_MAP_FILE =
  'products/shahin-ai/app/src/app/blueprint/core/dos/registry/component-map.ts';
const CANONICAL_PERMS_FILE = 'ops/scripts/seed-data/canonical-permissions.ts';
const ROLE_PERM_MAP_FILE = 'ops/scripts/seed-data/role-permission-map.ts';

// ─── Helpers ─────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
      walk(p, out);
    } else if (st.isFile()) {
      out.push(p);
    }
  }
  return out;
}

function readSafe(p) { try { return readFileSync(p, 'utf8'); } catch { return ''; } }

// ─── Extractors ──────────────────────────────────────────────────────────

// Extract string keys from a TS object literal: foo['bar']: ... → 'bar'
// We only need top-level keys of the WIDGET_KEY_MAP / COMPONENT_MAP exports.
function extractStringKeys(tsSrc) {
  const out = new Set();
  // matches:  'key':   or   "key":
  const re = /(?:^|[\{,\s])['"]([a-zA-Z0-9_.\-:/]+)['"]\s*:/g;
  let m;
  while ((m = re.exec(tsSrc))) out.add(m[1]);
  return out;
}

// Parse an INSERT INTO dos.dynamic_ui_routes (cols...) VALUES (vals...) statement.
// We extract: path_pattern, component_key, permission_key, signature_widget.
function parseRouteInserts(sql) {
  const rows = [];
  const stmtRe = /INSERT\s+INTO\s+dos\.dynamic_ui_routes\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
  let m;
  while ((m = stmtRe.exec(sql))) {
    const cols = m[1].split(',').map(c => c.trim().toLowerCase());
    const valsBlob = m[2];
    // crude tuple split — handles parens but not nested function calls in values
    const tupleRe = /\(([\s\S]*?)\)/g;
    let t;
    while ((t = tupleRe.exec(valsBlob))) {
      const parts = splitCsv(t[1]);
      if (parts.length !== cols.length) continue;
      const row = {};
      cols.forEach((c, i) => { row[c] = stripQuotes(parts[i]); });
      rows.push(row);
    }
  }
  return rows;
}

function parseWidgetInserts(sql) {
  const rows = [];
  const stmtRe = /INSERT\s+INTO\s+dos\.dynamic_ui_widgets\s*\(([^)]+)\)\s*(?:VALUES|SELECT)([\s\S]*?);/gi;
  let m;
  while ((m = stmtRe.exec(sql))) {
    const cols = m[1].split(',').map(c => c.trim().toLowerCase());
    const tail = m[2];
    if (/^\s*VALUES/i.test(`VALUES${tail}`) || tail.trimStart().startsWith('VALUES') === false) {
      // VALUES path
      const tupleRe = /\(([\s\S]*?)\)/g;
      let t;
      while ((t = tupleRe.exec(tail))) {
        const parts = splitCsv(t[1]);
        if (parts.length !== cols.length) continue;
        const row = { _source: 'values' };
        cols.forEach((c, i) => { row[c] = stripQuotes(parts[i]); });
        rows.push(row);
      }
    }
    // INSERT...SELECT can't be parsed naively for permission values; flag for manual review
    if (/SELECT/i.test(tail) && !/VALUES/i.test(tail)) {
      rows.push({ _source: 'select-cannot-parse', _cols: cols.join(','), _raw: tail.trim().slice(0, 120) });
    }
  }
  return rows;
}

function parseUpdateRouteSignatureWidget(sql) {
  // Captures UPDATE dos.dynamic_ui_routes SET signature_widget = '...' WHERE path_pattern = '...'
  const out = [];
  const re =
    /UPDATE\s+dos\.dynamic_ui_routes\s+SET\s+signature_widget\s*=\s*'([^']+)'[\s\S]*?path_pattern\s*=\s*'([^']+)'/gi;
  let m;
  while ((m = re.exec(sql))) out.push({ path_pattern: m[2], signature_widget: m[1] });
  return out;
}

function splitCsv(s) {
  const out = [];
  let buf = '';
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      buf += ch;
      if (ch === "'" && s[i - 1] !== '\\') inStr = false;
      continue;
    }
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
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    return t.slice(1, -1);
  }
  return t;
}

function extractPermissionCodes(canonicalSrc) {
  // matches:  code: 'foo.bar.baz'  or  code: "foo:bar"
  const re = /code:\s*['"]([^'"]+)['"]/g;
  const out = new Set();
  let m;
  while ((m = re.exec(canonicalSrc))) out.add(m[1]);
  return out;
}

function extractPermissionsFromRoleMap(src) {
  // any quoted permission-like string in the role-permission-map; collect for D5
  const re = /['"]([a-z][a-zA-Z0-9_]*[:.][a-zA-Z0-9_:.]+)['"]/g;
  const out = new Set();
  let m;
  while ((m = re.exec(src))) out.add(m[1]);
  return out;
}

// ─── Collect ─────────────────────────────────────────────────────────────
const allFiles = [];
for (const d of SEED_DIRS) walk(d, allFiles);
walk(MODULE_GLOB_ROOT, allFiles);
const sqlFiles = allFiles.filter(p =>
  p.endsWith('.sql') &&
  /dynamic[_-]ui|dynamic_ui_/i.test(p + readSafe(p).slice(0, 600))
);

const widgetMapKeys = extractStringKeys(readSafe(WIDGET_KEY_MAP_FILE));
const componentMapKeys = extractStringKeys(readSafe(COMPONENT_MAP_FILE));
const canonicalPerms = extractPermissionCodes(readSafe(CANONICAL_PERMS_FILE));
const grantedPerms = extractPermissionsFromRoleMap(readSafe(ROLE_PERM_MAP_FILE));

// Aggregate route + widget rows across all SQL files
const routes = new Map();   // key: module|path  → { module, path, permission_key, signature_widget, component_key, _files }
const widgets = [];         // [{module, route, widget_key, permission, is_signature, _file}]

for (const file of sqlFiles) {
  const sql = readSafe(file);
  const relFile = relative(repoRoot, file);

  const rIns = parseRouteInserts(sql);
  for (const r of rIns) {
    const key = `${r.module_code}|${r.path_pattern}`;
    const cur = routes.get(key) ?? { module: r.module_code, path: r.path_pattern, _files: [] };
    if (r.permission_key !== undefined) cur.permission_key = r.permission_key;
    if (r.component_key !== undefined) cur.component_key = r.component_key;
    if (r.signature_widget !== undefined) cur.signature_widget = r.signature_widget;
    cur._files.push(relFile);
    routes.set(key, cur);
  }

  const upd = parseUpdateRouteSignatureWidget(sql);
  for (const u of upd) {
    const matchKey = [...routes.keys()].find(k => k.endsWith('|' + u.path_pattern));
    if (matchKey) {
      const cur = routes.get(matchKey);
      cur.signature_widget = u.signature_widget;
      cur._files.push(relFile + ' [UPDATE]');
    }
  }

  const wIns = parseWidgetInserts(sql);
  for (const w of wIns) {
    if (w._source === 'select-cannot-parse') continue;
    widgets.push({
      module: w.module_code,
      route: w.route,
      widget_key: w.widget_key,
      permission: w.permission,
      is_signature: w.is_signature === true || w.is_signature === 'true',
      _file: relFile,
    });
  }
}

// ─── Cross-check ─────────────────────────────────────────────────────────
const violations = { D1: [], D2: [], D3: [], D4: [], D5: [] };

// D1: signature widget permission mismatch
for (const w of widgets) {
  if (!w.is_signature) continue;
  const route = routes.get(`${w.module}|${w.route}`);
  if (!route) continue;
  if (route.permission_key && w.permission && route.permission_key !== w.permission) {
    violations.D1.push({
      route: w.route,
      module: w.module,
      route_perm: route.permission_key,
      widget_perm: w.permission,
      widget_key: w.widget_key,
      file: w._file,
    });
  }
}

// D2: route component_key not in COMPONENT_MAP
for (const r of routes.values()) {
  if (!r.component_key) continue;
  if (!componentMapKeys.has(r.component_key)) {
    violations.D2.push({ route: r.path, module: r.module, component_key: r.component_key });
  }
}

// D3: widget_key not in WIDGET_KEY_MAP (signature widget keys from routes too)
for (const w of widgets) {
  if (!w.widget_key) continue;
  if (!widgetMapKeys.has(w.widget_key)) {
    violations.D3.push({ widget_key: w.widget_key, route: w.route, module: w.module });
  }
}
for (const r of routes.values()) {
  if (!r.signature_widget) continue;
  if (!widgetMapKeys.has(r.signature_widget)) {
    violations.D3.push({
      widget_key: r.signature_widget,
      route: r.path,
      module: r.module,
      _from: 'routes.signature_widget',
    });
  }
}

// D4: permission keys not in canonical-permissions catalogue
const allPerms = new Set();
for (const r of routes.values()) if (r.permission_key) allPerms.add(r.permission_key);
for (const w of widgets) if (w.permission) allPerms.add(w.permission);
for (const p of allPerms) {
  if (!canonicalPerms.has(p)) violations.D4.push({ permission: p });
}

// D5: permission keys not granted by any role
for (const p of allPerms) {
  if (!grantedPerms.has(p)) violations.D5.push({ permission: p });
}

// ─── Render ──────────────────────────────────────────────────────────────
const date = new Date().toISOString().slice(0, 10);
const reportDir = 'ops/reports';
mkdirSync(reportDir, { recursive: true });
const reportPath = join(reportDir, `dynamic-ui-drift-${date}.md`);

const counts = Object.fromEntries(Object.entries(violations).map(([k, v]) => [k, v.length]));
const totalViolations = Object.values(counts).reduce((a, b) => a + b, 0);

let md = `# Dynamic UI Drift Report — ${date}\n\n`;
md += `**Files scanned:** ${sqlFiles.length} SQL · `;
md += `routes: ${routes.size} · widget rows: ${widgets.length} · permissions: ${allPerms.size}\n\n`;
md += `**WIDGET_KEY_MAP keys:** ${widgetMapKeys.size} · **COMPONENT_MAP keys:** ${componentMapKeys.size} · `;
md += `**canonical perms:** ${canonicalPerms.size} · **granted perms (any role):** ${grantedPerms.size}\n\n`;
md += `## Summary\n\n`;
md += `| Class | Description | Count |\n|---|---|---|\n`;
md += `| D1 | Signature widget permission mismatch | ${counts.D1} |\n`;
md += `| D2 | Route component_key missing from COMPONENT_MAP | ${counts.D2} |\n`;
md += `| D3 | Widget_key missing from WIDGET_KEY_MAP | ${counts.D3} |\n`;
md += `| D4 | Permission missing from canonical-permissions | ${counts.D4} |\n`;
md += `| D5 | Permission not granted by any role | ${counts.D5} |\n`;
md += `| **Total** | | **${totalViolations}** |\n\n`;

for (const [cls, list] of Object.entries(violations)) {
  if (!list.length) continue;
  md += `## ${cls} — ${list.length} violation(s)\n\n`;
  md += '```json\n';
  md += JSON.stringify(list.slice(0, 100), null, 2);
  md += '\n```\n\n';
  if (list.length > 100) md += `_(${list.length - 100} more truncated)_\n\n`;
}

writeFileSync(reportPath, md);
console.log(`[drift-report] wrote ${reportPath} · D1=${counts.D1} D2=${counts.D2} D3=${counts.D3} D4=${counts.D4} D5=${counts.D5} total=${totalViolations}`);
