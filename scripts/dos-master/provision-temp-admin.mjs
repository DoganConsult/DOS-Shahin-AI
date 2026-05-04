#!/usr/bin/env node
/**
 * DOS Master — temporary platform-admin provisioning.
 *
 * Canonical seed path for platform-admin trust zone (Doctrine Article 4).
 * Idempotent. Revocable via `--revoke`.
 *
 * Provisions:
 *   1. platform_admin.platform_admin_user (active)
 *   2. platform_admin.platform_admin_grant for the four pillar roles
 *      (dos-platform-admin, dauth-admin, dnoc-operator, dsoc-analyst).
 *   3. platform_admin.platform_admin_session with a 24h JWE-shaped opaque
 *      token (real bytes — not a mock; consumed by admin-console-bff
 *      `/auth/whoami` until the platform-ops Keycloak realm is M11-deployed).
 *
 * Usage:
 *   node scripts/dos-master/provision-temp-admin.mjs --email <e> --name <n>
 *   node scripts/dos-master/provision-temp-admin.mjs --email <e> --revoke
 *   node scripts/dos-master/provision-temp-admin.mjs --list
 */
import { Client } from 'pg';
import { randomBytes } from 'node:crypto';

const argv = process.argv.slice(2);
function flag(n, d) {
  const i = argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = argv[i + 1];
  return v === undefined || (typeof v === 'string' && v.startsWith('--')) ? true : v;
}

async function withClient(fn) {
  const cs = process.env.DATABASE_URL
    || `postgres://${process.env.PGUSER || 'dos_auth'}:${process.env.PGPASSWORD || 'dos_auth_pass_2026'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'shahin_grc'}`;
  const c = new Client({ connectionString: cs });
  await c.connect();
  try { await c.query(`SET dos.actor = 'dos-master'`); return await fn(c); }
  finally { await c.end(); }
}

const PILLAR_ROLES = ['dos-platform-admin', 'dauth-admin', 'dnoc-operator', 'dsoc-analyst'];

async function provision(email, name) {
  return withClient(async (c) => {
    const u = await c.query(
      `INSERT INTO platform_admin.platform_admin_user (email, display_name, status)
       VALUES ($1,$2,'active')
       ON CONFLICT (email) DO UPDATE SET display_name=EXCLUDED.display_name, status='active'
       RETURNING id, email, display_name, status`,
      [email, name],
    );
    const userId = u.rows[0].id;
    for (const role of PILLAR_ROLES) {
      await c.query(
        `INSERT INTO platform_admin.platform_admin_grant (user_id, role_code, granted_by)
         VALUES ($1::uuid,$2,'dos-master:provision-temp-admin')
         ON CONFLICT (user_id, role_code) DO UPDATE
           SET revoked_at=NULL, granted_by=EXCLUDED.granted_by`,
        [userId, role],
      );
    }
    const token = randomBytes(32).toString('base64url');
    await c.query(
      `INSERT INTO platform_admin.platform_admin_session (user_id, jwe, expires_at)
       VALUES ($1::uuid,$2, now() + interval '24 hours')`,
      [userId, `tmp.${token}`],
    );
    console.log(JSON.stringify({
      ok: true,
      user: u.rows[0],
      roles: PILLAR_ROLES,
      session_token: `tmp.${token}`,
      expires_in_hours: 24,
      revoke_with: `node scripts/dos-master/provision-temp-admin.mjs --email ${email} --revoke`,
    }, null, 2));
  });
}

async function revoke(email) {
  return withClient(async (c) => {
    const u = await c.query(`SELECT id FROM platform_admin.platform_admin_user WHERE email=$1`, [email]);
    if (!u.rows.length) { console.error('user_not_found'); process.exit(3); }
    const userId = u.rows[0].id;
    await c.query(`UPDATE platform_admin.platform_admin_user SET status='retired' WHERE id=$1::uuid`, [userId]);
    await c.query(
      `UPDATE platform_admin.platform_admin_grant
          SET revoked_at = now()
        WHERE user_id=$1::uuid AND revoked_at IS NULL`,
      [userId],
    );
    await c.query(
      `UPDATE platform_admin.platform_admin_session
          SET revoked_at = now()
        WHERE user_id=$1::uuid AND revoked_at IS NULL`,
      [userId],
    );
    console.log(JSON.stringify({ ok: true, revoked: email }, null, 2));
  });
}

async function list() {
  return withClient(async (c) => {
    const r = await c.query(
      `SELECT u.email, u.display_name, u.status,
              (SELECT count(*) FROM platform_admin.platform_admin_grant g
                 WHERE g.user_id=u.id AND g.revoked_at IS NULL) AS active_grants,
              (SELECT count(*) FROM platform_admin.platform_admin_session s
                 WHERE s.user_id=u.id AND s.revoked_at IS NULL AND s.expires_at > now()) AS active_sessions
         FROM platform_admin.platform_admin_user u
        ORDER BY u.email`,
    );
    console.table(r.rows);
  });
}

const email = flag('email');
if (flag('list')) await list();
else if (!email) { console.error('--email required'); process.exit(2); }
else if (flag('revoke')) await revoke(String(email));
else await provision(String(email), String(flag('name', email)));
