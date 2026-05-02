// ============================================
// Shahin-Ai — Compliance Advanced Service
// Regulatory changes, obligations register,
// calendar, test plans, cross-framework mapping,
// filing tracker, continuous monitoring
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow } from '@dos/types';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface RegChangeInput {
  title: string;
  description?: string;
  sourceRegulator?: string;
  regulationReference?: string;
  changeType?: "new" | "amendment" | "repeal" | "guidance";
  effectiveDate?: string;
  impactLevel?: "low" | "medium" | "high" | "critical";
  affectedFrameworks?: string[];
  affectedControls?: string[];
  affectedPolicies?: string[];
  implementationPlan?: string;
  owner?: string;
  assignedTo?: string;
  identifiedBy?: string;
}

export interface ObligationInput {
  title: string;
  obligationText?: string;
  sourceRegulation?: string;
  jurisdiction?: string;
  frameworkId?: string;
  controlIds?: string[];
  owner?: string;
  responsibleTeam?: string;
  dueDate?: string;
  recurrence?: "one_time" | "daily" | "weekly" | "monthly" | "quarterly" | "annually";
  status?: string;
  complianceStatus?: string;
  evidenceIds?: string[];
}

export interface TestPlanInput {
  title: string;
  controlIds: string[];
  testType?: string;
  frequency?: "daily" | "weekly" | "monthly" | "quarterly" | "annually";
  assignedTo?: string;
  nextRunDate?: string;
  autoExecute?: boolean;
  createdBy?: string;
}

export interface FilingInput {
  title: string;
  regulator: string;
  filingType?: string;
  jurisdiction?: string;
  dueDate?: string;
  referenceNumber?: string;
  status?: string;
  submissionMethod?: string;
  notes?: string;
  filedBy?: string;
}

export interface CalendarEvent {
  type: string;
  title: string;
  date: string;
  status: string;
  entityType: string;
  entityId: string;
}

export interface CrossFrameworkMap {
  controls: Array<{
    controlId: string;
    controlTitle: string;
    frameworks: Array<{ frameworkId: string; frameworkName: string }>;
    frameworkCount: number;
  }>;
  frameworkCoverage: Array<{
    frameworkId: string;
    frameworkName: string;
    totalControls: number;
    mappedControls: number;
    coveragePercent: number;
  }>;
}

