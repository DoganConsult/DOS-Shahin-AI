import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dos_test:dos_test_pw@localhost:5432/dos_test';
const runTenantProvisioningE2E = process.env.RUN_TENANT_PROVISIONING_E2E === 'true';

async function getColumns(pool: Pool, schema: string, table: string): Promise<Set<string>> {
  const { rows } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2`,
    [schema, table],
  );
  return new Set(rows.map(r => String(r.column_name)));
}

(runTenantProvisioningE2E ? describe : describe.skip)('Tenant Provisioning E2E', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Platform Tables Exist', () => {
    it('public.tenants table exists', async () => {
      const { rows } = await pool.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'tenants'
      `);
      expect(rows).toHaveLength(1);
    });

    it('public.users table exists', async () => {
      const { rows } = await pool.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      `);
      expect(rows).toHaveLength(1);
    });

    it('dos schema core tables exist', async () => {
      const expected = [
        'functional_roles', 'permissions', 'module_registry',
        'product_registry', 'feature_flags',
      ];
      const { rows } = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'dos' AND table_type = 'BASE TABLE'
      `);
      const names = rows.map(r => r.table_name);
      for (const t of expected) {
        expect(names, `dos.${t} should exist`).toContain(t);
      }
    });
  });

  describe('Seed Data Completeness', () => {
    it('has 12+ functional roles', async () => {
      const { rows } = await pool.query(`SELECT count(*)::int AS c FROM dos.functional_roles`);
      expect(rows[0].c).toBeGreaterThanOrEqual(12);
    });

    it('has 500+ permissions', async () => {
      const { rows } = await pool.query(`SELECT count(*)::int AS c FROM dos.permissions`);
      expect(rows[0].c).toBeGreaterThanOrEqual(500);
    });

    it('has 25+ modules in registry', async () => {
      const { rows } = await pool.query(`SELECT count(*)::int AS c FROM dos.module_registry`);
      expect(rows[0].c).toBeGreaterThanOrEqual(25);
    });

    it('has agrc product in registry', async () => {
      const cols = await getColumns(pool, 'dos', 'product_registry');
      if (cols.has('code')) {
        const { rows } = await pool.query(`SELECT * FROM dos.product_registry WHERE code IN ('agrc', 'shahin-ai')`);
        expect(rows.length).toBeGreaterThanOrEqual(1);
        expect(rows[0].name_en).toBeTruthy();
        return;
      }
      if (cols.has('product_key')) {
        const { rows } = await pool.query(`SELECT * FROM dos.product_registry WHERE product_key IN ('agrc', 'shahin-ai')`);
        expect(rows.length).toBeGreaterThanOrEqual(1);
        return;
      }
      const { rows } = await pool.query(`SELECT * FROM dos.product_registry LIMIT 1`);
      expect(rows.length).toBeGreaterThanOrEqual(1);
    });

    it('has 15+ feature flags', async () => {
      const { rows } = await pool.query(`SELECT count(*)::int AS c FROM dos.feature_flags`);
      expect(rows[0].c).toBeGreaterThanOrEqual(15);
    });

    it('has role-permission mappings', async () => {
      const { rows } = await pool.query(`SELECT count(*)::int AS c FROM dos.role_permissions`);
      expect(rows[0].c).toBeGreaterThanOrEqual(50);
    });

    it('has access profiles', async () => {
      const { rows } = await pool.query(`SELECT count(*)::int AS c FROM dos.access_profiles`);
      expect(rows[0].c).toBeGreaterThanOrEqual(4);
    });

    it('has navigation entries', async () => {
      const { rows } = await pool.query(`SELECT count(*)::int AS c FROM dos.navigation_registry`);
      expect(rows[0].c).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Tenant Lifecycle', () => {
    const tenantId = 'e2e_' + Date.now().toString(36).slice(-6);
    const userId = 'u_' + Date.now().toString(36).slice(-8);

    afterAll(async () => {
      await pool.query(`DELETE FROM dos.tenant_product_activation WHERE tenant_id = $1`, [tenantId]).catch(() => {});
      await pool.query(`DELETE FROM public.tenant_user_memberships WHERE tenant_id = $1`, [tenantId]).catch(() => {});
      await pool.query(`DELETE FROM public.users WHERE user_id = $1`, [userId]).catch(() => {});
      await pool.query(`DELETE FROM public.tenants WHERE tenant_id = $1`, [tenantId]).catch(() => {});
    });

    it('creates a new tenant', async () => {
      await pool.query(`
        INSERT INTO public.tenants (tenant_id, tenant_code, tenant_name_en, schema_name, org_name, industry, org_size, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [tenantId, `tc_${tenantId}`, 'E2E Test Org', `schema_${tenantId}`, 'E2E Test Org', 'technology', '1-50', 'active']);

      const { rows } = await pool.query(`SELECT * FROM public.tenants WHERE tenant_id = $1`, [tenantId]);
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe('active');
    });

    it('creates a user under the tenant', async () => {
      await pool.query(`
        INSERT INTO public.users (user_id, email, password_hash, name, full_name, tenant_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, `e2e-${Date.now()}@test.com`, '$2a$10$placeholder', 'E2E Test User', 'E2E Test User', tenantId, 'active']);

      const { rows } = await pool.query(`SELECT * FROM public.users WHERE user_id = $1`, [userId]);
      expect(rows).toHaveLength(1);
      expect(rows[0].tenant_id).toBe(tenantId);
    });

    it('creates tenant membership', async () => {
      await pool.query(`
        INSERT INTO public.tenant_user_memberships (tenant_id, user_id, status, is_tenant_owner)
        VALUES ($1, $2, 'active', true)
        ON CONFLICT DO NOTHING
      `, [tenantId, userId]);

      const { rows } = await pool.query(
        `SELECT * FROM public.tenant_user_memberships WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].is_tenant_owner).toBe(true);
    });

    it('activates product for tenant', async () => {
      const cols = await getColumns(pool, 'dos', 'tenant_product_activation');
      const productCol = cols.has('product_code') ? 'product_code' : (cols.has('product_key') ? 'product_key' : 'product_code');
      await pool.query(
        `INSERT INTO dos.tenant_product_activation (tenant_id, ${productCol})
         SELECT $1, $2
         WHERE NOT EXISTS (
           SELECT 1 FROM dos.tenant_product_activation WHERE tenant_id = $1 AND ${productCol} = $2
         )`,
        [tenantId, 'agrc'],
      );

      const { rows } = await pool.query(
        `SELECT * FROM dos.tenant_product_activation WHERE tenant_id = $1`,
        [tenantId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0][productCol]).toBe('agrc');
    });

    it('tenant can access all GRC modules through product', async () => {
      const cols = await getColumns(pool, 'dos', 'module_registry');
      const codeCol = cols.has('code') ? 'code' : 'module_code';
      const { rows } = await pool.query(
        `SELECT ${codeCol} AS code FROM dos.module_registry
         WHERE category IN ('core_grc', 'operational', 'advanced')
         ORDER BY ${codeCol}`,
      );
      expect(rows.length).toBeGreaterThanOrEqual(10);
      const moduleCodes = rows.map(r => r.code);
      expect(moduleCodes).toContain('risk');
      expect(moduleCodes).toContain('compliance');
      expect(moduleCodes).toContain('audit');
      expect(moduleCodes).toContain('governance');
    });

    it('feature flags resolve for active modules', async () => {
      const cols = await getColumns(pool, 'dos', 'module_registry');
      const codeCol = cols.has('code') ? 'code' : 'module_code';
      const { rows } = await pool.query(
        `SELECT flag_code, enabled FROM dos.feature_flags
         WHERE module_code IN (
           SELECT ${codeCol} FROM dos.module_registry
           WHERE category IN ('core_grc', 'platform')
         )`,
      );
      expect(rows.length).toBeGreaterThanOrEqual(5);
      const enabledFlags = rows.filter(r => r.enabled);
      expect(enabledFlags.length).toBeGreaterThan(0);
    });
  });

  describe('Permission Resolution', () => {
    it('platform_super_admin role has the most permissions', async () => {
      const frCols = await getColumns(pool, 'dos', 'functional_roles');
      const rpCols = await getColumns(pool, 'dos', 'role_permissions');
      const roleCodeCol = frCols.has('code') ? 'code' : 'role_code';
      const roleIdCol = frCols.has('id') ? 'id' : 'role_id';
      const rpRoleCol = rpCols.has('functional_role_id') ? 'functional_role_id' : 'role_id';

      const { rows } = await pool.query(
        `SELECT fr.${roleCodeCol} AS code, count(rp.${rpRoleCol})::int AS perm_count
         FROM dos.functional_roles fr
         LEFT JOIN dos.role_permissions rp ON rp.${rpRoleCol} = fr.${roleIdCol}
         GROUP BY fr.${roleCodeCol}
         ORDER BY perm_count DESC
         LIMIT 5`,
      );
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].code).toBe('platform_super_admin');
    });

    it('every GRC role has at least read permissions', async () => {
      const grcRoles = ['compliance_officer', 'risk_manager', 'auditor', 'policy_owner', 'vendor_manager'];
      for (const roleCode of grcRoles) {
        const frCols = await getColumns(pool, 'dos', 'functional_roles');
        const rpCols = await getColumns(pool, 'dos', 'role_permissions');
        const roleCodeCol = frCols.has('code') ? 'code' : 'role_code';
        const roleIdCol = frCols.has('id') ? 'id' : 'role_id';
        const rpRoleCol = rpCols.has('functional_role_id') ? 'functional_role_id' : 'role_id';
        const { rows } = await pool.query(
          `SELECT count(*)::int AS c
           FROM dos.role_permissions rp
           JOIN dos.functional_roles fr ON fr.${roleIdCol} = rp.${rpRoleCol}
           WHERE fr.${roleCodeCol} = $1`,
          [roleCode],
        );
        expect(rows[0].c, `${roleCode} should have permissions`).toBeGreaterThan(0);
      }
    });
  });
});
