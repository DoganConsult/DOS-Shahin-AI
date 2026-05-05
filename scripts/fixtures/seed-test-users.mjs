#!/usr/bin/env node
/**
 * Wave F2 — Test User Fixture Seeder
 *
 * Idempotently seeds module-scoped test users into dos.role_profile_sync,
 * which projects atomically into platform_dauth.user_role_assignments via
 * trg_role_profile_project (Wave F1).
 *
 * Usage:
 *   node scripts/fixtures/seed-test-users.mjs <module>
 *   e.g. node scripts/fixtures/seed-test-users.mjs foundation
 *
 * Reads:  tests/fixtures/<module>/role-profiles.seed.json
 * Writes: dos.role_profile_sync (one row per user × role × scope)
 *         dos.users (one row per user, idempotent)
 *
 * Exit codes: 0 ok / 2 error.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
const { Pool } = pg;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATABASE_URL = process.env.DATABASE_URL
  || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';

const moduleArg = process.argv[2];
if (!moduleArg) {
  console.error('Usage: seed-test-users.mjs <module>');
  process.exit(2);
}

const fixturePath = join(ROOT, 'tests', 'fixtures', moduleArg, 'role-profiles.seed.json');
if (!existsSync(fixturePath)) {
  console.error(`[seed-test-users] fixture not found: ${fixturePath}`);
  process.exit(2);
}

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const tenantId = fixture.tenantId;
const users = fixture.users || [];

const pool = new Pool({ connectionString: DATABASE_URL });

async function ensureUser(client, u) {
  // Tolerate legacy column variations: minimum required columns are
  // (user_id, email, status). Display name and tenant_id are optional.
  try {
    await client.query(`
      INSERT INTO dos.users (user_id, email, display_name, status, tenant_id, role, full_name)
      VALUES ($1, $1, $2, 'active', $3, $4, $2)
      ON CONFLICT (user_id) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            status       = 'active',
            tenant_id    = EXCLUDED.tenant_id,
            role         = EXCLUDED.role
    `, [u.user_id, u.name, tenantId, u.role_code]);
  } catch (e) {
    // Last-resort minimal insert; never block the role-profile write.
    await client.query(
      `INSERT INTO dos.users (user_id, email, status) VALUES ($1,$1,'active') ON CONFLICT DO NOTHING`,
      [u.user_id]);
  }
}

async function ensureRoleProfile(client, u) {
  // Canonical writer: role_profile_sync. The AFTER-trigger projects to URA.
  await client.query(`
    INSERT INTO dos.role_profile_sync
      (tenant_id, user_id, role_code, scope, permissions, lifecycle_state, source_system)
    VALUES ($1, $2, $3, $4, $5::text[], $6, 'fixtures-seeder')
    ON CONFLICT (tenant_id, user_id, role_code, scope) DO UPDATE
      SET permissions = EXCLUDED.permissions,
          lifecycle_state = EXCLUDED.lifecycle_state
  `, [tenantId, u.user_id, u.role_code, u.scope, u.permissions, u.lifecycle_state || 'active']);
}

async function main() {
  const client = await pool.connect();
  try {
    let okUsers = 0, okProfiles = 0;
    for (const u of users) {
      // Independent tx per user — one bad row doesn't poison the batch.
      await client.query('BEGIN');
      try {
        await ensureUser(client, u);
        okUsers++;
        await ensureRoleProfile(client, u);
        okProfiles++;
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK').catch(()=>{});
        console.error(`  ✗ ${u.user_id}: ${e.message}`);
      }
    }
    console.log(`[seed-test-users] module=${moduleArg} tenant=${tenantId}`);
    console.log(`  ✔ users:    ${okUsers}`);
    console.log(`  ✔ profiles: ${okProfiles}`);
  } catch (e) {
    console.error('[seed-test-users] error:', e.message);
    process.exit(2);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
