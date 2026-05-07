#!/usr/bin/env node
/**
 * CI guard: component_key ⊆ COMPONENT_MAP.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/component-map-coverage.mjs [OPTIONS]

Verifies every component_key in migrations exists in COMPONENT_MAP.

Options:
  --help, -h           Show this help message

Environment Variables:
  COMPONENT_MAP_ENFORCE  Set to 1 to fail build (default: SHADOW mode)

Behavior:
  - Scans platform/dos/migrations/public/*.sql for active dynamic_ui_routes inserts
  - Verifies each component_key exists in platform/dos/registry/component-map.ts
  - SHADOW by default

Exit codes:
  Non-zero if any component_key missing (when COMPONENT_MAP_ENFORCE=1)

Examples:
  # Run in shadow mode (default)
  node scripts/ci-guards/component-map-coverage.mjs

  # Run with enforcement
  COMPONENT_MAP_ENFORCE=1 node scripts/ci-guards/component-map-coverage.mjs
`);
  process.exit(0);
}

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..', '..');
const MIG_DIR = join(REPO, 'platform/dos/migrations/public');
const COMPONENT_MAP_FILE = join(REPO, 'platform/dos/registry/component-map.ts');

const ACTIVE = new Set(['active']);

/** @param {string} sql */
function nextDosInsertBoundary(sql, fromIdx) {
  const rest = sql.slice(fromIdx);
  const m = rest.search(/\n(?:INSERT INTO dos\.|UPDATE dos\.)/i);
  if (m === -1) return sql.length;
  return fromIdx + m;
}

/**
 * @param {string} whole
 * @param {string} tableSuffix
 */
function extractInsertBlocks(whole, tableSuffix) {
  const needle = `INSERT INTO dos.${tableSuffix}`;
  const blocks = [];
  let i = 0;
  while (true) {
    const idx = whole.indexOf(needle, i);
    if (idx === -1) break;
    const end = nextDosInsertBoundary(whole, idx + needle.length);
    blocks.push(whole.slice(idx, end));
    i = end;
  }
  return blocks;
}

/** @param {string} block */
function parseRouteComponentKeys(block) {
  const keys = new Set();
  for (const m of block.matchAll(
    /\(\s*NULL\s*,\s*'[^']+'\s*,\s*'(\/[^']*)'\s*,\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*\d+\s*,\s*'([^']+)'/g,
  )) {
    if (ACTIVE.has(m[3])) keys.add(m[2]);
  }
  if (/SELECT[\s\S]*'active'/i.test(block) && /FROM\s*\(\s*VALUES/i.test(block)) {
    for (const m of block.matchAll(/\(\s*'(\/[^']*)'\s*,\s*'([^']+)'/g)) {
      keys.add(m[2]);
    }
  }
  return keys;
}

/** @param {string} text */
function parseCarbonPrimitiveSpreadKeys(text) {
  const anchor = 'const CARBON_PRIMITIVE_COMPONENT_MAP';
  const idx = text.indexOf(anchor);
  if (idx === -1) return new Set();
  const fromEntries = text.indexOf('Object.fromEntries', idx);
  if (fromEntries === -1) return new Set();
  const openBracket = text.indexOf('[', fromEntries);
  const closeConst = text.indexOf('] as const', openBracket);
  if (openBracket === -1 || closeConst === -1 || closeConst <= openBracket) return new Set();
  const slice = text.slice(openBracket + 1, closeConst);
  const keys = new Set();
  for (const m of slice.matchAll(/'([A-Za-z][A-Za-z0-9_]*)'/g)) keys.add(m[1]);
  return keys;
}

/** @param {string} text */
/** @param {string} exportName */
function parseTsRecordKeysFromText(text, exportName) {
  let start = text.indexOf(`export const ${exportName}`);
  if (start === -1) start = text.indexOf(`const ${exportName}`);
  if (start === -1) return new Set();
  const brace = text.indexOf('{', start);
  let depth = 0;
  let i = brace;
  for (; i < text.length; i++) {
    const c = text[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const body = text.slice(brace, i + 1);
  const keys = new Set();
  for (const m of body.matchAll(/['"]([A-Za-z][A-Za-z0-9_.-]*)['"]\s*:/g)) keys.add(m[1]);
  return keys;
}

function mergeComponentMapKeys(text) {
  const keys = parseTsRecordKeysFromText(text, 'COMPONENT_MAP');
  for (const k of parseCarbonPrimitiveSpreadKeys(text)) keys.add(k);
  // COMPONENT_MAP is composed via spread of REGISTRY_COMPONENT_MAP +
  // CARBON_PRIMITIVE_COMPONENT_MAP. Pull the registry keys directly so the
  // gate sees the full effective keyset.
  for (const k of parseTsRecordKeysFromText(text, 'REGISTRY_COMPONENT_MAP')) keys.add(k);
  return keys;
}

if (!existsSync(MIG_DIR) || !existsSync(COMPONENT_MAP_FILE)) {
  console.error('[component-map-coverage] missing paths — skipping');
  process.exit(0);
}

const mapKeys = mergeComponentMapKeys(readFileSync(COMPONENT_MAP_FILE, 'utf8'));
const routeKeys = new Set();
const files = readdirSync(MIG_DIR).filter(f => f.endsWith('.sql') && !f.includes('_down'));

for (const f of files) {
  const whole = readFileSync(join(MIG_DIR, f), 'utf8');
  for (const block of extractInsertBlocks(whole, 'dynamic_ui_routes')) {
    for (const k of parseRouteComponentKeys(block)) routeKeys.add(k);
  }
}

const missing = new Map();
for (const k of routeKeys) {
  if (!mapKeys.has(k)) {
    missing.set(k, new Set([`migrations: ${k} (active route)`]));
  }
}

if (missing.size === 0) {
  console.log(
    `[component-map-coverage] OK — ${routeKeys.size} active route component_key(s) ⊆ COMPONENT_MAP (${mapKeys.size} map entries)`,
  );
  process.exit(0);
}

console.error(`[component-map-coverage] ${missing.size} missing component_key(s):`);
for (const [k, notes] of missing) {
  console.error(`  ✗ ${k}  ← ${[...notes].join(', ')}`);
}
const enforce = process.env.COMPONENT_MAP_ENFORCE === '1';
if (enforce) process.exit(1);
console.error('[component-map-coverage] SHADOW mode (set COMPONENT_MAP_ENFORCE=1 to fail CI)');
process.exit(0);
