#!/usr/bin/env node
/**
 * carbon-dynamic-ui-coherence.mjs — Dynamic-UI / IBM Carbon contract gate
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/carbon-dynamic-ui-coherence.mjs [OPTIONS]

Verifies Dynamic-UI / IBM Carbon contract coherence.

Options:
  --help, -h           Show this help message

Behavior:
  1. Parses dos.ui_carbon_components INSERTs under platform/dos/migrations/public
  2. Parses dos.dynamic_ui_component_registry (full + legacy bare rows)
  3. Parses dos.dynamic_ui_routes for component_key
  4. Parses dos.dynamic_ui_widgets for widget keys
  5. Verifies vendor='ibm-carbon' for registry rows
  6. Verifies carbon_key references resolve to catalog
  7. Verifies component_key exists in COMPONENT_MAP
  8. Verifies widget keys resolve via resolveWidgetComponent rules

Exit codes:
  Non-zero on any contract violation

Examples:
  # Run carbon dynamic UI coherence check
  node scripts/ci-guards/carbon-dynamic-ui-coherence.mjs
`);
  process.exit(0);
}

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG_DIR = join(repoRoot, 'platform/dos/migrations/public');
const COMPONENT_MAP_FILE = join(repoRoot, 'platform/dos/registry/component-map.ts');
const WIDGET_MAP_FILE = join(
  repoRoot,
  'platform/config-center/shared/dynamic-ui/registry/widget-key-map.ts',
);

const ACTIVE = new Set(['active']);

/**
 * Remove top-level `DO $dq$ ... $dq$` blocks only (PostgreSQL anonymous blocks).
 * Blocks inside dollar-quoted function bodies (CREATE FUNCTION ... AS $$ ... $$)
 * are preserved — dollar-quote nesting is tracked so inner $$ does not close the outer body incorrectly.
 * This avoids CI false positives from deliberate negative-path INSERTs in smoke DO blocks.
 * @param {string} sql
 */
function stripTopLevelDoDollarBlocks(sql) {
  const parts = [];
  let i = 0;
  /** @type {string[]} */
  const dollarStack = [];

  /** @param {number} pos */
  function parseDollarDelimiter(pos) {
    if (sql[pos] !== '$') return null;
    if (sql[pos + 1] === '$') return '$$';
    const endTag = sql.indexOf('$', pos + 1);
    if (endTag === -1) return null;
    return sql.slice(pos, endTag + 1);
  }

  /** @param {number} pos */
  function skipString(pos) {
    let j = pos + 1;
    while (j < sql.length) {
      if (sql[j] === "'" && sql[j + 1] === "'") {
        j += 2;
        continue;
      }
      if (sql[j] === "'") return j + 1;
      j++;
    }
    return sql.length;
  }

  while (i < sql.length) {
    if (sql.slice(i, i + 2) === '--') {
      const nl = sql.indexOf('\n', i);
      const end = nl === -1 ? sql.length : nl + 1;
      parts.push(sql.slice(i, end));
      i = end;
      continue;
    }
    if (sql.slice(i, i + 2) === '/*') {
      const end = sql.indexOf('*/', i + 2);
      if (end === -1) {
        parts.push(sql.slice(i));
        break;
      }
      parts.push(sql.slice(i, end + 2));
      i = end + 2;
      continue;
    }

    if (sql[i] === "'") {
      const end = skipString(i);
      parts.push(sql.slice(i, end));
      i = end;
      continue;
    }

    const delim = parseDollarDelimiter(i);
    if (delim) {
      if (dollarStack.length && dollarStack[dollarStack.length - 1] === delim) {
        dollarStack.pop();
      } else {
        dollarStack.push(delim);
      }
      parts.push(delim);
      i += delim.length;
      continue;
    }

    if (dollarStack.length === 0) {
      const rest = sql.slice(i);
      const m = rest.match(/^\bDO\s+/i);
      if (m) {
        let pos = i + m[0].length;
        const openDelim = parseDollarDelimiter(pos);
        if (openDelim) {
          pos += openDelim.length;
          const closeIdx = sql.indexOf(openDelim, pos);
          if (closeIdx !== -1) {
            let end = closeIdx + openDelim.length;
            while (end < sql.length && /\s/.test(sql[end])) end++;
            if (sql[end] === ';') end++;
            parts.push('\n');
            i = end;
            continue;
          }
        }
      }
    }

    parts.push(sql[i]);
    i++;
  }

  return parts.join('');
}

/** @param {string} expr */
function parseSqlStringLiteral(expr) {
  if (!expr) return undefined;
  const t = expr.trim();
  const m = t.match(/^'((?:''|[^'])*)'(?:\s*::\s*[a-zA-Z_][a-zA-Z0-9_]*)?$/);
  if (!m) return undefined;
  return m[1].replace(/''/g, "'");
}

