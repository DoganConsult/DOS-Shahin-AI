// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

export type AssetType = 'agent' | 'model' | 'prompt' | 'tool' | 'provider' | 'workflow' | 'binding';
export type ScopeType = 'global' | 'tenant';
export type LifecycleStatus = 'draft' | 'review' | 'approved' | 'active' | 'deprecated' | 'archived';
export type AssetStatus = 'enabled' | 'disabled' | 'suspended';
export type SourceType = 'seeded' | 'discovered' | 'manual' | 'system';

export interface AIAsset {
  asset_id: string;
  asset_type: AssetType;
  asset_key: string;
  display_name: string;
  description: string | null;
  scope_type: ScopeType;
  tenant_id: string;
  lifecycle_status: LifecycleStatus;
  status: AssetStatus;
  business_owner: string | null;
  technical_owner: string | null;
  governance_owner: string | null;
  source_type: SourceType;
  source_ref: string | null;
  metadata: Record<string, unknown>;
  tags: string[];
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAssetInput {
  asset_type: AssetType;
  asset_key: string;
  display_name: string;
  description?: string;
  scope_type?: ScopeType;
  lifecycle_status?: LifecycleStatus;
  status?: AssetStatus;
  business_owner?: string;
  technical_owner?: string;
  governance_owner?: string;
  source_type?: SourceType;
  source_ref?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  created_by?: string;
}

export interface UpdateAssetInput {
  display_name?: string;
  description?: string;
  lifecycle_status?: LifecycleStatus;
  status?: AssetStatus;
  business_owner?: string;
  technical_owner?: string;
  governance_owner?: string;
  source_ref?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  updated_by?: string;
}

export interface AssetQuery {
  asset_type?: AssetType;
  scope_type?: ScopeType;
  lifecycle_status?: LifecycleStatus;
  status?: AssetStatus;
  source_type?: SourceType;
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

const VALID_ASSET_TYPES: AssetType[] = ['agent', 'model', 'prompt', 'tool', 'provider', 'workflow', 'binding'];
const VALID_SCOPE_TYPES: ScopeType[] = ['global', 'tenant'];
const VALID_LIFECYCLE: LifecycleStatus[] = ['draft', 'review', 'approved', 'active', 'deprecated', 'archived'];
const VALID_STATUS: AssetStatus[] = ['enabled', 'disabled', 'suspended'];
const VALID_SOURCE: SourceType[] = ['seeded', 'discovered', 'manual', 'system'];

const LIFECYCLE_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  draft: ['review', 'archived'],
  review: ['approved', 'draft'],
  approved: ['active', 'draft'],
  active: ['deprecated', 'suspended' as any],
  deprecated: ['archived', 'active'],
  archived: [],
};

function validate(field: string, value: string, allowed: string[]): void {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid ${field}: '${value}'. Allowed: ${allowed.join(', ')}`);
  }
}

export async function createAsset(tenantId: string, input: CreateAssetInput): Promise<AIAsset> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function getAssetById(tenantId: string, assetId: string): Promise<AIAsset | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".ai_asset_inventory WHERE asset_id = $1`,
    [assetId],
  );
  return (getFirstRow(result) as AIAsset) || null;
}

export async function getAssetByKey(
  tenantId: string,
  assetType: AssetType,
  assetKey: string,
  scopeType?: ScopeType,
): Promise<AIAsset | null> {
  const schema = tenantSchema(tenantId);
  const scope = scopeType || 'tenant';
  const result = await safeQuery(
    `SELECT * FROM "${schema}".ai_asset_inventory
     WHERE asset_type = $1 AND asset_key = $2 AND scope_type = $3 AND tenant_id = $4
     LIMIT 1`,
    [assetType, assetKey, scope, tenantId],
  );
  return (getFirstRow(result) as AIAsset) || null;
}

export async function updateAsset(
  tenantId: string,
  assetId: string,
  input: UpdateAssetInput,
): Promise<AIAsset | null> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function listAssets(tenantId: string, q: AssetQuery = {}): Promise<{ assets: AIAsset[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const wheres: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (q.asset_type) { wheres.push(`asset_type = $${idx}`); params.push(q.asset_type); idx++; }
  if (q.scope_type) { wheres.push(`scope_type = $${idx}`); params.push(q.scope_type); idx++; }
  if (q.lifecycle_status) { wheres.push(`lifecycle_status = $${idx}`); params.push(q.lifecycle_status); idx++; }
  if (q.status) { wheres.push(`status = $${idx}`); params.push(q.status); idx++; }
  if (q.source_type) { wheres.push(`source_type = $${idx}`); params.push(q.source_type); idx++; }
  if (q.tag) { wheres.push(`$${idx} = ANY(tags)`); params.push(q.tag); idx++; }
  if (q.search) {
    wheres.push(`(display_name ILIKE $${idx} OR asset_key ILIKE $${idx} OR description ILIKE $${idx})`);
    params.push(`%${q.search}%`);
    idx++;
  }

  const where = wheres.join(' AND ');
  const limit = Math.min(q.limit || 100, 500);
  const offset = q.offset || 0;

  const [dataResult, countResult] = await Promise.all([
    safeQuery(
      `SELECT * FROM "${schema}".ai_asset_inventory WHERE ${where} ORDER BY asset_type, asset_key LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${schema}".ai_asset_inventory WHERE ${where}`,
      params,
    ),
  ]);

  return {
    assets: dataResult.rows as AIAsset[],
    total: getFirstRow(countResult)?.total || 0,
  };
}

export async function deleteAsset(tenantId: string, assetId: string): Promise<boolean> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function upsertAsset(tenantId: string, input: CreateAssetInput): Promise<AIAsset> {
  validate('asset_type', input.asset_type, VALID_ASSET_TYPES);
  if (input.scope_type) validate('scope_type', input.scope_type, VALID_SCOPE_TYPES);

  const schema = tenantSchema(tenantId);
  const scopeType = input.scope_type || 'tenant';

  const result = await safeQuery(
    `INSERT INTO "${schema}".ai_asset_inventory
       (asset_type, asset_key, display_name, description,
        scope_type, tenant_id,
        lifecycle_status, status,
        business_owner, technical_owner, governance_owner,
        source_type, source_ref,
        metadata, tags,
        created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     ON CONFLICT (scope_type, asset_type, asset_key, tenant_id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       description = EXCLUDED.description,
       source_ref = EXCLUDED.source_ref,
       metadata = EXCLUDED.metadata,
       tags = EXCLUDED.tags,
       updated_at = NOW()
     RETURNING *`,
    [
      input.asset_type,
      input.asset_key.trim(),
      input.display_name.trim(),
      input.description || null,
      scopeType,
      tenantId,
      input.lifecycle_status || 'draft',
      input.status || 'enabled',
      input.business_owner || null,
      input.technical_owner || null,
      input.governance_owner || null,
      input.source_type || 'manual',
      input.source_ref || null,
      JSON.stringify(input.metadata || {}),
      input.tags || [],
      input.created_by || 'system',
    ],
  );
  return getFirstRow(result) as AIAsset;
}

export function getLifecycleTransitions(current: LifecycleStatus): LifecycleStatus[] {
  return LIFECYCLE_TRANSITIONS[current] || [];
}
