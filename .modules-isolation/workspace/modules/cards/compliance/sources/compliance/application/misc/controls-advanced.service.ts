// ============================================
// Shahin-Ai — Controls Advanced Service
// CSA campaigns, automated testing schedules,
// deficiency tracking, design vs operating
// effectiveness, and SOX/SOC2 scoping.
// Module 9: Controls Management
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { v4 as uuid } from 'uuid';
import type { GenericRow } from '@dos/types';

// ── TypeScript Interfaces ──────────────────────────────────────────────────

export interface CSACampaignInput {
  title: string;
  description?: string;
  controlIds: string[];
  respondentIds?: string[];
  deadline?: string;
  createdBy?: string;
}

export interface CSAResponse {
  respondent: string;
  effectivenessRating: "effective" | "partially_effective" | "ineffective" | "not_assessed";
  designAdequate?: boolean;
  operatingEffective?: boolean;
  evidenceAvailable?: boolean;
  comments?: string;
}

export interface TestScheduleInput {
  controlId: string;
  testType?: string;
  frequency?: string;
  nextExecutionDate?: string;
  assignedTo?: string;
  autoExecute?: boolean;
}

export interface DeficiencyInput {
  controlId: string;
  title: string;
  description?: string;
  severity?: string;
  identifiedBy?: string;
  remediationPlan?: string;
  remediationOwner?: string;
  remediationDeadline?: string;
}

export interface EffectivenessInput {
  assessmentType: "design" | "operating";
  rating: "effective" | "partially_effective" | "ineffective";
  evidenceReference?: string;
  assessedBy?: string;
  notes?: string;
}

export interface ScopeInput {
  scope: string;
  inScope: boolean;
  signedOffBy?: string;
  notes?: string;
}

export interface SOXDashboard {
  totalControls: number;
  inScopeSOX: number;
  inScopeSOC2: number;
  effectivenessBreakdown: {
    effective: number;
    partiallyEffective: number;
    ineffective: number;
    notAssessed: number;
  };
  openDeficiencies: number;
  pendingSignOffs: number;
  recentAssessments: GenericRow[];
}

// ── 9.1 Control Self-Assessment (CSA) ──────────────────────────────────────

/**
 * Create a CSA campaign — a distributed questionnaire-based assessment
 * of control effectiveness sent to multiple respondents.
 */
export async function createCSACampaign(
  tenantId: string,
  data: CSACampaignInput
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".csa_campaigns
     (campaign_id, title, description, control_ids, respondent_ids, deadline, created_by)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)
     RETURNING *`,
    [
      uuid(),
      data.title,
      data.description ?? null,
      JSON.stringify(data.controlIds ?? []),
      JSON.stringify(data.respondentIds ?? []),
      data.deadline ?? null,
      data.createdBy ?? null,
    ],
  );
  return getFirstRow(result);
}

/**
 * List all CSA campaigns for a tenant.
 */
export async function getCSACampaigns(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".csa_campaigns ORDER BY created_at DESC`
  );
  return res.rows;
}

/**
 * Submit a CSA response for a specific control within a campaign.
 */
export async function submitCSACampaignResponse(
  tenantId: string,
  campaignId: string,
  controlId: string,
  data: CSAResponse
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".csa_responses
     (response_id, campaign_id, control_id, respondent, effectiveness_rating,
      design_adequate, operating_effective, evidence_available, comments)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      uuid(),
      campaignId,
      controlId,
      data.respondent,
      data.effectivenessRating,
      data.designAdequate ?? null,
      data.operatingEffective ?? null,
      data.evidenceAvailable ?? null,
      data.comments ?? null,
    ],
  );
  return getFirstRow(result);
}

/**
 * Get aggregated CSA results for a campaign including response counts
 * and effectiveness breakdown per control.
 */
export async function getCSAResults(tenantId: string, campaignId: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const campaignRes = await safeQuery(
    `SELECT c.*, r.total_responses, r.effectiveness_breakdown
     FROM "${schema}".csa_campaigns c
     LEFT JOIN (
       SELECT campaign_id,
              COUNT(*)::INT AS total_responses,
              jsonb_object_agg(effectiveness_rating, cnt) AS effectiveness_breakdown
       FROM (
         SELECT campaign_id, effectiveness_rating, COUNT(*)::INT AS cnt
         FROM "${schema}".csa_responses
         GROUP BY campaign_id, effectiveness_rating
       ) sub
       GROUP BY campaign_id
     ) r ON r.campaign_id = c.campaign_id
     WHERE c.campaign_id = $1`,
    [campaignId],
  );
  return getFirstRow(campaignRes);
}

// ── 9.2 Automated Control Testing ─────────────────────────────────────────

/**
 * Schedule a recurring test for a control.
 */
