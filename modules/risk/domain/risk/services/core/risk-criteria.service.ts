import { logger } from '@dos/module-sdk';
import { safeQuery, tenantSchema } from '../../ports/database.port';

export interface RiskCriteria {
  id: string;
  tenantId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  category: string;
  likelihoodScale: number[];
  impactScale: number[];
  scoringMethod: 'matrix' | 'weighted' | 'custom';
  weights?: Record<string, number>;
  thresholds: { low: number; medium: number; high: number; critical: number };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getCriteria(tenantId: string): Promise<RiskCriteria[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".risk_scoring_models WHERE deleted_at IS NULL ORDER BY created_at DESC`,
    );
    return result.rows.map(mapRowToCriteria);
  } catch (err) {
    logger.warn(`[risk-criteria] Failed to fetch criteria`, { tenantId, error: (err as Error).message });
    return [];
  }
}

export async function getCriteriaById(tenantId: string, criteriaId: string): Promise<RiskCriteria | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".risk_scoring_models WHERE id = $1 AND deleted_at IS NULL`,
      [criteriaId],
    );
    return result.rows.length > 0 ? mapRowToCriteria(result.rows[0]) : null;
  } catch { return null; }
}

export async function createCriteria(
  tenantId: string, data: Partial<RiskCriteria>, userId: string,
): Promise<RiskCriteria> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".risk_scoring_models
     (tenant_id, code, name_en, name_ar, description_en, description_ar, category, scoring_method, weights, thresholds, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [tenantId, data.code, data.nameEn, data.nameAr, data.descriptionEn, data.descriptionAr,
     data.category, data.scoringMethod || 'matrix', JSON.stringify(data.weights || {}),
     JSON.stringify(data.thresholds || { low: 4, medium: 9, high: 15, critical: 20 }),
     data.isActive ?? true, userId],
  );
  logger.info(`[risk-criteria] created`, { tenantId, criteriaId: result.rows[0]?.id });
  return mapRowToCriteria(result.rows[0]);
}

export async function updateCriteria(
  tenantId: string, criteriaId: string, data: Partial<RiskCriteria>, userId: string,
): Promise<RiskCriteria | null> {
  const schema = tenantSchema(tenantId);
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.nameEn !== undefined) { fields.push(`name_en = $${idx++}`); values.push(data.nameEn); }
  if (data.nameAr !== undefined) { fields.push(`name_ar = $${idx++}`); values.push(data.nameAr); }
  if (data.descriptionEn !== undefined) { fields.push(`description_en = $${idx++}`); values.push(data.descriptionEn); }
  if (data.descriptionAr !== undefined) { fields.push(`description_ar = $${idx++}`); values.push(data.descriptionAr); }
  if (data.scoringMethod !== undefined) { fields.push(`scoring_method = $${idx++}`); values.push(data.scoringMethod); }
  if (data.weights !== undefined) { fields.push(`weights = $${idx++}`); values.push(JSON.stringify(data.weights)); }
  if (data.thresholds !== undefined) { fields.push(`thresholds = $${idx++}`); values.push(JSON.stringify(data.thresholds)); }
  if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.isActive); }

  if (fields.length === 0) return getCriteriaById(tenantId, criteriaId);

  fields.push(`updated_at = NOW()`);
  fields.push(`updated_by = $${idx++}`); values.push(userId);
  values.push(criteriaId);

  const result = await safeQuery(
    `UPDATE "${schema}".risk_scoring_models SET ${fields.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
    values,
  );
  return result.rows.length > 0 ? mapRowToCriteria(result.rows[0]) : null;
}

export async function deleteCriteria(tenantId: string, criteriaId: string, userId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".risk_scoring_models SET deleted_at = NOW(), updated_by = $1 WHERE id = $2 AND deleted_at IS NULL`,
    [userId, criteriaId],
  );
  return (result.rowCount ?? 0) > 0;
}

function mapRowToCriteria(row: any): RiskCriteria {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    code: row.code ?? '',
    nameEn: row.name_en ?? row.name ?? '',
    nameAr: row.name_ar ?? '',
    descriptionEn: row.description_en ?? row.description ?? '',
    descriptionAr: row.description_ar ?? '',
    category: row.category ?? 'default',
    likelihoodScale: [1, 2, 3, 4, 5],
    impactScale: [1, 2, 3, 4, 5],
    scoringMethod: row.scoring_method ?? 'matrix',
    weights: typeof row.weights === 'string' ? JSON.parse(row.weights) : row.weights ?? {},
    thresholds: typeof row.thresholds === 'string' ? JSON.parse(row.thresholds) : row.thresholds ?? { low: 4, medium: 9, high: 15, critical: 20 },
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
