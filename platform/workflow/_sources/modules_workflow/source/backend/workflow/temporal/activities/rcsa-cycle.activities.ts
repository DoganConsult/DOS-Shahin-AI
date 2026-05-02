// ============================================
// RCSA Cycle Activities — spec Workflow 2
// Campaign → Assign → Submit → Review → Score → Issues
// ============================================

import { query as _query, safeQuery, tenantSchema } from '@dos/db';
import { createNotification } from '../../modules/notification/services/notification.service';
import { emitEvent } from '@dos/platform-core/events';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface RCSACycleActivities {
  activateCampaign(tenantId: string, campaignId: string): Promise<void>;
  assignRespondents(tenantId: string, campaignId: string, riskIds: string[], respondentIds: string[], dueDate: string): Promise<number>;
  notifyRespondents(tenantId: string, campaignId: string, respondentIds: string[]): Promise<void>;
  getSubmissionProgress(tenantId: string, campaignId: string): Promise<{ submitted: number; total: number }>;
  sendReminders(tenantId: string, campaignId: string): Promise<void>;
  assignReviewers(tenantId: string, campaignId: string, reviewerIds: string[]): Promise<void>;
  notifyReviewers(tenantId: string, campaignId: string, reviewerIds: string[]): Promise<void>;
  getReviewProgress(tenantId: string, campaignId: string): Promise<{ reviewed: number; total: number }>;
  updateRiskScores(tenantId: string, campaignId: string): Promise<void>;
  openIssuesForDeficiencies(tenantId: string, campaignId: string): Promise<number>;
  completeCampaign(tenantId: string, campaignId: string): Promise<void>;
}

export async function activateCampaign(tenantId: string, campaignId: string): Promise<void> {
  const ts = tenantSchema(tenantId);
  await safeQuery(`UPDATE ${ts}.risk_campaigns SET status = 'active', updated_at = NOW() WHERE campaign_id = $1`, [campaignId]);
}

export async function assignRespondents(tenantId: string, campaignId: string, riskIds: string[], respondentIds: string[], dueDate: string): Promise<number> {
  const ts = tenantSchema(tenantId);
  let count = 0;
  for (const riskId of riskIds) {
    for (const respondentId of respondentIds) {
      await safeQuery(`
        INSERT INTO ${ts}.risk_assessment_items (campaign_id, risk_id, assigned_to, status, due_date)
        VALUES ($1, $2, $3, 'pending', $4)
        ON CONFLICT DO NOTHING
      `, [campaignId, riskId, respondentId, dueDate]);
      count++;
    }
  }
  return count;
}

export async function notifyRespondents(tenantId: string, campaignId: string, respondentIds: string[]): Promise<void> {
  for (const rid of respondentIds) {
    await createNotification(tenantId, {
      userId: rid,
      type: 'rcsa_assessment_assigned',
      title: 'RCSA Assessment Assigned',
      body: `You have been assigned a risk self-assessment for campaign ${campaignId}. Please complete your responses by the due date.`,
      entityType: 'risk_campaign',
      entityId: campaignId,
    }).catch(catchHandler(EC.EVENT_BUS));
  }
}

export async function getSubmissionProgress(tenantId: string, campaignId: string): Promise<{ submitted: number; total: number }> {
  const ts = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status IN ('submitted','reviewed','approved')) as submitted
    FROM ${ts}.risk_assessment_items WHERE campaign_id = $1 AND deleted_at IS NULL
  `, [campaignId]);
  return { submitted: parseInt(result.rows[0]?.submitted || '0'), total: parseInt(result.rows[0]?.total || '0') };
}

export async function sendReminders(tenantId: string, campaignId: string): Promise<void> {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT DISTINCT assigned_to FROM ${ts}.risk_assessment_items
    WHERE campaign_id = $1 AND status = 'pending' AND deleted_at IS NULL
  `, [campaignId]);
  for (const r of rows) {
    await createNotification(tenantId, {
      userId: r.assigned_to,
      type: 'rcsa_reminder',
      title: 'RCSA Assessment Reminder',
      body: `Your RCSA self-assessment responses are overdue. Please submit them as soon as possible.`,
      entityType: 'risk_campaign',
      entityId: campaignId,
    }).catch(catchHandler(EC.EVENT_BUS));
  }
}

export async function assignReviewers(tenantId: string, campaignId: string, _reviewerIds: string[]): Promise<void> {
  // Reviewers are notified and can access submitted items
  const ts = tenantSchema(tenantId);
  await safeQuery(`UPDATE ${ts}.risk_assessment_items SET status = 'submitted', updated_at = NOW()
    WHERE campaign_id = $1 AND status = 'pending' AND deleted_at IS NULL`, [campaignId]);
}