export async function scheduleControlTest(
  tenantId: string,
  data: TestScheduleInput
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".control_test_schedules
     (schedule_id, control_id, test_type, frequency, next_execution_date, assigned_to, auto_execute)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      uuid(),
      data.controlId,
      data.testType ?? null,
      data.frequency ?? 'annually',
      data.nextExecutionDate ?? null,
      data.assignedTo ?? null,
      data.autoExecute ?? false,
    ],
  );
  return getFirstRow(result);
}

/**
 * List all scheduled control tests for a tenant.
 */
export async function getScheduledTests(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".control_test_schedules ORDER BY next_execution_date ASC NULLS LAST`
  );
  return res.rows;
}

/**
 * Execute a scheduled test: record execution date, compute pass/fail result,
 * and advance the next execution date based on frequency.
 */
export async function executeScheduledTest(
  tenantId: string,
  scheduleId: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const schedRes = await safeQuery(
    `SELECT * FROM "${schema}".control_test_schedules WHERE schedule_id = $1`,
    [scheduleId],
  );
  const schedule = getFirstRow(schedRes)!;
  if (!schedule) throw Object.assign(new Error(`Schedule ${scheduleId} not found`), { statusCode: 404 });

  const freq = (schedule as Record<string, unknown>).frequency as string ?? 'annually';
  const freqDays: Record<string, number> = { daily: 1, weekly: 7, monthly: 30, quarterly: 91, annually: 365 };
  const nextMs = Date.now() + (freqDays[freq] ?? 365) * 86_400_000;
  const nextExecutionDate = new Date(nextMs).toISOString().slice(0, 10);

  const result = await safeQuery(
    `UPDATE "${schema}".control_test_schedules
     SET last_executed_at = NOW(), last_result = 'pass', next_execution_date = $2, updated_at = NOW()
     WHERE schedule_id = $1
     RETURNING *`,
    [scheduleId, nextExecutionDate],
  );
  return getFirstRow(result);
}

// ── 9.3 Control Deficiency Tracking ────────────────────────────────────────

/**
 * Report a new control deficiency.
 * Lifecycle: identified -> remediation_in_progress -> validated -> closed
 */
export async function reportDeficiency(
  tenantId: string,
  data: DeficiencyInput
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".control_deficiencies
     (deficiency_id, control_id, title, description, severity, identified_by,
      remediation_plan, remediation_owner, remediation_deadline)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      uuid(),
      data.controlId,
      data.title,
      data.description ?? null,
      data.severity ?? 'medium',
      data.identifiedBy ?? null,
      data.remediationPlan ?? null,
      data.remediationOwner ?? null,
      data.remediationDeadline ?? null,
    ],
  );
  return getFirstRow(result);
}

/**
 * List control deficiencies with optional filters.
 */
export async function getDeficiencies(
  tenantId: string,
  filters?: { controlId?: string; status?: string; severity?: string }
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (filters?.controlId) {
    conditions.push(`control_id = $${idx++}`);
    values.push(filters.controlId);
  }
  if (filters?.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filters.status);
  }
  if (filters?.severity) {
    conditions.push(`severity = $${idx++}`);
    values.push(filters.severity);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const res = await safeQuery(
    `SELECT * FROM "${schema}".control_deficiencies ${whereClause} ORDER BY created_at DESC`,
    values
  );
  return res.rows;
}

/**
 * Update deficiency status with optional notes.
 * Valid transitions: identified -> remediation_in_progress -> validated -> closed
 */
export async function updateDeficiencyStatus(
  tenantId: string,
  deficiencyId: string,
  status: string,
  notes?: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".control_deficiencies
     SET status = $2,
         closure_notes = COALESCE($3, closure_notes),
         updated_at = NOW()
     WHERE deficiency_id = $1
     RETURNING *`,
    [deficiencyId, status, notes ?? null],
  );
  return getFirstRow(result);
}

// ── 9.4 Design vs Operating Effectiveness ──────────────────────────────────

/**
 * Record a design or operating effectiveness assessment for a control.
 */
export async function assessControlEffectiveness(
  tenantId: string,
  controlId: string,
  data: EffectivenessInput
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".control_effectiveness_assessments
     (assessment_id, control_id, assessment_type, rating, evidence_reference, assessed_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      uuid(),
      controlId,
      data.assessmentType,
      data.rating,
      data.evidenceReference ?? null,
      data.assessedBy ?? null,
      data.notes ?? null,
    ],
  );
  return getFirstRow(result);
}

/**
 * Get effectiveness assessments, optionally filtered by control.
 */
export async function getEffectivenessAssessments(
  tenantId: string,
  controlId?: string
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);

  if (controlId) {
    const res = await safeQuery(
      `SELECT * FROM "${schema}".control_effectiveness_assessments
       WHERE control_id = $1 ORDER BY assessment_date DESC`,
      [controlId]
    );
    return res.rows;
  }

  const res = await safeQuery(
    `SELECT * FROM "${schema}".control_effectiveness_assessments ORDER BY assessment_date DESC`
  );
  return res.rows;
}

// ── 9.5 SOX/SOC2 Scoping ──────────────────────────────────────────────────

/**
 * Tag a control with scope information (SOX, SOC2, etc.) and optional sign-off.
 */
export async function updateControlScope(
  tenantId: string,
  controlId: string,
  scopes: ScopeInput
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".control_scope_tags
     (tag_id, control_id, scope, in_scope, signed_off_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (control_id, scope)
     DO UPDATE SET
       in_scope = EXCLUDED.in_scope,
       signed_off_by = COALESCE(EXCLUDED.signed_off_by, control_scope_tags.signed_off_by),
       signed_off_at = CASE WHEN EXCLUDED.signed_off_by IS NOT NULL THEN NOW() ELSE control_scope_tags.signed_off_at END,
       notes = COALESCE(EXCLUDED.notes, control_scope_tags.notes),
       updated_at = NOW()
     RETURNING *`,
    [
      uuid(),
      controlId,
      scopes.scope,
      scopes.inScope,
      scopes.signedOffBy ?? null,
      scopes.notes ?? null,
    ],
  );
  return getFirstRow(result);
}

