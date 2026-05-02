#!/usr/bin/env node
/**
 * Module Navigation Registry — codegen.
 *
 * Scans for `**\/contracts/navigation/navigation.json` under:
 *   - platform/<dna>/                  (DNA modules — e.g. platform/foundation)
 *   - modules/<module>/                (tenant-entitled modules)
 *
 * Emits a typed TypeScript registry at:
 *   platform/access/dos-access-store/src/generated/module-navigation.registry.ts
 *
 * The registry is a plain object map `moduleCode → NavContract` so
 * `ModuleLibraryNavSource` can resolve module nav without dynamic glob
 * imports (which need build-time tooling Angular doesn't ship by default).
 *
 * Validation: every navigation.json must declare `schemaVersion`,
 * `moduleCode`, `items[]` with at minimum `{id, label?|labelKey?, route?,
 * permission?}`. Codegen FAILS if any contract violates the shape.
 *
 * Modes:
 *   --dry  (default): print the would-be file to stdout; exit 0 if valid,
 *                     1 if any contract is malformed.
 *   --write           : write to disk (and append to .gitignore-respecting
 *                       location). Used by `pnpm modulenav:codegen:write`.
 *
 * Idempotent. Safe to run on every build.
 */

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot  = resolve(__dirname, '..', '..');

const SCAN_ROOTS = [
  'platform',
  'modules',
];
const NAV_PATH_SUFFIX = ['contracts', 'navigation', 'navigation.json'];
const OUT_FILE = 'platform/access/dos-access-store/src/generated/module-navigation.registry.ts';

const args = new Set(process.argv.slice(2));
const WRITE = args.has('--write');

function* walk(dir, depth = 0) {
  if (depth > 6) return; // safety
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git' || e.name.startsWith('_')) continue;
    const full = `${dir}/${e.name}`;
    if (e.isDirectory()) yield* walk(full, depth + 1);
    else if (e.isFile() && e.name === 'navigation.json'
             && full.endsWith(NAV_PATH_SUFFIX.join('/'))) {
      yield full;
    }
  }
}

function validateContract(json, file) {
  const errors = [];
  if (!json || typeof json !== 'object') errors.push('not an object');
  if (typeof json.schemaVersion !== 'number') errors.push('schemaVersion missing/non-numeric');
  if (typeof json.moduleCode !== 'string' || !json.moduleCode) errors.push('moduleCode missing');
  if (!Array.isArray(json.items)) errors.push('items[] missing');
  for (const [i, item] of (json.items || []).entries()) {
    if (!item || typeof item !== 'object') { errors.push(`items[${i}] not an object`); continue; }
    if (typeof item.id !== 'string' || !item.id) errors.push(`items[${i}].id missing`);
    if (item.label !== undefined && typeof item.label !== 'string') errors.push(`items[${i}].label non-string`);
    if (item.labelKey !== undefined && typeof item.labelKey !== 'string') errors.push(`items[${i}].labelKey non-string`);
    if (item.route !== undefined && typeof item.route !== 'string') errors.push(`items[${i}].route non-string`);
    if (item.permission !== undefined && typeof item.permission !== 'string') errors.push(`items[${i}].permission non-string`);
    if (item.icon !== undefined && typeof item.icon !== 'string') errors.push(`items[${i}].icon non-string`);
    if (item.order !== undefined && typeof item.order !== 'number') errors.push(`items[${i}].order non-numeric`);
  }
  if (json.groups !== undefined && !Array.isArray(json.groups)) errors.push('groups must be an array');
  for (const [i, g] of (json.groups || []).entries()) {
    if (typeof g.id !== 'string') errors.push(`groups[${i}].id missing`);
    if (g.items !== undefined && !Array.isArray(g.items)) errors.push(`groups[${i}].items non-array`);
  }
  return errors;
}

function generateTs(records) {
  const ts = [];
  ts.push('// AUTO-GENERATED — do not edit. Regenerate via `pnpm modulenav:codegen:write`.');
  ts.push('// Source: scripts/codegen/module-navigation-registry.mjs');
  ts.push('// Inputs:');
  for (const { source } of records) ts.push(`//   ${source}`);
  ts.push('');
  ts.push('export interface ModuleNavItemContract {');
  ts.push('  id: string;');
  ts.push('  label?: string;');
  ts.push('  labelKey?: string;');
  ts.push('  route?: string;');
  ts.push('  icon?: string;');
  ts.push('  permission?: string;');
  ts.push('  order?: number;');
  ts.push('  group?: string;');
  ts.push('  badge?: string;');
  ts.push('}');
  ts.push('');
  ts.push('export interface ModuleNavGroupContract {');
  ts.push('  id: string;');
  ts.push('  label?: string;');
  ts.push('  labelKey?: string;');
  ts.push('  items?: string[];');
  ts.push('  order?: number;');
  ts.push('}');
  ts.push('');
  ts.push('export interface ModuleNavContract {');
  ts.push('  schemaVersion: number;');
  ts.push('  moduleCode: string;');
  ts.push('  items: ModuleNavItemContract[];');
  ts.push('  groups?: ModuleNavGroupContract[];');
  ts.push('}');
  ts.push('');
  ts.push('export const MODULE_NAVIGATION_REGISTRY: Readonly<Record<string, ModuleNavContract>> = Object.freeze({');
  for (const { contract } of records) {
    ts.push(`  ${JSON.stringify(contract.moduleCode)}: ${JSON.stringify(contract, null, 2).replace(/\n/g, '\n  ')},`);
  }
  ts.push('});');
  ts.push('');
  ts.push('export function getModuleNavContract(moduleCode: string): ModuleNavContract | undefined {');
  ts.push('  return MODULE_NAVIGATION_REGISTRY[moduleCode];');
  ts.push('}');
  ts.push('');
  ts.push('export function listRegisteredModuleNav(): string[] {');
  ts.push('  return Object.keys(MODULE_NAVIGATION_REGISTRY).sort();');
  ts.push('}');
  ts.push('');
  return ts.join('\n');
}

const records = [];
const errors  = [];

for (const root of SCAN_ROOTS) {
  const abs = resolve(repoRoot, root);
  if (!existsSync(abs)) continue;
  for (const file of walk(abs)) {
    let json;
    try { json = JSON.parse(readFileSync(file, 'utf8')); }
    catch (err) { errors.push(`${relative(repoRoot, file)}: invalid JSON (${err.message})`); continue; }
    const validation = validateContract(json, file);
    if (validation.length) {
      errors.push(`${relative(repoRoot, file)}: ${validation.join(', ')}`);
      continue;
    }
    records.push({ source: relative(repoRoot, file), contract: json });
  }
}

records.sort((a, b) => a.contract.moduleCode.localeCompare(b.contract.moduleCode));

if (errors.length) {
  console.error('Module navigation codegen FAILED:');
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

const ts = generateTs(records);

if (WRITE) {
  const outAbs = resolve(repoRoot, OUT_FILE);
  mkdirSync(dirname(outAbs), { recursive: true });
  writeFileSync(outAbs, ts, 'utf8');
  console.log(`Wrote ${records.length} module nav contract(s) to ${OUT_FILE}`);
  for (const { source } of records) console.log(`  • ${source}`);
} else {
  console.log(`/* dry-run — ${records.length} contract(s); pass --write to emit ${OUT_FILE} */`);
  console.log(ts);
}
process.exit(0);
