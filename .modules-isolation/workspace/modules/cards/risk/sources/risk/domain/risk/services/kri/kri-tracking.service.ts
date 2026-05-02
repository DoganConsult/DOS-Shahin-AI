import { logger } from '../../ports/logger.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

export interface KriDefinition {
  kri_id: string;
  risk_id: string;
  kri_name: string;
  threshold_value: number;
  threshold_direction: 'above' | 'below';
  current_value: number | null;
  breach_count: number;
  enabled: boolean;
}

export interface KriValueRecord {
  value_id: string;
  kri_id: string;
  risk_id: string;
  value: number;
  exceeded: boolean;
  recorded_at: string;
}

export async function recordKriValue(tenantId: string, input: {
  kriId: string;
  riskId: string;
  value: number;
  recordedBy?: string;
}): Promise<{ exceeded: boolean; threshold?: number; kriName?: string }> {
  const schema = tenantSchema(tenantId);

  // Get KRI definition
  const kriResult = await safeQuery(
    `SELECT kri_id, kri_name, threshold_value, threshold_direction, current_value
     FROM "${schema}".kri_tracking WHERE kri_id = $1 AND enabled = TRUE`,
    [input.kriId]
  );
  if (kriResult.rows.length === 0) {
    return { exceeded: false };
  }

  const kri = getFirstRow(kriResult);
  const threshold = Number(kri.threshold_value);
  const direction = kri.threshold_direction || 'above';
  const exceeded = direction === 'above' ? input.value > threshold : input.value < threshold;

  // Insert value record
  await safeQuery(
    `INSERT INTO "${schema}".kri_values (kri_id, tenant_id, risk_id, value, exceeded, recorded_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.kriId, tenantId, input.riskId, input.value, exceeded, input.recordedBy || SYSTEM_JOB_ACTOR]
  );

  // Update current value on tracking record
  await safeQuery(
    `UPDATE "${schema}".kri_tracking
     SET last_value = current_value, current_value = $1, last_recorded_at = NOW(),
         breach_count = breach_count + CASE WHEN $2 THEN 1 ELSE 0 END,
         updated_at = NOW()
     WHERE kri_id = $3`,
    [input.value, exceeded, input.kriId]
  );

  // If breached, fire event
  if (exceeded) {
    await eventBus.publish(({
          eventType: 'risk.exceeded_appetite',
          tenantId,
          sourceService: 'kri-tracking',
          severity: 'critical',
          entityType: 'risk',
          entityId: input.riskId,
          payload: {
            kriId: input.kriId,
            kriName: kri.kri_name,
            riskName: input.riskId,
            riskScore: input.value,
            maxScore: threshold,
            category: 'kri_breach',
            direction,
            currentValue: input.value,
            thresholdValue: threshold,
          },
        } as any));
    logger.info(`[KRI] Breach detected: ${kri.kri_name} = ${input.value} (threshold: ${direction} ${threshold})`);
  }

  return { exceeded, threshold, kriName: kri.kri_name };
}

export async function getKriHistory(tenantId: string, kriId: string, limit: number = 50): Promise<KriValueRecord[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT value_id, kri_id, risk_id, value, exceeded, recorded_at
     FROM "${schema}".kri_values WHERE kri_id = $1
     ORDER BY recorded_at DESC LIMIT $2`,
    [kriId, limit]
  );
  return result.rows;
}

export async function getKriBreaches(tenantId: string, riskId?: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const riskFilter = riskId ? ` AND kv.risk_id = '${riskId}'` : '';
  const result = await safeQuery(
    `SELECT kt.kri_id, kt.kri_name, kt.risk_id, kt.threshold_value, kt.threshold_direction,
            kt.current_value, kt.breach_count, kv.value AS breach_value, kv.recorded_at AS breach_at
     FROM "${schema}".kri_tracking kt
     JOIN "${schema}".kri_values kv ON kv.kri_id = kt.kri_id AND kv.exceeded = TRUE
     WHERE kt.enabled = TRUE${riskFilter}
     ORDER BY kv.recorded_at DESC LIMIT 100`,
    []
  );
  return result.rows;
}

export async function createKri(tenantId: string, input: {
  riskId: string;
  kriName: string;
  kriNameAr?: string;
  description?: string;
  unit?: string;
  thresholdValue: number;
  thresholdDirection?: 'above' | 'below';
}): Promise<KriDefinition | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".kri_tracking
         (risk_id, kri_name, kri_name_ar, kri_description, unit, threshold_value, threshold_direction)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [input.riskId, input.kriName, input.kriNameAr || null, input.description || null,
       input.unit || 'count', input.thresholdValue, input.thresholdDirection || 'above']
    );
    return getFirstRow(result) || null;
  } catch (err) {
    logger.warn(`[KRI] createKri failed: ${toErrorMessage(err)}`);
    return null;
  }
}
