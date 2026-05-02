// ============================================
// Shahin-Ai — Assessment Advanced Service
// Campaign management, delegation, period
// comparison, evidence attachment, and
// anonymous reporting / whistleblower channel
// Requirements: 13.1–13.5
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

// ── 13.1 Assessment Campaign Management ─────────────────────────────────────

/**
 * Create a new assessment campaign with target respondents and deadline.
 */
export async function createAssessmentCampaign(tenantId: string, data: { title: string; description?: string; template_id?: string; target_respondents?: string[]; deadline?: string; created_by?: string }): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".assessment_campaigns
     (title, description, template_id, target_respondents, deadline, status, created_by)
     VALUES ($1, $2, $3::uuid, $4::jsonb, $5::date, 'active', $6) RETURNING *`,
    [
      data.title,
      data.description,
      data.template_id,
      JSON.stringify(data.target_respondents || []),
      data.deadline,
      data.created_by,
    ]
  );
  return result.rows[0];
}

/**
 * List all assessment campaigns with response counts.
 */
export async function getAssessmentCampaigns(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT ac.*,
      (SELECT COUNT(*)::int FROM "${schema}".assessment_campaign_responses acr
       WHERE acr.campaign_id = ac.campaign_id) AS response_count,
      jsonb_array_length(COALESCE(ac.target_respondents, '[]'::jsonb)) AS target_count
    FROM "${schema}".assessment_campaigns ac
    ORDER BY ac.created_at DESC
  `), { tenantId: tenantId, operation: 'query assessment_campaign_responses' });
  return result.rows;
}

/**
 * Get completion status for a specific campaign including per-respondent breakdown.
 */
export async function getCampaignCompletionStatus(tenantId: string, campaignId: string): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const campaign = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".assessment_campaigns WHERE campaign_id = $1::uuid`,
    [campaignId]
  ), { tenantId: tenantId, operation: 'query assessment_campaigns' });

  const responses = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT respondent, status, submitted_at
     FROM "${schema}".assessment_campaign_responses WHERE campaign_id = $1::uuid`,
    [campaignId]
  ), { tenantId: tenantId, operation: 'query assessment_campaigns' });

  const targets = campaign.rows[0]?.target_respondents || [];
  const respondedIds = new Set(responses.rows.map((r: GenericRow) => r.respondent));

  return {
    campaign: campaign.rows[0],

    total_targets: targets.length,
    responded: responses.rows.length,

    pending: targets.filter((t: GenericRow) => !respondedIds.has(t)).length,

    completion_pct: targets.length

      ? Math.round((responses.rows.length / targets.length) * 100)
      : 0,
    responses: responses.rows,
  };
}

// ── 13.2 Assessment Delegation ──────────────────────────────────────────────

/**
 * Delegate specific assessment sections from one user to another.
 */
export async function delegateAssessmentSection(
  tenantId: string,
  campaignId: string,
  data: { delegator: string; delegate: string; section_ids?: string[] }
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".assessment_delegations
     (campaign_id, delegator, delegate, section_ids, status)
     VALUES ($1::uuid, $2, $3, $4::jsonb, 'pending') RETURNING *`,
    [campaignId, data.delegator, data.delegate, JSON.stringify(data.section_ids || [])]
  );
  return result.rows[0];
}

/**
 * List all delegations for a given campaign.
 */
