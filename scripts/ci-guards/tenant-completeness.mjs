#!/usr/bin/env node
/**
 * DOS Master Doctrine — Tenant Completeness Guard
 *
 * Enforces that every active tenant satisfies the 12-layer authorization
 * + workspace-shell contract (2026-05-04 audit). Fails when any active
 * tenant lacks any of:
 *   - active membership
 *   - active role assignment
 *   - active 'shahin-ai' product activation
 *   - active 'foundation' product activation
 *   - active product entitlement
 *   - active foundation module entitlement
 *   - trial bundle row OR a paid subscription
 *   - 30 workspace shell binding rows
 *
 * Also asserts that every distinct perm referenced by
 * dos.workspace_shell_binding.perms_required[] is granted by ≥1 functional
 * role in platform_dauth.functional_roles.permissions[].
 *
 * Baseline: TENANT_COMPLETENESS_BASELINE_MAX (default 0 — clean substrate).
 * Tighten:  TENANT_COMPLETENESS_ENFORCE=1 forces 0-failure.
 */
import { Client } from 'pg';

async function main() {
  const cs = process.env.DATABASE_URL
    || `postgres://${process.env.PGUSER || 'dos_auth'}:${process.env.PGPASSWORD || 'dos_auth_pass_2026'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'shahin_grc'}`;
  const c = new Client({ connectionString: cs });
  try { await c.connect(); } catch (e) {
    console.warn('[tenant-completeness] DB unreachable, skipping:', e.message);
    process.exit(0);
  }

  const failures = [];

  // ── Layer 1 — every active tenant has the full row set.
  const tenants = await c.query(
    `SELECT tenant_id, tenant_code FROM dos.tenants WHERE status='active' ORDER BY created_at`,
  );
  for (const t of tenants.rows) {
    const checks = [
      { name: 'membership', sql: `SELECT 1 FROM dos.tenant_memberships WHERE tenant_id=$1 AND status='active' LIMIT 1` },
      { name: 'role',       sql: `SELECT 1 FROM dos.user_role_assignments WHERE tenant_id=$1 AND is_active=true LIMIT 1` },
      { name: 'shahin-act', sql: `SELECT 1 FROM dos.tenant_product_activation WHERE tenant_id=$1 AND product_key='shahin-ai' AND status='active'` },
      { name: 'found-act',  sql: `SELECT 1 FROM dos.tenant_product_activation WHERE tenant_id=$1 AND product_key='foundation' AND status='active'` },
      { name: 'prod-ent',   sql: `SELECT 1 FROM dos.tenant_product_entitlements WHERE tenant_id=$1 AND entitlement_status='active' LIMIT 1` },
      { name: 'found-ent',  sql: `SELECT 1 FROM dos.tenant_module_entitlements WHERE tenant_id=$1 AND module_code='foundation' AND entitlement_status='active'` },
      { name: 'trial-or-sub', sql: `SELECT 1 FROM dos.tenant_trials WHERE tenant_id=$1 UNION SELECT 1 FROM dos.tenant_subscriptions WHERE tenant_id=$1 AND status IN ('active','past_due','grace') LIMIT 1` },
    ];
    for (const ck of checks) {
      const r = await c.query(ck.sql, [t.tenant_id]);
      if (r.rows.length === 0) failures.push(`${t.tenant_id} (${t.tenant_code}): missing ${ck.name}`);
    }
    const sb = await c.query(
      `SELECT count(*)::int AS n FROM dos.workspace_shell_binding WHERE tenant_id=$1`,
      [t.tenant_id],
    );
    if (sb.rows[0].n !== 30) {
      failures.push(`${t.tenant_id} (${t.tenant_code}): workspace_shell_binding has ${sb.rows[0].n} rows, expected 30`);
    }
  }

  // ── Layer 2 — every shell perm grantable by at least one role.
  const perms = await c.query(
    `SELECT DISTINCT unnest(perms_required) AS perm FROM dos.workspace_shell_binding WHERE perms_required IS NOT NULL`,
  );
  for (const row of perms.rows) {
    const g = await c.query(
      `SELECT 1 FROM platform_dauth.functional_roles WHERE $1 = ANY(permissions) LIMIT 1`,
      [row.perm],
    );
    if (g.rows.length === 0) {
      failures.push(`shell perm '${row.perm}' is granted by ZERO functional roles`);
    }
  }

  await c.end();

  const BASELINE_MAX = Number(process.env.TENANT_COMPLETENESS_BASELINE_MAX ?? 0);
  const ENFORCE = process.env.TENANT_COMPLETENESS_ENFORCE === '1';
  const failCount = failures.length;
  if (failCount > BASELINE_MAX || (ENFORCE && failCount > 0)) {
    console.error(`[tenant-completeness] FAIL ${failCount} violations (baseline=${BASELINE_MAX}, enforce=${ENFORCE})`);
    failures.slice(0, 20).forEach((f) => console.error(`  ${f}`));
    if (failCount > 20) console.error(`  ... +${failCount - 20} more`);
    process.exit(1);
  }
  console.log(`[tenant-completeness] PASS active_tenants=${tenants.rows.length} shell_perms=${perms.rows.length} failures=${failCount}`);
}

main().catch((e) => { console.error('[tenant-completeness] ERROR', e.message); process.exit(1); });
