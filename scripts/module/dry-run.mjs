#!/usr/bin/env node
// pnpm module:dry-run <code> — emit SQL without executing.
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadContract, validateContract } from './lib/load-contract.mjs';
import { crossRefAgainstDb } from './lib/cross-ref.mjs';
import { emit, emitSqlBundleText } from './lib/sql-emitter.mjs';
import { makePool } from './lib/db.mjs';

const code = process.argv[2];
if (!code) { console.error('usage: module:dry-run <code>'); process.exit(2); }

let contract;
try {
  ({ contract } = loadContract(code));
} catch (error) {
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
}
const sv = validateContract(contract);
const blockers = sv.errors.filter(e => e.severity === 'BLOCKER');
if (blockers.length) {
  console.error(`[module:dry-run] schema blockers — abort`);
  for (const e of blockers) console.error(`  ✗ ${e.error_type} ${e.error_path}: ${e.message}`);
  process.exit(1);
}

const pool = makePool();
try {
  const client = await pool.connect();
  let tenantIds = null;
  try {
    const xref = await crossRefAgainstDb(client, contract);
    const xb = xref.filter(e => e.severity === 'BLOCKER');
    if (xb.length) {
      console.error(`[module:dry-run] cross-ref blockers — abort`);
      for (const e of xb) console.error(`  ✗ ${e.error_type} ${e.error_path}: ${e.message}`);
      process.exit(1);
    }
    if ((contract.seeds || []).some(s => s.scope === 'per_tenant')) {
      const r = await client.query(`SELECT tenant_id FROM dos.tenants ORDER BY tenant_id`);
      tenantIds = r.rows.map(x => x.tenant_id);
    }
  } finally { client.release(); }

  const out = emit(contract, { tenantIds });
  const path = join(tmpdir(), `module-dry-run-${code}.sql`);
  writeFileSync(path, emitSqlBundleText(out));
  console.log(`[module:dry-run] ${code} — statements=${out.statements.length}`);
  console.log(`  rows by table:`);
  for (const [t, n] of Object.entries(out.rowsByTable)) {
    console.log(`    ${t.padEnd(48)} ${n}`);
  }
  if (tenantIds) console.log(`  tenants targeted: ${tenantIds.length}`);
  console.log(`  SQL plan written: ${path}`);
} finally { await pool.end(); }
