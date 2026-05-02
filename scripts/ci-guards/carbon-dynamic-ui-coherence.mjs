#!/usr/bin/env node
/**
 * carbon-dynamic-ui-coherence.mjs — Dynamic-UI / IBM Carbon contract gate
 *
 * 1. Parses dos.ui_carbon_components INSERTs under platform/dos/migrations/public
 * 2. Parses dos.dynamic_ui_component_registry (full + legacy bare rows)
 * 3. Parses dos.dynamic_ui_routes (active readiness only) for component_key
 * 4. Parses dos.dynamic_ui_widgets for signature_widget_key / widget_key literals
 * 5. Loads COMPONENT_MAP + WIDGET_KEY_MAP (static regex) and verifies:
 *    - approved ibm-carbon registry rows reference carbon_key in catalog set
 *    - every active route component_key exists in COMPONENT_MAP
 *    - every approved registry component_key exists in COMPONENT_MAP
 *    - every referenced widget key resolves via resolveWidgetComponent rules
 *      (exact key OR documented prefix family in this script — kept in sync
 *      with widget-key-map.ts)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG_DIR = join(repoRoot, 'platform/dos/migrations/public');
const COMPONENT_MAP_FILE = join(repoRoot, 'platform/dos/registry/component-map.ts');
const WIDGET_MAP_FILE = join(
  repoRoot,
  'platform/config-center/shared/dynamic-ui/registry/widget-key-map.ts',
);

const ACTIVE = new Set(['active']);

/** @param {string} sql */
function nextDosInsertBoundary(sql, fromIdx) {
  const rest = sql.slice(fromIdx);
  const m = rest.search(/\n(?:INSERT INTO dos\.|UPDATE dos\.)/i);
  if (m === -1) return sql.length;
  return fromIdx + m;
}

/**
 * Extract blocks: INSERT INTO dos.<table> ... until next INSERT/UPDATE dos. or EOF
 * @param {string} whole
 * @param {string} tableSuffix e.g. 'dynamic_ui_routes'
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
function parseCarbonCatalogKeys(block) {
  const keys = new Set();
  for (const m of block.matchAll(/\(\s*'([a-z0-9_.-]+)'\s*,/gi)) keys.add(m[1]);
  return keys;
}

/**
 * Full registry row: ('ComplianceHome', 'ibm-carbon', 'approved', 'tiles',
 * @param {string} sql
 */
