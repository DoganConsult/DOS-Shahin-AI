/**
 * Compliance Workspace — Gaps, Roadmap, Milestones
 *
 * Extracted from compliance-workspace.service.ts for modularity.
 */

import { safeQuery, safeQueryWithClient, withTransaction } from '../../../ports/database.port';
import { v4 as uuid } from "uuid";
import { pct, ctx } from "../../misc/compliance.utils.js";
import type { ComplianceScope } from "../../misc/compliance.utils.js";
import { eventBus } from '../../../ports/events.port';
import { getComplianceSettings } from "../core/compliance-settings.service";
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowNull, EC , catchHandler as _catchHandler } from '@dos/platform-core/resilience';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';

/** Resolve an assignee to a user ID based on role code within the tenant. */
async function resolveAssigneeToUserId(tenantId: string, opts: { roleCode?: string; preferPrimaryOwner?: boolean; entityId?: string; domain?: string } = {}): Promise<string | null> {
  const { roleCode } = opts;
  if (!roleCode) return null;
  const result = await safeQuery(
    `SELECT user_id FROM public.users WHERE tenant_id = $1 AND role = $2 LIMIT 1`,
    [tenantId, roleCode],
  ).catch(() => ({ rows: [] }));
  return result.rows?.[0]?.user_id ?? null;
}

// ═══════════════════════════════════════════════════════════════════
// 5. GAPS
// ═══════════════════════════════════════════════════════════════════

export interface GapsRegisterResult {
  items: Array<{
    gapId: string;
    title: string;
    description: string | null;
    severity: string;
    status: string;
    frameworkId: string | null;
    frameworkName: string | null;
    domainName: string | null;
    obligationCode: string | null;
    obligationTitle: string | null;
    sourceType: string | null;
    sourceId: string | null;
    createdAt: string;
    remediation: { task_id: string; title: string; status: string; linked_entity_id: string; assigned_to: string | null; due_date: string | null } | null;
  }>;
  total: number;
}

export async function getGapsRegister(
  tenantId: string,
  frameworkId?: string,
  severity?: string,
  options?: { scope?: ComplianceScope; userId?: string; limit?: number; offset?: number }
): Promise<GapsRegisterResult> {
  const { schema } = ctx(tenantId);
  const settings = await getComplianceSettings(tenantId);
  const limit = options?.limit != null
    ? Math.max(1, Math.min(settings.paginationMaxPageSize, options.limit))
    : Math.max(1, Math.min(1000, settings.gapsListLimit));
  const offset = Math.max(0, options?.offset ?? 0);
  const scopeMy = options?.scope === "my" && options?.userId;

  const baseFrom = `FROM "${schema}".findings f
     LEFT JOIN instrument_structure ist ON ist.node_id = f.source_id
     LEFT JOIN instruments i ON i.instrument_id = ist.instrument_id
     LEFT JOIN instrument_structure pd ON pd.node_id = ist.parent_node_id
     WHERE f.deleted_at IS NULL`;
  const params: unknown[] = [];
  const conditions: string[] = [];
  let pIdx = 1;
  if (frameworkId) {
    conditions.push(`ist.instrument_id = $${pIdx}`);
    params.push(frameworkId);
    pIdx++;
  }
  if (severity) {
    conditions.push(`f.severity = $${pIdx}`);
    params.push(severity);
    pIdx++;
  }
  if (scopeMy) {
    conditions.push(`f.assigned_to = $${pIdx}`);
    params.push(options!.userId!);
    pIdx++;
  }
  const andSql = conditions.length ? ` AND ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*)::int AS total ${baseFrom}${andSql}`;
  const countRes = await safeQuery(countSql, params);
  const total = Number(getFirstRow(countRes)?.total ?? 0);

  const limitParam = pIdx;
  const offsetParam = pIdx + 1;
  const sql = `SELECT f.finding_id AS gap_id, f.title, f.description, f.severity, f.status,
                    f.source_type, f.source_id, f.remediation_id, f.created_at,
                    ist.code AS obligation_code, ist.title_en AS obligation_title,
                    ist.instrument_id AS framework_id,
                    i.name_en AS framework_name,
                    pd.title_en AS domain_name
             ${baseFrom}${andSql}
             ORDER BY CASE f.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, f.created_at DESC
             LIMIT $${limitParam} OFFSET $${offsetParam}`;
  params.push(limit, offset);

  const res = await safeQuery(sql, params);

  const gapIds = res.rows.map((g: GenericRow) => g.gap_id);
  let remMap: Record<string, unknown> = {};
  if (gapIds.length > 0) {
    const remRes = await safeQuery(
      `SELECT task_id, title, status, linked_entity_id, assigned_to, due_date
       FROM "${schema}".remediation_tasks WHERE linked_entity_id = ANY($1) AND deleted_at IS NULL`, [gapIds]);
    for (const r of remRes.rows) {
      remMap[r.linked_entity_id] = r;
    }
  }

  const items = res.rows.map((g: GenericRow) => ({
    gapId: g.gap_id,
    title: g.title || `${g.obligation_code || '—'}: Gap`,
    description: g.description,
    severity: g.severity,
    status: g.status,
    frameworkId: g.framework_id,
    frameworkName: g.framework_name,
    domainName: g.domain_name,
    obligationCode: g.obligation_code,
    obligationTitle: g.obligation_title,
    sourceType: g.source_type,
    sourceId: g.source_id,
    createdAt: g.created_at,
    remediation: remMap[g.gap_id] || null,
  }));

  return { items, total };
}

