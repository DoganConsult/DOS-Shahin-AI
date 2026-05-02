#!/usr/bin/env node
/**
 * Apply the 10 source-orphaned migrations for tenant_f2a45bc25f31.
 * These files live in legacy uppercase "X Module/db/tenant/migrations/" paths
 * that the post-SQL-reorg runner doesn't scan. We apply them with the same
 * SET search_path + __TENANT_SCHEMA__ substitution semantics as the runner,
 * then write applied/failed rows to dos.tenant_migrations with the same
 * checksum format.
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const repoRoot = resolve(decodeURIComponent(new URL('../..', import.meta.url).pathname));
process.chdir(repoRoot);

const db = require(resolve(repoRoot, 'packages/dos-db/dist/index.js'));
const { safeQuery, getPool, closePool } = db;

const TENANT_ID = 'f2a45bc25f31';
const SCHEMA    = `tenant_${TENANT_ID}`;

const TARGETS = [
  ['module/ai',           'platform/ai/migrations/tenant/ai/111_ai_model_risk_management_enhancement.sql', '111_ai_model_risk_management_enhancement.sql'],
  ['module/incident',     'Incident Module/db/tenant/migrations/102_incident_governance_pipeline.sql',     '102_incident_governance_pipeline.sql'],
  ['module/incident',     'Incident Module/db/tenant/migrations/105_incident_advanced_tables.sql',         '105_incident_advanced_tables.sql'],
  ['module/incident',     'Incident Module/db/tenant/migrations/117_incident_case_breach_enterprise_v2.sql', '117_incident_case_breach_enterprise_v2.sql'],
  // 129_ai_rls_enablement — source not in repo; will be marked superseded below.
  ['module/risk',         'Risk Module/db/tenant/migrations/104_risk_team_ownership.sql',                   '104_risk_team_ownership.sql'],
  ['module/risk',         'Risk Module/db/tenant/migrations/109_risk_production_readiness.sql',             '109_risk_production_readiness.sql'],
  ['module/risk',         'Risk Module/db/tenant/migrations/112_ai_model_risk_register_link.sql',           '112_ai_model_risk_register_link.sql'],
  ['module/risk',         'Risk Module/db/tenant/migrations/121_risk_spec_field_alignment.sql',             '121_risk_spec_field_alignment.sql'],
  // module/workflow/022_reconcile_workflow_tables — EXCLUDED.
  // This file mutates dos.workflow_instances (platform scope) and was
  // misfiled as a tenant migration. All 5 added columns already exist
  // in dos.workflow_instances. Reclassified as 'superseded-misclassified'
  // by ops/scripts/superuser/3D_grant_pglogical_and_finalize.sql.
];

function checksumFor(s) { return createHash('sha256').update(s).digest('hex'); }

function substitute(sql, schema) {
  const quoted = `"${schema}"`;
  return sql.replace(/"__TENANT_SCHEMA__"/g, quoted).replace(/__TENANT_SCHEMA__/g, quoted);
}

async function recordResult(migrationId, source, filename, checksum, status, durationMs, errorMessage) {
  await safeQuery(
    `INSERT INTO dos.tenant_migrations
       (tenant_id, migration_id, source, filename, checksum, status, duration_ms, error_message, applied_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'orphan-rescue')
     ON CONFLICT (tenant_id, migration_id, checksum) DO UPDATE
       SET status = EXCLUDED.status,
           duration_ms = EXCLUDED.duration_ms,
           error_message = EXCLUDED.error_message,
           applied_at = NOW(),
           applied_by = EXCLUDED.applied_by`,
    [TENANT_ID, migrationId, source, filename, checksum, status, durationMs, errorMessage ?? null],
  );
}

async function main() {
  const pool = getPool();
  let applied = 0, failed = 0, skipped = 0;
  for (const [source, relpath, filename] of TARGETS) {
    const migrationId = `${source}/${filename.replace(/\.sql$/, '')}`;
    let raw;
    try {
      raw = readFileSync(resolve(repoRoot, relpath), 'utf-8');
    } catch (err) {
      console.error(`SKIP ${migrationId}: file not found at ${relpath}`);
      skipped++;
      continue;
    }
    const substituted = substitute(raw, SCHEMA);
    if (substituted.includes('__TENANT_SCHEMA__')) {
      console.error(`SKIP ${migrationId}: still contains placeholder after substitution`);
      skipped++;
      continue;
    }
    const checksum = checksumFor(substituted);

    const dup = await safeQuery(
      `SELECT 1 FROM dos.tenant_migrations
        WHERE tenant_id=$1 AND migration_id=$2 AND checksum=$3 AND status IN ('applied','verified-by-clone','verified-by-backfill')`,
      [TENANT_ID, migrationId, checksum],
    );
    if (dup.rows.length) {
      console.log(`SKIP ${migrationId}: already applied for this checksum`);
      skipped++;
      continue;
    }

    const t0 = Date.now();
    try {
      const execSql = `SET search_path TO "${SCHEMA}", public;\n${substituted}`;
      await safeQuery(execSql);
      const dur = Date.now() - t0;
      await recordResult(migrationId, source, filename, checksum, 'applied', dur);
      console.log(`APPLIED ${migrationId} (${dur}ms)`);
      applied++;
    } catch (err) {
      const dur = Date.now() - t0;
      const msg = err?.message ?? String(err);
      await recordResult(migrationId, source, filename, checksum, 'failed', dur, msg);
      console.error(`FAILED  ${migrationId}: ${msg.split('\n')[0]}`);
      failed++;
    }
  }
  console.log(`\nTOTALS: applied=${applied} failed=${failed} skipped=${skipped}`);
  await closePool();
}

main().catch(err => { console.error('FATAL', err); process.exit(1); });
