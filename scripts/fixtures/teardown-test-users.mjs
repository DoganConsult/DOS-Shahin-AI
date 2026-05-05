#!/usr/bin/env node
/**
 * Wave F2 — Test User Fixture Teardown
 *
 * Idempotently removes seeded test users for a given module.
 * Removal of role_profile_sync rows triggers DELETE on URA via projection.
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
if (!moduleArg) { console.error('Usage: teardown-test-users.mjs <module>'); process.exit(2); }

const fixturePath = join(ROOT, 'tests', 'fixtures', moduleArg, 'role-profiles.seed.json');
if (!existsSync(fixturePath)) { console.error(`[teardown] fixture not found`); process.exit(2); }
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const tenantId = fixture.tenantId;
const ids = (fixture.users || []).map(u => u.user_id);

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r1 = await client.query(
      `DELETE FROM dos.role_profile_sync WHERE tenant_id=$1 AND user_id = ANY($2::text[]) RETURNING profile_id`,
      [tenantId, ids]);
    await client.query(`DELETE FROM dos.users WHERE user_id = ANY($1::text[])`, [ids]).catch(()=>{});
    await client.query('COMMIT');
    console.log(`[teardown] module=${moduleArg} removed profiles=${r1.rowCount}`);
  } catch (e) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('[teardown] error:', e.message);
    process.exit(2);
  } finally {
    client.release();
    await pool.end();
  }
}
main();