export async function getGapDetail(tenantId: string, gapId: string) {
  const { schema } = ctx(tenantId);
  const gRes = await safeQuery(
    `SELECT f.*, ist.code AS obl_code, ist.title_en AS obl_title, ist.title_ar AS obl_title_ar,
            ist.description_en AS obl_desc, ist.instrument_id AS framework_id,
            i.name_en AS fw_name,
            pd.title_en AS domain_name
     FROM "${schema}".findings f
     LEFT JOIN instrument_structure ist ON ist.node_id = f.source_id
     LEFT JOIN instruments i ON i.instrument_id = ist.instrument_id
     LEFT JOIN instrument_structure pd ON pd.node_id = ist.parent_node_id
     WHERE f.finding_id = $1`, [gapId]);
  if (gRes.rows.length === 0) return null;
  const gap = getFirstRow(gRes)!;

  // Linked controls
  const ctrlRes = await safeQuery(
    `SELECT control_id, title, status, test_status, evidence_ids, owner
     FROM "${schema}".controls
     WHERE $1 = ANY(mapped_registry_nodes) AND deleted_at IS NULL`, [gap.source_id]);

  // Remediation tasks
  const remRes = await safeQuery(
    `SELECT * FROM "${schema}".remediation_tasks
     WHERE linked_entity_id = $1 AND deleted_at IS NULL`, [gapId]);

  return {
    gap: {
      gapId: gap.finding_id,
      title: gap.title,
      description: gap.description,
      severity: gap.severity,
      status: gap.status,
      sourceId: gap.source_id,
      frameworkId: gap.framework_id,
      frameworkName: gap.fw_name,
      domainName: gap.domain_name,
      obligationCode: gap.obl_code,
      obligationTitle: gap.obl_title,
      obligationTitleAr: gap.obl_title_ar,
      obligationDescription: gap.obl_desc,
      createdAt: gap.created_at,
    },
    linkedControls: ctrlRes.rows,
    remediationTasks: remRes.rows,
  };
}

export async function updateGap(tenantId: string, gapId: string, data: { status?: string; owner?: string }) {
  const { schema } = ctx(tenantId);
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (data.status) { sets.push(`status = $${idx}`); params.push(data.status); idx++; }
  if (sets.length === 0) return null;
  params.push(gapId);
  const res = await safeQuery(
    `UPDATE "${schema}".findings SET ${sets.join(', ')} WHERE finding_id = $${idx} RETURNING *`, params);
  const row = getFirstRow(res) || null;
  if (row && data.status && ['closed', 'remediated'].includes(data.status)) {
    eventBus.publish(({ eventType: 'compliance.gap_closed', tenantId, sourceService: 'ComplianceWorkspaceService', severity: 'info', payload: { gapId, status: data.status } } as any));
  }
  return row;
}

export async function createGapRemediationTask(tenantId: string, gapId: string, data: {
  title: string; description?: string; assignedTo?: string; priority?: string; dueDate?: string;
  controlId?: string; riskId?: string; evidenceId?: string;
}) {
  const { schema } = ctx(tenantId);
  let assignedTo = data.assignedTo ?? null;
  if (!assignedTo && (data.controlId ?? data.riskId ?? data.evidenceId)) {
    if (data.controlId) {
      assignedTo = await swallowNull(EC.FALLBACK_QUERY, resolveAssigneeToUserId(tenantId, { preferPrimaryOwner: true, entityId: data.controlId, domain: 'control' }), { tenantId: tenantId, operation: 'fallback query' });
    } else if (data.riskId) {
      assignedTo = await swallowNull(EC.FALLBACK_QUERY, resolveAssigneeToUserId(tenantId, { preferPrimaryOwner: true, entityId: data.riskId, domain: 'risk' }), { tenantId: tenantId, operation: 'fallback query' });
    } else if (data.evidenceId) {
      assignedTo = await swallowNull(EC.FALLBACK_QUERY, resolveAssigneeToUserId(tenantId, { preferPrimaryOwner: true, entityId: data.evidenceId, domain: 'evidence' }), { tenantId: tenantId, operation: 'fallback query' });
    }
  }
  const taskId = uuid();
  const row = await withTransaction(tenantId, async (client) => {
    const res = await safeQueryWithClient(
      `INSERT INTO "${schema}".remediation_tasks
         (task_id, title, description, linked_entity_type, linked_entity_id, assigned_to, priority, due_date, status)
       VALUES ($1, $2, $3, 'finding', $4, $5, $6, $7, 'open')
       RETURNING *`,
      [taskId, data.title, data.description || '', gapId, assignedTo, data.priority || 'medium', data.dueDate || null], client);
    await safeQueryWithClient(`UPDATE "${schema}".findings SET remediation_id = $1 WHERE finding_id = $2`, [taskId, gapId], client);
    return getFirstRow(res);
  });
  eventBus.publish(({ eventType: 'compliance.gap_remediation_started', tenantId, sourceService: 'ComplianceWorkspaceService', severity: 'info', payload: { gapId, taskId } } as any));
  return row;
}

