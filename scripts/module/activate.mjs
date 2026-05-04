#!/usr/bin/env node
// pnpm module:activate <code> --tenant=<id>
// For platform-DNA modules (workspace-shell), activation is implicit — every
// tenant gets the bindings via publish. For non-platform modules this would
// also write dos.tenant_module_entitlements.
import { loadContract } from './lib/load-contract.mjs';
import { makePool, withPublisherTx } from './lib/db.mjs';

const code = process.argv[2];
const tenantArg = process.argv.find(a => a.startsWith('--tenant='));
const tenant = tenantArg?.split('=')[1];
if (!code || !tenant) { console.error('usage: module:activate <code> --tenant=<id>'); process.exit(2); }

let contract;
try {
  ({ contract } = loadContract(code));
} catch (error) {
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
}
if (contract.module.is_platform_dna) {
  console.log(`[module:activate] ${code} is platform-DNA — every tenant is implicitly active. No-op for tenant=${tenant}.`);
  process.exit(0);
}

const pool = makePool();
try {
  await withPublisherTx(pool, async client => {
    await client.query(
      `INSERT INTO dos.tenant_module_entitlements (tenant_id, module_code, status, granted_at)
       VALUES ($1, $2, 'active', now())
       ON CONFLICT (tenant_id, module_code) DO UPDATE SET status='active'`,
      [tenant, code]);
  });
  console.log(`[module:activate] ${code} → tenant ${tenant} = active`);
} finally { await pool.end(); }