/** @param {string} inner no outer parens */
function splitTopLevelCommas(inner) {
  const parts = [];
  let depth = 0;
  let start = 0;
  let inStr = false;
  for (let i = 0; i <= inner.length; i++) {
    const c = inner[i];
    if (i === inner.length || (depth === 0 && !inStr && c === ',')) {
      parts.push(inner.slice(start, i).trim());
      start = i + 1;
      continue;
    }
    if (i === inner.length) break;
    if (inStr) {
      if (c === "'" && inner[i + 1] === "'") {
        i++;
        continue;
      }
      if (c === "'") inStr = false;
      continue;
    }
    if (c === "'") {
      inStr = true;
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') depth--;
  }
  return parts;
}

/** @param {string} inner VALUES payload: `(row1), (row2)` */
function splitTopLevelTuples(inner) {
  const s = inner.trim();
  const tuples = [];
  let i = 0;
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    if (s[i] !== '(') return [];
    let depth = 0;
    const start = i;
    for (; i < s.length; i++) {
      const c = s[i];
      if (c === "'" && s[i + 1] === "'") {
        i++;
        continue;
      }
      if (c === '(') depth++;
      else if (c === ')') {
        depth--;
        if (depth === 0) {
          tuples.push(s.slice(start + 1, i));
          i++;
          break;
        }
      }
    }
    while (i < s.length && /^[\s,]/.test(s[i])) i++;
  }
  return tuples;
}

/**
 * @param {string} block
 * @param {string} tableSuffix e.g. 'dynamic_ui_component_registry'
 */
