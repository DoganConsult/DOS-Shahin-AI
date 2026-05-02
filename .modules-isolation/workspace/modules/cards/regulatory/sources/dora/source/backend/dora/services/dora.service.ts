import { safeQuery, tenantSchema } from '../ports/database.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import type { DoraIctAssetCreateDTO, DoraIctAssetUpdateDTO, DoraResilienceTestCreateDTO } from '../types/dora.dto';
import type { GenericRow } from '@dos/types';

export async function list(tenantId: string, _query?: any): Promise<GenericRow[]> { return getIctAssets(tenantId); }
export async function getById(tenantId: string, id: string): Promise<GenericRow | null> { return getIctAssetById(tenantId, id); }
export async function create(tenantId: string, body: Record<string, unknown>, _userId?: string): Promise<GenericRow> { return createIctAsset(tenantId, (body as any)); }
export async function update(tenantId: string, id: string, body: Record<string, unknown>, _userId?: string): Promise<GenericRow | null> { return updateIctAsset(tenantId, id, body); }

export async function getIctAssets(tenantId: string, filters?: Record<string, string>): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".dora_ict_assets WHERE 1=1`;
  const params: string[] = [];
  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND status = $${params.length}`;
  }
  if (filters?.criticality) {
    params.push(filters.criticality);
    sql += ` AND criticality = $${params.length}`;
  }
  sql += ` ORDER BY created_at DESC`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function getIctAssetById(tenantId: string, assetId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dora_ict_assets WHERE asset_id = $1`, [assetId]
  );
  return result.rows[0] || null;
}

export async function createIctAsset(tenantId: string, dto: DoraIctAssetCreateDTO): Promise<GenericRow> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".dora_ict_assets (name, asset_type, criticality, vendor, description, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW()) RETURNING *`,
    [dto.name, dto.assetType, dto.criticality, dto.vendor || null, dto.description || null]
  );
  return result.rows[0];
}

export async function updateIctAsset(tenantId: string, assetId: string, dto: DoraIctAssetUpdateDTO): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (dto.name !== undefined) { fields.push(`name = $${idx++}`); params.push(dto.name); }
  if (dto.assetType !== undefined) { fields.push(`asset_type = $${idx++}`); params.push(dto.assetType); }
  if (dto.criticality !== undefined) { fields.push(`criticality = $${idx++}`); params.push(dto.criticality); }
  if (dto.vendor !== undefined) { fields.push(`vendor = $${idx++}`); params.push(dto.vendor); }
  if (dto.description !== undefined) { fields.push(`description = $${idx++}`); params.push(dto.description); }
  if (dto.status !== undefined) { fields.push(`status = $${idx++}`); params.push(dto.status); }
  if (fields.length === 0) return getIctAssetById(tenantId, assetId);
  fields.push(`updated_at = NOW()`);
  params.push(assetId);
  const result = await safeQuery(
    `UPDATE "${schema}".dora_ict_assets SET ${fields.join(', ')} WHERE asset_id = $${idx} RETURNING *`, params
  );
  return result.rows[0] || null;
}

export async function deleteIctAsset(tenantId: string, assetId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".dora_ict_assets WHERE asset_id = $1`, [assetId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getResilienceTests(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dora_resilience_tests ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function createResilienceTest(tenantId: string, dto: DoraResilienceTestCreateDTO): Promise<GenericRow> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".dora_resilience_tests (title, test_type, scope, scheduled_date, status, created_at)
     VALUES ($1, $2, $3, $4, 'planned', NOW()) RETURNING *`,
    [dto.title, dto.testType, dto.scope, dto.scheduledDate || null]
  );
  return result.rows[0];
}

export async function getMajorIncidents(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dora_major_incidents ORDER BY reported_at DESC`
  );
  return result.rows;
}

export async function getThreatIntel(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dora_threat_intel ORDER BY received_at DESC`
  );
  return result.rows;
}

export async function getBackupConfigs(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dora_backup_configs ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function getDoraOverview(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const [assets, tests, incidents, threats] = await Promise.all([
    safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".dora_ict_assets WHERE status = 'active'`),
    safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".dora_resilience_tests WHERE status IN ('planned','in_progress')`),
    safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".dora_major_incidents WHERE status != 'resolved'`),
    safeQuery(`SELECT COUNT(*) as cnt FROM "${schema}".dora_threat_intel WHERE acknowledged = false`),
  ]);
  return {
    activeAssets: parseInt(assets.rows[0]?.cnt || '0', 10),
    pendingTests: parseInt(tests.rows[0]?.cnt || '0', 10),
    openIncidents: parseInt(incidents.rows[0]?.cnt || '0', 10),
    unacknowledgedThreats: parseInt(threats.rows[0]?.cnt || '0', 10),
  };
}
