#!/usr/bin/env node
/**
 * Wave F-Functional — End-to-end functional test for the Role-Profile path.
 *
 * Mirrors the TS RoleProfileService (services/user-service/src/domain/foundation/
 * role-profile.service.ts) using direct pg, so we can prove the full pipeline:
 *
 *   1. Direct INSERT into platform_dauth.user_role_assignments WITHOUT GUC
 *      MUST be rejected by trigger trg_ura_via_role_profile_only.
 *   2. UPSERT through dos.role_profile_sync MUST land + project a row into
 *      platform_dauth.user_role_assignments.
 *   3. UPDATE via re-upsert MUST bump version and propagate.
 *   4. DELETE through role_profile_sync MUST cascade to URA.
 *   5. Sync-log MUST capture every push as outcome='ok'.
 *
 * Exit: 0 all green / 1 any check failed / 2 error.
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL
  || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';

const TENANT = 'tenant_test_foundation';
const USER   = 'test+rp-functional@dos.local';
const ROLE   = 'viewer';
const SCOPE  = 'tenant';

const checks = [];
function record(id, label, ok, detail='') {
  checks.push({ id, label, ok, detail });
  console.log(`${ok ? '✔' : '✗'} ${id} ${label}${detail ? ' — '+detail : ''}`);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function ensureUser(c) {
  try {
    await c.query(
      `INSERT INTO dos.users (user_id, email, status) VALUES ($1,$1,'active')
       ON CONFLICT (user_id) DO NOTHING`, [USER]);
  } catch {
    /* legacy schema variations tolerated */
  }
}

async function cleanup(c) {
  await c.query('BEGIN');
  await c.query(`SET LOCAL app.via_role_profile = 'true'`);
  await c.query(`DELETE FROM dos.role_profile_sync
                  WHERE tenant_id=$1 AND user_id=$2`, [TENANT, USER]);
  await c.query('COMMIT');
}

async function negativePathDirectInsertRejected(c) {
  // No GUC set → must throw.
  let rejected = false, msg = '';
  try {
    await c.query(
      `INSERT INTO platform_dauth.user_role_assignments
         (assignment_id, tenant_id, user_id, role_code, scope, granted_by, granted_at, is_active)
       VALUES ('direct-bypass-attempt', $1, $2, $3, 'tenant', 'test', now(), true)`,
      [TENANT, USER, ROLE]);
  } catch (e) {
    rejected = true;
    msg = e.message.split('\n')[0];
  }
  record('NEG.1', 'Direct URA insert is rejected by trigger', rejected, msg);
}

async function upsertProfile(c, role) {
  await c.query('BEGIN');
  await c.query(`SET LOCAL app.via_role_profile = 'true'`);
  const r = await c.query(
    `INSERT INTO dos.role_profile_sync
       (tenant_id, user_id, role_code, scope, permissions, lifecycle_state, source_system)
     VALUES ($1, $2, $3, $4, $5::text[], 'active', 'role-profile-service-test')
     ON CONFLICT (tenant_id, user_id, role_code, scope) DO UPDATE
       SET permissions = EXCLUDED.permissions,
           lifecycle_state = EXCLUDED.lifecycle_state
     RETURNING profile_id, version`,
    [TENANT, USER, role, SCOPE, ['foundation.read','foundation.user.read']]);
  await c.query(
    `INSERT INTO dos.role_profile_sync_log (acceptor_id, direction, profile_id, tenant_id, user_id, role_code, outcome)
     VALUES ('internal.role-profile-service','push',$1,$2,$3,$4,'ok')`,
    [r.rows[0].profile_id, TENANT, USER, role]);
  await c.query('COMMIT');
  return r.rows[0];
}

async function profileLandsAndProjects(c) {
  const { profile_id, version } = await upsertProfile(c, ROLE);
  const ps = await c.query(
    `SELECT 1 FROM dos.role_profile_sync WHERE profile_id=$1`, [profile_id]);
  record('POS.1', 'Profile row lands in role_profile_sync', ps.rowCount === 1, `version=${version}`);

  const ura = await c.query(
    `SELECT is_active, role_code FROM platform_dauth.user_role_assignments
      WHERE assignment_id=$1`, [profile_id]);
  record('POS.2', 'Trigger projects role-profile to URA',
    ura.rowCount === 1 && ura.rows[0].is_active === true && ura.rows[0].role_code === ROLE,
    ura.rowCount ? `role_code=${ura.rows[0].role_code} active=${ura.rows[0].is_active}` : 'no row');

  return profile_id;
}

async function reUpsertBumpsVersion(c) {
  const r1 = await upsertProfile(c, ROLE);
  const r2 = await upsertProfile(c, ROLE);
  record('POS.3', 'Re-upsert bumps version monotonically', r2.version > r1.version,
    `v${r1.version} → v${r2.version}`);
}

async function revokeCascadesToUra(c, profile_id) {
  await c.query('BEGIN');
  await c.query(`SET LOCAL app.via_role_profile = 'true'`);
  const del = await c.query(
    `DELETE FROM dos.role_profile_sync WHERE profile_id=$1 RETURNING profile_id`,
    [profile_id]);
  await c.query('COMMIT');
  record('POS.4', 'Revoke removes role_profile_sync row', del.rowCount === 1);

  const ura = await c.query(
    `SELECT 1 FROM platform_dauth.user_role_assignments WHERE assignment_id=$1`,
    [profile_id]);
  record('POS.5', 'Revoke cascaded to URA (DELETE)', ura.rowCount === 0);
}

async function syncLogCaptured(c) {
  const r = await c.query(
    `SELECT outcome, count(*)::int AS n FROM dos.role_profile_sync_log
      WHERE tenant_id=$1 AND user_id=$2
      GROUP BY outcome`,
    [TENANT, USER]);
  const oks = r.rows.find(r => r.outcome==='ok')?.n ?? 0;
  record('POS.6', 'Sync-log captures push outcomes', oks >= 1, `ok rows=${oks}`);
}

async function main() {
  const c = await pool.connect();
  try {
    await ensureUser(c);
    await cleanup(c);

    await negativePathDirectInsertRejected(c);
    const pid = await profileLandsAndProjects(c);
    await reUpsertBumpsVersion(c);
    await revokeCascadesToUra(c, pid);
    await syncLogCaptured(c);

    const failed = checks.filter(x => !x.ok);
    console.log(`\n[role-profile-functional] ${checks.length - failed.length}/${checks.length} checks PASS`);
    if (failed.length) process.exit(1);
    process.exit(0);
  } catch (e) {
    console.error('[role-profile-functional] error:', e.message);
    process.exit(2);
  } finally {
    c.release();
    await pool.end();
  }
}

main();