export interface MonitoringStatus {
  totalControls: number;
  controlsWithFreshEvidence: number;
  staleEvidenceCount: number;
  gapCount: number;
  freshnessCutoffDays: number;
  details: Array<{
    controlId: string;
    controlTitle: string;
    evidenceCount: number;
    latestEvidenceDate: string | null;
    isFresh: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// 2.1 Regulatory Change Management
// ---------------------------------------------------------------------------

/** Create a new regulatory change record. */
export async function createRegulatoryChange(
  tenantId: string,
  data: RegChangeInput
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".regulatory_changes
      (title, description, source_regulator, regulation_reference, change_type,
       effective_date, impact_level, affected_frameworks, affected_controls,
       affected_policies, implementation_plan, owner, assigned_to, identified_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      data.title,
      data.description || null,
      data.sourceRegulator || null,
      data.regulationReference || null,
      data.changeType || "amendment",
      data.effectiveDate || null,
      data.impactLevel || "medium",
      JSON.stringify(data.affectedFrameworks || []),
      JSON.stringify(data.affectedControls || []),
      JSON.stringify(data.affectedPolicies || []),
      data.implementationPlan || null,
      data.owner || null,
      data.assignedTo || null,
      data.identifiedBy || null,
    ]
  );
  return result.rows[0];
}

/** Retrieve regulatory changes with optional filters. */
export async function getRegulatoryChanges(
  tenantId: string,
  filters?: { status?: string; impactLevel?: string }
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters?.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(filters.status);
  }
  if (filters?.impactLevel) {
    conditions.push(`impact_level = $${paramIdx++}`);
    params.push(filters.impactLevel);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await safeQuery(
    `SELECT * FROM "${schema}".regulatory_changes ${where} ORDER BY created_at DESC`,
    params
  );
  return result.rows;
}

/** Update the status of a regulatory change (workflow transitions). */
export async function updateRegulatoryChangeStatus(
  tenantId: string,
  changeId: string,
  status: string,
  _updatedBy: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".regulatory_changes
     SET status = $2, updated_at = NOW()
     WHERE change_id = $1
     RETURNING *`,
    [changeId, status],
  );
  return result.rows[0];
}

/** Record an impact assessment for a regulatory change. */
export async function assessRegulatoryImpact(
  tenantId: string,
  changeId: string,
  impactData: Record<string, unknown>
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".regulatory_changes
     SET impact_assessment = $2::jsonb, assessed_at = NOW(), updated_at = NOW()
     WHERE change_id = $1
     RETURNING *`,
    [changeId, JSON.stringify(impactData)],
  );
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// 2.2 Compliance Obligations Register
// ---------------------------------------------------------------------------

/** Retrieve obligations with optional filters. */
export async function getObligations(
  tenantId: string,
  filters?: { status?: string; jurisdiction?: string; frameworkId?: string }
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters?.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(filters.status);
  }
  if (filters?.jurisdiction) {
    conditions.push(`jurisdiction = $${paramIdx++}`);
    params.push(filters.jurisdiction);
  }
  if (filters?.frameworkId) {
    conditions.push(`framework_id = $${paramIdx++}`);
    params.push(filters.frameworkId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await safeQuery(
    `SELECT * FROM "${schema}".compliance_obligations ${where} ORDER BY due_date ASC NULLS LAST, created_at DESC`,
    params
  );
  return result.rows;
}

/** Create a new compliance obligation. */
export async function createObligation(
  tenantId: string,
  data: ObligationInput
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".compliance_obligations
      (title, obligation_text, source_regulation, jurisdiction, framework_id,
       control_ids, owner, responsible_team, due_date, recurrence, status,
       compliance_status, evidence_ids)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      data.title,
      data.obligationText || null,
      data.sourceRegulation || null,
      data.jurisdiction || "KSA",
      data.frameworkId || null,
      JSON.stringify(data.controlIds || []),
      data.owner || null,
      data.responsibleTeam || null,
      data.dueDate || null,
      data.recurrence || "annually",
      data.status || "active",
      data.complianceStatus || "not_assessed",
      JSON.stringify(data.evidenceIds || []),
    ]
  );
  return result.rows[0];
}

