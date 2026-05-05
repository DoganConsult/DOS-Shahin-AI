#!/usr/bin/env node
/**
 * Wave F5 — Audit Shelf bundle builder
 *
 * Produces a deterministic regulator-handover bundle for a tenant and
 * appends a row to dos.audit_signoff_ledger.
 *
 * Usage:
 *   node modules/audit-shelf/scripts/audit-shelf-bundle.mjs <tenant_id> [--actor=<email>]
 *
 * Output:
 *   ops/handover/<date>/audit-shelf/<tenant_id>/bundle.json
 *   ops/handover/<date>/audit-shelf/<tenant_id>/bundle.sha256
 *
 * Exit: 0 ok / 2 error
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import pg from 'pg';
const { Pool } = pg;

const ROOT  = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DATABASE_URL = process.env.DATABASE_URL
  || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';

const tenantId = process.argv[2];
if (!tenantId) {
  console.error('Usage: audit-shelf-bundle.mjs <tenant_id>');
  process.exit(2);
}
const actor = (process.argv.find(a => a.startsWith('--actor=')) || '--actor=cli@dos.local').split('=')[1];

const today = new Date().toISOString().slice(0,10);
const outDir = join(ROOT, 'ops', 'handover', today, 'audit-shelf', tenantId);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const pool = new Pool({ connectionString: DATABASE_URL });

async function fetchAll() {
  const sections = {};
  const counts = {};

  async function q(key, sql, params=[]) {
    try {
      const r = await pool.query(sql, params);
      sections[key] = r.rows;
      counts[key]   = r.rowCount;
    } catch (e) {
      sections[key] = { error: e.message };
      counts[key]   = -1;
    }
  }

  await q('role_profile_sync_ledger',
    `SELECT id, occurred_at, acceptor_id, direction, profile_id, tenant_id, user_id, role_code, outcome
       FROM dos.role_profile_sync_log
      WHERE tenant_id = $1
      ORDER BY occurred_at DESC LIMIT 5000`, [tenantId]);

  await q('ura_projection_state',
    `SELECT assignment_id, tenant_id, user_id, role_code, scope, granted_by, granted_at, is_active
       FROM platform_dauth.user_role_assignments
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY user_id, role_code`, [tenantId]);

  await q('drift_telemetry_window',
    `SELECT id, sampled_at, metric_key, value_num, severity
       FROM dos.platform_drift_log
      WHERE sampled_at >= now() - interval '30 days'
      ORDER BY sampled_at DESC LIMIT 10000`);

  await q('tenant_migration_ledger',
    `SELECT * FROM dos.tenant_migrations WHERE tenant_id = $1
      ORDER BY applied_at DESC NULLS LAST LIMIT 1000`, [tenantId]);

  await q('audit_signoff_ledger',
    `SELECT bundle_id, generated_at, generated_by, bundle_hash, signed_by, signed_at
       FROM dos.audit_signoff_ledger
      WHERE tenant_id = $1
      ORDER BY generated_at DESC LIMIT 100`, [tenantId]);

  return { sections, counts };
}

async function main() {
  const generated_at = new Date().toISOString();
  const { sections, counts } = await fetchAll();

  const payload = {
    contractKey: 'module.audit-shelf.bundle',
    version:     '1.0.0',
    tenant_id:   tenantId,
    generated_at,
    generated_by: actor,
    sections,
  };

  const json = JSON.stringify(payload, null, 2);
  const hash = createHash('sha256').update(json).digest('hex');

  const bundlePath = join(outDir, 'bundle.json');
  writeFileSync(bundlePath, json + '\n');
  writeFileSync(join(outDir, 'bundle.sha256'), `${hash}  bundle.json\n`);

  // Append to ledger
  await pool.query(
    `INSERT INTO dos.audit_signoff_ledger
       (tenant_id, generated_at, generated_by, bundle_hash, bundle_path, section_counts)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [tenantId, generated_at, actor, hash,
     bundlePath.replace(ROOT+'/',''), JSON.stringify(counts)]);

  console.log(`[audit-shelf] tenant=${tenantId}`);
  for (const [k,v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  console.log(`[audit-shelf] bundle → ${bundlePath.replace(ROOT+'/','')}`);
  console.log(`[audit-shelf] sha256  ${hash}`);

  await pool.end();
}

main().catch(e => { console.error('[audit-shelf] error:', e.message); process.exit(2); });
