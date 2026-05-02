// ============================================
// Risk Work Queue Service — spec section 8.B
// Enterprise-grade personal work queue for
// risk managers, owners, and reviewers.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

export interface WorkQueueResult {
  risksPendingReview: Record<string, unknown>[];
  assessmentsDue: Record<string, unknown>[];
  indicatorBreaches: Record<string, unknown>[];
  treatmentTasksDue: Record<string, unknown>[];
  escalationsPending: Record<string, unknown>[];
  myIssues: Record<string, unknown>[];
  counts: {
    pendingReview: number;
    assessmentsDue: number;
    indicatorBreaches: number;
    treatmentsDue: number;
    escalations: number;
    issues: number;
    total: number;
  };
}

export async function getWorkQueue(tenantId: string, userId: string): Promise<WorkQueueResult> {
  const ts = tenantSchema(tenantId);

  const [pendingReview, assessmentsDue, breaches, treatmentsDue, escalations, issues] = await Promise.all([
    // Risks assigned to user that need review (draft, identified, or pending_review)
    safeQuery(`
      SELECT r.risk_id, r.risk_code, r.title, r.category, r.status,
             COALESCE(r.inherent_score, r.risk_score, r.likelihood * r.impact) AS risk_score,
             COALESCE(r.residual_score, r.risk_score) AS residual_score,
             r.trend_direction, r.appetite_status, r.next_review_date,
             r.updated_at, r.owner, r.owner_user_id
      FROM ${ts}.risks r
      WHERE r.deleted_at IS NULL
        AND r.status IN ('identified', 'draft', 'pending_review')
        AND (r.owner = $1 OR r.owner_user_id = $1)
      ORDER BY COALESCE(r.inherent_score, r.risk_score, r.likelihood * r.impact) DESC,
               r.updated_at DESC
      LIMIT 25
    `, [userId]).then(r => r.rows).catch((): Record<string, unknown>[] => []),

    // Assessments where user is the assessor and assessment is pending
    safeQuery(`
      SELECT ai.item_id, ai.risk_id, ai.status, ai.due_date,
             r.title AS risk_title, r.category,
             c.title AS campaign_title, c.campaign_type AS methodology
      FROM ${ts}.risk_assessment_items ai
      JOIN ${ts}.risks r ON r.risk_id = ai.risk_id
      LEFT JOIN ${ts}.risk_campaigns c ON c.campaign_id = ai.campaign_id
      WHERE ai.deleted_at IS NULL
        AND ai.assigned_to = $1
        AND ai.status IN ('pending', 'in_progress')
      ORDER BY ai.due_date ASC NULLS LAST
      LIMIT 25
    `, [userId]).then(r => r.rows).catch((): Record<string, unknown>[] => []),

    // Open KRI breaches (all — visible to risk team)
    safeQuery(`
      SELECT bl.breach_id, bl.kri_id, bl.breach_value, bl.threshold_breached,
             bl.threshold_value, bl.status, bl.breached_at,
             k.name AS kri_name, k.owner, k.linked_risk_id,
             r.title AS risk_title
      FROM ${ts}.kri_breach_log bl
      JOIN ${ts}.risk_kris k ON k.kri_id = bl.kri_id
      LEFT JOIN ${ts}.risks r ON r.risk_id = k.linked_risk_id
      WHERE bl.status IN ('open', 'acknowledged')
      ORDER BY CASE bl.threshold_breached WHEN 'red' THEN 1 WHEN 'amber' THEN 2 ELSE 3 END,
               bl.breached_at DESC
      LIMIT 25
    `, []).then(r => r.rows).catch((): Record<string, unknown>[] => []),

    // Treatments assigned to user that are not completed
    safeQuery(`
      SELECT tp.treatment_id, tp.risk_id, tp.title, tp.treatment_strategy,
             tp.treatment_status, tp.owner, tp.end_date,
             tp.completion_percent,
             r.title AS risk_title, r.category,
             CASE WHEN tp.end_date < NOW() THEN true ELSE false END AS is_overdue
      FROM ${ts}.risk_treatments tp
      JOIN ${ts}.risks r ON r.risk_id = tp.risk_id
      WHERE tp.deleted_at IS NULL
        AND tp.owner = $1
        AND tp.treatment_status NOT IN ('completed', 'closed')
      ORDER BY tp.end_date ASC NULLS LAST
      LIMIT 25
    `, [userId]).then(r => r.rows).catch((): Record<string, unknown>[] => []),

    // Escalations in the last 30 days
    safeQuery(`
      SELECT sh.history_id, sh.risk_id, sh.previous_status, sh.new_status,
             sh.previous_score, sh.new_score, sh.changed_by, sh.reason,
             sh.created_at,
             r.title AS risk_title, r.category
      FROM ${ts}.risk_status_history sh
      JOIN ${ts}.risks r ON r.risk_id = sh.risk_id
      WHERE sh.new_status = 'escalated'
        AND sh.created_at > NOW() - INTERVAL '30 days'
      ORDER BY sh.created_at DESC
      LIMIT 25
    `, []).then(r => r.rows).catch((): Record<string, unknown>[] => []),

    // Process tasks assigned to user for risk entity type
    safeQuery(`
      SELECT pt.task_id, pt.title, pt.description, pt.priority,
             pt.status, pt.assigned_to, pt.sla_deadline,
             pt.escalation_level, pt.entity_id AS linked_risk_id,
             pt.created_at,
             r.title AS risk_title
      FROM ${ts}.process_tasks pt
      LEFT JOIN ${ts}.risks r ON r.risk_id = pt.entity_id
      WHERE pt.entity_type = 'risk'
        AND pt.assigned_to = $1
        AND pt.status NOT IN ('completed', 'cancelled')
      ORDER BY pt.sla_deadline ASC NULLS LAST
      LIMIT 25
    `, [userId]).then(r => r.rows).catch((): Record<string, unknown>[] => []),
  ]);

  return {
    risksPendingReview: pendingReview,
    assessmentsDue,
    indicatorBreaches: breaches,
    treatmentTasksDue: treatmentsDue,
    escalationsPending: escalations,
    myIssues: issues,
    counts: {
      pendingReview: pendingReview.length,
      assessmentsDue: assessmentsDue.length,
      indicatorBreaches: breaches.length,
      treatmentsDue: treatmentsDue.length,
      escalations: escalations.length,
      issues: issues.length,
      total: pendingReview.length + assessmentsDue.length + breaches.length +
             treatmentsDue.length + escalations.length + issues.length,
    },
  };
}