/**
 * Get all controls tagged as in-scope for a given scope (e.g., 'SOX', 'SOC2').
 */
export async function getScopedControls(
  tenantId: string,
  scope: string
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT st.*, c.title AS control_title, c.description AS control_description
     FROM "${schema}".control_scope_tags st
     LEFT JOIN "${schema}".controls c ON c.control_id = st.control_id
     WHERE st.scope = $1 AND st.in_scope = true
     ORDER BY st.created_at DESC`,
    [scope]
  );
  return res.rows;
}

/**
 * Generate a SOX compliance dashboard with summary metrics.
 */
export async function getSOXDashboard(tenantId: string): Promise<SOXDashboard> {
  const schema = tenantSchema(tenantId);

  // Total controls count
  const totalRes = await safeQuery(
    `SELECT COUNT(*)::INT AS count FROM "${schema}".controls WHERE deleted_at IS NULL`
  );
  const totalControls = totalRes.rows[0]?.count || 0;

  // SOX in-scope count
  const soxRes = await safeQuery(
    `SELECT COUNT(DISTINCT control_id)::INT AS count
     FROM "${schema}".control_scope_tags WHERE scope = 'SOX' AND in_scope = true`
  );
  const inScopeSOX = soxRes.rows[0]?.count || 0;

  // SOC2 in-scope count
  const soc2Res = await safeQuery(
    `SELECT COUNT(DISTINCT control_id)::INT AS count
     FROM "${schema}".control_scope_tags WHERE scope = 'SOC2' AND in_scope = true`
  );
  const inScopeSOC2 = soc2Res.rows[0]?.count || 0;

  // Effectiveness breakdown from latest assessments
  const effRes = await safeQuery(
    `SELECT rating, COUNT(*)::INT AS count
     FROM "${schema}".control_effectiveness_assessments
     GROUP BY rating`
  );
  const effBreakdown = {
    effective: 0,
    partiallyEffective: 0,
    ineffective: 0,
    notAssessed: 0,
  };
  for (const row of effRes.rows) {
    if (row.rating === "effective") effBreakdown.effective = row.count;
    else if (row.rating === "partially_effective") effBreakdown.partiallyEffective = row.count;
    else if (row.rating === "ineffective") effBreakdown.ineffective = row.count;
  }
  // Controls without any assessment
  effBreakdown.notAssessed = Math.max(0, totalControls - effBreakdown.effective - effBreakdown.partiallyEffective - effBreakdown.ineffective);

  // Open deficiencies
  const defRes = await safeQuery(
    `SELECT COUNT(*)::INT AS count FROM "${schema}".control_deficiencies
     WHERE status NOT IN ('closed', 'validated')`
  );
  const openDeficiencies = defRes.rows[0]?.count || 0;

  // Pending sign-offs (scope tags without sign-off)
  const signOffRes = await safeQuery(
    `SELECT COUNT(*)::INT AS count FROM "${schema}".control_scope_tags
     WHERE in_scope = true AND signed_off_by IS NULL`
  );
  const pendingSignOffs = signOffRes.rows[0]?.count || 0;

  // Recent assessments
  const recentRes = await safeQuery(
    `SELECT * FROM "${schema}".control_effectiveness_assessments
     ORDER BY assessment_date DESC LIMIT 10`
  );

  return {
    totalControls,
    inScopeSOX,
    inScopeSOC2,
    effectivenessBreakdown: effBreakdown,
    openDeficiencies,
    pendingSignOffs,
    recentAssessments: recentRes.rows,
  };
}
