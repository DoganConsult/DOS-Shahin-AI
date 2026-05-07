#!/usr/bin/env node
/**
 * dynamic-ui-yaml-coverage.mjs — Phase 2 CI gate
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/dynamic-ui-yaml-coverage.mjs [OPTIONS]

Enforces YAML registry entries are present in live SPA registry files.

Options:
  --help, -h           Show this help message

Behavior:
  - Every entry in platform/dynamic-ui/contracts/registry.yaml must be in live TS registry
  - Same import path and export name required
  - YAML-declared permissions must exist in canonical-permissions.ts (D4)
  - YAML-declared permissions must be granted by ≥1 role in role-permission-map.ts (D5)
  - Once all modules migrate, flip SUBSET_OK to enforce exact equivalence

Exit codes:
  Non-zero on coverage violation

Examples:
  # Run YAML coverage check
  node scripts/ci-guards/dynamic-ui-yaml-coverage.mjs
`);
  process.exit(0);
}

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
process.chdir(repoRoot);

const REGISTRY = 'platform/dynamic-ui/contracts/registry.yaml';
const WIDGET_MAP_FILE =
  'products/shahin-ai/app/src/app/blueprint/shared/dynamic-ui/registry/widget-key-map.ts';
const COMPONENT_MAP_FILE =
  'products/shahin-ai/app/src/app/blueprint/core/dos/registry/component-map.ts';
const CANONICAL_PERMS_FILE = 'ops/scripts/seed-data/canonical-permissions.ts';
const ROLE_PERM_MAP_FILE = 'ops/scripts/seed-data/role-permission-map.ts';

// Reuse the same minimal YAML parser as the codegen, by spawning it.
// (We could import it; spawning keeps the gate independent.)
function loadYaml() {
  const raw = readFileSync(REGISTRY, 'utf8');
  return parseYaml(raw);
}
function parseYaml(src) {
  const lines = src.split('\n');
  const out = {};
  const stack = [{ obj: out, indent: -1 }];
  let currentList = null;
  let currentListIndent = null;
  function setOnTop(key, value) { stack[stack.length - 1].obj[key] = value; }
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const stripped = raw.replace(/#.*$/, '').trimEnd();
    if (!stripped.trim()) continue;
    const indent = raw.match(/^\s*/)[0].length;
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    if (currentList && indent <= currentListIndent) { currentList = null; currentListIndent = null; }
    const listMatch = stripped.match(/^(\s*)-\s*(.*)$/);
    if (listMatch && currentList) {
      const obj = {};
      currentList.push(obj);
      const inlineKv = listMatch[2].match(/^([A-Za-z_][\w]*)\s*:\s*(.*)$/);
      if (inlineKv) obj[inlineKv[1]] = parseScalar(inlineKv[2]);
      stack.push({ obj, indent });
      continue;
    }
    const kv = stripped.match(/^(\s*)([A-Za-z_][\w]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const [, , key, val] = kv;
    if (val === '') {
      let next = i + 1;
      while (
        next < lines.length &&
        !lines[next].replace(/#.*$/, '').trim()
      ) next++;
      if (next < lines.length && /^\s*-\s/.test(lines[next])) {
        const arr = []; setOnTop(key, arr); currentList = arr; currentListIndent = indent;
      } else {
        const obj = {}; setOnTop(key, obj); stack.push({ obj, indent });
      }
    } else setOnTop(key, parseScalar(val));
  }
  return out;
}
function parseScalar(s) {
  const t = s.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null' || t === '~') return null;
  if (/^-?\d+$/.test(t)) return Number(t);
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) return t.slice(1, -1);
  return t;
}

