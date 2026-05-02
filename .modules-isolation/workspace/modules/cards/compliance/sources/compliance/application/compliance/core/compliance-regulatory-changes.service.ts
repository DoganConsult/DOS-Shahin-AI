/**
 * Regulatory Changes — CRUD operations and impact analysis for
 * regulatory change tracking.
 *
 * Split from compliance-audit-export.service.ts for modularity.
 */

import { safeQuery } from '../../../ports/database.port';
import { v4 as uuid } from "uuid";
import { ctx } from "../../misc/compliance.utils.js";
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';

// ═══════════════════════════════════════════════════════════════════
// 15. REGULATORY CHANGES
// ═══════════════════════════════════════════════════════════════════

export async function getRegulatoryChanges(tenantId: string, status?: string) {
  const { schema } = ctx(tenantId);
  let q = `SELECT rc.*, u.display_name AS owner_name
           FROM "${schema}".regulatory_changes rc
           LEFT JOIN public.users u ON u.user_id = rc.owner_user_id
           ORDER BY rc.created_at DESC`;
  const params: unknown[] = [];
  if (status) {
    q = `SELECT rc.*, u.display_name AS owner_name
         FROM "${schema}".regulatory_changes rc
         LEFT JOIN public.users u ON u.user_id = rc.owner_user_id
         WHERE rc.status = $1 ORDER BY rc.created_at DESC`;
    params.push(status);
  }
  const res = await safeQuery(q, params);
  return res.rows;
}

export async function createRegulatoryChange(tenantId: string, data: {
  title: string; description?: string; regulatorCode?: string; effectiveDate?: string;
  severity?: string; ownerUserId?: string; departmentId?: string; businessUnitId?: string;
}) {
  const { schema } = ctx(tenantId);
  const id = uuid();
  await safeQuery(
    `INSERT INTO "${schema}".regulatory_changes (change_id, title, description, regulator_code, effective_date, severity, owner_user_id, department_id, business_unit_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, data.title, data.description || null, data.regulatorCode || null,
     data.effectiveDate || null, data.severity || 'medium',
     data.ownerUserId || null, data.departmentId || null, data.businessUnitId || null]);
  return { change_id: id, ...data, status: 'new', created_at: new Date().toISOString() };
}

export async function assessRegulatoryImpact(tenantId: string, changeId: string, data: {
  impactedControls: number; gapCount: number; notes?: string;
}) {
  const { schema } = ctx(tenantId);
  const res = await safeQuery(
    `UPDATE "${schema}".regulatory_changes
     SET impact_assessment = $1, status = 'assessed', updated_at = NOW()
     WHERE change_id = $2 RETURNING *`,
    [JSON.stringify({ impacted_controls: data.impactedControls, gap_count: data.gapCount, notes: data.notes }), changeId]);
  return getFirstRow(res) || null;
}

export async function updateRegulatoryChangeStatus(tenantId: string, changeId: string, status: string) {
  const { schema } = ctx(tenantId);
  const valid = ['new', 'under_review', 'assessed', 'action_required', 'implemented', 'dismissed'];
  if (!valid.includes(status)) return null;
  const res = await safeQuery(
    `UPDATE "${schema}".regulatory_changes SET status = $1, updated_at = NOW() WHERE change_id = $2 RETURNING *`,
    [status, changeId]);
  return getFirstRow(res) || null;
}

/**
 * Create or update an impact record for a regulatory change.
 * Links a regulatory change to a control or obligation with impact details.
 */
export async function upsertRegulatoryChangeImpact(tenantId: string, changeId: string, data: {
  impactType: 'control' | 'obligation';
  targetId: string; // control_id or obligation_id
  impactSeverity?: 'critical' | 'high' | 'medium' | 'low';
  impactCategory?: string;
  impactDescription?: string;
  remediationStatus?: 'pending' | 'assessed' | 'planned' | 'in_progress' | 'completed' | 'not_applicable' | 'deferred';
  remediationDueDate?: string;
  remediationNotes?: string;
  remediationTaskId?: string;
  assessedBy?: string;
  assessmentConfidence?: number;
}) {
  const { schema } = ctx(tenantId);

  // Check if impact record already exists
  const existingRes = await safeQuery(
    `SELECT impact_id FROM "${schema}".regulatory_change_impacts
     WHERE change_id = $1 AND impact_type = $2 AND target_id = $3`,
    [changeId, data.impactType, data.targetId]
  );

  if (existingRes.rows.length > 0) {
    // Update existing record
    const impactId = getFirstRow(existingRes)?.impact_id;
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.impactSeverity) { sets.push(`impact_severity = $${idx}`); params.push(data.impactSeverity); idx++; }
    if (data.impactCategory) { sets.push(`impact_category = $${idx}`); params.push(data.impactCategory); idx++; }
    if (data.impactDescription !== undefined) { sets.push(`impact_description = $${idx}`); params.push(data.impactDescription); idx++; }
    if (data.remediationStatus) { sets.push(`remediation_status = $${idx}`); params.push(data.remediationStatus); idx++; }
    if (data.remediationDueDate) { sets.push(`remediation_due_date = $${idx}`); params.push(data.remediationDueDate); idx++; }
    if (data.remediationNotes !== undefined) { sets.push(`remediation_notes = $${idx}`); params.push(data.remediationNotes); idx++; }
    if (data.remediationTaskId) { sets.push(`remediation_task_id = $${idx}`); params.push(data.remediationTaskId); idx++; }
    if (data.assessedBy) { sets.push(`assessed_by = $${idx}`); params.push(data.assessedBy); idx++; }
    if (data.assessmentConfidence !== undefined) { sets.push(`assessment_confidence = $${idx}`); params.push(data.assessmentConfidence); idx++; }

    sets.push(`updated_at = NOW()`);
    if (data.assessedBy && !data.assessedBy.includes('assessed_at')) {
      sets.push(`assessed_at = NOW()`);
    }

    params.push(impactId);
    const res = await safeQuery(
      `UPDATE "${schema}".regulatory_change_impacts
       SET ${sets.join(', ')}
       WHERE impact_id = $${idx} RETURNING *`,
      params
    );
    return getFirstRow(res);
  } else {
    // Create new record
    const impactId = uuid();
    const res = await safeQuery(
      `INSERT INTO "${schema}".regulatory_change_impacts
       (impact_id, change_id, impact_type, target_id, impact_severity, impact_category,
        impact_description, remediation_status, remediation_due_date, remediation_notes,
        remediation_task_id, assessed_by, assessed_at, assessment_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        impactId, changeId, data.impactType, data.targetId,
        data.impactSeverity || 'medium',
        data.impactCategory || null,
        data.impactDescription || null,
        data.remediationStatus || 'pending',
        data.remediationDueDate || null,
        data.remediationNotes || null,
        data.remediationTaskId || null,
        data.assessedBy || null,
        data.assessedBy ? new Date().toISOString() : null,
        data.assessmentConfidence || null
      ]
    );
    return getFirstRow(res);
  }
}

