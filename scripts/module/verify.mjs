#!/usr/bin/env node
// pnpm module:verify <code> — post-apply DB checks.
import { loadContract } from './lib/load-contract.mjs';
import { makePool } from './lib/db.mjs';

const code = process.argv[2];
if (!code) { console.error('usage: module:verify <code>'); process.exit(2); }

let contract;
try {
  ({ contract } = loadContract(code));
} catch (error) {
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
}
const pool = makePool();
const failures = [];

try {
  const client = await pool.connect();
  try {
    for (const c of contract.components ?? []) {
      const r = await client.query(
        `SELECT 1 FROM dos.dynamic_ui_component_registry
          WHERE component_key = $1 AND vendor='ibm-carbon' AND approval_status='approved'`,
        [c.component_key]);
      if (r.rowCount === 0) failures.push(`component ${c.component_key} not registered/approved`);
    }
    for (const p of contract.permissions ?? []) {
      const r = await client.query(
        `SELECT 1 FROM platform_dauth.permissions WHERE permission_code=$1`, [p.code]);
      if (r.rowCount === 0) failures.push(`permission ${p.code} not present`);
    }
    if (code === 'workspace-shell') {
      const enKeys = Object.keys(contract.i18n?.en ?? {});
      const r = await client.query(
        `SELECT count(*)::int AS n FROM dos.workspace_shell_i18n WHERE locale='en'`);
      if (r.rows[0].n < enKeys.length)
        failures.push(`workspace_shell_i18n EN row count ${r.rows[0].n} < contract ${enKeys.length}`);
      const r2 = await client.query(
        `SELECT count(*)::int AS n FROM dos.workspace_shell_binding
          WHERE component_key LIKE 'workspace.%' AND props <> '{}'::jsonb`);
      if (r2.rows[0].n === 0) failures.push(`workspace_shell_binding has no non-empty props rows`);
    }
    const r3 = await client.query(
      `SELECT contract_version, applied_at FROM dos.module_contract_publish_log
        WHERE module_code=$1 ORDER BY applied_at DESC LIMIT 1`, [code]);
    if (r3.rowCount === 0) failures.push(`no publish_log entry for ${code}`);
    else console.log(`  last publish: v${r3.rows[0].contract_version} at ${r3.rows[0].applied_at.toISOString()}`);
  } finally { client.release(); }
} finally { await pool.end(); }

console.log(`[module:verify] ${code} — failures=${failures.length}`);
for (const f of failures) console.error(`  ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
