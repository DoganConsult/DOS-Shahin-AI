// ============================================
// Shahin — Scoring Policy Service
// CRUD for scoring policies and weighted
// assessment score recalculation
// ============================================

import { v4 as uuid } from "uuid";
import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// === Scoring Policy CRUD ===

export async function createScoringPolicy(
  tenantId: string,
  data: { name: string; weights: Record<string, number>; is_default?: boolean }
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const policyId = uuid();

  const result = await safeQuery(
    `INSERT INTO "${schema}".scoring_policies
      (policy_id, name, weights, is_default)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [policyId, data.name, JSON.stringify(data.weights), data.is_default ?? false]
  );
  return getFirstRow(result);
}

export async function getScoringPolicies(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".scoring_policies ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function getScoringPolicyById(
  tenantId: string,
  policyId: string
): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".scoring_policies WHERE policy_id = $1`,
    [policyId]
  );
  return getFirstRow(result) || null;
}

export async function updateScoringPolicy(
  tenantId: string,
  policyId: string,
  data: Partial<{ name: string; weights: Record<string, number>; is_default: boolean }>
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const fields: string[] = [];
  const params: unknown[] = [policyId];
  let idx = 2;
  if (data.name !== undefined) { fields.push(`name = $${idx++}`); params.push(data.name); }
  if (data.weights !== undefined) { fields.push(`weights = $${idx++}::jsonb`); params.push(JSON.stringify(data.weights)); }
  if (data.is_default !== undefined) { fields.push(`is_default = $${idx++}`); params.push(data.is_default); }
  if (fields.length === 0) return undefined;
  fields.push(`updated_at = NOW()`);
  const result = await safeQuery(
    `UPDATE "${schema}".scoring_policies SET ${fields.join(', ')} WHERE policy_id = $1 RETURNING *`,
    params,
  );
  return result.rows[0];
}

export async function deleteScoringPolicy(
  tenantId: string,
  policyId: string
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".scoring_policies WHERE policy_id = $1 RETURNING policy_id`,
    [policyId]
  );
  return result.rows.length > 0;
}

// === Weighted Score Calculation ===

/**
 * Pure function: calculates a weighted assessment score from items and policy weights.
 *
 * Each item has a `control_node_id` (used to look up its category) and a `status`.
 * `categoryMap` maps control_node_id → category name.
 * `weights` maps category name → weight decimal.
 *
 * For each category present in weights:
 *   categoryScore = (compliant * 1.0 + partially_compliant * 0.5) / applicable
 * Final score = sum(categoryScore * weight) / sum(weights) * 100
 *
 * Items whose category is not in the weights map are ignored.
 * Returns 0 when there are no applicable items or no matching weights.
 */
export function calculateWeightedScorePure(
  items: { control_node_id: string; status: string }[],
  categoryMap: Record<string, string>,
  weights: Record<string, number>
): number {
  // Group items by category
  const byCategory: Record<string, { status: string }[]> = {};
  for (const item of items) {
    const category = categoryMap[item.control_node_id];
    if (category && weights[category] !== undefined) {
      if (!byCategory[category]) byCategory[category] = [];
      byCategory[category].push(item);
    }
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [category, catItems] of Object.entries(byCategory)) {
    const applicable = catItems.filter((i) => i.status !== "not_applicable");
    if (applicable.length === 0) continue;

    const compliant = applicable.filter((i) => i.status === "compliant").length;
    const partial = applicable.filter((i) => i.status === "partially_compliant").length;
    const categoryScore = (compliant * 1.0 + partial * 0.5) / applicable.length;

    const weight = weights[category];
    weightedSum += categoryScore * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return (weightedSum / totalWeight) * 100;
}

/**
 * Applies a scoring policy to an assessment:
 * 1. Fetches the scoring policy weights
 * 2. Fetches all assessment items
 * 3. Builds a category map from control_node_id → category (using instrument_structure)
 * 4. Calculates the weighted score
 * 5. Updates the assessment's score field
 * 6. Returns the new score
 */
export async function applyPolicy(
  tenantId: string,
  assessmentId: string,
  policyId: string
): Promise<number> {
  const schema = tenantSchema(tenantId);
  const policyRes = await safeQuery(
    `SELECT weights FROM "${schema}".scoring_policies WHERE policy_id = $1`,
    [policyId],
  );
  const policy = policyRes.rows[0];
  if (!policy) return 0;
  const weights: Record<string, number> = typeof policy.weights === 'string'
    ? JSON.parse(policy.weights)
    : (policy.weights || {});

  const itemsRes = await safeQuery(
    `SELECT ai.control_node_id, ai.status
     FROM "${schema}".compliance_assessment_items ai
     WHERE ai.assessment_id = $1`,
    [assessmentId],
  );
  const categoryMapRes = await safeQuery(
    `SELECT node_id, category FROM instrument_structure WHERE node_id = ANY($1::text[])`,
    [itemsRes.rows.map((r: Record<string, unknown>) => r.control_node_id)],
  );
  const categoryMap: Record<string, string> = {};
  for (const row of categoryMapRes.rows) {
    categoryMap[row.node_id as string] = row.category as string;
  }

  const score = calculateWeightedScorePure(
    itemsRes.rows as { control_node_id: string; status: string }[],
    categoryMap,
    weights,
  );

  await safeQuery(
    `UPDATE "${schema}".compliance_assessments SET score = $2, updated_at = NOW() WHERE assessment_id = $1`,
    [assessmentId, score],
  );
  return score;
}