// ═══════════════════════════════════════════════════════════════════
// 8c. GAP VALIDATE (validate gap closure)
// ═══════════════════════════════════════════════════════════════════

export async function validateGap(tenantId: string, gapId: string, data: {
  validatedBy?: string; validationNotes?: string; notes?: string; evidenceId?: string; validationEvidence?: string;
}) {
  const { schema } = ctx(tenantId);
  const result = await withTransaction(tenantId, async (client) => {
    const res = await safeQueryWithClient(
      `UPDATE "${schema}".findings
       SET status = 'closed', updated_at = NOW()
       WHERE finding_id = $1 RETURNING *`, [gapId], client);
    if (res.rows.length === 0) return null;

    const row = getFirstRow(res)!;
    if (row?.remediation_id) {
      await safeQueryWithClient(
        `UPDATE "${schema}".remediation_tasks
         SET status = 'completed', updated_at = NOW()
         WHERE task_id = $1`, [row.remediation_id], client);
    }

    return row;
  });

  if (!result) return null;

  return {
    gapId,
    status: 'closed',
    validatedBy: data.validatedBy || SYSTEM_JOB_ACTOR,
    validationNotes: data.validationNotes || data.notes || '',
    evidenceId: data.evidenceId || data.validationEvidence || null,
    closedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// 6. ROADMAP (delegates to roadmap-builder)
// ═══════════════════════════════════════════════════════════════════

export async function getComplianceRoadmap(tenantId: string) {
  const { schema: _schema } = ctx(tenantId);
  // Try public.roadmaps first
  const rmRes = await safeQuery(
    `SELECT roadmap_id, tenant_id, phases, created_at, updated_at
     FROM roadmaps WHERE tenant_id = $1`, [tenantId]);
  if (rmRes.rows.length === 0) return null;
  const rm = getFirstRow(rmRes)!;

  // Get tasks
  const taskRes = await safeQuery(
    `SELECT task_id, milestone_id, phase_type, title_en, title_ar, target_module,
            target_action, priority, status, framework_ref, created_at, updated_at
     FROM roadmap_tasks WHERE roadmap_id = $1 ORDER BY created_at`, [rm.roadmap_id]);

  const phases = typeof rm.phases === 'string' ? JSON.parse(rm.phases) : rm.phases;
  const totalTasks = taskRes.rows.length;
  const completedTasks = taskRes.rows.filter((t: GenericRow) => t.status === 'completed').length;

  return {
    roadmapId: rm.roadmap_id,
    phases,
    tasks: taskRes.rows,
    totalTasks,
    completedTasks,
    completionPercent: pct(completedTasks, totalTasks),
    createdAt: rm.created_at,
    updatedAt: rm.updated_at,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 8d. ROADMAP GENERATE
// ═══════════════════════════════════════════════════════════════════

export async function generateRoadmap(tenantId: string) {
  const { schema } = ctx(tenantId);
  const roadmapId = uuid();

  // Get open gaps grouped by severity
  const gapRes = await safeQuery(
    `SELECT f.finding_id, f.title, f.severity, f.source_id,
            ist.instrument_id AS framework_id, i.name_en AS fw_name
     FROM "${schema}".findings f
     LEFT JOIN instrument_structure ist ON ist.node_id = f.source_id
     LEFT JOIN instruments i ON i.instrument_id = ist.instrument_id
     WHERE f.deleted_at IS NULL AND f.status NOT IN ('closed', 'resolved')
     ORDER BY CASE f.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`);

  const gaps = gapRes.rows;
  const criticalGaps = gaps.filter((g: GenericRow) => g.severity === 'critical');
  const highGaps = gaps.filter((g: GenericRow) => g.severity === 'high');
  const mediumGaps = gaps.filter((g: GenericRow) => g.severity === 'medium');
  const lowGaps = gaps.filter((g: GenericRow) => g.severity === 'low' || !g.severity);

  const phases = [
    { phaseType: 'foundation', title: 'Foundational Compliance', objective: 'Close critical and high-severity gaps', order: 1 },
    { phaseType: 'control_strengthening', title: 'Control Strengthening', objective: 'Implement and test controls for medium gaps', order: 2 },
    { phaseType: 'evidence_maturity', title: 'Evidence Maturity', objective: 'Ensure evidence coverage for all controls', order: 3 },
    { phaseType: 'audit_readiness', title: 'Audit Readiness', objective: 'Prepare for regulator-facing posture', order: 4 },
  ];

  await withTransaction(tenantId, async (client) => {
    const existingRm = await safeQueryWithClient(`SELECT roadmap_id FROM roadmaps WHERE tenant_id = $1`, [tenantId], client);
    if (existingRm.rows.length > 0) {
      const oldId = getFirstRow(existingRm)?.roadmap_id;
      await safeQueryWithClient(`DELETE FROM roadmap_tasks WHERE roadmap_id = $1`, [oldId], client);
      await safeQueryWithClient(`DELETE FROM roadmaps WHERE roadmap_id = $1`, [oldId], client);
    }

    await safeQueryWithClient(
      `INSERT INTO roadmaps (roadmap_id, tenant_id, phases, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [roadmapId, tenantId, JSON.stringify(phases)], client);

    const createTasks = async (gapList: GenericRow[], phaseType: string, priority: string) => {
      for (const g of gapList) {
        const taskId = uuid();
        await safeQueryWithClient(
          `INSERT INTO roadmap_tasks (task_id, roadmap_id, milestone_id, phase_type, title_en, title_ar,
             target_module, target_action, priority, status, framework_ref, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5, 'compliance', 'remediate', $6, 'pending', $7, NOW(), NOW())`,
          [taskId, roadmapId, uuid(), phaseType, g.title, priority, g.framework_id || null], client);
      }
    };

    await createTasks(criticalGaps, 'foundation', 'critical');
    await createTasks(highGaps, 'foundation', 'high');
    await createTasks(mediumGaps, 'control_strengthening', 'medium');
    await createTasks(lowGaps, 'evidence_maturity', 'low');
  });

  const totalTasks = gaps.length;

  return {
    roadmapId,
    phases,
    totalTasks,
    completedTasks: 0,
    completionPercent: 0,
    gapBreakdown: {
      critical: criticalGaps.length,
      high: highGaps.length,
      medium: mediumGaps.length,
      low: lowGaps.length,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// 11. UPDATE MILESTONE
// ═══════════════════════════════════════════════════════════════════

export async function updateMilestone(tenantId: string, milestoneId: string, data: { status?: string; notes?: string }) {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (data.status) { sets.push(`status = $${idx}`); params.push(data.status); idx++; }
  if (sets.length === 0) return null;
  params.push(milestoneId);
  const res = await safeQuery(
    `UPDATE roadmap_tasks SET ${sets.join(', ')}, updated_at = NOW() WHERE task_id = $${idx} RETURNING *`, params);
  return getFirstRow(res) || null;
}

// ═══════════════════════════════════════════════════════════════════
// 20. ROADMAP TASK UPDATE
// ═══════════════════════════════════════════════════════════════════

export async function updateRoadmapTask(tenantId: string, taskId: string, data: {
  status?: string; ownerUserId?: string; ownerTeamId?: string; dueDate?: string; progressPct?: number; notes?: string;
}) {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (data.status) { sets.push(`status = $${idx}`); params.push(data.status); idx++; }
  if (data.ownerUserId !== undefined) { sets.push(`owner_user_id = $${idx}`); params.push(data.ownerUserId || null); idx++; }
  if (data.ownerTeamId !== undefined) { sets.push(`owner_team_id = $${idx}`); params.push(data.ownerTeamId || null); idx++; }
  if (data.dueDate !== undefined) { sets.push(`due_date = $${idx}`); params.push(data.dueDate || null); idx++; }
  if (data.progressPct !== undefined) { sets.push(`progress_pct = $${idx}`); params.push(data.progressPct); idx++; }
  if (data.notes !== undefined) { sets.push(`notes = $${idx}`); params.push(data.notes); idx++; }
  if (sets.length === 0) return null;
  params.push(taskId);
  const res = await safeQuery(
    `UPDATE public.roadmap_tasks SET ${sets.join(', ')} WHERE task_id = $${idx} RETURNING *`, params);
  return getFirstRow(res) || null;
}