/** Update an existing compliance obligation. */
export async function updateObligation(
  tenantId: string,
  obligationId: string,
  data: Partial<ObligationInput>
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const fields: string[] = [];
  const params: unknown[] = [obligationId];
  let idx = 2;
  if (data.title !== undefined) { fields.push(`title = $${idx++}`); params.push(data.title); }
  if (data.obligationText !== undefined) { fields.push(`obligation_text = $${idx++}`); params.push(data.obligationText); }
  if (data.sourceRegulation !== undefined) { fields.push(`source_regulation = $${idx++}`); params.push(data.sourceRegulation); }
  if (data.jurisdiction !== undefined) { fields.push(`jurisdiction = $${idx++}`); params.push(data.jurisdiction); }
  if (data.frameworkId !== undefined) { fields.push(`framework_id = $${idx++}`); params.push(data.frameworkId); }
  if (data.owner !== undefined) { fields.push(`owner = $${idx++}`); params.push(data.owner); }
  if (data.responsibleTeam !== undefined) { fields.push(`responsible_team = $${idx++}`); params.push(data.responsibleTeam); }
  if (data.dueDate !== undefined) { fields.push(`due_date = $${idx++}`); params.push(data.dueDate); }
  if (data.status !== undefined) { fields.push(`status = $${idx++}`); params.push(data.status); }
  if (data.complianceStatus !== undefined) { fields.push(`compliance_status = $${idx++}`); params.push(data.complianceStatus); }
  if (fields.length === 0) return undefined;
  fields.push(`updated_at = NOW()`);
  const result = await safeQuery(
    `UPDATE "${schema}".compliance_obligations SET ${fields.join(', ')} WHERE obligation_id = $1 RETURNING *`,
    params,
  );
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// 2.3 Compliance Calendar
// ---------------------------------------------------------------------------

/** Aggregate calendar events from multiple compliance sources. */
export async function getComplianceCalendar(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const schema = tenantSchema(tenantId);
  const events: CalendarEvent[] = [];

  // Obligation due dates
  const obligations = await safeQuery(
    `SELECT obligation_id, title, due_date, status
     FROM "${schema}".compliance_obligations
     WHERE due_date BETWEEN $1 AND $2
     ORDER BY due_date`,
    [startDate, endDate]
  );
  for (const row of obligations.rows) {
    events.push({
      type: "obligation",
      title: row.title,
      date: row.due_date,
      status: row.status,
      entityType: "compliance_obligation",
      entityId: row.obligation_id,
    });
  }

  // Regulatory filing deadlines
  const filings = await safeQuery(
    `SELECT filing_id, title, due_date, status
     FROM "${schema}".regulatory_filings
     WHERE due_date BETWEEN $1 AND $2
     ORDER BY due_date`,
    [startDate, endDate]
  );
  for (const row of filings.rows) {
    events.push({
      type: "filing",
      title: row.title,
      date: row.due_date,
      status: row.status,
      entityType: "regulatory_filing",
      entityId: row.filing_id,
    });
  }

  // Control test plan next-run dates
  const testPlans = await safeQuery(
    `SELECT plan_id, title, next_run_date, status
     FROM "${schema}".control_test_plans
     WHERE next_run_date BETWEEN $1 AND $2
     ORDER BY next_run_date`,
    [startDate, endDate]
  );
  for (const row of testPlans.rows) {
    events.push({
      type: "test_plan",
      title: row.title,
      date: row.next_run_date,
      status: row.status,
      entityType: "control_test_plan",
      entityId: row.plan_id,
    });
  }

  // Regulatory change effective dates
  const regChanges = await safeQuery(
    `SELECT change_id, title, effective_date, status
     FROM "${schema}".regulatory_changes
     WHERE effective_date BETWEEN $1 AND $2
     ORDER BY effective_date`,
    [startDate, endDate]
  );
  for (const row of regChanges.rows) {
    events.push({
      type: "regulatory_change",
      title: row.title,
      date: row.effective_date,
      status: row.status,
      entityType: "regulatory_change",
      entityId: row.change_id,
    });
  }

  // Policy review dates (from existing policies table)
  try {
    const policies = await safeQuery(
      `SELECT policy_id, title, next_review_date, status
       FROM "${schema}".policies
       WHERE next_review_date BETWEEN $1 AND $2 AND deleted_at IS NULL
       ORDER BY next_review_date`,
      [startDate, endDate]
    );
    for (const row of policies.rows) {
      events.push({
        type: "policy_review",
        title: row.title,
        date: row.next_review_date,
        status: row.status,
        entityType: "policy",
        entityId: row.policy_id,
      });
    }
  } catch {
    // policies table may not have next_review_date column; skip gracefully
  }

  // Sort all events by date
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return events;
}

// ---------------------------------------------------------------------------
// 2.4 Control Test Plan Scheduling
// ---------------------------------------------------------------------------

/** Create a new control test plan. */
export async function createTestPlan(
  tenantId: string,
  data: TestPlanInput
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".control_test_plans
      (title, control_ids, test_type, frequency, assigned_to, next_run_date,
       auto_execute, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      data.title,
      JSON.stringify(data.controlIds || []),
      data.testType || "effectiveness",
      data.frequency || "quarterly",
      data.assignedTo || null,
      data.nextRunDate || null,
      data.autoExecute || false,
      data.createdBy || null,
    ]
  );
  return result.rows[0];
}

/** List all control test plans for the tenant. */
export async function getTestPlans(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".control_test_plans ORDER BY next_run_date ASC NULLS LAST, created_at DESC`
  );
  return result.rows;
}

