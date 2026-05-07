#!/usr/bin/env node
/**
 * Asserts that no migration outside the publisher path inserts into publisher-owned tables
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/module-contract-publisher-only.mjs [OPTIONS]

Catches manual SQL drift before it lands by checking publisher-owned table writes.

Options:
  --help, -h           Show this help message

Environment Variables:
  MODULE_CONTRACT_PUBLISHER_ONLY_ENFORCE  Set to 1 to enforce ban (default: shadow mode)

Protected tables (publisher-owned):
  - dos.workspace_shell_i18n
  - dos.workspace_shell_status_label

Allowlist:
  - 20260504_0030_module_contract_publisher_core.sql (bootstrap allowed)

Exit codes:
  Non-zero on publisher-owned table write violation (when enforced)

Examples:
  # Run in shadow mode (default)
  node scripts/ci-guards/module-contract-publisher-only.mjs

  # Run with enforcement
  MODULE_CONTRACT_PUBLISHER_ONLY_ENFORCE=1 node scripts/ci-guards/module-contract-publisher-only.mjs
`);
  process.exit(0);
}

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIG_DIR = join(REPO, 'platform/dos/migrations/public');
const enforce = process.env.MODULE_CONTRACT_PUBLISHER_ONLY_ENFORCE === '1';

// Tables the publisher owns at runtime.
const PROTECTED = [
  'dos.workspace_shell_i18n',
  'dos.workspace_shell_status_label',
];

// Allowlist: the publisher-core migration may CREATE/INSERT (bootstrap).
const ALLOWLIST = new Set([
  '20260504_0030_module_contract_publisher_core.sql',
]);

const failures = [];
for (const file of readdirSync(MIG_DIR)) {
  if (!file.endsWith('.sql')) continue;
  if (ALLOWLIST.has(file)) continue;
  const txt = readFileSync(join(MIG_DIR, file), 'utf8');
  for (const t of PROTECTED) {
    const re = new RegExp(`(?:INSERT\\s+INTO|UPDATE)\\s+${t.replace('.', '\\.')}\\b`, 'i');
    if (re.test(txt)) failures.push({ file, table: t });
  }
}

console.log(`[module-contract-publisher-only] failures=${failures.length}`);
for (const f of failures) console.error(`  ✗ ${f.file} writes to publisher-owned ${f.table}`);
if (failures.length && enforce) process.exit(1);
process.exit(0);