/**
 * Get detailed impact analysis for a regulatory change.
 * Returns affected controls and obligations with full details, impact severity,
 * and remediation status.
 */
export async function getRegulatoryChangeImpact(tenantId: string, changeId: string) {
  const { schema } = ctx(tenantId);

  // Fetch the regulatory change
  const changeRes = await safeQuery(
    `SELECT * FROM "${schema}".regulatory_changes WHERE change_id = $1`,
    [changeId]
  );
  if (changeRes.rows.length === 0) {
    return null;
  }
  const change = getFirstRow(changeRes)!;

  // Fetch all impact records
  const impactsRes = await safeQuery(
    `SELECT * FROM "${schema}".regulatory_change_impacts
     WHERE change_id = $1
     ORDER BY impact_severity DESC, created_at ASC`,
    [changeId]
  );
  const impacts = impactsRes.rows;

  // Separate controls and obligations
  const controlImpacts = impacts.filter(i => i.impact_type === 'control');
  const obligationImpacts = impacts.filter(i => i.impact_type === 'obligation');

  // Fetch full control details for affected controls
  const affectedControlIds = controlImpacts.map(i => i.target_id);
  let controls: unknown[] = [];
  if (affectedControlIds.length > 0) {
    const controlsRes = await safeQuery(
      `SELECT control_id, title, description, status, test_status, effectiveness,
              owner, owner_user_id, frameworks, evidence_ids, last_tested_at,
              test_frequency, lifecycle_phase
       FROM "${schema}".controls
       WHERE control_id = ANY($1) AND deleted_at IS NULL`,
      [affectedControlIds]
    );
    controls = controlsRes.rows;
  }

  // Fetch full obligation details for affected obligations
  const affectedObligationIds = obligationImpacts.map(i => i.target_id);
  let obligations: unknown[] = [];
  if (affectedObligationIds.length > 0) {
    const obligationsRes = await safeQuery(
      `SELECT obligation_id, framework_id, requirement_ref, title_en, title_ar,
              description_en, description_ar, status, priority, owner_id,
              mapped_controls, evidence_types, review_frequency
       FROM "${schema}".compliance_obligations
       WHERE obligation_id = ANY($1) AND deleted_at IS NULL`,
      [affectedObligationIds]
    );
    obligations = obligationsRes.rows;
  }

  // Enrich controls with impact details
  const enrichedControls = controls.map(control => {

    const impact = controlImpacts.find(i => i.target_id === control.control_id);
    return {

      ...control,
      impact: impact ? {
        impact_id: impact.impact_id,
        severity: impact.impact_severity,
        category: impact.impact_category,
        description: impact.impact_description,
        remediation_status: impact.remediation_status,
        remediation_due_date: impact.remediation_due_date,
        remediation_notes: impact.remediation_notes,
        remediation_task_id: impact.remediation_task_id,
        assessed_by: impact.assessed_by,
        assessed_at: impact.assessed_at,
        assessment_confidence: impact.assessment_confidence
      } : null
    };
  });

  // Enrich obligations with impact details
  const enrichedObligations = obligations.map(obligation => {

    const impact = obligationImpacts.find(i => i.target_id === obligation.obligation_id);
    return {

      ...obligation,
      impact: impact ? {
        impact_id: impact.impact_id,
        severity: impact.impact_severity,
        category: impact.impact_category,
        description: impact.impact_description,
        remediation_status: impact.remediation_status,
        remediation_due_date: impact.remediation_due_date,
        remediation_notes: impact.remediation_notes,
        remediation_task_id: impact.remediation_task_id,
        assessed_by: impact.assessed_by,
        assessed_at: impact.assessed_at,
        assessment_confidence: impact.assessment_confidence
      } : null
    };
  });

  // Compute summary statistics
  const summary = {
    total_impacts: impacts.length,
    total_controls: controlImpacts.length,
    total_obligations: obligationImpacts.length,
    by_severity: {
      critical: impacts.filter(i => i.impact_severity === 'critical').length,
      high: impacts.filter(i => i.impact_severity === 'high').length,
      medium: impacts.filter(i => i.impact_severity === 'medium').length,
      low: impacts.filter(i => i.impact_severity === 'low').length
    },
    by_remediation_status: {
      pending: impacts.filter(i => i.remediation_status === 'pending').length,
      assessed: impacts.filter(i => i.remediation_status === 'assessed').length,
      planned: impacts.filter(i => i.remediation_status === 'planned').length,
      in_progress: impacts.filter(i => i.remediation_status === 'in_progress').length,
      completed: impacts.filter(i => i.remediation_status === 'completed').length,
      not_applicable: impacts.filter(i => i.remediation_status === 'not_applicable').length,
      deferred: impacts.filter(i => i.remediation_status === 'deferred').length
    },
    overdue_remediations: impacts.filter(i =>
      i.remediation_due_date && new Date(i.remediation_due_date) < new Date() &&
      !['completed', 'not_applicable'].includes(i.remediation_status)
    ).length
  };

  return {
    regulatory_change: {
      change_id: change.change_id,
      title: change.title || change.regulation_name,
      description: change.description || change.change_summary,
      regulator_id: change.regulator_id,
      framework_code: change.framework_code,
      change_type: change.change_type,
      impact_level: change.impact_level,
      effective_date: change.effective_date,
      compliance_deadline: change.compliance_deadline,
      response_status: change.response_status,
      published_date: change.published_date
    },
    summary,
    affected_controls: enrichedControls,
    affected_obligations: enrichedObligations,
    // Legacy: also include the affected_controls array from the change record for backward compatibility
    legacy_affected_controls: change.affected_controls || [],
    legacy_affected_domains: change.affected_domains || [],
    legacy_impact_assessment: change.impact_assessment || null
  };
}