/** Execute a test plan: update last_run, compute next_run, record result. */
export async function executeTestPlan(
  tenantId: string,
  planId: string,
  executedBy: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const planRes = await safeQuery(
    `SELECT * FROM "${schema}".control_test_plans WHERE plan_id = $1`,
    [planId],
  );
  const plan = planRes.rows[0];
  if (!plan) return undefined;
  const freqDays: Record<string, number> = {
    daily: 1, weekly: 7, monthly: 30, quarterly: 91, annually: 365,
  };
  const daysAhead = freqDays[plan.frequency as string] ?? 91;
  const nextRun = new Date();
  nextRun.setDate(nextRun.getDate() + daysAhead);
  const result = await safeQuery(
    `UPDATE "${schema}".control_test_plans
     SET last_run_at = NOW(), next_run_date = $2, last_executed_by = $3, updated_at = NOW()
     WHERE plan_id = $1
     RETURNING *`,
    [planId, nextRun.toISOString(), executedBy],
  );
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// 2.5 Cross-Framework Mapping
// ---------------------------------------------------------------------------

/** Build a map of controls to their associated frameworks with coverage stats. */
export async function getCrossFrameworkMap(tenantId: string): Promise<CrossFrameworkMap> {
  const schema = tenantSchema(tenantId);

  // Fetch all controls with their framework assignments
  const controlsRes = await safeQuery(
    `SELECT control_id, title, frameworks FROM "${schema}".controls ORDER BY title`
  );

  // Fetch all frameworks for name lookup
  const frameworksRes = await safeQuery(
    `SELECT framework_id, name FROM "${schema}".frameworks
     WHERE (removed_by_admin IS NULL OR removed_by_admin = FALSE)`
  );
  const fwMap = new Map<string, string>();
  for (const fw of frameworksRes.rows) {
    fwMap.set(fw.framework_id, fw.name);
  }

  // Build control-to-frameworks mapping (only controls with 1+ frameworks)
  const controls: CrossFrameworkMap["controls"] = [];
  const frameworkControlCounts = new Map<string, { total: number; mapped: number }>();

  // Initialize framework counts
  for (const fw of frameworksRes.rows) {
    frameworkControlCounts.set(fw.framework_id, { total: 0, mapped: 0 });
  }

  for (const ctrl of controlsRes.rows) {
    const frameworkIds: string[] = ctrl.frameworks || [];
    if (frameworkIds.length === 0) continue;

    const frameworks = frameworkIds
      .filter((fid: string) => fwMap.has(fid))
      .map((fid: string) => ({
        frameworkId: fid,
        frameworkName: fwMap.get(fid) || fid,
      }));

    controls.push({
      controlId: ctrl.control_id,
      controlTitle: ctrl.title,
      frameworks,
      frameworkCount: frameworks.length,
    });

    // Count controls per framework
    for (const fid of frameworkIds) {
      const entry = frameworkControlCounts.get(fid);
      if (entry) {
        entry.mapped++;
      }
    }
  }

  // Build framework coverage stats
  // Get total registry controls per framework for coverage calculation
  const frameworkCoverage: CrossFrameworkMap["frameworkCoverage"] = [];
  for (const fw of frameworksRes.rows) {
    const counts = frameworkControlCounts.get(fw.framework_id) || { total: 0, mapped: 0 };
    const totalControls = fw.total_controls || counts.mapped;
    frameworkCoverage.push({
      frameworkId: fw.framework_id,
      frameworkName: fw.name,
      totalControls,
      mappedControls: counts.mapped,
      coveragePercent: totalControls > 0 ? Math.round((counts.mapped / totalControls) * 100) : 0,
    });
  }

  return { controls, frameworkCoverage };
}

// ---------------------------------------------------------------------------
// 2.6 Regulatory Filing Tracker
// ---------------------------------------------------------------------------

/** List regulatory filings with optional filters. */
export async function getFilings(
  tenantId: string,
  filters?: { status?: string; regulator?: string; jurisdiction?: string }
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters?.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(filters.status);
  }
  if (filters?.regulator) {
    conditions.push(`regulator = $${paramIdx++}`);
    params.push(filters.regulator);
  }
  if (filters?.jurisdiction) {
    conditions.push(`jurisdiction = $${paramIdx++}`);
    params.push(filters.jurisdiction);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await safeQuery(
    `SELECT * FROM "${schema}".regulatory_filings ${where} ORDER BY due_date ASC NULLS LAST, created_at DESC`,
    params
  );
  return result.rows;
}

/** Create a new regulatory filing record. */
export async function createFiling(
  tenantId: string,
  data: FilingInput
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".regulatory_filings
      (title, regulator, filing_type, jurisdiction, due_date,
       reference_number, status, submission_method, notes, filed_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      data.title,
      data.regulator,
      data.filingType || null,
      data.jurisdiction || "KSA",
      data.dueDate || null,
      data.referenceNumber || null,
      data.status || "pending",
      data.submissionMethod || null,
      data.notes || null,
      data.filedBy || null,
    ]
  );
  return result.rows[0];
}

