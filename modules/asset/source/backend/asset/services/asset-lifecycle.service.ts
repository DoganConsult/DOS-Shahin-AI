/**
 * Asset Lifecycle Service
 * Manages lifecycle stages for assets from procurement to retirement.
 * @owner Module:asset
 */
import { safeQuery, tenantSchema } from '../ports/database.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

const STAGES = ['procurement', 'deployment', 'active', 'maintenance', 'decommission', 'retired'] as const;
type _AssetStage = typeof STAGES[number];

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  procurement: ['deployment'],
  deployment: ['active'],
  active: ['maintenance', 'decommission'],
  maintenance: ['active', 'decommission'],
  decommission: ['retired'],
  retired: [],
};

/** Get all lifecycle stages in order. */
export function getLifecycleStages(): string[] {
  return [...STAGES];
}

/** Get distribution of assets across lifecycle stages. */
export async function getLifecycleDistribution(tenantId: string): Promise<Array<{ stage: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(`SELECT lifecycle_stage AS stage, COUNT(*)::int AS count FROM "${schema}".assets WHERE deleted_at IS NULL GROUP BY lifecycle_stage ORDER BY lifecycle_stage`, []);
    return result.rows;
  } catch { return []; }
}

/** Transition an asset to a new lifecycle stage. */
export async function transitionStage(
  tenantId: string, assetId: string, targetStage: string, userId: string,
): Promise<{ fromStage: string; toStage: string }> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(`SELECT lifecycle_stage FROM "${schema}".assets WHERE id = $1 AND deleted_at IS NULL`, [assetId]);

  if (current.rows.length === 0) { const e: unknown = new Error('Asset not found'); e.statusCode = 404; throw e; }
  const fromStage: string = current.rows[0].lifecycle_stage || 'procurement';
  const allowed = ALLOWED_TRANSITIONS[fromStage] || [];

  if (!allowed.includes(targetStage)) { const e: unknown = new Error(`Cannot transition from ${fromStage} to ${targetStage}`); e.statusCode = 400; throw e; }
  await safeQuery(`UPDATE "${schema}".assets SET lifecycle_stage = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3`, [targetStage, userId, assetId]);
  await safeQuery(`INSERT INTO "${schema}".asset_lifecycle_events (asset_id, from_stage, to_stage, changed_by, changed_at) VALUES ($1,$2,$3,$4,NOW())`,
    [assetId, fromStage, targetStage, userId]).catch(catchHandler(EC.EVENT_BUS));
  return { fromStage, toStage: targetStage };
}

/** Get lifecycle event history for an asset. */
export async function getLifecycleEvents(tenantId: string, assetId: string): Promise<Array<{ fromStage: string; toStage: string; changedBy: string; changedAt: string }>> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(`SELECT from_stage AS "fromStage", to_stage AS "toStage", changed_by AS "changedBy", changed_at AS "changedAt" FROM "${schema}".asset_lifecycle_events WHERE asset_id = $1 ORDER BY changed_at ASC`, [assetId]);
    return result.rows;
  } catch { return []; }
}

/** Get valid transitions from a given stage. */
export function getValidTransitions(currentStage: string): string[] {
  return ALLOWED_TRANSITIONS[currentStage] || [];
}
