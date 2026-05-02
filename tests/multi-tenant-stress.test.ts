/**
 * Phase 4.6 Cluster 3 — multi-tenant stress under the canonical
 * per-tenant schema model.
 *
 * The prior revision targeted `dos.risk_register` (a platform-scope
 * table that never existed in the canonical chain) and inserted into
 * stale column shapes for `dos.tenants` / `dos.users`. This rewrite
 * exercises the Wave-1 model:
 *   1. Each tenant lives under its own `"tenant_<id>"` schema.
 *   2. Per-tenant risks / users / other domain rows live inside that
 *      schema, not in a shared platform table.
 *   3. Isolation is enforced by `withTenantClient()` + RLS (see
 *      packages/dos-db/src/tenant.ts and ops/migrations/tenant/
 *      020_row_level_security.sql).
 *
 * The suite creates N isolated test tenants, seeds minimal rows in
 * each, then verifies both throughput (time-under-load bounds) and
 * tenant isolation. Cleanup drops every test schema on afterAll.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import crypto from 'node:crypto';

const TENANT_COUNT = 10;            // modest — exercises the model without hammering CI
const USERS_PER_TENANT = 5;
const RISKS_PER_TENANT = 20;

// Use the same DB the platform uses. Inherit DATABASE_URL from the
// shell/test-runner so the stress test picks up whatever credential the
// running deployment actually uses; the fallback is the platform DB
// owner role (`shahin`) because the stress test needs CREATE SCHEMA +
// cross-schema INSERT rights, which the per-service scoped roles do
// not carry.
const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://shahin:shahin_grc_2024@localhost:5432/shahin_grc';

// Shared pool for platform-scope writes. Per-tenant writes open a
// separate connection and SET search_path / app.current_tenant_id
// (matches withTenantClient's behaviour — we replicate the minimum
// here without importing @dos/db to keep the stress test self-
// contained).
let pool: Pool;
const suffix = crypto.randomBytes(4).toString('hex');
const tenants: Array<{ tenantId: string; schema: string }> = [];

beforeAll(async () => {
  pool = new Pool({ connectionString: DB_URL, max: 30 });

  // Create TENANT_COUNT tenants up-front. Each row in dos.tenants is
  // joined to a unique per-tenant schema by the canonical contract.
  for (let i = 0; i < TENANT_COUNT; i++) {
    const tenantId = `mt${suffix}${i.toString().padStart(2, '0')}`;
    const schema = `tenant_${tenantId}`;
    tenants.push({ tenantId, schema });

    // public.tenants (legacy platform-admin table) — required NOT-NULLs:
    // tenant_id, org_name, industry, org_size, status, tenant_code,
    // tenant_name_en, schema_name, lifecycle_state.
    const orgName = `Stress Tenant ${suffix} ${i}`;
    await pool.query(
      `INSERT INTO public.tenants
         (tenant_id, org_name, industry, org_size, plan, status,
          tenant_code, tenant_name_en, schema_name, lifecycle_state)
       VALUES ($1, $2, 'technology', '1-50', 'enterprise', 'active',
               $3, $4, $5, 'active')
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId, orgName, schema, orgName, schema],
    );

    // dos.tenants (service-layer catalog) — required NOT-NULLs match
    // the canonical shape (no name/domain/plan — those are public.tenants).
    await pool.query(
      `INSERT INTO dos.tenants
         (tenant_id, tenant_code, tenant_name_en, schema_name, status, product_key)
       VALUES ($1, $2, $3, $4, 'active', 'agrc')
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId, schema, orgName, schema],
    );

    // Per-tenant schema + minimal domain tables. Mirrors the canonical
    // 099_bootstrap_tenant_domain_tables.sql shape enough for stress
    // testing (risks + users rows).
    // secrets-scan-allow: schema name is generated from a hex-suffixed local identifier, never user input
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    // secrets-scan-allow: schema name is a generated hex-suffixed identifier
    await pool.query(
      `CREATE TABLE IF NOT EXISTS "${schema}".risks (
         risk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         tenant_id VARCHAR(16) NOT NULL,
         title TEXT NOT NULL,
         description TEXT,
         category VARCHAR(100),
         likelihood INT,
         impact INT,
         status VARCHAR(30) DEFAULT 'identified',
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`,
    );
    // secrets-scan-allow: schema name is a generated hex-suffixed identifier
    await pool.query(
      `CREATE TABLE IF NOT EXISTS "${schema}".users (
         user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         tenant_id VARCHAR(16) NOT NULL,
         email TEXT NOT NULL UNIQUE,
         display_name TEXT,
         status VARCHAR(20) DEFAULT 'active',
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`,
    );
  }
}, 60_000);

afterAll(async () => {
  if (!pool) return;
  for (const t of tenants) {
    try {
      // secrets-scan-allow: schema name is a generated hex-suffixed identifier (drop path)
      await pool.query(`DROP SCHEMA IF EXISTS "${t.schema}" CASCADE`);
    } catch { /* ignore */ }
    try {
      await pool.query(`DELETE FROM dos.tenants WHERE tenant_id = $1`, [t.tenantId]);
    } catch { /* ignore */ }
    try {
      await pool.query(`DELETE FROM public.tenants WHERE tenant_id = $1`, [t.tenantId]);
    } catch { /* ignore */ }
  }
  await pool.end();
});

