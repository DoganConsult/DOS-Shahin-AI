// ============================================
// F04: RCSA (Risk & Control Self-Assessment)
// Campaign management, questionnaire distrib-
// ution, workshop-based assessment tracking.
// Bridges gap vs IBM ORM RCSA module.
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { v4 as uuid } from 'uuid';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

export interface RCSACampaign {
  campaignId: string;
  name: string;
  type: 'individual' | 'workshop';
  status: 'draft' | 'active' | 'closed' | 'archived';
  assessorIds: string[];
  riskIds: string[];
  controlIds: string[];
  dueDate: string;
  scoringTemplate: 'standard_5x5' | 'custom';
}

export async function createRCSACampaign(
  tenantId: string,
  campaign: Omit<RCSACampaign, 'campaignId' | 'status'>,
): Promise<RCSACampaign> {
  const schema = tenantSchema(tenantId);
  const campaignId = uuid();
  await safeQuery(
    `INSERT INTO "${schema}".rcsa_campaigns
     (campaign_id, name, type, status, assessor_ids, risk_ids, control_ids, due_date, scoring_template)
     VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8)`,
    [campaignId, campaign.name, campaign.type, JSON.stringify(campaign.assessorIds),
     JSON.stringify(campaign.riskIds), JSON.stringify(campaign.controlIds),
     campaign.dueDate, campaign.scoringTemplate],
  );
  return { ...campaign, campaignId, status: 'draft' };
}

export async function launchRCSACampaign(tenantId: string, campaignId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".rcsa_campaigns SET status = 'active', launched_at = NOW(), updated_at = NOW() WHERE campaign_id = $1`,
    [campaignId],
  );
}

export async function submitRCSAResponse(tenantId: string, response: {
  responseId: string;
  campaignId: string;
  inherentLikelihood: number;
  inherentImpact: number;
  controlDesignEffectiveness: number;
  controlOperatingEffectiveness: number;
  residualLikelihood: number;
  residualImpact: number;
  comments: string;
}): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".rcsa_responses SET
      inherent_likelihood = $3, inherent_impact = $4,
      control_design_effectiveness = $5, control_operating_effectiveness = $6,
      residual_likelihood = $7, residual_impact = $8,
      comments = $9, status = 'submitted', submitted_at = NOW()
     WHERE response_id = $1 AND campaign_id = $2`,
    [response.responseId, response.campaignId, response.inherentLikelihood,
     response.inherentImpact, response.controlDesignEffectiveness,
     response.controlOperatingEffectiveness, response.residualLikelihood,
     response.residualImpact, response.comments],
  );
}

export async function getRCSACampaigns(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".rcsa_campaigns ORDER BY created_at DESC`, [],
  );
  return res.rows;
}

export async function getRCSACampaignResults(tenantId: string, campaignId: string): Promise<{
  totalAssessors: number;
  submitted: number;
  pending: number;
  completionRate: number;
  riskSummaries: unknown[];
}> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT risk_id, status,
            AVG(inherent_likelihood * inherent_impact)::numeric(5,2) as avg_inherent,
            AVG(residual_likelihood * residual_impact)::numeric(5,2) as avg_residual,
            AVG((control_design_effectiveness + control_operating_effectiveness) / 2)::numeric(5,2) as avg_ctrl_eff,
            COUNT(*) as count
     FROM "${schema}".rcsa_responses
     WHERE campaign_id = $1
     GROUP BY risk_id, status`,
    [campaignId],
  );

  const submitted = res.rows.filter((r: GenericRow) => r.status === 'submitted').length;
  const pending = res.rows.filter((r: GenericRow) => r.status === 'pending').length;
  const total = submitted + pending;

  return {
    totalAssessors: total,
    submitted,
    pending,
    completionRate: total > 0 ? Math.round((submitted / total) * 100) : 0,
    riskSummaries: res.rows.filter((r: GenericRow) => r.status === 'submitted'),
  };
}