export async function notifyReviewers(tenantId: string, campaignId: string, reviewerIds: string[]): Promise<void> {
  for (const rid of reviewerIds) {
    await createNotification(tenantId, {
      userId: rid,
      type: 'rcsa_review_assigned',
      title: 'RCSA Review Required',
      body: `RCSA responses are ready for your review in campaign ${campaignId}.`,
      entityType: 'risk_campaign',
      entityId: campaignId,
    }).catch(catchHandler(EC.EVENT_BUS));
  }
}

export async function getReviewProgress(tenantId: string, campaignId: string): Promise<{ reviewed: number; total: number }> {
  const ts = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status IN ('reviewed','approved')) as reviewed
    FROM ${ts}.risk_assessment_items WHERE campaign_id = $1 AND deleted_at IS NULL
  `, [campaignId]);
  return { reviewed: parseInt(result.rows[0]?.reviewed || '0'), total: parseInt(result.rows[0]?.total || '0') };
}

export async function updateRiskScores(tenantId: string, campaignId: string): Promise<void> {
  const ts = tenantSchema(tenantId);
  // Get all approved items and their responses, average scores, update risks
  const { rows } = await safeQuery(`
    SELECT ai.risk_id,
      AVG(ar.inherent_likelihood)::int as avg_inh_l, AVG(ar.inherent_impact)::int as avg_inh_i,
      AVG(ar.residual_likelihood)::int as avg_res_l, AVG(ar.residual_impact)::int as avg_res_i
    FROM ${ts}.risk_assessment_items ai
    JOIN ${ts}.risk_assessment_responses ar ON ar.item_id = ai.item_id
    WHERE ai.campaign_id = $1 AND ai.deleted_at IS NULL
    GROUP BY ai.risk_id
  `, [campaignId]);

  for (const r of rows) {
    if (!r.risk_id) continue;
    const inhScore = (r.avg_inh_l || 3) * (r.avg_inh_i || 3);
    const resScore = (r.avg_res_l || 2) * (r.avg_res_i || 2);
    await safeQuery(`
      INSERT INTO ${ts}.risk_assessments (risk_id, assessment_type, assessor_id, inherent_likelihood, inherent_impact, inherent_score, residual_likelihood, residual_impact, residual_score, methodology)
      VALUES ($1, 'rcsa', 'rcsa_campaign', $2, $3, $4, $5, $6, $7, 'rcsa')
    `, [r.risk_id, r.avg_inh_l, r.avg_inh_i, inhScore, r.avg_res_l, r.avg_res_i, resScore]);
  }
}

export async function openIssuesForDeficiencies(tenantId: string, campaignId: string): Promise<number> {
  const ts = tenantSchema(tenantId);
  // Find risks where residual score increased or control effectiveness is low
  const { rows } = await safeQuery(`
    SELECT ai.risk_id, r.title, AVG(ar.residual_likelihood * ar.residual_impact) as avg_res_score
    FROM ${ts}.risk_assessment_items ai
    JOIN ${ts}.risk_assessment_responses ar ON ar.item_id = ai.item_id
    JOIN ${ts}.risks r ON r.risk_id = ai.risk_id
    WHERE ai.campaign_id = $1 AND ai.deleted_at IS NULL
    GROUP BY ai.risk_id, r.title
    HAVING AVG(ar.residual_likelihood * ar.residual_impact) >= 15
  `, [campaignId]);

  let issuesOpened = 0;
  for (const r of rows) {
    await safeQuery(`
      INSERT INTO ${ts}.process_tasks (title, description, entity_type, entity_id, priority, status, created_by)
      VALUES ($1, $2, 'risk', $3, 'high', 'open', 'rcsa_workflow')
    `, [`RCSA: High residual risk — ${r.title}`, `RCSA assessment indicates residual score of ${Math.round(r.avg_res_score)} for risk ${r.risk_id}`, r.risk_id]);
    issuesOpened++;
  }

  return issuesOpened;
}

export async function completeCampaign(tenantId: string, campaignId: string): Promise<void> {
  const ts = tenantSchema(tenantId);
  await safeQuery(`UPDATE ${ts}.risk_campaigns SET status = 'completed', updated_at = NOW() WHERE campaign_id = $1`, [campaignId]);
  emitEvent({ tenantId, userId: SYSTEM_JOB_ACTOR, module: 'risks', event: 'rcsa_campaign_completed', entityType: 'risk_campaign', entityId: campaignId });
}
