import { logger } from '../../../ports/logger.port';
/**
 * Compliance Workspace — Assessment, Findings, Controls Register, Monitoring, Savings
 *
 * Extracted from compliance-workspace.service.ts for modularity.
 */

import { emptyResult, safeQuery, safeQueryWithClient, withTransaction } from '../../../ports/database.port';
import { v4 as uuid } from "uuid";
import { pct, computeMaturity, ctx } from "../../misc/compliance.utils.js";
import type { ComplianceScope } from "../../misc/compliance.utils.js";
import { eventBus } from '../../../ports/events.port';
import { emitAudit } from '../../../ports/soc.port';
import { publishPlatformEvent } from '../../../ports/dos.port';
import { getComplianceSettings } from "../core/compliance-settings.service";
import { getAiPort } from "../../../ports/ai.port";
import { toErrorMessage } from '@dos/module-sdk';
import { getClearanceFilterHierarchy } from '../../../../remediation/services/clearance.service.js';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, swallowDefault, EC } from '@dos/platform-core/resilience';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';

// ═══════════════════════════════════════════════════════════════════
// 8b. FRAMEWORK ASSESS (trigger assessment)
// ═══════════════════════════════════════════════════════════════════

export async function assessFramework(tenantId: string, frameworkCode: string, userId?: string) {
  const { schema } = ctx(tenantId);
  const assessmentId = uuid();

  return withTransaction(tenantId, async (client) => {
    const ctrlRes = await safeQueryWithClient(
      `SELECT control_id, title, status, test_status, evidence_ids, mapped_registry_nodes
       FROM "${schema}".controls WHERE $1 = ANY(frameworks) AND deleted_at IS NULL`, [frameworkCode], client);
    const controls = ctrlRes.rows;
    const total = controls.length;
    const implemented = controls.filter((c: GenericRow) => c.status === 'implemented').length;
    const tested = controls.filter((c: GenericRow) => c.test_status === 'passed').length;
    const withEvidence = controls.filter((c: GenericRow) => (c.evidence_ids || []).length > 0).length;
    const score = pct(implemented, total);

    await safeQueryWithClient(
      `INSERT INTO "${schema}".assessments (assessment_id, framework_id, title, status, score, created_by, created_at)
       VALUES ($1, $2, $3, 'completed', $4, $5, NOW())`,
      [assessmentId, frameworkCode, `Auto-assessment ${new Date().toISOString().slice(0,10)}`, score, userId || SYSTEM_JOB_ACTOR], client);

    await safeQueryWithClient(
      `UPDATE "${schema}".frameworks SET completion_percent = $1, implemented_controls = $2, total_controls = $3, updated_at = NOW()
       WHERE framework_id = $4`, [score, implemented, total, frameworkCode], client);

    const oblRes = await safeQueryWithClient(
      `SELECT node_id, code, title_en FROM instrument_structure
       WHERE instrument_id = $1 AND level = 4 ORDER BY sort_order`, [frameworkCode], client);
    const mappedNodes = new Set<string>();
    for (const c of controls) {
      for (const n of (c.mapped_registry_nodes || [])) mappedNodes.add(n);
    }
    const wsRes = await safeQueryWithClient(`SELECT workspace_id FROM "${schema}".workspaces LIMIT 1`, [], client);
    const wsId = getFirstRow(wsRes)?.workspace_id;

    let newGaps = 0;
    if (wsId) {
      for (const obl of oblRes.rows) {
        if (!mappedNodes.has(obl.node_id)) {
          const existing = await safeQueryWithClient(
            `SELECT finding_id FROM "${schema}".findings WHERE source_id = $1 AND status != 'closed' AND deleted_at IS NULL`, [obl.node_id], client);
          if (existing.rows.length === 0) {
            await safeQueryWithClient(
              `INSERT INTO "${schema}".findings (finding_id, workspace_id, title, severity, status, source_type, source_id, created_at)
               VALUES ($1, $2, $3, 'medium', 'open', 'obligation', $4, NOW())`,
              [uuid(), wsId, `Gap: ${obl.code} — ${obl.title_en}`, obl.node_id], client);
            newGaps++;
          }
        }
      }
    }

    return {
      assessmentId,
      frameworkCode,
      score,
      totalControls: total,
      implementedControls: implemented,
      testedControls: tested,
      withEvidence,
      newGapsCreated: newGaps,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// 9. COVERAGE MATRIX
// ═══════════════════════════════════════════════════════════════════

export async function getCoverageMatrix(tenantId: string, frameworkId: string) {
  const { schema } = ctx(tenantId);

  // Obligations for framework
  const oblRes = await safeQuery(
    `SELECT node_id, code, title_en, title_ar, priority
     FROM instrument_structure WHERE instrument_id = $1 AND level = 4
     ORDER BY sort_order LIMIT 100`, [frameworkId]);

  // Controls
  const ctrlRes = await safeQuery(
    `SELECT control_id, title, status, test_status, evidence_ids, mapped_registry_nodes
     FROM "${schema}".controls WHERE $1 = ANY(frameworks) AND deleted_at IS NULL`, [frameworkId]);

  const matrix = oblRes.rows.map((o: GenericRow) => {
    const mappedCtrls = ctrlRes.rows.filter((c: GenericRow) => (c.mapped_registry_nodes || []).includes(o.node_id));
    const hasEvidence = mappedCtrls.some((c: GenericRow) => (c.evidence_ids || []).length > 0);
    const isImplemented = mappedCtrls.some((c: GenericRow) => c.status === 'implemented');
    const isTested = mappedCtrls.some((c: GenericRow) => c.test_status === 'passed');
    return {
      obligationId: o.node_id,
      obligationCode: o.code,
      obligationTitle: o.title_en,
      priority: o.priority,
      hasControl: mappedCtrls.length > 0,
      controlCount: mappedCtrls.length,
      isImplemented,
      hasEvidence,
      isTested,
      controls: mappedCtrls.map((c: GenericRow) => ({
        controlId: c.control_id,
        title: c.title,
        status: c.status,
      })),
    };
  });

  const totalObl = oblRes.rows.length;
  const implCount = matrix.filter((m) => m.isImplemented).length;
  const evCount = matrix.filter((m) => m.hasEvidence).length;
  const testedCount = matrix.filter((m) => m.isTested).length;
  const pctImpl = pct(implCount, totalObl || 1);
  const pctEv = pct(evCount, totalObl || 1);
  const pctTested = pct(testedCount, totalObl || 1);
  const { maturityScore, maturityLevel } = computeMaturity(pctImpl, pctEv, pctTested);

  return {
    frameworkId,
    totalObligations: totalObl,
    covered: matrix.filter((m) => m.hasControl).length,
    implemented: implCount,
    withEvidence: evCount,
    maturityLevel,
    maturityScore,
    matrix,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 12. ASSESSMENT HISTORY
// ═══════════════════════════════════════════════════════════════════

export async function getAssessmentHistory(tenantId: string) {
  const { schema } = ctx(tenantId);
  const res = await safeQuery(
    `SELECT assessment_id, framework_id, title, status, score, created_by, created_at
     FROM "${schema}".assessments
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC LIMIT 50`);
  return res.rows.map((a: GenericRow) => ({
    assessmentId: a.assessment_id,
    frameworkId: a.framework_id,
    title: a.title || 'Assessment',
    status: a.status,
    score: a.score,
    createdAt: a.created_at,
    runBy: a.created_by,
    scope: null,
  }));
}

// ═══════════════════════════════════════════════════════════════════
// 16. FINDINGS — CREATE / UPDATE
// ═══════════════════════════════════════════════════════════════════

export async function createFinding(tenantId: string, data: {
  title: string; description?: string; severity?: string; sourceType?: string; sourceId?: string; assignedTo?: string; dueDate?: string;
  generateAISuggestions?: boolean; // Optional: trigger AI remediation suggestions on creation
}) {
  const { schema } = ctx(tenantId);
  const findingId = uuid();
  await safeQuery(
    `INSERT INTO "${schema}".findings (finding_id, title, description, severity, status, source_type, source_id, assigned_to, due_date, created_at)
     VALUES ($1, $2, $3, $4, 'open', $5, $6, $7, $8, NOW())`,
    [findingId, data.title, data.description || null, data.severity || 'medium',
     data.sourceType || null, data.sourceId || null, data.assignedTo || null, data.dueDate || null]);
  eventBus.publish(({ eventType: 'compliance.finding_raised', tenantId, sourceService: 'ComplianceWorkspaceService', severity: 'info', payload: { findingId, title: data.title, severity: data.severity } } as any));
  // Mirror to DSOC: a compliance finding is a security-relevant audit
  // event; severity escalates to high/critical when the finding itself
  // is high/critical so DSOC can raise an alert downstream.
  void emitAudit({
    tenantId,
    category: 'data_access',
    severity: data.severity === 'critical' ? 'critical' : data.severity === 'high' ? 'high' : 'medium',
    actor: { type: 'service', id: 'compliance-service' },
    action: 'compliance.finding_raised',
    resource: { type: 'finding', id: findingId },
    outcome: 'success',
    occurredAt: new Date().toISOString(),
    attributes: { title: data.title, sourceType: data.sourceType, sourceId: data.sourceId },
  }).catch(() => { /* swallow — audit must not block finding creation */ });
  // Also publish a domain event through the DOS orchestrator so the
  // durable platform_events_log row exists for correlation + replay.
  void publishPlatformEvent({
    eventType: 'compliance.finding_raised',
    tenantId,
    occurredAt: new Date().toISOString(),
    payload: { findingId, severity: data.severity, sourceType: data.sourceType, sourceId: data.sourceId },
  }).catch(() => { /* DOS publish is best-effort */ });

  // Optionally generate AI remediation suggestions (non-blocking)
  if (data.generateAISuggestions !== false) {
    // Fire and forget - don't block finding creation on AI generation
    generateFindingRemediationSuggestions(tenantId, findingId).catch((err) => {
      logger.error(`[ComplianceWorkspace] Failed to generate AI suggestions for finding ${findingId} on creation:`, toErrorMessage(err));
    });
  }

  return { finding_id: findingId, ...data, status: 'open', created_at: new Date().toISOString() };
}

export async function updateFinding(tenantId: string, findingId: string, data: {
  status?: string; assignedTo?: string; remediationPlan?: string;
}) {
  const { schema } = ctx(tenantId);
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (data.status) { sets.push(`status = $${idx}`); params.push(data.status); idx++; }
  if (data.assignedTo) { sets.push(`assigned_to = $${idx}`); params.push(data.assignedTo); idx++; }
  if (data.remediationPlan) { sets.push(`remediation_plan = $${idx}`); params.push(data.remediationPlan); idx++; }
  if (sets.length === 0) return null;
  params.push(findingId);
  const res = await safeQuery(
    `UPDATE "${schema}".findings SET ${sets.join(', ')}, updated_at = NOW() WHERE finding_id = $${idx} RETURNING *`, params);
  const row = getFirstRow(res) || null;
  if (row && data.status === 'closed') {
    eventBus.publish(({ eventType: 'compliance.finding_closed', tenantId, sourceService: 'ComplianceWorkspaceService', severity: 'info', payload: { findingId, status: 'closed' } } as any));
  }
  return row;
}

/**
 * Generate AI-powered remediation suggestions for a finding.
 * Called automatically on finding creation and can be triggered on-demand when opening a finding.
 * @param tenantId - Tenant ID
 * @param findingId - Finding ID
 * @returns AI-generated remediation suggestions with metadata
 */
export async function generateFindingRemediationSuggestions(
  tenantId: string,
  findingId: string
): Promise<{ suggestions: string[]; generatedAt: string; confidence?: number; model?: string } | null> {
  try {
    const { schema } = ctx(tenantId);

    // Retrieve finding details
    const findingRes = await safeQuery(
      `SELECT finding_id, title, description, severity, status, source_type, source_id, assigned_to, due_date
       FROM "${schema}".findings WHERE finding_id = $1 AND deleted_at IS NULL`,
      [findingId]
    );

    if (findingRes.rows.length === 0) {
      return null;
    }

    const finding = getFirstRow(findingRes)!;

    // Build context for AI
    const context = {
      title: finding.title,
      description: finding.description || '',
      severity: finding.severity || 'medium',
      status: finding.status || 'open',
      sourceType: finding.source_type,
      sourceId: finding.source_id,
      assignedTo: finding.assigned_to,
      dueDate: finding.due_date,
    };

    // Call AI to generate remediation suggestions
    const systemPrompt = `You are a GRC (Governance, Risk, and Compliance) expert specializing in KSA regulatory frameworks (NCA ECC, SAMA CSF, CST CRF, PDPL).
Your task is to analyze compliance findings and generate actionable, prioritized remediation suggestions.

Guidelines:
- Provide 3-5 specific, actionable remediation steps
- Prioritize suggestions by impact and feasibility
- Consider KSA regulatory context and sector-specific requirements
- Include technical, process, and governance recommendations
- Ensure suggestions are measurable and time-bound where applicable
- Reference relevant control domains (IAM, Logging, Data Protection, IR/BCM, Vendor Risk) when relevant

Respond with a JSON object containing:
{
  "suggestions": ["suggestion1", "suggestion2", ...],
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why these suggestions are appropriate"
}`;

    const userMessage = `Generate remediation suggestions for this compliance finding:

Title: ${context.title}
Description: ${context.description}
Severity: ${context.severity}
Status: ${context.status}
Source: ${context.sourceType}${context.sourceId ? ` (${context.sourceId})` : ''}
${context.assignedTo ? `Assigned to: ${context.assignedTo}` : ''}
${context.dueDate ? `Due date: ${context.dueDate}` : ''}

Provide prioritized, actionable remediation steps.`;

    interface AISuggestionResponse {
      suggestions: string[];
      confidence?: number;
      reasoning?: string;
    }

    const aiResponse = await getAiPort().gatewayJSON<AISuggestionResponse>({
      tenantId,
      systemPrompt,
      userMessage,
      maxTokens: 1000,
      temperature: 0.7,
    });

    if (!aiResponse || !Array.isArray(aiResponse.suggestions) || aiResponse.suggestions.length === 0) {
      logger.warn(`[ComplianceWorkspace] AI returned invalid response for finding ${findingId}`);
      return null;
    }

    // Store suggestions in database
    const suggestionsData = {
      suggestions: aiResponse.suggestions,
      generatedAt: new Date().toISOString(),
      confidence: aiResponse.confidence ?? 0.8,
      model: 'multi-provider',
      reasoning: aiResponse.reasoning,
    };

    await safeQuery(
      `UPDATE "${schema}".findings
       SET ai_remediation_suggestions = $1, updated_at = NOW()
       WHERE finding_id = $2`,
      [JSON.stringify(suggestionsData), findingId]
    );

    return {
      suggestions: aiResponse.suggestions,
      generatedAt: suggestionsData.generatedAt,
      confidence: suggestionsData.confidence,
      model: suggestionsData.model,
    };
  } catch (err: unknown) {
    logger.error(`[ComplianceWorkspace] Failed to generate AI remediation suggestions for finding ${findingId}:`, toErrorMessage(err));
    // Don't throw - return null so finding creation/retrieval can continue
    return null;
  }
}

/**
 * Get finding by ID with AI remediation suggestions included.
 * @param tenantId - Tenant ID
 * @param findingId - Finding ID
 * @param includeAISuggestions - Whether to generate AI suggestions if not present (default: false)
 * @returns Finding object with AI suggestions if available
 */
export async function getFindingWithAISuggestions(
  tenantId: string,
  findingId: string,
  includeAISuggestions: boolean = false
): Promise<GenericRow | undefined> {
  const { schema } = ctx(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".findings WHERE finding_id = $1 AND deleted_at IS NULL`,
    [findingId]
  );

  if (result.rows.length === 0) {
    const err = new Error("Finding not found") as Error & { status?: number };
    err.status = 404;
    throw err;
  }

  const finding = getFirstRow(result)!;

  // If AI suggestions are requested and not present, generate them
  if (includeAISuggestions && !finding.ai_remediation_suggestions) {
    const suggestions = await generateFindingRemediationSuggestions(tenantId, findingId);
    if (suggestions) {
      // Re-fetch to get updated suggestions
      const updatedResult = await safeQuery(
        `SELECT * FROM "${schema}".findings WHERE finding_id = $1 AND deleted_at IS NULL`,
        [findingId]
      );
      if (updatedResult.rows.length > 0) {
        return getFirstRow(updatedResult);
      }
    }
  }

  return finding;
}

/**
 * Bulk update finding status for multiple findings.
 * @param tenantId - Tenant ID
 * @param findingIds - Array of finding IDs to update
 * @param status - New status value
 * @returns Number of updated findings
 */
export async function bulkUpdateFindingStatus(
  tenantId: string,
  findingIds: string[],
  status: string
): Promise<{ updated: number }> {
  if (!findingIds || findingIds.length === 0) {
    return { updated: 0 };
  }
  const { schema } = ctx(tenantId);
  const res = await safeQuery(
    `UPDATE "${schema}".findings
     SET status = $1, updated_at = NOW()
     WHERE finding_id = ANY($2::uuid[]) AND deleted_at IS NULL
     RETURNING finding_id`,
    [status, findingIds]
  );
  const updated = res.rows.length;
  if (updated > 0) {
    swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'compliance.finding_bulk_updated',
          tenantId,
          sourceService: 'ComplianceWorkspaceService',
          severity: 'info',
          payload: { findingIds, status, updated }
        } as any)), { tenantId, operation: 'eventBus:compliance.finding_bulk_updated' });
  }
  return { updated };
}

/**
 * Bulk assign controls to an owner.
 * @param tenantId - Tenant ID
 * @param controlIds - Array of control IDs to assign
 * @param ownerId - User ID to assign as owner
 * @returns Number of updated controls
 */
export async function bulkAssignControls(
  tenantId: string,
  controlIds: string[],
  ownerId: string
): Promise<{ updated: number }> {
  if (controlIds.length === 0) return { updated: 0 };
  const { schema } = ctx(tenantId);
  const placeholders = controlIds.map((_: string, i: number) => `$${i + 2}`).join(',');
  const result = await safeQuery(
    `UPDATE "${schema}".controls
     SET owner = $1, updated_at = NOW()
     WHERE control_id IN (${placeholders}) AND deleted_at IS NULL
     RETURNING control_id`,
    [ownerId, ...controlIds],
  );
  return { updated: result.rows.length };
}

// ═══════════════════════════════════════════════════════════════════
// 17. ASSESSMENT REVIEW / APPROVAL
// ═══════════════════════════════════════════════════════════════════

export async function assignReviewer(tenantId: string, assessmentId: string, reviewerId: string) {
  const { schema } = ctx(tenantId);
  const res = await safeQuery(
    `UPDATE "${schema}".assessments SET reviewer_id = $1 WHERE assessment_id = $2 RETURNING *`,
    [reviewerId, assessmentId]);
  return getFirstRow(res) || null;
}

export async function submitForReview(tenantId: string, assessmentId: string) {
  const { schema } = ctx(tenantId);
  const res = await safeQuery(
    `UPDATE "${schema}".assessments SET review_status = 'pending_review', status = 'under_review',
       submitted_for_review_at = NOW()
     WHERE assessment_id = $1 AND status IN ('completed', 'in_progress') RETURNING *`,
    [assessmentId]);
  return getFirstRow(res) || null;
}

export async function approveAssessment(tenantId: string, assessmentId: string, notes?: string) {
  const { schema } = ctx(tenantId);
  const res = await safeQuery(
    `UPDATE "${schema}".assessments SET review_status = 'approved', review_notes = $1,
       reviewed_at = NOW(), status = 'completed'
     WHERE assessment_id = $2 RETURNING *`,
    [notes || null, assessmentId]);
  return getFirstRow(res) || null;
}

export async function rejectAssessment(tenantId: string, assessmentId: string, notes: string) {
  const { schema } = ctx(tenantId);
  const res = await safeQuery(
    `UPDATE "${schema}".assessments SET review_status = 'rejected', review_notes = $1,
       reviewed_at = NOW(), status = 'in_progress'
     WHERE assessment_id = $2 RETURNING *`,
    [notes, assessmentId]);
  return getFirstRow(res) || null;
}

// ═══════════════════════════════════════════════════════════════════
// CONTROLS REGISTER (compliance-aligned)
// ═══════════════════════════════════════════════════════════════════

export async function getControlsRegister(
  tenantId: string,
  frameworkId?: string,
  options?: { limit?: number; offset?: number; scope?: ComplianceScope; userId?: string; status?: string; owner?: string; userRole?: string }
): Promise<{ items: GenericRow[]; total: number }> {
  const { schema } = ctx(tenantId);
  const settings = await getComplianceSettings(tenantId);
  const limit = Math.min(
    Math.max(1, options?.limit ?? settings.paginationDefaultPageSize),
    settings.paginationMaxPageSize
  );
  const offset = Math.max(0, options?.offset ?? 0);
  const scopeMy = options?.scope === "my" && options?.userId;

  const conditions = ['c.deleted_at IS NULL'];
  const countParams: unknown[] = [];
  let p = 1;

  if (frameworkId) {
    conditions.push(`$${p} = ANY(c.frameworks)`);
    countParams.push(frameworkId);
    p++;
  }
  if (scopeMy) {
    conditions.push(`c.owner = $${p++}`);
    countParams.push(options!.userId!);
  }
  if (options?.status) {
    conditions.push(`c.status = $${p++}`);
    countParams.push(options.status);
  }
  if (options?.owner) {
    conditions.push(`c.owner = $${p++}`);
    countParams.push(options.owner);
  }

  // P5.5: Filter by user clearance (data_classification)
  if (options?.userRole) {
    const clearanceFilter = getClearanceFilterHierarchy(options.userRole, 'data_classification', p);
    conditions.push(clearanceFilter.condition);
    countParams.push(clearanceFilter.paramValue);
    p++;
  }

  const baseWhere = conditions.join(' AND ');
  const listParams = [...countParams, limit, offset];
  const limitIdx = countParams.length + 1;
  const offsetIdx = countParams.length + 2;
  const countSql = `SELECT COUNT(*)::int AS total FROM "${schema}".controls c WHERE ${baseWhere}`;
  const listSql = `SELECT c.control_id, c.title, c.description, c.status, c.test_status,
              c.frameworks, c.mapped_registry_nodes, c.evidence_ids, c.owner,
              c.automatable, c.last_tested_at, c.owner_team_id, c.created_at, c.data_classification
       FROM "${schema}".controls c WHERE ${baseWhere} ORDER BY c.created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

  const [countRes, ctrlRes] = await Promise.all([
    safeQuery(countSql, countParams),
    safeQuery(listSql, listParams),
  ]);
  const total = Number(getFirstRow(countRes)?.total ?? 0);
  const controlIds = (ctrlRes.rows as GenericRow[]).map((c) => c.control_id);

  const evMap = new Map<string, number>();
  const riskMap = new Map<string, number>();
  if (controlIds.length > 0) {
    const [evCountRes, riskRes] = await Promise.all([
      safeQuery(
        `SELECT control_id, COUNT(*)::int AS cnt FROM "${schema}".evidence WHERE deleted_at IS NULL AND control_id = ANY($1) GROUP BY control_id`,
        [controlIds]
      ),
      safeQuery(
        `SELECT control_id, COUNT(*)::int AS cnt FROM "${schema}".risk_control_links WHERE control_id = ANY($1) GROUP BY control_id`,
        [controlIds]
      ),
    ]);
    for (const r of evCountRes.rows as GenericRow[]) evMap.set(r.control_id as string, r.cnt as number);
    for (const r of riskRes.rows as GenericRow[]) riskMap.set(r.control_id as string, r.cnt as number);
  }

  const items = (ctrlRes.rows as GenericRow[]).map((c: GenericRow) => ({
    controlId: c.control_id,
    title: c.title,
    description: c.description,
    status: c.status,
    testStatus: c.test_status,
    frameworks: c.frameworks || [],
    mappedRegistryNodes: c.mapped_registry_nodes || [],
    evidenceIds: c.evidence_ids || [],
    owner: c.owner,
    automatable: c.automatable,
    lastTestedAt: c.last_tested_at,
    ownerTeamId: c.owner_team_id,
    evidenceCount: evMap.get(c.control_id) ?? (c.evidence_ids || []).length,
    riskCount: riskMap.get(c.control_id) ?? 0,
    createdAt: c.created_at,
  }));

  return { items, total };
}

// ═══════════════════════════════════════════════════════════════════
// CONTROL MONITORING (continuous assurance: SLA, evidence expiry)
// ═══════════════════════════════════════════════════════════════════

/** SLA days by test_frequency (same as controls.routes /monitoring) */
const SLA_DAYS: Record<string, number> = {
  daily: 2,
  weekly: 10,
  monthly: 35,
  quarterly: 100,
  annually: 380,
};
const DEFAULT_SLA_DAYS = 90;
const APPROACHING_DAYS = 7; // consider "approaching" when within 7 days of SLA
const EVIDENCE_EXPIRY_WINDOW_DAYS = 30;

export interface ControlMonitoringItem {
  controlId: string;
  title: string;
  owner: string | null;
  lastTestedAt: string | null;
  testFrequency: string;
  testStatus: string;
  evidenceExpiryNext: string | null;
  automatedCheckStatus: "automated" | "manual";
  slaState: "ok" | "approaching_sla" | "past_sla";
  daysSinceTest: number | null;
}

export async function getControlMonitoring(
  tenantId: string,
  options?: { frameworkId?: string }
): Promise<{
  approachingSla: ControlMonitoringItem[];
  pastSla: ControlMonitoringItem[];
  expiringEvidence: ControlMonitoringItem[];
  items: ControlMonitoringItem[];
  counts: { approaching: number; past: number; expiring: number };
}> {
  const { schema } = ctx(tenantId);

  const baseWhere = `c.deleted_at IS NULL`;
  const frameworkFilter = options?.frameworkId ? ` AND $1 = ANY(c.frameworks)` : "";
  const params = options?.frameworkId ? [options.frameworkId] : [];

  const ctrlSql = `
    SELECT c.control_id, c.title, c.owner, c.test_status, c.last_tested_at,
           COALESCE(c.test_frequency, 'manual') AS test_frequency
    FROM "${schema}".controls c
    WHERE ${baseWhere}${frameworkFilter}
  `;
  const ctrlRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(ctrlSql, params), { tenantId: tenantId, operation: 'query controls' });
  const controls = (ctrlRes.rows as GenericRow[]) || [];
  const controlIds = controls.map((c: GenericRow) => c.control_id).filter(Boolean);
  if (controlIds.length === 0) {
    return {
      approachingSla: [],
      pastSla: [],
      expiringEvidence: [],
      items: [],
      counts: { approaching: 0, past: 0, expiring: 0 },
    };
  }

  const evSql = `
    SELECT e.control_id, MIN(e.expiry_date)::text AS evidence_expiry_next
    FROM "${schema}".evidence e
    WHERE e.deleted_at IS NULL AND e.control_id IS NOT NULL AND e.expiry_date > CURRENT_DATE
      AND e.control_id = ANY($1)
    GROUP BY e.control_id
  `;
  const evRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(evSql, [controlIds]), { tenantId: tenantId, operation: 'query evidence' });
  const expiryByControl = new Map<string, string>();
  for (const r of (evRes.rows as GenericRow[]) || []) {
    if (r.control_id && r.evidence_expiry_next) expiryByControl.set(r.control_id, r.evidence_expiry_next);
  }

  const now = Date.now();
  const oneDay = 86400000;
  const approachingSla: ControlMonitoringItem[] = [];
  const pastSla: ControlMonitoringItem[] = [];
  const expiringEvidence: ControlMonitoringItem[] = [];
  const items: ControlMonitoringItem[] = [];

  for (const c of controls) {
    const testFrequency = (c.test_frequency || "manual").toLowerCase();
    const slaDays = SLA_DAYS[testFrequency] ?? DEFAULT_SLA_DAYS;
    const lastTestedAt = c.last_tested_at ? new Date(c.last_tested_at).toISOString() : null;
    const daysSinceTest = c.last_tested_at
      ? Math.floor((now - new Date(c.last_tested_at).getTime()) / oneDay)
      : null;
    const evidenceExpiryNext = expiryByControl.get(c.control_id) || null;
    const automatedCheckStatus =
      testFrequency === "continuous" || testFrequency === "automated" ? "automated" : "manual";

    let slaState: "ok" | "approaching_sla" | "past_sla" = "ok";
    if (lastTestedAt !== null) {
      if (daysSinceTest !== null && daysSinceTest >= slaDays) slaState = "past_sla";
      else if (daysSinceTest !== null && daysSinceTest >= slaDays - APPROACHING_DAYS) slaState = "approaching_sla";
    } else {
      slaState = "past_sla";
    }

    const item: ControlMonitoringItem = {
      controlId: c.control_id,
      title: c.title || "",
      owner: c.owner || null,
      lastTestedAt,
      testFrequency: c.test_frequency || "manual",
      testStatus: c.test_status || "not_tested",
      evidenceExpiryNext,
      automatedCheckStatus,
      slaState,
      daysSinceTest,
    };
    items.push(item);
    if (slaState === "past_sla") pastSla.push(item);
    else if (slaState === "approaching_sla") approachingSla.push(item);
    if (evidenceExpiryNext) {
      const expDays = Math.floor(
        (new Date(evidenceExpiryNext).getTime() - now) / oneDay
      );
      if (expDays <= EVIDENCE_EXPIRY_WINDOW_DAYS) expiringEvidence.push(item);
    }
  }

  return {
    approachingSla,
    pastSla,
    expiringEvidence,
    items,
    counts: {
      approaching: approachingSla.length,
      past: pastSla.length,
      expiring: expiringEvidence.length,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// FINDINGS REGISTER (compliance-aligned)
// ═══════════════════════════════════════════════════════════════════

export async function getFindingsRegister(
  tenantId: string,
  frameworkId?: string,
  severity?: string,
  options?: { limit?: number; offset?: number; scope?: ComplianceScope; userId?: string; status?: string; assignedTo?: string; userRole?: string }
): Promise<{ items: GenericRow[]; total: number }> {
  const { schema } = ctx(tenantId);
  const settings = await getComplianceSettings(tenantId);
  const limit = Math.min(
    Math.max(1, options?.limit ?? settings.paginationDefaultPageSize),
    settings.paginationMaxPageSize
  );
  const offset = Math.max(0, options?.offset ?? 0);
  const scopeMy = options?.scope === "my" && options?.userId;

  const conditions = ['f.deleted_at IS NULL'];
  const countParams: unknown[] = [];
  const listParams: unknown[] = [];
  let p = 1;
  if (frameworkId) {
    conditions.push(`f.source_id = $${p}`);
    countParams.push(frameworkId);
    listParams.push(frameworkId);
    p++;
  }
  if (severity) {
    conditions.push(`f.severity = $${p++}`);
    countParams.push(severity);
    listParams.push(severity);
  }
  if (scopeMy) {
    conditions.push(`f.assigned_to = $${p++}`);
    countParams.push(options!.userId!);
    listParams.push(options!.userId!);
  }
  if (options?.status) {
    conditions.push(`f.status = $${p++}`);
    countParams.push(options.status);
    listParams.push(options.status);
  }
  if (options?.assignedTo) {
    conditions.push(`f.assigned_to = $${p++}`);
    countParams.push(options.assignedTo);
    listParams.push(options.assignedTo);
  }

  // P5.5: Filter by user clearance (confidentiality_level)
  if (options?.userRole) {
    const clearanceFilter = getClearanceFilterHierarchy(options.userRole, 'confidentiality_level', p);
    conditions.push(clearanceFilter.condition);
    countParams.push(clearanceFilter.paramValue);
    listParams.push(clearanceFilter.paramValue);
    p++;
  }

  const baseWhere = conditions.join(' AND ');
  listParams.push(limit, offset);
  const limitParam = p++;
  const offsetParam = p;

  const [countRes, findRes] = await Promise.all([
    safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${schema}".findings f WHERE ${baseWhere}`,
      countParams
    ),
    safeQuery(
      `SELECT f.finding_id, f.title, f.description, f.severity, f.status,
              f.source_type, f.source_id, f.remediation_plan, f.due_date,
              f.assigned_to, f.created_at, f.confidentiality_level
       FROM "${schema}".findings f WHERE ${baseWhere} ORDER BY f.created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`,
      listParams
    ),
  ]);
  const total = Number(getFirstRow(countRes)?.total ?? 0);
  const items = (findRes.rows as GenericRow[]).map((f: GenericRow) => ({
    findingId: f.finding_id,
    title: f.title || `Finding ${(f.finding_id || '').slice(0, 8)}`,
    description: f.description,
    severity: f.severity || 'medium',
    status: f.status || 'open',
    sourceType: f.source_type,
    sourceId: f.source_id,
    remediationPlan: f.remediation_plan,
    dueDate: f.due_date,
    assignedTo: f.assigned_to,
    createdAt: f.created_at,
  }));
  return { items, total };
}