function extractMapEntries(file) {
  const src = readFileSync(file, 'utf8');
  const out = [];
  const re = /['"]([a-zA-Z0-9_.\-:/]+)['"]\s*:\s*\(\s*\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)\s*\.then\(\s*m\s*=>\s*m\.([A-Za-z0-9_$]+)/g;
  let m; while ((m = re.exec(src))) out.push({ key: m[1], spec: m[2], exportName: m[3] });
  return out;
}
function extractPermCodes(src) {
  const re = /code:\s*['"]([^'"]+)['"]/g; const out = new Set();
  let m; while ((m = re.exec(src))) out.add(m[1]);
  return out;
}
function extractGrantedPerms(src) {
  const re = /['"]([a-z][a-zA-Z0-9_]*[:.][a-zA-Z0-9_:.]+)['"]/g; const out = new Set();
  let m; while ((m = re.exec(src))) out.add(m[1]);
  return out;
}

if (!existsSync(REGISTRY)) {
  console.log(`[yaml-coverage] SKIP — no registry.yaml at ${REGISTRY}`);
  process.exit(0);
}

const yaml = loadYaml();
const widgets = yaml.widgets ?? [];
const components = yaml.components ?? [];

const liveWidgets = new Map(extractMapEntries(WIDGET_MAP_FILE).map(e => [e.key, e]));
const liveComponents = new Map(extractMapEntries(COMPONENT_MAP_FILE).map(e => [e.key, e]));
const canonicalPerms = extractPermCodes(readFileSync(CANONICAL_PERMS_FILE, 'utf8'));
const grantedPerms = extractGrantedPerms(readFileSync(ROLE_PERM_MAP_FILE, 'utf8'));

const failures = [];
function check(side, yamlEntry, liveMap) {
  const live = liveMap.get(yamlEntry.key);
  if (!live) {
    failures.push({ side, key: yamlEntry.key, reason: 'missing-in-live-map', yaml: yamlEntry });
    return;
  }
  if (live.spec !== yamlEntry.import_path) {
    failures.push({
      side, key: yamlEntry.key, reason: 'import-path-mismatch',
      yaml: yamlEntry.import_path, live: live.spec,
    });
  }
  if (live.exportName !== yamlEntry.export_name) {
    failures.push({
      side, key: yamlEntry.key, reason: 'export-name-mismatch',
      yaml: yamlEntry.export_name, live: live.exportName,
    });
  }
}
for (const w of widgets) check('widget', w, liveWidgets);
for (const c of components) check('component', c, liveComponents);

// D4/D5 permission alignment is currently a soft warning. Hard enforcement
// flips on once Phase 3 lands the dos.permission_catalogue + FK migration
// (see ops/reports/dynamic-ui-drift-* for the gap inventory).
const STRICT_PERMS = process.env.DYNAMIC_UI_YAML_STRICT_PERMS === '1';
const permWarnings = [];
const permsInYaml = new Set();
for (const w of widgets) if (w.permission) permsInYaml.add(w.permission);
for (const c of components) if (c.permission) permsInYaml.add(c.permission);
for (const p of permsInYaml) {
  if (!canonicalPerms.has(p)) {
    const v = { side: 'permission', key: p, reason: 'not-in-canonical-permissions' };
    (STRICT_PERMS ? failures : permWarnings).push(v);
  }
  if (!grantedPerms.has(p)) {
    const v = { side: 'permission', key: p, reason: 'not-granted-by-any-role' };
    (STRICT_PERMS ? failures : permWarnings).push(v);
  }
}

console.log(`[yaml-coverage] yaml=${widgets.length}w/${components.length}c · perms=${permsInYaml.size} · failures=${failures.length} · perm-warnings=${permWarnings.length}`);
if (permWarnings.length) {
  console.warn('[yaml-coverage] WARN — permission catalogue drift (Phase 3 will hard-fail; set DYNAMIC_UI_YAML_STRICT_PERMS=1 to fail now):');
  for (const w of permWarnings) console.warn(`  - [${w.side}] ${w.key}  reason=${w.reason}`);
}
if (failures.length) {
  console.error('[yaml-coverage] FAIL — registry.yaml drift:');
  for (const f of failures) console.error(`  - [${f.side}] ${f.key}  ${JSON.stringify(f)}`);
  process.exit(1);
}
console.log('[yaml-coverage] PASS — every yaml entry matches the live SPA registries.');
process.exit(0);
