// ============================================
// AI Model Experiments Service — Phase 9, Step 9.1
// SOC 2 PI1.3 (processing accuracy), A/B testing
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow as _GenericRow } from '@dos/types';

// 1. createExperiment
export async function createExperiment(
  tenantId: string,
  experiment: Record<string, unknown>,
): Promise<{ id: string }> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".ai_model_experiments
       (system_id, experiment_name, hypothesis,
        variant_a_config, variant_b_config, traffic_split_pct,
        start_date, end_date, primary_metric, success_threshold, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`,
    [
      experiment.system_id, experiment.experiment_name,
      experiment.hypothesis ?? null,
      JSON.stringify(experiment.variant_a_config ?? {}),
      JSON.stringify(experiment.variant_b_config ?? {}),
      experiment.traffic_split_pct ?? 50,
      experiment.start_date ?? null, experiment.end_date ?? null,
      experiment.primary_metric, experiment.success_threshold ?? null,
      'draft',
    ],
  );
  return { id: rows[0].id };
}

// 2. recordVariantMetrics
export async function recordVariantMetrics(
  tenantId: string,
  experimentId: string,
  variant: 'variant_a' | 'variant_b',
  metrics: Record<string, unknown>,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const resultCol = variant === 'variant_a' ? 'variant_a_result' : 'variant_b_result';
  const sampleCol = variant === 'variant_a' ? 'sample_size_a' : 'sample_size_b';

  await safeQuery(
    `UPDATE "${schema}".ai_model_experiments
     SET ${resultCol} = $1, ${sampleCol} = ${sampleCol} + $2, updated_at = now()
     WHERE id = $3`,
    [JSON.stringify(metrics), metrics.sample_count ?? 1, experimentId],
  );
}

// 3. declareWinner
export async function declareWinner(
  tenantId: string,
  experimentId: string,
  winner: string,
  significance: number,
  declaredBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".ai_model_experiments
     SET winner = $1, statistical_significance = $2,
         declared_by = $3, declared_at = now(),
         status = 'completed', updated_at = now()
     WHERE id = $4`,
    [winner, significance, declaredBy, experimentId],
  );
}

// 4. getExperimentById
export async function getExperimentById(
  tenantId: string,
  experimentId: string,
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".ai_model_experiments WHERE id = $1`,
    [experimentId],
  );
  return rows[0] ?? null;
}

// 5. listExperiments
export async function listExperiments(
  tenantId: string,
  systemId?: string,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  if (systemId) {
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".ai_model_experiments
       WHERE system_id = $1 ORDER BY created_at DESC`,
      [systemId],
    );
    return rows;
  }
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".ai_model_experiments ORDER BY created_at DESC`,
  );
  return rows;
}
