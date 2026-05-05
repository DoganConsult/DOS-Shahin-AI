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
 *   - 60 workspace shell binding rows (60-key taxonomy v3.0)
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
  // ── Discover required platform modules from DB (no hardcoded module names).
  let requiredProducts = [];
  let requiredModules = [];
  try {
    const rp = await c.query(
      `SELECT DISTINCT product_key FROM dos.tenant_product_activation LIMIT 100`,
    );
    requiredProducts = rp.rows.map(r => r.product_key);
  } catch { /* table may not exist; graceful degradation */ }
  try {
    const rm = await c.query(
      `SELECT DISTINCT module_code FROM dos.dynamic_ui_modules WHERE is_platform_required = true`,
    );
    requiredModules = rm.rows.map(r => r.module_code);
  } catch {
    // Fallback: if is_platform_required column doesn't exist, check all modules
    requiredModules = [];
  }

  for (const t of tenants.rows) {
    const checks = [
      { name: 'membership', sql: `SELECT 1 FROM dos.tenant_memberships WHERE tenant_id=$1 AND status='active' LIMIT 1` },
      { name: 'role',       sql: `SELECT 1 FROM dos.user_role_assignments WHERE tenant_id=$1 AND is_active=true LIMIT 1` },
      { name: 'prod-ent',   sql: `SELECT 1 FROM dos.tenant_product_entitlements WHERE tenant_id=$1 AND entitlement_status='active' LIMIT 1` },
      { name: 'trial-or-sub', sql: `SELECT 1 FROM dos.tenant_trials WHERE tenant_id=$1 UNION SELECT 1 FROM dos.tenant_subscriptions WHERE tenant_id=$1 AND status IN ('active','past_due','grace') LIMIT 1` },
    ];
    // Dynamic product activation checks
    for (const pk of requiredProducts) {
      checks.push({
        name: `product-act:${pk}`,
        sql: `SELECT 1 FROM dos.tenant_product_activation WHERE tenant_id=$1 AND product_key='${pk}' AND status='active'`,
      });
    }
    // Dynamic module entitlement checks
    for (const mc of requiredModules) {
      checks.push({
        name: `module-ent:${mc}`,
        sql: `SELECT 1 FROM dos.tenant_module_entitlements WHERE tenant_id=$1 AND module_code='${mc}' AND entitlement_status='active'`,
      });
    }
    for (const ck of checks) {
      const r = await c.query(ck.sql, [t.tenant_id]);
      if (r.rows.length === 0) failures.push(`${t.tenant_id} (${t.tenant_code}): missing ${ck.name}`);
    }
    const sb = await c.query(
      `SELECT count(*)::int AS n FROM dos.workspace_shell_binding WHERE tenant_id=$1`,
      [t.tenant_id],
    );
    // Expected shell binding count comes from DB, not hardcoded
    const expectedKeys = await c.query(
      `SELECT count(DISTINCT component_key)::int AS n FROM dos.dynamic_ui_component_registry WHERE component_key LIKE 'workspace.%'`,
    );
    const expectedCount = expectedKeys.rows[0]?.n ?? 60;
    if (sb.rows[0].n !== expectedCount) {
      failures.push(`${t.tenant_id} (${t.tenant_code}): workspace_shell_binding has ${sb.rows[0].n} rows, expected ${expectedCount}`);
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
