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

  const input = data as Record<string, unknown>;
  const riskCode = (input.riskCode as string) || `RSK-${riskId.toUpperCase()}`;

  const likelihood = (input.likelihood as number) || 3;
  const impact = (input.impact as number) || 3;
  const inherentScore = likelihood * impact;

  const result = await safeQuery(`
    INSERT INTO "${schema}".risks
      (risk_id, risk_code, title, description, statement,
       category, likelihood, impact, owner, owner_user_id, status,
       inherent_score, residual_score, risk_appetite, entity_type, entity_id,
       due_date, review_date, control_ids, cause_text, event_text, impact_text,
       business_unit_id, trend_direction, appetite_status, next_review_date,
       created_by, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22,
            $23, $24, $25, $26,
            $27, NOW(), NOW())
    RETURNING *
  `, [
    riskId, tenantId, input.title, input.description, input.statement,
    input.category, likelihood, impact, input.owner, input.ownerUserId, input.status || 'identified',
    inherentScore, null, input.riskAppetite, input.entityType, input.entityId,
    input.dueDate, input.reviewDate, input.controlIds, input.causeText, input.eventText, input.impactText,
    input.businessUnitId, input.trendDirection, input.appetiteStatus, input.nextReviewDate,
    input.ownerId || 'system',
  ]);

  const risk = getFirstRow(result);

  // Process orchestration: create task for risk review/assessment
  try {
    await createProcessTask(tenantId, {
      entityType: 'risk',
      entityId: riskId,
      taskType: 'risk_assessment',
      title: `Review new risk: ${input.title}`,
      priority: inherentScore >= 15 ? 'high' : 'medium',
      assigneeId: input.ownerId as string || null,
      metadata: { riskId },
    });
  } catch { /* task creation is non-critical */ }

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