/** Update the status of a regulatory filing. */
export async function updateFilingStatus(
  tenantId: string,
  filingId: string,
  status: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".regulatory_filings
     SET status = $2, updated_at = NOW()
     WHERE filing_id = $1
     RETURNING *`,
    [filingId, status],
  );
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// 2.7 Continuous Compliance Monitoring
// ---------------------------------------------------------------------------

/** Get overall compliance monitoring status including evidence freshness. */
export async function getComplianceMonitoringStatus(
  tenantId: string
): Promise<MonitoringStatus> {
  const schema = tenantSchema(tenantId);
  const freshnessCutoffDays = 90; // Evidence older than 90 days is considered stale

  // Get all controls
  const controlsRes = await safeQuery(
    `SELECT control_id, title FROM "${schema}".controls ORDER BY title`
  );

  // Get latest evidence date per control
  const evidenceRes = await safeQuery(
    `SELECT control_id, COUNT(*)::int AS evidence_count,
            MAX(created_at) AS latest_evidence_date
     FROM "${schema}".evidence
     GROUP BY control_id`
  );
  const evidenceMap = new Map<string, { count: number; latestDate: string }>();
  for (const row of evidenceRes.rows) {
    evidenceMap.set(row.control_id, {
      count: row.evidence_count,
      latestDate: row.latest_evidence_date,
    });
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - freshnessCutoffDays);

  let freshCount = 0;
  let staleCount = 0;
  let gapCount = 0;
  const details: MonitoringStatus["details"] = [];

  for (const ctrl of controlsRes.rows) {
    const ev = evidenceMap.get(ctrl.control_id);
    if (!ev || ev.count === 0) {
      // No evidence at all — gap
      gapCount++;
      details.push({
        controlId: ctrl.control_id,
        controlTitle: ctrl.title,
        evidenceCount: 0,
        latestEvidenceDate: null,
        isFresh: false,
      });
    } else {
      const isFresh = new Date(ev.latestDate) >= cutoffDate;
      if (isFresh) freshCount++;
      else staleCount++;
      details.push({
        controlId: ctrl.control_id,
        controlTitle: ctrl.title,
        evidenceCount: ev.count,
        latestEvidenceDate: ev.latestDate,
        isFresh,
      });
    }
  }

  return {
    totalControls: controlsRes.rows.length,
    controlsWithFreshEvidence: freshCount,
    staleEvidenceCount: staleCount,
    gapCount,
    freshnessCutoffDays,
    details,
  };
}

/** Trigger an evidence freshness refresh (re-evaluate stale/gap status). */
export async function triggerEvidenceRefresh(
  tenantId: string,
  frameworkId?: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  // If frameworkId provided, only refresh controls for that framework
  let controlFilter = "";
  const params: unknown[] = [];
  if (frameworkId) {
    controlFilter = `WHERE $1 = ANY(frameworks)`;
    params.push(frameworkId);
  }

  const controlsRes = await safeQuery(
    `SELECT control_id, title, evidence_ids FROM "${schema}".controls ${controlFilter} ORDER BY title`,
    params
  );

  const refreshResults: Record<string, unknown>[] = [];
  const freshnessCutoffDays = 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - freshnessCutoffDays);

  for (const ctrl of controlsRes.rows) {
    const evRes = await safeQuery(
      `SELECT COUNT(*)::int AS cnt, MAX(created_at) AS latest
       FROM "${schema}".evidence
       WHERE control_id = $1`,
      [ctrl.control_id]
    );
    const row = evRes.rows[0];
    const evidenceCount = row?.cnt || 0;
    const latestDate = row?.latest || null;
    const isFresh = latestDate ? new Date(latestDate) >= cutoffDate : false;

    refreshResults.push({
      controlId: ctrl.control_id,
      controlTitle: ctrl.title,
      evidenceCount,
      latestEvidenceDate: latestDate,
      isFresh,
      status: evidenceCount === 0 ? "gap" : isFresh ? "fresh" : "stale",
    });
  }

  return {
    refreshedAt: new Date().toISOString(),
    frameworkId: frameworkId || null,
    totalControlsChecked: refreshResults.length,
    fresh: refreshResults.filter((r) => r.status === "fresh").length,
    stale: refreshResults.filter((r) => r.status === "stale").length,
    gaps: refreshResults.filter((r) => r.status === "gap").length,
    controls: refreshResults,
  };
}