function parseFullRegistryRows(sql) {
  const rows = [];
  for (const m of sql.matchAll(
    /\(\s*'([^']+)'\s*,\s*'ibm-carbon'\s*,\s*'([^']+)'\s*,\s*'([a-z0-9_.-]+)'/gi,
  )) {
    rows.push({ componentKey: m[1], approval: m[2], carbonKey: m[3] });
  }
  return rows;
}

/** Legacy: INSERT INTO ... (component_key, schema_version, metadata) VALUES ('x', */
function parseBareRegistryKeys(sql) {
  const keys = new Set();
  for (const m of sql.matchAll(
    /INSERT\s+INTO\s+dos\.dynamic_ui_component_registry\s*\(\s*component_key\s*,\s*schema_version/gi,
  )) {
    const start = m.index;
    const chunk = sql.slice(start, start + 800);
    const vm = chunk.match(/VALUES\s*\(\s*'([^']+)'/i);
    if (vm) keys.add(vm[1]);
  }
  return keys;
}

/**
 * Route rows — only inside dynamic_ui_routes blocks.
 * @param {string} block
 */
function parseRouteComponentKeys(block) {
  const keys = new Set();
  // Direct VALUES (NULL, 'module', '/path', 'component_key', 'perm', N, 'active', ...)
  for (const m of block.matchAll(
    /\(\s*NULL\s*,\s*'[^']+'\s*,\s*'(\/[^']*)'\s*,\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*\d+\s*,\s*'([^']+)'/g,
  )) {
    if (ACTIVE.has(m[3])) keys.add(m[2]);
  }
  // SELECT ... 'active' and FROM (VALUES ('/path','component_key',
  if (/SELECT[\s\S]*'active'/i.test(block) && /FROM\s*\(\s*VALUES/i.test(block)) {
    for (const m of block.matchAll(/\(\s*'(\/[^']*)'\s*,\s*'([^']+)'/g)) {
      keys.add(m[2]);
    }
  }
  return keys;
}

/** Widget INSERT block: (NULL, 'mod', '/path', 'widget_key', ... */
function parseWidgetKeys(block) {
  const keys = new Set();
  for (const m of block.matchAll(
    /\(\s*NULL\s*,\s*'[^']+'\s*,\s*'(\/[^']*)'\s*,\s*'([^']+)'/g,
  )) {
    keys.add(m[2]);
  }
  return keys;
}

/**
 * Keys merged into COMPONENT_MAP via `...CARBON_PRIMITIVE_COMPONENT_MAP`
 * (Object.fromEntries + array of quoted literals before `] as const`).
 * @param {string} text full component-map.ts source
 */
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
function parseTsRecordKeysFromText(text, exportName) {
  const start = text.indexOf(`export const ${exportName}`);
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

/** @param {string} text */
function collectWidgetMapKeys(text) {
  const quoted = new Set();
  const canonStart = text.indexOf('const CANONICAL_SIGNATURE_WIDGET_MAP');
  if (canonStart !== -1) {
    const canonEnd = text.indexOf('};', canonStart);
    const canonSlice = text.slice(canonStart, canonEnd === -1 ? canonStart + 50000 : canonEnd + 2);
    for (const x of canonSlice.matchAll(/'([a-z0-9._-]+)'\s*:/gi)) quoted.add(x[1]);
  }
  const start = text.indexOf('export const WIDGET_KEY_MAP');
  const end = text.indexOf('export function resolveWidgetComponent', start);
  if (start !== -1 && end !== -1) {
    const slice = text.slice(start, end);
    for (const x of slice.matchAll(/'([a-z0-9._-]+)'\s*:/gi)) quoted.add(x[1]);
  }
  return quoted;
}

/** Mirror widget-key-map.ts resolveWidgetComponent fallbacks for CI */
function widgetFallbackTarget(key, quoted) {
  if (!key) return null;
  if (quoted.has(key)) return key;
  const prefixes = [
    ['command-center.', 'command-center'],
    ['smart-grid.', 'smart-data-grid'],
    ['audit-timeline.', 'forensic-timeline'],
    ['context-rail.', 'entity-360'],
    ['matrix.', 'risk-heatmap'],
    ['recommendation-card.', 'ai-recommendations-panel'],
  ];
  for (const [pre, target] of prefixes) {
    if (key.startsWith(pre) && quoted.has(target)) return target;
  }
  if (key.endsWith('.cfg')) {
    const base = key.replace(/\.cfg$/, '');
    if (base === 'command-center' && quoted.has('command-center')) return 'command-center';
    if (base === 'smart-grid' && quoted.has('smart-data-grid')) return 'smart-data-grid';
    if ((base === 'audit-timeline' || base.startsWith('audit-timeline')) && quoted.has('forensic-timeline'))
      return 'forensic-timeline';
  }
  const head = key.split('.')[0];
  if (quoted.has(head)) return head;
  return null;
}

function parseTsRecordKeys(tsPath, exportName) {
  const text = readFileSync(tsPath, 'utf8');
  return mergeComponentMapKeySet(text, exportName);
}

/** @param {string} text */
function mergeComponentMapKeySet(text, exportName) {
  const keys = parseTsRecordKeysFromText(text, exportName);
  if (exportName === 'COMPONENT_MAP') {
    for (const k of parseCarbonPrimitiveSpreadKeys(text)) keys.add(k);
  }
  return keys;
}

/**
 * Print sorted JSON array of component_key values that must appear in COMPONENT_MAP:
 * approved ibm-carbon registry rows, active route keys, and legacy bare registry keys.
 * Usage: COHERENCE_EMIT_KEYS=1 node scripts/ci-guards/carbon-dynamic-ui-coherence.mjs
 */
function emitKeysMode() {
  if (!existsSync(MIG_DIR)) {
    console.error('[carbon-dynamic-ui-coherence] missing', MIG_DIR);
    process.exit(1);
  }
  const fullRegistry = [];
  const routeKeys = new Set();
  const bareRegistry = new Set();
  const files = readdirSync(MIG_DIR).filter(f => f.endsWith('.sql') && !f.includes('_down'));

  for (const f of files) {
    const whole = readFileSync(join(MIG_DIR, f), 'utf8');
    fullRegistry.push(...parseFullRegistryRows(whole));
    for (const k of parseBareRegistryKeys(whole)) bareRegistry.add(k);
    for (const block of extractInsertBlocks(whole, 'dynamic_ui_routes')) {
      for (const k of parseRouteComponentKeys(block)) routeKeys.add(k);
    }
  }

  const needed = new Set();
  for (const row of fullRegistry) {
    if (row.approval === 'approved') needed.add(row.componentKey);
  }
  for (const ck of routeKeys) needed.add(ck);
  for (const ck of bareRegistry) needed.add(ck);

  const specificLazyImports = new Set([
    'ShahinProfilePage',
    'ShahinSettingsPage',
    'ShahinTenantProfilePage',
    'ShahinTenantSettingsPage',
  ]);
  const sorted = [...needed].filter(k => !specificLazyImports.has(k)).sort();
  console.log(JSON.stringify(sorted, null, 2));
  process.exit(0);
}

function main() {
  if (process.env.COHERENCE_EMIT_KEYS === '1') {
    emitKeysMode();
    return;
  }
  if (!existsSync(MIG_DIR)) {
    console.error('[carbon-dynamic-ui-coherence] missing', MIG_DIR);
    process.exit(1);
  }

  let carbonCatalog = new Set();
  const fullRegistry = [];
  const bareRegistry = new Set();
  const routeKeys = new Set();
  const widgetKeys = new Set();

  const files = readdirSync(MIG_DIR).filter(f => f.endsWith('.sql') && !f.includes('_down'));

  for (const f of files) {
    const whole = readFileSync(join(MIG_DIR, f), 'utf8');
    for (const block of extractInsertBlocks(whole, 'ui_carbon_components')) {
      for (const k of parseCarbonCatalogKeys(block)) carbonCatalog.add(k);
    }
    fullRegistry.push(...parseFullRegistryRows(whole));
    for (const k of parseBareRegistryKeys(whole)) bareRegistry.add(k);

    for (const block of extractInsertBlocks(whole, 'dynamic_ui_routes')) {
      for (const k of parseRouteComponentKeys(block)) routeKeys.add(k);
    }
    for (const block of extractInsertBlocks(whole, 'dynamic_ui_widgets')) {
      for (const k of parseWidgetKeys(block)) widgetKeys.add(k);
    }
  }

  const componentMapText = readFileSync(COMPONENT_MAP_FILE, 'utf8');
  const componentMapKeys = mergeComponentMapKeySet(componentMapText, 'COMPONENT_MAP');
  const widgetQuoted = collectWidgetMapKeys(readFileSync(WIDGET_MAP_FILE, 'utf8'));
  const failures = [];

  for (const row of fullRegistry) {
    if (row.approval !== 'approved') continue;
    if (!carbonCatalog.has(row.carbonKey)) {
      failures.push({
        kind: 'registry_carbon_missing',
        component_key: row.componentKey,
        carbon_key: row.carbonKey,
        reason: 'carbon_key not found in ui_carbon_components migration inserts',
      });
    }
    if (!componentMapKeys.has(row.componentKey)) {
      failures.push({
        kind: 'registry_no_component_map',
        component_key: row.componentKey,
        reason: 'approved registry component_key missing from COMPONENT_MAP',
      });
    }
  }

  for (const ck of routeKeys) {
    if (!componentMapKeys.has(ck)) {
      failures.push({
        kind: 'active_route_no_component_map',
        component_key: ck,
        reason: 'active dynamic_ui_routes component_key missing from COMPONENT_MAP',
      });
    }
  }

  for (const wk of widgetKeys) {
    const resolved = widgetFallbackTarget(wk, widgetQuoted);
    if (!resolved) {
      failures.push({
        kind: 'widget_unresolved',
        widget_key: wk,
        reason: 'no WIDGET_KEY_MAP entry and no prefix/.cfg fallback (see resolveWidgetComponent)',
      });
    }
  }

  if (failures.length === 0) {
    console.log(
      `[carbon-dynamic-ui-coherence] OK — catalog ${carbonCatalog.size} carbon keys, ` +
        `${fullRegistry.filter(r => r.approval === 'approved').length} approved registry rows, ` +
        `${routeKeys.size} active route keys, ${widgetKeys.size} widget keys, ` +
        `COMPONENT_MAP ${componentMapKeys.size} entries`,
    );
    if (bareRegistry.size > 0) {
      console.log(
        `[carbon-dynamic-ui-coherence] note: ${bareRegistry.size} bare registry INSERT patterns detected (expect backfill migration)`,
      );
    }
    process.exit(0);
  }

  console.error(`[carbon-dynamic-ui-coherence] FAIL — ${failures.length} issue(s)\n`);
  for (const f of failures) console.error(JSON.stringify(f));
  process.exit(1);
}

main();
