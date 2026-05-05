#!/usr/bin/env node
/**
 * Phase 6 — Runtime Drift Telemetry Sampler
 *
 * Samples gap-relevant counts from the live DB and appends one row per
 * metric_key into `dos.platform_drift_log`. Designed to run hourly as a
 * cron job alongside the nightly `audit:full` workflow:
 *
 *   - audit:full = boolean PASS/FAIL gate (CI guards)
 *   - drift-telemetry-sample = continuous time-series of the same predicates,
 *     with severity escalation when a guard would have failed.
 *
 * Severity rules:
 *   info     → metric within doctrine bound
 *   warn     → metric drifting but not yet a guard trip
 *   critical → CI-guard equivalent predicate would FAIL right now (page)
 *
 * Exit codes:
 *   0  — all metrics sampled (regardless of severity)
 *   2  — DB connection error
 *
 * The exit code intentionally does NOT depend on severity. Paging is the
 * job of the alerting pipeline reading rows where severity='critical'.
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL
  || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';

const samples = []; // { metric_key, value_num, value_text, severity, details }

function record(metric_key, value_num, severity = 'info', details = {}) {
  samples.push({ metric_key, value_num, value_text: null, severity, details });
}

async function sample(pool) {
  // ── 1. role_permissions ↔ functional_roles.permissions[] mismatch count.
  {
    const r = await pool.query(`
      SELECT COUNT(*)::int AS n
        FROM platform_dauth.functional_roles fr
       WHERE fr.permissions IS NOT NULL
         AND array_length(fr.permissions,1) > 0
         AND array_length(fr.permissions,1) <> (
           SELECT COUNT(*)::int FROM platform_dauth.role_permissions rp
            WHERE rp.role_id = fr.role_id
         )`);
    const n = r.rows[0].n;
    record('rbac.role_permissions.mismatch_count', n, n > 0 ? 'critical' : 'info');
  }

  // ── 2. tenant_id-form schemas missing from registry AND not allow-listed.
  {
    const r = await pool.query(`
      SELECT COUNT(*)::int AS n
        FROM information_schema.schemata s
       WHERE s.schema_name LIKE 'tenant_%'
         AND NOT EXISTS (
           SELECT 1 FROM dos.tenants t
            WHERE t.schema_name=s.schema_name OR 'tenant_'||t.tenant_id=s.schema_name
         )
         AND NOT EXISTS (
           SELECT 1 FROM dos.tenant_schema_allowlist a
            WHERE a.schema_name = s.schema_name
         )`);
    const n = r.rows[0].n;
    record('tenants.schema_orphans_unaccounted', n, n > 0 ? 'critical' : 'info');
  }

  // ── 3. active tenants without a migration-ledger entry.
  {
    const r = await pool.query(`
      SELECT COUNT(*)::int AS n FROM dos.tenants t
       WHERE t.status='active'
         AND NOT EXISTS (SELECT 1 FROM dos.tenant_migrations m WHERE m.tenant_id=t.tenant_id)`);
    const n = r.rows[0].n;
    record('tenants.active_no_migration_ledger', n, n > 0 ? 'critical' : 'info');
  }

  // ── 4. (tenant_id, product_key) duplicates in tenant_product_activation.
  {
    const r = await pool.query(`
      SELECT COUNT(*)::int AS n FROM (
        SELECT 1 FROM dos.tenant_product_activation
         GROUP BY tenant_id, product_key HAVING COUNT(*) > 1
      ) d`);
    const n = r.rows[0].n;
    record('tenants.product_activation_duplicates', n, n > 0 ? 'critical' : 'info');
  }

  // ── 5. shell perms not grantable by ≥1 functional role.
  {
    const r = await pool.query(`
      WITH p AS (
        SELECT DISTINCT unnest(perms_required) AS perm
          FROM dos.workspace_shell_binding WHERE perms_required IS NOT NULL
      )
      SELECT COUNT(*)::int AS n FROM p
       WHERE NOT EXISTS (
         SELECT 1 FROM platform_dauth.functional_roles fr WHERE p.perm = ANY(fr.permissions)
       )`);
    const n = r.rows[0].n;
    record('shell.perms_ungrantable', n, n > 0 ? 'critical' : 'info');
  }

  // ── 6. workspace_shell_binding row count per active tenant — drift if not 30.
  {
    const r = await pool.query(`
      SELECT COUNT(*)::int AS n FROM (
        SELECT t.tenant_id, COUNT(b.*) c
          FROM dos.tenants t
          LEFT JOIN dos.workspace_shell_binding b ON b.tenant_id=t.tenant_id
         WHERE t.status='active'
         GROUP BY t.tenant_id HAVING COUNT(b.*) <> 30
      ) x`);
    const n = r.rows[0].n;
    record('shell.binding_rowcount_drift', n, n > 0 ? 'critical' : 'info');
  }

  // ── 7. dual-naming role collisions in functional_roles.
  {
    const r = await pool.query(`
      SELECT COUNT(*)::int AS n FROM platform_dauth.functional_roles a
       WHERE a.role_code LIKE 'role_%'
         AND EXISTS (SELECT 1 FROM platform_dauth.functional_roles b
                      WHERE b.role_code = SUBSTRING(a.role_code FROM 6))`);
    const n = r.rows[0].n;
    record('rbac.functional_roles.dual_naming_collisions', n, n > 0 ? 'critical' : 'info');
  }

  // ── 8. dynamic_ui_component_registry rows with carbon_key not registered.
  {
    const r = await pool.query(`
      SELECT COUNT(*)::int AS n FROM dos.dynamic_ui_component_registry r
       WHERE r.carbon_key IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM dos.ui_carbon_components c WHERE c.carbon_key=r.carbon_key)`);
    const n = r.rows[0].n;
    record('ui.carbon_key_orphans', n, n > 0 ? 'critical' : 'info');
  }

  // ── 9. Total active tenants (informational; alerting threshold = drop).
  {
    const r = await pool.query(`SELECT COUNT(*)::int AS n FROM dos.tenants WHERE status='active'`);
    record('tenants.active_count', r.rows[0].n, 'info');
  }

  // ── 10. Sampler heartbeat (wall-clock; alerting watches gap > 90 min).
  record('telemetry.sampler_heartbeat', 1, 'info', { ts: new Date().toISOString() });
}

async function persist(pool) {
  if (samples.length === 0) return;
  const valuesSql = samples.map((_, i) =>
    `($${i*5+1}, $${i*5+2}, $${i*5+3}, $${i*5+4}, $${i*5+5}::jsonb)`).join(',');
  const params = samples.flatMap(s => [
    s.metric_key,
    s.value_num,
    s.value_text,
    s.severity,
    JSON.stringify(s.details ?? {}),
  ]);
  await pool.query(
    `INSERT INTO dos.platform_drift_log
       (metric_key, value_num, value_text, severity, details)
     VALUES ${valuesSql}`,
    params,
  );
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    await sample(pool);
    await persist(pool);
    const crit = samples.filter(s => s.severity === 'critical');
    const warn = samples.filter(s => s.severity === 'warn');
    console.log(`[drift-telemetry] sampled ${samples.length} metrics — ${crit.length} critical, ${warn.length} warn`);
    if (crit.length > 0) {
      console.error('[drift-telemetry] CRITICAL drift:');
      for (const s of crit) console.error(`  ✗ ${s.metric_key} = ${s.value_num}`);
    }
    process.exit(0);
  } catch (e) {
    console.error('[drift-telemetry] DB error:', e.message);
    process.exit(2);
  } finally {
    await pool.end();
  }
}

main();