function sliceAfterDosInsertColumnList(block, tableSuffix) {
  const re = new RegExp(`INSERT\\s+INTO\\s+dos\\.${tableSuffix}\\s*\\(`, 'i');
  const m = re.exec(block);
  if (!m) return null;
  let i = m.index + m[0].length;
  let depth = 1;
  while (i < block.length && depth > 0) {
    const c = block[i];
    if (c === "'") {
      i++;
      while (i < block.length) {
        if (block[i] === "'" && block[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (block[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') depth--;
    i++;
  }
  return block.slice(i);
}

/** @param {string} block */
function sliceAfterRegistryColumnList(block) {
  return sliceAfterDosInsertColumnList(block, 'dynamic_ui_component_registry');
}

/**
 * @param {string} block
 * @param {string} tableSuffix
 */
function parseDosInsertColumns(block, tableSuffix) {
  const re = new RegExp(`INSERT\\s+INTO\\s+dos\\.${tableSuffix}\\s*\\(`, 'i');
  const m = re.exec(block);
  if (!m) return null;
  let i = m.index + m[0].length;
  let depth = 1;
  const start = i;
  while (i < block.length && depth > 0) {
    const c = block[i];
    if (c === "'") {
      i++;
      while (i < block.length) {
        if (block[i] === "'" && block[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (block[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) {
        const inner = block.slice(start, i);
        return splitTopLevelCommas(inner).map(c =>
          c.trim().replace(/^"+|"+$/g, '').replace(/^`+|`+$/g, ''),
        );
      }
    }
    i++;
  }
  return null;
}

/** @param {string} block */
function parseRegistryInsertColumns(block) {
  return parseDosInsertColumns(block, 'dynamic_ui_component_registry');
}

/** @param {string} rest after column list closing `)` */
function extractValuesInner(rest) {
  const t = rest.trimStart();
  if (!/^VALUES\s+/i.test(t)) return null;
  const after = t.replace(/^VALUES\s+/i, '');
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < after.length; i++) {
    const c = after[i];
    if (inStr) {
      if (c === "'" && after[i + 1] === "'") {
        i++;
        continue;
      }
      if (c === "'") inStr = false;
      continue;
    }
    if (c === "'") {
      inStr = true;
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && /^\s*ON\s+CONFLICT\b/i.test(after.slice(i))) {
      return after.slice(0, i).trim();
    }
  }
  return after.trim();
}

/** @param {string} rest after column list closing `)` */
function extractSelectListRaw(rest) {
  const t = rest.trimStart();
  if (!/^SELECT\s+/i.test(t)) return null;
  const afterSelect = t.replace(/^SELECT\s+/i, '');
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < afterSelect.length; i++) {
    const c = afterSelect[i];
    if (inStr) {
      if (c === "'" && afterSelect[i + 1] === "'") {
        i++;
        continue;
      }
      if (c === "'") inStr = false;
      continue;
    }
    if (c === "'") {
      inStr = true;
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && /^\s+FROM\b/i.test(afterSelect.slice(i))) {
      return afterSelect.slice(0, i).trim();
    }
  }
  return null;
}

/**
 * Fail-closed on string literal vendor values only (dynamic expressions skipped).
 * Applies to dos.dynamic_ui_component_registry and dos.ui_carbon_components when INSERT lists vendor.
 * @param {string} fileLabel
 * @param {string} sqlAlreadyDoStripped
 * @param {'dynamic_ui_component_registry'|'ui_carbon_components'} tableSuffix
 * @param {object[]} failures
 */
function auditDosInsertVendorLiterals(fileLabel, sqlAlreadyDoStripped, tableSuffix, failures) {
  const blocks = extractInsertBlocks(sqlAlreadyDoStripped, tableSuffix);
  const kind =
    tableSuffix === 'dynamic_ui_component_registry'
      ? 'registry_vendor_not_ibm_carbon'
      : 'carbon_catalog_vendor_not_ibm_carbon';
  const tableLabel =
    tableSuffix === 'dynamic_ui_component_registry'
      ? 'dynamic_ui_component_registry'
      : 'ui_carbon_components';

  for (const block of blocks) {
    const cols = parseDosInsertColumns(block, tableSuffix);
    if (!cols?.length) continue;
    const vendorIdx = cols.findIndex(c => c.replace(/"/g, '') === 'vendor');
    if (vendorIdx === -1) continue;

    const tail = sliceAfterDosInsertColumnList(block, tableSuffix);
    if (!tail) continue;
    const trimmed = tail.trimStart();

    const valuesInner = extractValuesInner(trimmed);
    if (valuesInner !== null) {
      const tuples = splitTopLevelTuples(valuesInner);
      for (const tuple of tuples) {
        const cells = splitTopLevelCommas(tuple);
        const expr = cells[vendorIdx];
        const lit = parseSqlStringLiteral(expr);
        if (lit !== undefined && lit !== 'ibm-carbon') {
          failures.push({
            kind,
            file: fileLabel,
            vendor_literal: lit,
            reason: `${tableLabel} migration vendor column must be exactly ibm-carbon (non-DO INSERT)`,
          });
        }
      }
      continue;
    }

    const selectList = extractSelectListRaw(trimmed);
    if (selectList !== null) {
      const cells = splitTopLevelCommas(selectList);
      const expr = cells[vendorIdx];
      const lit = parseSqlStringLiteral(expr);
      if (lit !== undefined && lit !== 'ibm-carbon') {
        failures.push({
          kind,
          file: fileLabel,
          vendor_literal: lit,
          reason: `${tableLabel} migration vendor column must be exactly ibm-carbon (INSERT … SELECT)`,
        });
      }
    }
  }
}

/** @param {string} fileLabel @param {string} sqlAlreadyDoStripped @param {object[]} failures */
function auditRegistryVendorLiterals(fileLabel, sqlAlreadyDoStripped, failures) {
  auditDosInsertVendorLiterals(fileLabel, sqlAlreadyDoStripped, 'dynamic_ui_component_registry', failures);
}

/** @param {string} fileLabel @param {string} sqlAlreadyDoStripped @param {object[]} failures */
function auditCarbonCatalogVendorLiterals(fileLabel, sqlAlreadyDoStripped, failures) {
  auditDosInsertVendorLiterals(fileLabel, sqlAlreadyDoStripped, 'ui_carbon_components', failures);
}

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
    // COMPONENT_MAP is composed via spread of REGISTRY_COMPONENT_MAP +
    // CARBON_PRIMITIVE_COMPONENT_MAP. Pull the registry keys directly so
    // the gate sees the full effective keyset.
    for (const k of parseTsRecordKeysFromText(text, 'REGISTRY_COMPONENT_MAP')) keys.add(k);
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
  const failures = [];

  const files = readdirSync(MIG_DIR).filter(f => f.endsWith('.sql') && !f.includes('_down'));

  for (const f of files) {
    const whole = readFileSync(join(MIG_DIR, f), 'utf8');
    const stripped = stripTopLevelDoDollarBlocks(whole);
    const fileLabel = relative(repoRoot, join(MIG_DIR, f));
    auditRegistryVendorLiterals(fileLabel, stripped, failures);
    auditCarbonCatalogVendorLiterals(fileLabel, stripped, failures);

    for (const block of extractInsertBlocks(stripped, 'ui_carbon_components')) {
      for (const k of parseCarbonCatalogKeys(block)) carbonCatalog.add(k);
    }
    fullRegistry.push(...parseFullRegistryRows(stripped));
    for (const k of parseBareRegistryKeys(stripped)) bareRegistry.add(k);

    for (const block of extractInsertBlocks(stripped, 'dynamic_ui_routes')) {
      for (const k of parseRouteComponentKeys(block)) routeKeys.add(k);
    }
    for (const block of extractInsertBlocks(stripped, 'dynamic_ui_widgets')) {
      for (const k of parseWidgetKeys(block)) widgetKeys.add(k);
    }
  }

  const componentMapText = readFileSync(COMPONENT_MAP_FILE, 'utf8');
  const componentMapKeys = mergeComponentMapKeySet(componentMapText, 'COMPONENT_MAP');
  const widgetQuoted = collectWidgetMapKeys(readFileSync(WIDGET_MAP_FILE, 'utf8'));

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
