// ============================================
// Risk Intake Activities — spec Workflow 1
// Create → Categorize → Assign → Score → Review → Publish
// ============================================

import { query as _query, safeQuery, tenantSchema } from '@dos/db';
import { createNotification } from '../../modules/notification/services/notification.service';
import { emitEvent } from '@dos/platform-core/events';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface RiskIntakeActivities {
  validateRiskEntry(tenantId: string, riskId: string): Promise<void>;
  categorizeRisk(tenantId: string, riskId: string, description: string): Promise<string>;
  assignRiskOwner(tenantId: string, riskId: string, category: string): Promise<string>;
  performInitialScoring(tenantId: string, riskId: string): Promise<number>;
  requestRiskReview(tenantId: string, riskId: string, reviewerId: string): Promise<void>;
  rejectRisk(tenantId: string, riskId: string, reason: string, reviewerId: string): Promise<void>;
  publishRiskToRegister(tenantId: string, riskId: string, approvedBy: string): Promise<void>;
}

export async function validateRiskEntry(tenantId: string, riskId: string): Promise<void> {
  const ts = tenantSchema(tenantId);
  const result = await safeQuery(`SELECT risk_id FROM ${ts}.risks WHERE risk_id = $1 AND deleted_at IS NULL`, [riskId]);
  if (!result.rows[0]) throw new Error(`Risk ${riskId} not found in tenant ${tenantId}`);
}

export async function categorizeRisk(tenantId: string, riskId: string, description: string): Promise<string> {
  const ts = tenantSchema(tenantId);
  // Check if already categorized
  const existing = await safeQuery(`SELECT category FROM ${ts}.risks WHERE risk_id = $1`, [riskId]);
  if (existing.rows[0]?.category && existing.rows[0].category !== 'uncategorized') {
    return existing.rows[0].category;
  }
  // Simple keyword-based categorization (production would use AI)
  const desc = (description || '').toLowerCase();
  let category = 'operational';
  if (desc.includes('cyber') || desc.includes('data') || desc.includes('security')) category = 'cyber';
  else if (desc.includes('compliance') || desc.includes('regulatory')) category = 'compliance';
  else if (desc.includes('financial') || desc.includes('market') || desc.includes('credit')) category = 'financial';
  else if (desc.includes('strategic') || desc.includes('reputation')) category = 'strategic';
  else if (desc.includes('vendor') || desc.includes('third')) category = 'third_party';

  await safeQuery(`UPDATE ${ts}.risks SET category = $2, updated_at = NOW() WHERE risk_id = $1`, [riskId, category]);
  return category;
}

export async function assignRiskOwner(tenantId: string, riskId: string, _category: string): Promise<string> {
  const ts = tenantSchema(tenantId);
  // Find lowest-workload team member for the risk category via RACI
  const result = await safeQuery(`
    SELECT r.user_id FROM ${ts}.raci_assignments r
    WHERE r.scope_type = 'risk' AND r.raci_role IN ('R','A')
    ORDER BY (SELECT COUNT(*) FROM ${ts}.risks ri WHERE ri.owner = r.user_id AND ri.status = 'active') ASC
    LIMIT 1
  `, []);
  const ownerId = result.rows[0]?.user_id || 'unassigned';
  await safeQuery(`UPDATE ${ts}.risks SET owner = $2, owner_user_id = $2, updated_at = NOW() WHERE risk_id = $1`, [riskId, ownerId]);
  return ownerId;
}

export async function performInitialScoring(tenantId: string, riskId: string): Promise<number> {
  const ts = tenantSchema(tenantId);
  const result = await safeQuery(`SELECT likelihood, impact FROM ${ts}.risks WHERE risk_id = $1`, [riskId]);
  const r = result.rows[0];
  const likelihood = r?.likelihood || 3;
  const impact = r?.impact || 3;
  const score = likelihood * impact;
  // Create initial assessment record
  await safeQuery(`
    INSERT INTO ${ts}.risk_assessments (risk_id, assessment_type, assessor_id, inherent_likelihood, inherent_impact, inherent_score, methodology)
    VALUES ($1, 'initial', 'system', $2, $3, $4, 'intake_workflow')
  `, [riskId, likelihood, impact, score]);
  return score;
}

export async function requestRiskReview(tenantId: string, riskId: string, reviewerId: string): Promise<void> {
  const ts = tenantSchema(tenantId);
  await safeQuery(`UPDATE ${ts}.risks SET status = 'pending_review', updated_at = NOW() WHERE risk_id = $1`, [riskId]);
  await createNotification(tenantId, {
    userId: reviewerId,
    type: 'risk_review_requested',
    title: `Risk review requested: ${riskId}`,
    body: `Please review and approve/reject risk ${riskId} for publication to the register.`,
    entityType: 'risk',
    entityId: riskId,
  }).catch(catchHandler(EC.EVENT_BUS));
}

export async function rejectRisk(tenantId: string, riskId: string, reason: string, reviewerId: string): Promise<void> {
  const ts = tenantSchema(tenantId);
  await safeQuery(`UPDATE ${ts}.risks SET status = 'draft', updated_at = NOW() WHERE risk_id = $1`, [riskId]);
  await safeQuery(`
    INSERT INTO ${ts}.risk_status_history (risk_id, previous_status, new_status, changed_by, reason)
    VALUES ($1, 'pending_review', 'draft', $2, $3)
  `, [riskId, reviewerId, reason]);
}

export async function publishRiskToRegister(tenantId: string, riskId: string, approvedBy: string): Promise<void> {
  const ts = tenantSchema(tenantId);
  await safeQuery(`UPDATE ${ts}.risks SET status = 'active', updated_at = NOW() WHERE risk_id = $1`, [riskId]);
  await safeQuery(`
    INSERT INTO ${ts}.risk_status_history (risk_id, previous_status, new_status, changed_by, reason)
    VALUES ($1, 'pending_review', 'active', $2, 'Published to register via intake workflow')
  `, [riskId, approvedBy]);
  emitEvent({ tenantId, userId: approvedBy, module: 'risks', event: 'risk_published', entityType: 'risk', entityId: riskId });
}
