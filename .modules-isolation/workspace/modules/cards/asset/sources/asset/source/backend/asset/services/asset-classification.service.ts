// ============================================
// Asset Classification Service
// Classification definitions + asset assignment
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

interface CreateClassificationInput {
  code: string;
  name_en: string;
  name_ar?: string;
  description?: string;
  level: number;
  color?: string;
  handling_requirements?: string;
  retention_period_days?: number;
  requires_encryption?: boolean;
  requires_dlp?: boolean;
}

export async function listClassifications(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`SELECT * FROM "${ts}".asset_classifications ORDER BY level`);
  return rows;
}

export async function getClassificationById(tenantId: string, id: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`SELECT * FROM "${ts}".asset_classifications WHERE classification_id = $1`, [id]);
  return rows[0] || null;
}

export async function createClassification(tenantId: string, input: CreateClassificationInput) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    INSERT INTO "${ts}".asset_classifications (
      code, name_en, name_ar, description, level, color,
      handling_requirements, retention_period_days, requires_encryption, requires_dlp
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
  `, [
    input.code, input.name_en, input.name_ar || '', input.description || '',
    input.level, input.color || null, input.handling_requirements || null,
    input.retention_period_days || null, input.requires_encryption ?? false, input.requires_dlp ?? false,
  ]);
  return rows[0];
}

export async function updateClassification(tenantId: string, id: string, updates: Partial<CreateClassificationInput>) {
  const ts = tenantSchema(tenantId);
  const allowed = ['code','name_en','name_ar','description','level','color','handling_requirements','retention_period_days','requires_encryption','requires_dlp'];
  const cols = Object.keys(updates).filter(k => allowed.includes(k));
  if (!cols.length) return null;
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => (updates as Record<string, unknown>)[c]);
  const { rows } = await safeQuery(
    `UPDATE "${ts}".asset_classifications SET ${sets.join(', ')}, updated_at = NOW() WHERE classification_id = $1 RETURNING *`,
    [id, ...vals],
  );
  return rows[0] || null;
}

export async function classifyAsset(tenantId: string, userId: string, assetId: string, classificationId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    UPDATE "${ts}".assets SET data_classification_id = $2, updated_at = NOW()
    WHERE asset_id = $1 AND deleted_at IS NULL RETURNING asset_id, data_classification_id
  `, [assetId, classificationId]);

  if (rows[0]) {
    emitEvent(({
          tenantId, userId, module: 'asset', event: 'asset_classified',
          entityType: 'asset', entityId: assetId,
          data: { classificationId },
        } as any)).catch(catchHandler(EC.EVENT_BUS));
  }
  return rows[0] || null;
}

export async function getClassificationDistribution(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT
      c.code, c.name_en, c.level, c.color,
      COUNT(a.asset_id)::int AS asset_count
    FROM "${ts}".asset_classifications c
    LEFT JOIN "${ts}".assets a ON a.data_classification_id = c.classification_id AND a.deleted_at IS NULL
    GROUP BY c.classification_id, c.code, c.name_en, c.level, c.color
    ORDER BY c.level
  `);
  return rows;
}