export async function getAssessmentDelegations(tenantId: string, campaignId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".assessment_delegations
     WHERE campaign_id = $1::uuid ORDER BY created_at DESC`,
    [campaignId]
  ), { tenantId: tenantId, operation: 'query assessment_delegations' });
  return result.rows;
}

// ── 13.3 Assessment Period Comparison ───────────────────────────────────────

/**
 * Compare average scores and response counts between two assessment campaigns.
 */
export async function compareAssessments(
  tenantId: string,
  campaignIdA: string,
  campaignIdB: string
): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const [respA, respB] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT * FROM "${schema}".assessment_campaign_responses WHERE campaign_id = $1::uuid`,
      [campaignIdA]
    ), { tenantId: tenantId, operation: 'query assessment_campaign_responses' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT * FROM "${schema}".assessment_campaign_responses WHERE campaign_id = $1::uuid`,
      [campaignIdB]
    ), { tenantId: tenantId, operation: 'query assessment_campaign_responses' }),
  ]);

  const scoreA =
    respA.rows.reduce((sum: number, r: GenericRow) => sum + (r.score || 0), 0) /
    (respA.rows.length || 1);
  const scoreB =
    respB.rows.reduce((sum: number, r: GenericRow) => sum + (r.score || 0), 0) /
    (respB.rows.length || 1);

  return {
    period_a: {
      campaign_id: campaignIdA,
      avg_score: Math.round(scoreA * 10) / 10,
      response_count: respA.rows.length,
    },
    period_b: {
      campaign_id: campaignIdB,
      avg_score: Math.round(scoreB * 10) / 10,
      response_count: respB.rows.length,
    },
    delta: Math.round((scoreB - scoreA) * 10) / 10,
    trend: scoreB > scoreA ? 'improving' : scoreB < scoreA ? 'declining' : 'stable',
  };
}

// ── 13.4 Assessment Evidence Attachment ─────────────────────────────────────

/**
 * Attach evidence items to a specific assessment response.
 */
export async function attachEvidenceToResponse(
  tenantId: string,
  responseId: string,
  evidenceIds: string[]
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".assessment_campaign_responses
     SET evidence_ids = $2::jsonb, updated_at = now()
     WHERE response_id = $1::uuid RETURNING *`,
    [responseId, JSON.stringify(evidenceIds)]
  );
  return result.rows[0];
}

// ── 13.5 Anonymous Reporting / Whistleblower Channel ────────────────────────

/**
 * Submit an anonymous report with a generated tracking code.
 * No authentication required — the tracking code is the only identifier.
 */
export async function submitAnonymousReport(tenantId: string, data: { category: string; description: string; severity?: string; evidence_description?: string }): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const trackingCode = `WB-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()}`;

  const result = await safeQuery(
    `INSERT INTO "${schema}".anonymous_reports
     (tracking_code, category, description, severity, evidence_description, status)
     VALUES ($1, $2, $3, $4, $5, 'submitted')
     RETURNING tracking_code, report_id, status, created_at`,
    [
      trackingCode,
      data.category,
      data.description,
      data.severity || 'medium',
      data.evidence_description,
    ]
  );
  return result.rows[0];
}

/**
 * List anonymous reports with optional status filter (admin view).
 */
export async function getAnonymousReports(tenantId: string, filters?: { status?: string }): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const params: unknown[] = [];
  let sql = `SELECT report_id, tracking_code, category, severity, status, created_at, assigned_to
             FROM "${schema}".anonymous_reports`;
  if (filters?.status) {
    sql += ` WHERE status = $1`;
    params.push(filters.status);
  }
  sql += ` ORDER BY created_at DESC`;
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(sql, params), { tenantId: tenantId, operation: 'query anonymous_reports' });
  return result.rows;
}

/**
 * Look up an anonymous report by tracking code (public endpoint).
 */
export async function getAnonymousReportByTrackingCode(
  tenantId: string,
  trackingCode: string
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT tracking_code, category, severity, status, created_at, resolution_notes
     FROM "${schema}".anonymous_reports WHERE tracking_code = $1`,
    [trackingCode]
  ), { tenantId: tenantId, operation: 'query anonymous_reports' });
  return result.rows[0] || null;
}

/**
 * Update an anonymous report (assign, resolve, add notes).
 */
export async function updateAnonymousReport(
  tenantId: string,
  reportId: string,
  data: { status?: string; assigned_to?: string; resolution_notes?: string }
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".anonymous_reports
     SET status = COALESCE($2, status),
         assigned_to = COALESCE($3, assigned_to),
         resolution_notes = COALESCE($4, resolution_notes),
         updated_at = now()
     WHERE report_id = $1::uuid RETURNING *`,
    [reportId, data.status, data.assigned_to, data.resolution_notes]
  );
  return result.rows[0];
}
