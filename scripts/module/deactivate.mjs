#!/usr/bin/env node
// pnpm module:deactivate <code> --tenant=<id>
import { loadContract } from './lib/load-contract.mjs';
import { makePool, withPublisherTx } from './lib/db.mjs';

const code = process.argv[2];
const tenantArg = process.argv.find(a => a.startsWith('--tenant='));
const tenant = tenantArg?.split('=')[1];
if (!code || !tenant) { console.error('usage: module:deactivate <code> --tenant=<id>'); process.exit(2); }

const { contract } = loadContract(code);
if (contract.module.is_platform_dna) {
  console.error(`[module:deactivate] ${code} is platform-DNA — refused.`);
  process.exit(1);
}

const pool = makePool();
try {
  await withPublisherTx(pool, async client => {
    await client.query(
      `UPDATE dos.tenant_module_entitlements SET status='inactive'
        WHERE tenant_id=$1 AND module_code=$2`, [tenant, code]);
  });
  console.log(`[module:deactivate] ${code} → tenant ${tenant} = inactive`);
} finally { await pool.end(); }
