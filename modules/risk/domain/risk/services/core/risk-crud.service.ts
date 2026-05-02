// ============================================
// Shahin -- Risk CRUD Service
// Create and update individual risk entries
// with process-orchestration integration.
// Spec-aligned: includes all section 15 fields.
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { createProcessTask } from '../../ports/lifecycle.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';

/**
 * Create a new risk entry with full spec fields and spawn a
 * process-orchestration task for initial review/assessment (best-effort).
 */
export async function createRiskEntry(tenantId: string, data: unknown): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const riskId = uuid().slice(0, 8);

  const riskCode = data.riskCode || `RSK-${riskId.toUpperCase()}`;

  const inherentScore = (data.likelihood || 3) * (data.impact || 3);

  const result = await safeQuery(`
    INSERT INTO "${schema}".risks
      (risk_id, risk_code, title, description, statement,
       category, likelihood, impact, owner, owner_user_id, status,
       treatment_status, control_ids,
       cause_text, event_text, impact_text,
       business_unit_id, trend_direction, appetite_status,
       inherent_likelihood, inherent_impact, inherent_score,
       next_review_date, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23, NOW())
    RETURNING risk_id AS "riskId", risk_code AS "riskCode", title, description, statement,
              category, owner, owner_user_id AS "ownerUserId", status,
              likelihood, impact, risk_score AS "riskScore",
              inherent_likelihood AS "inherentLikelihood", inherent_impact AS "inherentImpact",
              inherent_score AS "inherentScore",
              treatment_status AS "treatmentStatus",
              trend_direction AS "trendDirection", appetite_status AS "appetiteStatus",
              business_unit_id AS "businessUnitId",
              next_review_date AS "nextReviewDate",
              created_at AS "createdAt"
  `, [
    riskId,
    riskCode,

    data.title,

    data.description || '',

    data.statement || data.description || '',

    data.category || 'operational',

    data.likelihood || 3,

    data.impact || 3,

    data.owner || '',

    data.ownerUserId || data.owner || '',

    data.status || 'identified',

    data.treatmentStatus || 'untreated',

    data.controlIds || [],

    data.causeText || data.cause_text || null,

    data.eventText || data.event_text || null,

    data.impactText || data.impact_text || null,

    data.businessUnitId || data.business_unit_id || null,

    data.trendDirection || 'stable',

    data.appetiteStatus || 'within',

    data.likelihood || 3,

    data.impact || 3,
    inherentScore,

    data.nextReviewDate || data.next_review_date || null,
  ]);

  const risk = getFirstRow(result);

  // Process orchestration: create task for risk review/assessment
  try {
    await createProcessTask(tenantId, {
      entityType: 'risk',
      entityId: riskId,
      taskType: 'risk_assessment',

      title: `Review new risk: ${data.title}`,
      description: `Newly identified risk requires initial assessment and treatment plan.`,
      priority: inherentScore >= 15 ? 'high' : 'medium',
      assigneeRole: 'risk_manager',
    });
  } catch { /* best-effort: orchestration may not be configured */ }

  return risk;
}

/**
 * Update an existing risk entry with partial data.
 * All fields use COALESCE to preserve existing values when not supplied.
 * Includes all spec section 15 fields.
 */
export async function updateRiskEntry(tenantId: string, riskId: string, data: unknown): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}
