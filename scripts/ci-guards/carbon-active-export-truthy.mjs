#!/usr/bin/env node
/**
 * carbon-active-export-truthy.mjs — Catalog truthfulness guard.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/carbon-active-export-truthy.mjs [OPTIONS]

Verifies dos.ui_carbon_components catalog truthfulness against carbon-components-angular exports.

Options:
  --help, -h           Show this help message

Contract:
  For every row with runtime_status='active' AND integration_mode='native-angular':
  - Row MUST carry source_component_name = '<RealClassName>'
  - Class MUST be exported by carbon-components-angular

  For runtime_status='wrapper-required':
  - Row MAY carry source_component_name = NULL (semantic alias)

  For integration_mode='react-only-reference':
  - Row MUST be runtime_status='wrapper-required'

Exit codes:
  Non-zero on any contract failure

Examples:
  # Run carbon active export truthy check
  node scripts/ci-guards/carbon-active-export-truthy.mjs
`);
  process.exit(0);
}

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG_DIR = join(repoRoot, 'platform/dos/migrations/public');
const CCA_DIR = join(repoRoot, 'node_modules/carbon-components-angular');

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (name.endsWith('.d.ts')) yield p;
  }
}

function loadCarbonExports() {
  if (!existsSync(CCA_DIR)) {
    console.error('[carbon-active-export-truthy] carbon-components-angular not installed at', CCA_DIR);
    process.exit(2);
  }
  const exports = new Set();
  for (const f of walk(CCA_DIR)) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/^export declare class\s+([A-Za-z0-9_]+)/gm)) {
      exports.add(m[1]);
    }
  }
  return exports;
}

/**
 * Parse one INSERT block of dos.ui_carbon_components VALUES into row objects
 * keyed by carbon_key. We rely on the canonical column order used by every
 * platform/dos/migrations/public/*.sql:
 *   (carbon_key, package_name, package_version, category, vendor,
 *    integration_mode, runtime_status, angular_native, wrapper_required,
 *    stability, dynamic_ui_allowed, source_component_name, notes)
 */
function parseCatalogRows(sql) {
  const rows = [];
  // Match the canonical 13-tuple. NULL allowed in source_component_name.
  const re = /\(\s*'([a-z0-9_.-]+)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'([a-z]+)'\s*,\s*'ibm-carbon'\s*,\s*'([a-z-]+)'\s*,\s*'([a-z-]+)'\s*,\s*(true|false)\s*,\s*(true|false)\s*,\s*'[a-z]+'\s*,\s*(true|false)\s*,\s*(NULL|'([^']*)')/gi;
  for (const m of sql.matchAll(re)) {
    rows.push({
      carbon_key: m[1],
      category: m[2],
      integration_mode: m[3],
      runtime_status: m[4],
      angular_native: m[5] === 'true',
      wrapper_required: m[6] === 'true',
      dynamic_ui_allowed: m[7] === 'true',
      source_component_name: m[8] === 'NULL' ? null : m[9],
    });
  }
  return rows;
}

function loadAllCatalogInserts() {
  const out = new Map();
  const files = readdirSync(MIG_DIR).filter((f) => f.endsWith('.sql') && !f.endsWith('_down.sql')).sort();
  for (const f of files) {
    const sql = readFileSync(join(MIG_DIR, f), 'utf8');
    if (!/INSERT INTO dos\.ui_carbon_components/i.test(sql)) continue;
    for (const row of parseCatalogRows(sql)) {
      out.set(row.carbon_key, { ...row, _file: f });
    }
  }
  return out;
}

function main() {
  const carbonExports = loadCarbonExports();
  const rows = loadAllCatalogInserts();
  const failures = [];
  let activeChecked = 0;
  let wrapperChecked = 0;

  for (const [key, row] of rows) {
    // Rule 1: react-only-reference must be wrapper-required.
    if (row.integration_mode === 'react-only-reference' && row.runtime_status !== 'wrapper-required') {
      failures.push(`[${row._file}] ${key}: integration_mode=react-only-reference requires runtime_status=wrapper-required (got ${row.runtime_status})`);
      continue;
    }

    if (row.runtime_status === 'active' && row.integration_mode === 'native-angular') {
      activeChecked++;
      if (!row.source_component_name) {
        failures.push(`[${row._file}] ${key}: active+native-angular row must declare source_component_name`);
        continue;
      }
      if (!carbonExports.has(row.source_component_name)) {
        failures.push(`[${row._file}] ${key}: source_component_name='${row.source_component_name}' not exported by carbon-components-angular`);
      }
      continue;
    }

    if (row.runtime_status === 'wrapper-required') {
      wrapperChecked++;
      // Wrapper rows MAY carry source_component_name (alias) or NULL (semantic).
      // No carbon export check — a @dos/ui-system wrapper owns the alias.
      continue;
    }
  }

  console.log(`[carbon-active-export-truthy] catalog rows scanned=${rows.size} active-checked=${activeChecked} wrapper-checked=${wrapperChecked} failures=${failures.length}`);
  if (failures.length) {
    for (const m of failures) console.error('  ✗ ' + m);
    process.exit(1);
  }
  console.log('[carbon-active-export-truthy] PASS — every active native-angular row maps to a real carbon-components-angular export.');
}

main();
