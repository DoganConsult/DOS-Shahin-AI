import { masterQuery } from '@dos/db/master';

async function actor(): Promise<void> {
  await masterQuery(`SET dos.actor = 'dos-master'`);
}

export interface TenantSummary {
  tenant_id: string;
  tenant_code: string;
  tenant_name: string | null;
  status: string;
  schema_name: string;
}

export async function tenantSummary(tenantId: string): Promise<TenantSummary | null> {
  const r = await masterQuery(
    `SELECT tenant_id, tenant_code, tenant_name, status, schema_name
       FROM dos.tenants WHERE tenant_id = $1`,
    [tenantId],
  );
  if (!r.rows.length) return null;
  const t = r.rows[0] as Record<string, unknown>;
  return {
    tenant_id: String(t.tenant_id),
    tenant_code: String(t.tenant_code),
    tenant_name: t.tenant_name == null ? null : String(t.tenant_name),
    status: String(t.status),
    schema_name: String(t.schema_name),
  };
}

export async function tenantMembers(tenantId: string) {
  const r = await masterQuery(
    `SELECT user_id, role_code, status, membership_type, is_tenant_owner, created_at
       FROM dos.tenant_memberships
      WHERE tenant_id = $1 AND status = 'active'
      ORDER BY is_tenant_owner DESC, role_code, user_id`,
    [tenantId],
  );
  return r.rows;
}

export async function tenantEntitlements(tenantId: string) {
  const r = await masterQuery(
    `SELECT module_code, product_code, entitlement_status, source, starts_at, ends_at
       FROM dos.tenant_module_entitlements
      WHERE tenant_id = $1
      ORDER BY module_code`,
    [tenantId],
  );
  return r.rows;
}

export async function tenantSoDRules(tenantId: string) {
  // Module-level SoD rules apply globally; tenant inherits.
  const r = await masterQuery(
    `SELECT rule_code, conflict_type, role_a, role_b, severity, enabled
       FROM dos.module_sod_rules
      WHERE enabled = true
      ORDER BY severity DESC, rule_code
      LIMIT 100`,
  ).catch(() => ({ rows: [] }));
  return r.rows;
}

export async function tenantBrandTokens(tenantId: string) {
  const r = await masterQuery(
    `SELECT tokens FROM dos.tenant_brand_tokens WHERE tenant_id = $1 LIMIT 1`,
    [tenantId],
  ).catch(() => ({ rows: [] as Record<string, unknown>[] }));
  return (r.rows[0]?.tokens as Record<string, unknown>) ?? {};
}

export interface ComposerBootstrap {
  tenant: TenantSummary;
  members: unknown[];
  entitlements: unknown[];
  sod_rules: unknown[];
  brand: Record<string, unknown>;
  composer_version: string;
  generatedAt: string;
}

export async function composerBootstrap(tenantId: string): Promise<ComposerBootstrap> {
  const tenant = await tenantSummary(tenantId);
  if (!tenant) throw new Error('tenant_not_found');
  const [members, entitlements, sod_rules, brand] = await Promise.all([
    tenantMembers(tenantId),
    tenantEntitlements(tenantId),
    tenantSoDRules(tenantId),
    tenantBrandTokens(tenantId),
  ]);
  return {
    tenant,
    members,
    entitlements,
    sod_rules,
    brand,
    composer_version: 'a+ v1',
    generatedAt: new Date().toISOString(),
  };
}

export async function upsertMember(tenantId: string, userId: string, roleCode: string, ownedBy = false): Promise<void> {
  await actor();
  await masterQuery(
    `INSERT INTO dos.tenant_memberships (tenant_id, user_id, role_code, status, is_tenant_owner)
     VALUES ($1,$2,$3,'active',$4)
     ON CONFLICT DO NOTHING`,
    [tenantId, userId, roleCode, ownedBy],
  );
}
