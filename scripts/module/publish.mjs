#!/usr/bin/env node
// pnpm module:publish <code> — apply contract atomically with publisher session.
import { createHash } from 'node:crypto';
import { loadContract, validateContract } from './lib/load-contract.mjs';
import { crossRefAgainstDb } from './lib/cross-ref.mjs';
import { emit, emitSqlBundleText } from './lib/sql-emitter.mjs';
import { makePool, withPublisherTx } from './lib/db.mjs';

const code = process.argv[2];
if (!code) { console.error('usage: module:publish <code>'); process.exit(2); }

const { contract, raw, sha256 } = loadContract(code);
const sv = validateContract(contract);
const blockers = sv.errors.filter(e => e.severity === 'BLOCKER');
if (blockers.length) {
  console.error('[module:publish] schema blockers — abort');
  for (const e of blockers) console.error(`  ✗ ${e.error_type} ${e.error_path}: ${e.message}`);
  process.exit(1);
}

const pool = makePool();
try {
  // pre-flight cross-ref
  let tenantIds = null;
  {
    const client = await pool.connect();
    try {
      const xref = await crossRefAgainstDb(client, contract);
      const xb = xref.filter(e => e.severity === 'BLOCKER');
      if (xb.length) {
        for (const e of xb) {
          await client.query(
            `INSERT INTO dos.module_contract_errors
               (module_code, contract_version, phase, error_type,
                error_path, message, severity)
             VALUES ($1,$2,'publish',$3,$4,$5,$6)`,
            [code, contract.module.version, e.error_type, e.error_path, e.message, e.severity]);
        }
        console.error('[module:publish] cross-ref BLOCKERS recorded — abort');
        process.exit(1);
      }
      const r = await client.query(`SELECT tenant_id FROM dos.tenants ORDER BY tenant_id`);
      tenantIds = r.rows.map(x => x.tenant_id);
    } finally { client.release(); }
  }

  const out = emit(contract, { tenantIds });
  const sqlText = emitSqlBundleText(out);
  const sqlSha = createHash('sha256').update(sqlText).digest('hex');

  await withPublisherTx(pool, async client => {
    for (const s of out.statements) {
      try {
        await client.query(s.sql, s.params);
      } catch (e) {
        throw new Error(`publish failed at ${s.name}: ${e.message}`);
      }
    }
    await client.query(
      `INSERT INTO dos.module_contract_publish_log
         (module_code, contract_version, schema_version,
          contract_sha256, sql_sha256, rows_emitted, summary)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [code, contract.module.version, contract.schemaVersion ?? 1,
       sha256, sqlSha, JSON.stringify(out.rowsByTable),
       `${out.statements.length} stmts; ${tenantIds?.length ?? 0} tenants`]);
  });

  console.log(`[module:publish] ${code} v${contract.module.version} — APPLIED`);
  console.log(`  statements    : ${out.statements.length}`);
  console.log(`  contract_sha  : ${sha256.slice(0,16)}…`);
  console.log(`  sql_sha       : ${sqlSha.slice(0,16)}…`);
  for (const [t, n] of Object.entries(out.rowsByTable)) {
    console.log(`  rows ${t.padEnd(48)} ${n}`);
  }
} finally { await pool.end(); }
