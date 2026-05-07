#!/usr/bin/env node
/**
 * CI guard: strict Carbon-key ↔ COMPONENT_MAP closure.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/carbon-key-component-map-strict.mjs [OPTIONS]

Enforces strict Carbon-key ↔ COMPONENT_MAP closure.

Options:
  --help, -h           Show this help message

Platform rule:
  DB/registry: every dos.dynamic_ui_component_registry row MUST
    - vendor='ibm-carbon'
    - approval_status='approved'
    - carbon_key NOT NULL
    - carbon_key resolves to Angular-usable dos.ui_carbon_components row

  Frontend: every distinct carbon_key referenced in registry MUST
    - Have at least one component_key in COMPONENT_MAP
    - Resolve to real Carbon Angular renderer (NOT CarbonCatalogPlaceholderRenderer)

Exit codes:
  1 — Violation detected
  2 — Error

Examples:
  # Run carbon key component map strict check
  node scripts/ci-guards/carbon-key-component-map-strict.mjs
`);
  process.exit(0);
}

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..', '..');
const COMPONENT_MAP_FILE = join(REPO, 'platform/dos/registry/component-map.ts');
const PLACEHOLDER = 'CarbonCatalogPlaceholderRenderer';
const REQUIRED_PUBLIC_CARBON_KEYS = [
  'ui_shell', 'header', 'header_name', 'header_navigation', 'header_menu',
  'header_menu_item', 'header_global_bar', 'header_global_action', 'side_nav',
  'side_nav_items', 'side_nav_menu', 'side_nav_menu_item', 'side_nav_link',
  'content', 'grid', 'column', 'layer', 'breadcrumb', 'tabs', 'tab', 'tile',
  'clickable_tile', 'expandable_tile', 'tag', 'data_table', 'table_toolbar',
  'table_toolbar_search', 'table_toolbar_actions', 'table_batch_actions',
  'pagination', 'structured_list', 'search', 'dropdown', 'combo_box',
  'multi_select', 'date_picker', 'text_input', 'text_area', 'number_input',
  'select', 'checkbox', 'radio', 'toggle', 'button', 'icon_button',
  'overflow_menu', 'overflow_menu_option', 'modal', 'inline_notification',
  'toast_notification', 'tooltip', 'toggletip', 'popover', 'progress_bar',
  'inline_loading', 'skeleton_text', 'skeleton_placeholder', 'context_menu',
  'file_uploader', 'accordion',
];

function psql(sql) {
  const env = { ...process.env, PGPASSWORD: process.env.PGPASSWORD || 'dos_auth_pass_2026' };
  return execFileSync('psql', [
    '-h', process.env.PGHOST || 'localhost',
    '-U', process.env.PGUSER || 'dos_auth',
    '-d', process.env.PGDATABASE || 'shahin_grc',
    '-At', '-F', '|', '-c', sql,
  ], { env, encoding: 'utf8' });
}

// 1. DB invariants.
const integrity = psql(`
  SELECT
    (SELECT count(*) FROM dos.dynamic_ui_component_registry),
    (SELECT count(*) FROM dos.dynamic_ui_component_registry WHERE vendor <> 'ibm-carbon'),
    (SELECT count(*) FROM dos.dynamic_ui_component_registry WHERE approval_status <> 'approved'),
    (SELECT count(*) FROM dos.dynamic_ui_component_registry WHERE carbon_key IS NULL OR carbon_key = ''),
    (SELECT count(*) FROM dos.dynamic_ui_component_registry r
       LEFT JOIN dos.ui_carbon_components c ON c.carbon_key = r.carbon_key
      WHERE c.carbon_key IS NULL
         OR c.vendor <> 'ibm-carbon'
         OR c.is_active = false
         OR c.runtime_status NOT IN ('active','wrapper-required'));
`).trim().split('|').map(Number);
const [total, badVendor, notApproved, nullCarbon, badCatalog] = integrity;

const dbErrors = [];
if (badVendor)   dbErrors.push(`${badVendor} row(s) with vendor != 'ibm-carbon'`);
if (notApproved) dbErrors.push(`${notApproved} row(s) with approval_status != 'approved'`);
if (nullCarbon)  dbErrors.push(`${nullCarbon} row(s) with NULL/empty carbon_key`);
if (badCatalog)  dbErrors.push(`${badCatalog} row(s) referencing inactive/non-Angular Carbon catalog rows`);

// 2. Pull (component_key, carbon_key) pairs from registry.
const pairs = psql(`
  SELECT component_key, carbon_key
    FROM dos.dynamic_ui_component_registry
   ORDER BY carbon_key, component_key;
`).trim().split('\n').filter(Boolean).map(l => {
  const [component_key, carbon_key] = l.split('|');
  return { component_key, carbon_key };
});

// 3. Parse COMPONENT_MAP source: extract component_key → renderer-class-name.
const src = readFileSync(COMPONENT_MAP_FILE, 'utf8');
const mapBindings = new Map(); // component_key → renderer class
for (const m of src.matchAll(
  /['"]([A-Za-z][A-Za-z0-9_.\-]*)['"]\s*:\s*\(\)\s*=>\s*import\([^)]+\)\s*\.then\([^)]+=>\s*[a-zA-Z_$][\w$]*\.(\w+)\s*\)/g,
)) {
  mapBindings.set(m[1], m[2]);
}
// Bare-identifier shorthand entries (`Tabs:` etc.) for the primitive map.
for (const m of src.matchAll(
  /^\s*([A-Za-z][A-Za-z0-9_]*)\s*:\s*\(\)\s*=>\s*import\([^)]+\)\s*\.then\([^)]+=>\s*[a-zA-Z_$][\w$]*\.(\w+)\s*\)/gm,
)) {
  if (!mapBindings.has(m[1])) mapBindings.set(m[1], m[2]);
}

// 4. For each registry row, the FE must bind its component_key to a
//    real (non-placeholder) renderer.
const feErrors = [];
const carbonNoNative = new Map(); // carbon_key → reasons[]
for (const { component_key, carbon_key } of pairs) {
  const cls = mapBindings.get(component_key);
  if (!cls) {
    feErrors.push(`component_key '${component_key}' (carbon_key='${carbon_key}') has NO entry in COMPONENT_MAP`);
    continue;
  }
  if (cls === PLACEHOLDER) {
    if (!carbonNoNative.has(carbon_key)) carbonNoNative.set(carbon_key, []);
    carbonNoNative.get(carbon_key).push(component_key);
  }
}

// 5. Each distinct carbon_key must have at least one component_key bound
//    to a real renderer (not the placeholder). If every component_key for
//    a carbon_key resolves to the placeholder, that carbon_key has no
//    real renderer → fail.
const carbonHasNative = new Map(); // carbon_key → true if any non-placeholder
for (const { component_key, carbon_key } of pairs) {
  const cls = mapBindings.get(component_key);
  if (cls && cls !== PLACEHOLDER) carbonHasNative.set(carbon_key, true);
}
const distinctCarbon = [...new Set(pairs.map(p => p.carbon_key))];
const missingNative = distinctCarbon.filter(ck => !carbonHasNative.get(ck));
const registryComponentKeys = new Set(pairs.map(p => p.component_key));
const registryCarbonKeys = new Set(pairs.map(p => p.carbon_key));

const requiredCatalogRows = psql(`
  SELECT carbon_key
    FROM dos.ui_carbon_components
   WHERE carbon_key = ANY(ARRAY[${REQUIRED_PUBLIC_CARBON_KEYS.map(k => `'${k}'`).join(',')}])
     AND vendor = 'ibm-carbon'
     AND is_active = true
     AND runtime_status IN ('active','wrapper-required')
   ORDER BY carbon_key;
`).trim().split('\n').filter(Boolean);
const requiredCatalogKeys = new Set(requiredCatalogRows);

const errors = [...dbErrors];
for (const key of REQUIRED_PUBLIC_CARBON_KEYS) {
  if (!requiredCatalogKeys.has(key)) errors.push(`required public carbon_key '${key}' missing from approved Carbon catalog`);
  if (!registryCarbonKeys.has(key) || !registryComponentKeys.has(key)) errors.push(`required public carbon_key '${key}' missing from approved Dynamic UI registry as component_key='${key}'`);
  if (!mapBindings.has(key)) errors.push(`required public carbon_key '${key}' missing from COMPONENT_MAP`);
}
if (feErrors.length) errors.push(...feErrors);
if (missingNative.length) {
  for (const ck of missingNative) {
    errors.push(`carbon_key '${ck}' has NO real renderer (all bindings → ${PLACEHOLDER})`);
  }
}

const summary = {
  registry_total: total,
  registry_distinct_carbon_keys: distinctCarbon.length,
  carbon_keys_with_real_renderer: distinctCarbon.length - missingNative.length,
  carbon_keys_placeholder_only: missingNative.length,
  component_map_entries: mapBindings.size,
  required_public_carbon_keys: REQUIRED_PUBLIC_CARBON_KEYS.length,
  required_public_catalog_keys: requiredCatalogKeys.size,
  required_public_registry_keys: REQUIRED_PUBLIC_CARBON_KEYS.filter(k => registryCarbonKeys.has(k) && registryComponentKeys.has(k)).length,
  required_public_component_map_keys: REQUIRED_PUBLIC_CARBON_KEYS.filter(k => mapBindings.has(k)).length,
  db_violations: dbErrors.length,
  fe_missing_entries: feErrors.length,
};
console.log('[carbon-key-component-map-strict] summary:', JSON.stringify(summary, null, 2));

if (errors.length) {
  console.error(`[carbon-key-component-map-strict] FAIL — ${errors.length} violation(s):`);
  for (const e of errors) console.error('  ✗', e);
  process.exit(1);
}
console.log('[carbon-key-component-map-strict] OK — every registry carbon_key resolves to a real Carbon renderer.');
process.exit(0);
