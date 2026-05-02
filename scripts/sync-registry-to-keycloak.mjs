#!/usr/bin/env node
/**
 * Outbox → Keycloak synchronizer.
 *
 * Polls `platform_dos.event_outbox` for events of interest and applies the
 * corresponding Keycloak mutation. Designed to be run under pm2/systemd as a
 * long-running process; also safe to invoke one-shot (--once).
 *
 * Event contract (minimum columns expected on event_outbox):
 *   - id            bigint / uuid primary key
 *   - event_type    text  — one of:
 *                       'registry.product.enabled'
 *                       'registry.product.disabled'
 *                       'registry.module.enabled'
 *                       'registry.tenant.enabled'
 *                       'registry.tenant.disabled'
 *                       'registry.entitlement.granted'
 *                       'registry.entitlement.revoked'
 *   - payload       jsonb — { productCode?, moduleCode?, tenantId?, ... }
 *   - processed_at  timestamptz nullable
 *   - attempts      int default 0
 *
 * If the outbox table does not yet exist, the script logs a warning and exits 0
 * so orchestration doesn't fail.
 *
 * Usage:
 *   node scripts/sync-registry-to-keycloak.mjs --once
 *   node scripts/sync-registry-to-keycloak.mjs --interval 5000
 */
import { Client } from 'pg';
import { spawn } from 'node:child_process';

function env(n, f) { const v = process.env[n]; return v && v.length > 0 ? v : f; }

function parseArgs(argv) {
  const out = { once: false, interval: 5000, batch: 50 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--once') out.once = true;
    else if (argv[i] === '--interval') out.interval = Number(argv[++i]);
    else if (argv[i] === '--batch') out.batch = Number(argv[++i]);
  }
  return out;
}

async function runScript(script, extraArgs) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [script, ...extraArgs], { stdio: 'inherit', env: process.env });
    p.on('exit', (code) => resolve(code ?? 1));
  });
}

async function handleEvent(ev) {
  const payload = ev.payload || {};
  switch (ev.event_type) {
    case 'registry.product.enabled':
      if (!payload.productCode) return { skipped: 'missing productCode' };
      return { code: await runScript('scripts/provision-keycloak-product.mjs', ['--product', payload.productCode]) };
    case 'registry.module.enabled':
      if (!payload.moduleCode) return { skipped: 'missing moduleCode' };
      return { code: await runScript('scripts/provision-keycloak-module-roles.mjs', ['--modules', payload.moduleCode]) };
    case 'registry.tenant.enabled':
    case 'registry.entitlement.granted':
      if (!payload.tenantId) return { skipped: 'missing tenantId' };
      return { code: await runScript('scripts/provision-keycloak-tenant.mjs', ['--tenant', payload.tenantId]) };
    case 'registry.product.disabled':
    case 'registry.tenant.disabled':
    case 'registry.entitlement.revoked':
      // Never delete Keycloak state from an event; log and continue. Deletion
      // MUST go through admin console with change ticket.
      return { skipped: 'soft-revoke handled at runtime' };
    default:
      return { skipped: `unhandled: ${ev.event_type}` };
  }
}

async function drain(pg, batch) {
  let claimed;
  try {
    claimed = await pg.query(
      `UPDATE platform_dos.event_outbox
          SET attempts = attempts + 1
        WHERE id IN (
          SELECT id FROM platform_dos.event_outbox
          WHERE processed_at IS NULL
            AND event_type LIKE 'registry.%'
          ORDER BY id
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        )
      RETURNING id, event_type, payload`,
      [batch],
    );
  } catch (e) {
    if (/relation .* does not exist/i.test(String(e.message))) {
      console.warn('[outbox] platform_dos.event_outbox not present — exiting cleanly.');
      return 'no-outbox';
    }
    throw e;
  }
  if (!claimed.rows.length) return 0;
  let ok = 0;
  for (const ev of claimed.rows) {
    try {
      const r = await handleEvent(ev);
      await pg.query(`UPDATE platform_dos.event_outbox SET processed_at = now() WHERE id = $1`, [ev.id]);
      console.log(JSON.stringify({ id: ev.id, event: ev.event_type, result: r }));
      ok++;
    } catch (e) {
      console.error(`[outbox] failed id=${ev.id} type=${ev.event_type}: ${e.message}`);
    }
  }
  return ok;
}

async function main() {
  const args = parseArgs(process.argv);
  const dbUrl = env('DATABASE_URL');
  if (!dbUrl) { console.error('DATABASE_URL required'); process.exit(2); }
  const pg = new Client({ connectionString: dbUrl });
  await pg.connect();
  try {
    if (args.once) {
      const n = await drain(pg, args.batch);
      console.log(JSON.stringify({ drained: n }));
      return;
    }
    let stopping = false;
    process.on('SIGTERM', () => { stopping = true; });
    process.on('SIGINT', () => { stopping = true; });
    while (!stopping) {
      const n = await drain(pg, args.batch);
      if (n === 'no-outbox') break;
      if (n === 0) await new Promise((r) => setTimeout(r, args.interval));
    }
  } finally {
    await pg.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
