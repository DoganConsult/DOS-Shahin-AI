#!/usr/bin/env node
// pnpm module:validate <code> — schema + cross-ref validation.
import { loadContract, validateContract, listModules } from './lib/load-contract.mjs';
import { crossRefAgainstDb } from './lib/cross-ref.mjs';
import { makePool } from './lib/db.mjs';

const code = process.argv[2];
if (!code) {
  console.error(`usage: module:validate <code>\n  available: ${listModules().join(', ')}`);
  process.exit(2);
}

let contract;
try {
  ({ contract } = loadContract(code));
} catch (error) {
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
}
const sv = validateContract(contract);
const errors = [...sv.errors];

if (sv.ok || sv.errors.every(e => e.severity !== 'BLOCKER')) {
  const pool = makePool();
  try {
    const client = await pool.connect();
    try { errors.push(...await crossRefAgainstDb(client, contract)); }
    finally { client.release(); }
  } finally { await pool.end(); }
}

const blockers = errors.filter(e => e.severity === 'BLOCKER');
const warnings = errors.filter(e => e.severity === 'WARNING');
console.log(`[module:validate] ${code} — blockers=${blockers.length} warnings=${warnings.length}`);
for (const e of blockers) console.error(`  ✗ BLOCKER ${e.error_type} @ ${e.error_path}: ${e.message}`);
for (const e of warnings) console.warn(`  ⚠ WARNING ${e.error_type} @ ${e.error_path}: ${e.message}`);
process.exit(blockers.length ? 1 : 0);
