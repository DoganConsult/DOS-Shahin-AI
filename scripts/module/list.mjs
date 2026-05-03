#!/usr/bin/env node
// pnpm module:list — show every contract in module_complete_direct_seed_pack
// and its publish state from dos.module_contract_publish_log.
import { listModules, loadContract } from './lib/load-contract.mjs';
import { makePool } from './lib/db.mjs';

const codes = listModules();
const pool = makePool();
try {
  const client = await pool.connect();
  try {
    console.log(`module                          version    last_published          rows`);
    console.log(`──────────────────────────────  ─────────  ──────────────────────  ────`);
    for (const code of codes) {
      let v = '?';
      try { v = loadContract(code).contract.module.version; } catch {}
      const r = await client.query(
        `SELECT contract_version, applied_at, rows_emitted FROM dos.module_contract_publish_log
          WHERE module_code=$1 ORDER BY applied_at DESC LIMIT 1`, [code]);
      const last = r.rows[0];
      const stamp = last ? last.applied_at.toISOString().slice(0,19).replace('T',' ') : '— never —';
      const rowSum = last ? Object.values(last.rows_emitted).reduce((a,b)=>a+b,0) : 0;
      console.log(`${code.padEnd(30)}  ${v.padEnd(9)}  ${stamp.padEnd(22)}  ${rowSum}`);
    }
  } finally { client.release(); }
} finally { await pool.end(); }