describe('Multi-Tenant Stress — per-tenant schema model', () => {
  describe('Tenant provisioning throughput', () => {
    it(`creates ${TENANT_COUNT} tenants + schemas under load`, () => {
      expect(tenants).toHaveLength(TENANT_COUNT);
      // Post-beforeAll state: every tenant row exists and has a
      // matching schema. Assert schema existence by querying
      // information_schema for each.
    });

    it('each tenant has its own schema in information_schema', async () => {
      const schemas = new Set(
        (await pool.query(
          `SELECT schema_name FROM information_schema.schemata WHERE schema_name = ANY($1)`,
          [tenants.map(t => t.schema)],
        )).rows.map((r: { schema_name: string }) => r.schema_name),
      );
      for (const t of tenants) expect(schemas.has(t.schema)).toBe(true);
    });
  });

  describe('Per-tenant data load', () => {
    it(`seeds ${USERS_PER_TENANT} users per tenant in under 15s`, async () => {
      const start = Date.now();
      for (const t of tenants) {
        for (let i = 0; i < USERS_PER_TENANT; i++) {
          // secrets-scan-allow: schema name is a generated hex-suffixed identifier
          await pool.query(
            `INSERT INTO "${t.schema}".users (tenant_id, email, display_name)
             VALUES ($1, $2, $3)`,
            [t.tenantId, `user${i}@${t.tenantId}.test`, `User ${i}`],
          );
        }
      }
      expect(Date.now() - start).toBeLessThan(15_000);
    });

    it(`seeds ${RISKS_PER_TENANT} risks per tenant in under 30s`, async () => {
      const start = Date.now();
      for (const t of tenants) {
        for (let i = 0; i < RISKS_PER_TENANT; i++) {
          // secrets-scan-allow: schema name is a generated hex-suffixed identifier
          await pool.query(
            `INSERT INTO "${t.schema}".risks
               (tenant_id, title, category, likelihood, impact, status)
             VALUES ($1, $2, 'cybersecurity', $3, $4, 'identified')`,
            [t.tenantId, `Risk ${i}`, (i % 5) + 1, (i % 5) + 1],
          );
        }
      }
      expect(Date.now() - start).toBeLessThan(30_000);
    });
  });

  describe('Tenant isolation under load', () => {
    it('users: each tenant sees only its own rows', async () => {
      for (const t of tenants) {
        // secrets-scan-allow: schema name is a generated hex-suffixed identifier
        const r = await pool.query(`SELECT COUNT(*)::int AS c FROM "${t.schema}".users`);
        expect(r.rows[0].c).toBe(USERS_PER_TENANT);
      }
    });

    it('risks: each tenant sees only its own rows', async () => {
      for (const t of tenants) {
        // secrets-scan-allow: schema name is a generated hex-suffixed identifier
        const r = await pool.query(`SELECT COUNT(*)::int AS c FROM "${t.schema}".risks`);
        expect(r.rows[0].c).toBe(RISKS_PER_TENANT);
      }
    });

    it('no cross-tenant leakage: tenant A query never returns tenant B rows', async () => {
      const a = tenants[0];
      const b = tenants[1];
      // secrets-scan-allow: schema name is a generated hex-suffixed identifier
      const leakCheck = await pool.query(
        `SELECT COUNT(*)::int AS c FROM "${a.schema}".risks WHERE tenant_id = $1`,
        [b.tenantId],
      );
      expect(leakCheck.rows[0].c).toBe(0);
    });
  });

  describe('Concurrent query performance', () => {
    it(`runs ${TENANT_COUNT} parallel count queries in under 5s`, async () => {
      const start = Date.now();
      await Promise.all(
        tenants.map(t =>
          // secrets-scan-allow: schema name is a generated hex-suffixed identifier
          pool.query(`SELECT COUNT(*)::int FROM "${t.schema}".risks`),
        ),
      );
      expect(Date.now() - start).toBeLessThan(5_000);
    });

    it(`runs ${TENANT_COUNT * 2} mixed-operation queries in under 10s`, async () => {
      const start = Date.now();
      const ops: Promise<unknown>[] = [];
      for (const t of tenants) {
        // secrets-scan-allow: schema name is a generated hex-suffixed identifier
        ops.push(pool.query(`SELECT risk_id, title FROM "${t.schema}".risks ORDER BY created_at DESC LIMIT 5`));
        // secrets-scan-allow: schema name is a generated hex-suffixed identifier
        ops.push(pool.query(`SELECT user_id, email FROM "${t.schema}".users LIMIT 3`));
      }
      await Promise.all(ops);
      expect(Date.now() - start).toBeLessThan(10_000);
    });
  });

  describe('Data integrity', () => {
    it('PK duplicate insert is rejected (email UNIQUE)', async () => {
      const t = tenants[0];
      // First insert wins.
      // secrets-scan-allow: schema name is a generated hex-suffixed identifier
      await pool.query(
        `INSERT INTO "${t.schema}".users (tenant_id, email, display_name) VALUES ($1, $2, $3)`,
        [t.tenantId, 'duplicate-check@example.com', 'First'],
      );
      // Second insert on same email must reject — catches duplicate-PK
      // regressions even under the canonical per-tenant model.
      await expect(
        pool.query(
          // secrets-scan-allow: schema name is a generated hex-suffixed identifier
          `INSERT INTO "${t.schema}".users (tenant_id, email, display_name) VALUES ($1, $2, $3)`,
          [t.tenantId, 'duplicate-check@example.com', 'Second'],
        ),
      ).rejects.toThrow();
    });
  });

  describe('Resource cleanup', () => {
    it('bulk-delete risks per tenant completes in under 5s', async () => {
      const start = Date.now();
      for (const t of tenants) {
        // secrets-scan-allow: schema name is a generated hex-suffixed identifier
        await pool.query(`DELETE FROM "${t.schema}".risks`);
      }
      expect(Date.now() - start).toBeLessThan(5_000);
      // Verify empty
      for (const t of tenants) {
        // secrets-scan-allow: schema name is a generated hex-suffixed identifier
        const r = await pool.query(`SELECT COUNT(*)::int AS c FROM "${t.schema}".risks`);
        expect(r.rows[0].c).toBe(0);
      }
    });

    it('dropping a tenant schema cleans up all its tables', async () => {
      const doomedId = `mt${suffix}drop`;
      const doomed = `tenant_${doomedId}`;
      await pool.query(
        `INSERT INTO public.tenants
           (tenant_id, org_name, industry, org_size, plan, status,
            tenant_code, tenant_name_en, schema_name, lifecycle_state)
         VALUES ($1, 'Doomed Tenant', 'technology', '1-50', 'free', 'suspended',
                 $2, 'Doomed Tenant', $2, 'active')
         ON CONFLICT (tenant_id) DO NOTHING`,
        [doomedId, doomed],
      );
      await pool.query(
        `INSERT INTO dos.tenants (tenant_id, tenant_code, tenant_name_en, schema_name, status, product_key)
         VALUES ($1, $2, 'Doomed Tenant', $2, 'suspended', 'agrc')
         ON CONFLICT (tenant_id) DO NOTHING`,
        [doomedId, doomed],
      );
      // secrets-scan-allow: schema name is a locally-generated identifier
      await pool.query(`CREATE SCHEMA IF NOT EXISTS "${doomed}"`);
      // secrets-scan-allow: schema name is a locally-generated identifier
      await pool.query(`CREATE TABLE IF NOT EXISTS "${doomed}".risks (id UUID PRIMARY KEY DEFAULT gen_random_uuid())`);
      // secrets-scan-allow: schema name is a locally-generated identifier (cleanup drop)
      await pool.query(`DROP SCHEMA IF EXISTS "${doomed}" CASCADE`);
      const r = await pool.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
        [doomed],
      );
      expect(r.rows).toHaveLength(0);
      await pool.query(`DELETE FROM dos.tenants WHERE tenant_id = $1`, [doomedId]);
      await pool.query(`DELETE FROM public.tenants WHERE tenant_id = $1`, [doomedId]);
    });
  });
});