// ═══════════════════════════════════════════════════════════════════
// SAVINGS METRICS (compliance-aligned)
// ═══════════════════════════════════════════════════════════════════

export async function getSavingsMetrics(tenantId: string) {
  const { schema } = ctx(tenantId);

  const [ctrlRes, evRes, assessRes, remRes] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'implemented')::int AS implemented,
              COUNT(*) FILTER (WHERE automatable = true)::int AS automatable,
              COUNT(*) FILTER (WHERE test_status = 'passed')::int AS tested
       FROM "${schema}".controls WHERE deleted_at IS NULL`),
    safeQuery(`SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE verified = true)::int AS verified
       FROM "${schema}".evidence WHERE deleted_at IS NULL`),
    safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".assessments WHERE deleted_at IS NULL`),
    safeQuery(`SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status IN ('completed','closed'))::int AS resolved
       FROM "${schema}".remediation_tasks WHERE deleted_at IS NULL`),
  ]);

  const ctrl = getFirstRow(ctrlRes) || {};
  const ev = getFirstRow(evRes) || {};
  const assess = getFirstRow(assessRes) || {};
  const rem = getFirstRow(remRes) || {};

  const autoControls = ctrl.automatable || 0;
  const hoursSaved = Math.round((autoControls * 2.5) + (ctrl.tested * 0.5) + (ev.verified * 0.3) + (assess.total * 4));
  const tasksEliminated = autoControls + ctrl.tested + ev.verified;
  const evidenceAutoCollected = Math.round(ev.total * 0.6);
  const evidenceManual = ev.total - evidenceAutoCollected;
  const auditPrepDays = Math.max(3, Math.round(ctrl.implemented / Math.max(ctrl.total, 1) * 15));
  const costAvoided = Math.round(hoursSaved * 75);

  return {
    hoursSaved,
    tasksEliminated,
    evidenceAutoCollected,
    evidenceManual,
    auditPrepDays,
    costAvoided,
    controlsTotal: ctrl.total || 0,
    controlsImplemented: ctrl.implemented || 0,
    controlsAutomatable: autoControls,
    controlsTested: ctrl.tested || 0,
    evidenceTotal: ev.total || 0,
    evidenceVerified: ev.verified || 0,
    assessmentsTotal: assess.total || 0,
    remediationsTotal: rem.total || 0,
    remediationsResolved: rem.resolved || 0,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 21. COMPLIANCE POSTURE BY ORG STRUCTURE
// ═══════════════════════════════════════════════════════════════════

export async function getComplianceByOrgUnit(tenantId: string, groupBy: 'department' | 'business_unit' = 'department') {
  const { schema } = ctx(tenantId);
  const col = groupBy === 'department' ? 'department_id' : 'business_unit_id';
  const tbl = groupBy === 'department' ? 'departments' : 'business_units';
  const nameCol = 'name';
  const idCol = groupBy === 'department' ? 'department_id' : 'business_unit_id';

  // secrets-scan-allow: idCol/nameCol from typed union; schema tenantSchema()-validated
  const res = await safeQuery(
    `SELECT ou.${idCol} AS unit_id, ou.${nameCol} AS unit_name,
            COUNT(c.control_id)::int AS total_controls,
            COUNT(c.control_id) FILTER (WHERE c.status = 'implemented')::int AS implemented,
            COUNT(f.finding_id)::int AS open_gaps,
            COUNT(f.finding_id) FILTER (WHERE f.severity = 'critical')::int AS critical_gaps
     FROM "${schema}".${tbl} ou
     LEFT JOIN "${schema}".controls c ON c.${col} = ou.${idCol} AND c.deleted_at IS NULL
     LEFT JOIN "${schema}".findings f ON f.${col} = ou.${idCol} AND f.deleted_at IS NULL AND f.status NOT IN ('closed','resolved')
     WHERE ou.deleted_at IS NULL
     GROUP BY ou.${idCol}, ou.${nameCol}
     ORDER BY ou.${nameCol}`);
  return res.rows;
}
