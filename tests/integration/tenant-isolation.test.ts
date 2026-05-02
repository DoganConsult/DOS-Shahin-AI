import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

/**
 * Phase 11 — tenant isolation smoke tests against real `dos.*` DDL
 * (see ops/migrations/000_create_dos_schema.sql, 009b_service_domain_tables.sql, 006_missing_admin_tables.sql).
 *
 * Skips when DATABASE_URL unset or SKIP_TENANT_ISOLATION=1 (CI without Postgres).
 */
const connectionString = process.env.DATABASE_URL;
const skip = !connectionString || process.env.SKIP_TENANT_ISOLATION === '1';

function tid(prefix: string): string {
  const base = `${prefix}${randomUUID().replace(/-/g, '')}`;
  return base.slice(0, 16);
}

describe.skipIf(skip)('Tenant isolation (dos schema)', () => {
  let pool: Pool;
  let tenant1Id: string;
  let tenant2Id: string;
  let user1Id: string;
  let user2Id: string;
  let schema1: string;
  let schema2: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: connectionString! });
    tenant1Id = tid('a');
    tenant2Id = tid('b');
    schema1 = `st_${tenant1Id}`;
    schema2 = `st_${tenant2Id}`;

    const t1 = await pool.query(
      `INSERT INTO dos.tenants (tenant_id, tenant_code, tenant_name_en, schema_name, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING tenant_id`,
      [tenant1Id, `code-${tenant1Id}`, 'Isolation Tenant 1', schema1]
    );
    tenant1Id = t1.rows[0].tenant_id;

    const t2 = await pool.query(
      `INSERT INTO dos.tenants (tenant_id, tenant_code, tenant_name_en, schema_name, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING tenant_id`,
      [tenant2Id, `code-${tenant2Id}`, 'Isolation Tenant 2', schema2]
    );
    tenant2Id = t2.rows[0].tenant_id;

    const u1 = await pool.query(
      `INSERT INTO dos.users (email, display_name, tenant_id, status, platform_role)
       VALUES ($1, $2, $3, 'active', 'member') RETURNING user_id`,
      [`u1-${tenant1Id}@test.local`, 'User One', tenant1Id]
    );
    user1Id = u1.rows[0].user_id;

    const u2 = await pool.query(
      `INSERT INTO dos.users (email, display_name, tenant_id, status, platform_role)
       VALUES ($1, $2, $3, 'active', 'member') RETURNING user_id`,
      [`u2-${tenant2Id}@test.local`, 'User Two', tenant2Id]
    );
    user2Id = u2.rows[0].user_id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM dos.risks WHERE tenant_id = ANY($1)', [[tenant1Id, tenant2Id]]).catch(() => {});
    await pool.query('DELETE FROM dos.compliance_frameworks WHERE tenant_id = ANY($1)', [[tenant1Id, tenant2Id]]).catch(() => {});
    await pool.query('DELETE FROM dos.audit_plans WHERE tenant_id = ANY($1)', [[tenant1Id, tenant2Id]]).catch(() => {});
    await pool.query('DELETE FROM dos.evidence WHERE tenant_id = ANY($1)', [[tenant1Id, tenant2Id]]).catch(() => {});
    await pool.query('DELETE FROM dos.user_role_assignments WHERE user_id = ANY($1)', [[user1Id, user2Id]]).catch(() => {});
    await pool.query('DELETE FROM dos.users WHERE tenant_id = ANY($1)', [[tenant1Id, tenant2Id]]);
    await pool.query('DELETE FROM dos.tenants WHERE tenant_id = ANY($1)', [[tenant1Id, tenant2Id]]);
    await pool.end();
  });

  it('isolates dos.users by tenant_id', async () => {
    const a = await pool.query('SELECT * FROM dos.users WHERE tenant_id = $1', [tenant1Id]);
    const b = await pool.query('SELECT * FROM dos.users WHERE tenant_id = $1', [tenant2Id]);
    expect(a.rows).toHaveLength(1);
    expect(b.rows).toHaveLength(1);
    expect(a.rows[0].user_id).toEqual(user1Id);
    expect(b.rows[0].user_id).toEqual(user2Id);
  });

  it('returns no row when scoping user1 to tenant2', async () => {
    const cross = await pool.query(
      'SELECT 1 FROM dos.users WHERE user_id = $1 AND tenant_id = $2',
      [user1Id, tenant2Id]
    );
    expect(cross.rows).toHaveLength(0);
  });

  it('isolates dos.risks by tenant_id (UUID PK)', async () => {
    await pool.query(
      `INSERT INTO dos.risks (tenant_id, title, category, status) VALUES ($1, $2, 'operational', 'identified')`,
      [tenant1Id, 'Risk T1']
    );
    await pool.query(
      `INSERT INTO dos.risks (tenant_id, title, category, status) VALUES ($1, $2, 'operational', 'identified')`,
      [tenant2Id, 'Risk T2']
    );
    const r1 = await pool.query(
      `SELECT title FROM dos.risks WHERE tenant_id = $1 AND title = $2`,
      [tenant1Id, 'Risk T1']
    );
    const leak = await pool.query(
      `SELECT title FROM dos.risks WHERE tenant_id = $1 AND title = $2`,
      [tenant1Id, 'Risk T2']
    );
    expect(r1.rows).toHaveLength(1);
    expect(leak.rows).toHaveLength(0);
  });
});
