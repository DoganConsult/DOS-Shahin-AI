import { logger } from '../../../ports/logger.port';
// ============================================================================
// Shahin — Governance Gap Scanner Service
// Recurring scanner that detects governance gaps and auto-creates
// process tasks via the process orchestration service.
// ============================================================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { createProcessTask, type ProcessTaskInput } from '../../../ports/lifecycle.port';
import { enterpriseAuthzService } from '../../../../admin/services/enterprise-authz.service.js';
import { eventBus } from '../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { swallow, EC } from '@dos/platform-core/resilience';

const MODULE_FOR_ENTITY: Record<string, string> = {
  policy: 'policy', control: 'compliance', committee: 'governance',
  procedure: 'governance', mandate: 'governance', governance_action: 'governance',
  enforcement_violation: 'governance', delegation: 'governance', obligation: 'governance',
  responsibility: 'governance', charter: 'governance', exception: 'exception',
  objective: 'governance', board_pack: 'governance',
};

async function createAuthzTask(tenantId: string, input: ProcessTaskInput): Promise<void> {
  try {

    const moduleCode = MODULE_FOR_ENTITY[input.entityType ?? ''] ?? 'governance';
    const candidates = await enterpriseAuthzService.findEligibleAssignees(
      tenantId, moduleCode, `${moduleCode}.record.update`,
      { includeDelegations: true, limit: 1 },
    );
    if (candidates.length > 0) {

      input.assigneeRole = candidates[0].functionalRoleCode;
    }
  } catch {
    // Enterprise authz tables may not exist — fall through to orchestration routing
  }
  await createProcessTask(tenantId, input);
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Check if a matching process task was already created in the last 24h */
async function taskExistsRecently(
  schema: string,
  entityType: string,
  entityId: string,
  taskType: string,
): Promise<boolean> {
  const res = await safeQuery(
    `SELECT 1 FROM "${schema}".process_tasks
     WHERE entity_type = $1 AND entity_id = $2 AND task_type = $3
       AND status NOT IN ('completed','cancelled','auto_closed')
       AND created_at > NOW() - INTERVAL '24 hours'
     LIMIT 1`,
    [entityType, entityId, taskType],
  );
  return res.rows.length > 0;
}

// ════════════════════════════════════════════════════════════════════════════
// PART B — Scan & Auto-Fire
// ════════════════════════════════════════════════════════════════════════════

// ── Scan 1: Policies Needing Review ────────────────────────────────────────

async function scanPoliciesNeedingReview(tenantId: string, schema: string): Promise<number> {
  const res = await safeQuery(
    `SELECT policy_id, title FROM "${schema}".policies
     WHERE next_review_date < NOW()
       AND status NOT IN ('draft','archived')
       AND deleted_at IS NULL
     LIMIT 50`,
  );
  let created = 0;
  for (const p of res.rows) {
    const id = String(p.policy_id);
    if (await taskExistsRecently(schema, 'policy', id, 'control_review')) continue;
    await createAuthzTask(tenantId, {
      title: `Review policy: ${p.title || id}`,

      description: 'Policy review date has passed. Review and update the policy.',
      taskType: 'control_review',
      priority: 'medium',
      entityType: 'policy',
      entityId: id,
      triggerSource: 'governance-auto-fire',
    });
    created++;
  }
  return created;
}

// ── Scan 2: Controls Without Recent Evidence ──────────────────────────────

async function scanControlsWithoutEvidence(tenantId: string, schema: string): Promise<number> {
  const res = await safeQuery(
    `SELECT c.control_id, c.title
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".evidence_tasks et ON et.control_id = c.control_id::TEXT
       AND et.status = 'completed' AND et.completed_at > NOW() - INTERVAL '90 days'
     WHERE c.deleted_at IS NULL AND et.task_id IS NULL
     LIMIT 50`,
  );
  let created = 0;
  for (const c of res.rows) {
    const id = String(c.control_id);
    if (await taskExistsRecently(schema, 'control', id, 'evidence_request')) continue;
    await createAuthzTask(tenantId, {
      title: `Collect evidence for control: ${c.title || id}`,

      description: 'No recent evidence collected for this control in the past 90 days.',
      taskType: 'evidence_request',
      priority: 'medium',
      entityType: 'control',
      entityId: id,
      triggerSource: 'governance-auto-fire',
    });
    created++;
  }
  return created;
}

// ── Scan 3: Overdue Action Items ──────────────────────────────────────────

async function scanOverdueActionItems(tenantId: string, schema: string): Promise<number> {
  // Use existing auto-escalation
  try {
    const { autoEscalateOverdueActions } = await import('./governance-auto-escalation.service.js');
    await autoEscalateOverdueActions(tenantId);
  } catch { /* best-effort */ }

  // Create remediation tasks for severely overdue (30d+) items that have no process task
  const res = await safeQuery(
    `SELECT action_item_id, title FROM "${schema}".governance_action_items
     WHERE due_date < NOW() - INTERVAL '30 days'
       AND status NOT IN ('completed','closed','cancelled','verified')
       AND deleted_at IS NULL
     LIMIT 30`,
  );
  let created = 0;
  for (const a of res.rows) {
    const id = String(a.action_item_id);
    if (await taskExistsRecently(schema, 'governance_action', id, 'remediation')) continue;
    await createAuthzTask(tenantId, {
      title: `Overdue governance action: ${a.title || id}`,

      description: 'Governance action item overdue by 30+ days. Immediate remediation required.',
      taskType: 'remediation',
      priority: 'high',
      entityType: 'governance_action',
      entityId: id,
      triggerSource: 'governance-auto-fire',
    });
    created++;
  }
  return created;
}

// ── Scan 4: Committees Without Recent Meetings ────────────────────────────

async function scanCommitteesWithoutMeetings(tenantId: string, schema: string): Promise<number> {
  const res = await safeQuery(
    `SELECT c.committee_id, c.name
     FROM "${schema}".committees c
     LEFT JOIN "${schema}".governance_meetings gm ON gm.committee_id = c.committee_id
       AND gm.scheduled_at > NOW() - INTERVAL '90 days'
     WHERE c.deleted_at IS NULL AND gm.meeting_id IS NULL
     LIMIT 20`,
  );
  let created = 0;
  for (const c of res.rows) {
    const id = String(c.committee_id);
    if (await taskExistsRecently(schema, 'committee', id, 'verification')) continue;
    await createAuthzTask(tenantId, {
      title: `Schedule meeting for committee: ${c.name || id}`,

      description: 'No committee meeting in the last 90 days. Schedule a meeting to maintain governance cadence.',
      taskType: 'verification',
      priority: 'medium',
      entityType: 'committee',
      entityId: id,
      triggerSource: 'governance-auto-fire',
    });
    created++;
  }
  return created;
}

// ── Scan 5: Procedures Without Review ─────────────────────────────────────

async function scanProceduresWithoutReview(tenantId: string, schema: string): Promise<number> {
  const res = await safeQuery(
    `SELECT sop_id, title_en, process_type FROM "${schema}".sop_procedures
     WHERE updated_at < NOW() - INTERVAL '1 year'
       AND status = 'active'
     LIMIT 30`,
  );
  let created = 0;
  for (const p of res.rows) {
    const id = String(p.sop_id);
    if (await taskExistsRecently(schema, 'procedure', id, 'control_review')) continue;
    await createAuthzTask(tenantId, {
      title: `Review procedure: ${p.title_en || p.process_type}`,

      description: 'Procedure has not been reviewed in over 1 year. Annual review required.',
      taskType: 'control_review',
      priority: 'low',
      entityType: 'procedure',
      entityId: id,
      triggerSource: 'governance-auto-fire',
    });
    created++;
  }
  return created;
}

// ── Scan 6: Mandates Expiring Soon ────────────────────────────────────────

async function scanMandatesExpiring(tenantId: string, schema: string): Promise<number> {
  const res = await safeQuery(
    `SELECT mandate_id, title_en FROM "${schema}".governance_mandates
     WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
       AND status = 'active'
       AND deleted_at IS NULL
     LIMIT 20`,
  );
  let created = 0;
  for (const m of res.rows) {
    const id = String(m.mandate_id);
    if (await taskExistsRecently(schema, 'mandate', id, 'verification')) continue;
    await createAuthzTask(tenantId, {
      title: `Mandate expiring: ${m.title_en || id}`,

      description: 'Governance mandate expires within 60 days. Initiate renewal process.',
      taskType: 'verification',
      priority: 'high',
      entityType: 'mandate',
      entityId: id,
      triggerSource: 'governance-auto-fire',
    });
    created++;
  }
  return created;
}

// ── Scan 7: Enforcement Scan → Remediation Tasks ──────────────────────────

async function runEnforcementAndRemediate(tenantId: string, schema: string): Promise<number> {
  let created = 0;
  try {
    const { runEnforcementScan } = await import('../operations/governance-enforcement.service.js');
    await runEnforcementScan(tenantId);
  } catch { /* best-effort */ }

  // Create tasks for unresolved violations
  const violations = await safeQuery(
    `SELECT log_id, rule_code, entity_type, entity_id, severity, description
     FROM "${schema}".governance_enforcement_log
     WHERE resolved_at IS NULL AND severity = 'violation'
     LIMIT 30`,
  );

  for (const v of violations.rows) {
    const id = String(v.log_id);
    if (await taskExistsRecently(schema, 'enforcement_violation', id, 'remediation')) continue;
    await createAuthzTask(tenantId, {
      title: `Enforcement violation: ${v.rule_code} — ${v.entity_type}`,

      description: v.description || `Unresolved governance enforcement violation (${v.rule_code})`,
      taskType: 'remediation',
      priority: 'high',
      entityType: 'enforcement_violation',
      entityId: id,
      triggerSource: 'governance-auto-fire',
    });
    created++;
  }
  return created;
}

// ── Scan 8: Health Score → Improvement Actions ────────────────────────────

async function computeHealthAndImprove(tenantId: string, schema: string): Promise<number> {
  let created = 0;
  try {
    const { computeGovernanceHealth } = await import('../structure/governance-health.service.js');
    const health = await computeGovernanceHealth(tenantId);
    if (!health?.dimensions) return 0;

    for (const dim of health.dimensions) {
      if (dim.grade === 'red') {
        // Check if action item already exists for this dimension
        const _exists = await safeQuery(
          `SELECT 1 FROM "${schema}".governance_action_items
           WHERE source_type = 'governance_health' AND source_id = $1::UUID
             AND status NOT IN ('completed','closed','cancelled')
           LIMIT 1`,
          // source_id is UUID — use a deterministic ID derived from dimension name
          // Instead, check by title pattern since source_id may not map cleanly
        );
        // Simpler: check by title
        const existsByTitle = await safeQuery(
          `SELECT 1 FROM "${schema}".governance_action_items
           WHERE title ILIKE $1
             AND status NOT IN ('completed','closed','cancelled')
             AND created_at > NOW() - INTERVAL '7 days'
           LIMIT 1`,
          [`%${dim.dimension}%improvement%`],
        );
        if (existsByTitle.rows.length > 0) continue;

        await safeQuery(
          `INSERT INTO "${schema}".governance_action_items
             (title, description, priority, status, source_type, board_attention, escalation_level, created_at)
           VALUES ($1, $2, 'high', 'open', 'governance_health', TRUE, 0, NOW())`,
          [
            `Governance health improvement: ${dim.dimension}`,
            `Dimension "${dim.dimension}" scored ${dim.score}% (grade: RED). Immediate action required to improve governance posture.`,
          ],
        );
        created++;
      }
    }
  } catch (err: unknown) {
    logger.warn(`[GovernanceAutoFire] Health computation error: ${toErrorMessage(err)}`);
  }
  return created;
}

// ── Scan 9: Expiring Delegations ──────────────────────────────────────────

async function scanExpiringDelegations(tenantId: string, schema: string): Promise<number> {
  const res = await safeQuery(
    `SELECT delegation_id, authority_type, delegate_user_id
     FROM "${schema}".governance_delegations
     WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
       AND status = 'active' AND deleted_at IS NULL
     LIMIT 20`,
  );
  let created = 0;
  for (const d of res.rows) {
    const id = String(d.delegation_id);
    if (await taskExistsRecently(schema, 'delegation', id, 'verification')) continue;
    await createAuthzTask(tenantId, {
      title: `Delegation expiring: ${d.authority_type}`,

      description: `Authority delegation for ${d.authority_type} expires within 30 days. Review and renew.`,
      taskType: 'verification',
      priority: 'high',
      entityType: 'delegation',
      entityId: id,
      triggerSource: 'governance-auto-fire',
    });
    created++;
  }
  return created;
}

// ── Scan 10: Overdue Obligations ──────────────────────────────────────────

async function scanOverdueObligations(tenantId: string, schema: string): Promise<number> {
  const res = await safeQuery(
    `SELECT obligation_id, title_en FROM "${schema}".governance_obligations
     WHERE status = 'overdue' AND deleted_at IS NULL
     LIMIT 20`,
  );
  let created = 0;
  for (const ob of res.rows) {
    const id = String(ob.obligation_id);
    if (await taskExistsRecently(schema, 'obligation', id, 'remediation')) continue;
    await createAuthzTask(tenantId, {
      title: `Overdue obligation: ${ob.title_en || id}`,

      description: 'Regulatory obligation is overdue. Immediate action required.',
      taskType: 'remediation',
      priority: 'critical',
      entityType: 'obligation',
      entityId: id,
      triggerSource: 'governance-auto-fire',
    });
    created++;
  }
  return created;
}

// ── Scan 11: Responsibility Gaps ──────────────────────────────────────────

async function scanResponsibilityGaps(tenantId: string, schema: string): Promise<number> {
  // Find critical responsibilities with no assignment
  const res = await safeQuery(
    `SELECT r.responsibility_id, r.title_en
     FROM "${schema}".governance_responsibilities r
     LEFT JOIN "${schema}".governance_responsibility_assignments a ON a.responsibility_id = r.responsibility_id
     WHERE r.deleted_at IS NULL AND r.criticality IN ('critical','high') AND a.assignment_id IS NULL
     LIMIT 20`,
  );
  let created = 0;
  for (const r of res.rows) {
    const id = String(r.responsibility_id);
    if (await taskExistsRecently(schema, 'responsibility', id, 'verification')) continue;
    await createAuthzTask(tenantId, {
      title: `Unassigned responsibility: ${r.title_en || id}`,

      description: 'Critical/high-priority responsibility has no assignment. Assign to appropriate team or individual.',
      taskType: 'verification',
      priority: 'high',
      entityType: 'responsibility',
      entityId: id,
      triggerSource: 'governance-auto-fire',
    });
    created++;
  }
  return created;
}

// ── Scan 12: Expiring Charters ────────────────────────────────────────────

async function scanExpiringCharters(tenantId: string, schema: string): Promise<number> {
  const res = await safeQuery(
    `SELECT charter_id, title_en FROM "${schema}".governance_charters
     WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '60 days'
       AND status = 'active'
     LIMIT 10`,
  );
  let created = 0;
  for (const ch of res.rows) {
    const id = String(ch.charter_id);
    if (await taskExistsRecently(schema, 'charter', id, 'verification')) continue;
    await createAuthzTask(tenantId, {
      title: `Charter expiring: ${ch.title_en || id}`,

      description: 'Committee charter expires within 60 days. Review and renew.',
      taskType: 'verification',
      priority: 'medium',
      entityType: 'charter',
      entityId: id,
      triggerSource: 'governance-auto-fire',
    });
    created++;
  }
  return created;
}

// ── Scan 13: Expired Exceptions ───────────────────────────────────────────

async function scanExpiredExceptions(tenantId: string, schema: string): Promise<number> {
  const res = await safeQuery(
    `SELECT exception_id, control_id, reason FROM "${schema}".control_exceptions
     WHERE valid_to < CURRENT_DATE AND status NOT IN ('closed','expired','revoked')
       AND deleted_at IS NULL
     LIMIT 20`,
  );
  let created = 0;
  for (const ex of res.rows) {
    const id = String(ex.exception_id);
    if (await taskExistsRecently(schema, 'exception', id, 'remediation')) continue;
    await createAuthzTask(tenantId, {
      title: `Expired control exception: ${ex.control_id}`,

      description: 'Control exception has expired. Either implement the control or request extension.',
      taskType: 'remediation',
      priority: 'high',
      entityType: 'exception',
      entityId: id,
      triggerSource: 'governance-auto-fire',
    });
    created++;
  }
  return created;
}

// ── Scan 14: Objectives At Risk ───────────────────────────────────────────

async function scanObjectivesAtRisk(tenantId: string, schema: string): Promise<number> {
  const res = await safeQuery(
    `SELECT objective_id, title_en, target_date, progress_percent
     FROM "${schema}".governance_objectives
     WHERE status IN ('at_risk','delayed')
       AND deleted_at IS NULL
     LIMIT 20`,
  );
  let created = 0;
  for (const obj of res.rows) {
    const id = String(obj.objective_id);
    if (await taskExistsRecently(schema, 'objective', id, 'remediation')) continue;
    await createAuthzTask(tenantId, {
      title: `Objective at risk: ${obj.title_en || id}`,

      description: `Governance objective at ${obj.progress_percent || 0}% progress with target date approaching. Intervention needed.`,
      taskType: 'remediation',
      priority: 'high',
      entityType: 'objective',
      entityId: id,
      triggerSource: 'governance-auto-fire',
    });
    created++;
  }
  return created;
}

// ── Scan 15: Stale Board Packs ────────────────────────────────────────────

async function scanStaleBoardPacks(tenantId: string, schema: string): Promise<number> {
  const res = await safeQuery(
    `SELECT pack_id, title_en, meeting_date FROM "${schema}".board_packs
     WHERE status = 'draft' AND meeting_date < NOW() + INTERVAL '14 days'
       AND meeting_date > NOW() - INTERVAL '7 days'
     LIMIT 5`,
  );
  let created = 0;
  for (const bp of res.rows) {
    const id = String(bp.pack_id);
    if (await taskExistsRecently(schema, 'board_pack', id, 'verification')) continue;
    await createAuthzTask(tenantId, {
      title: `Board pack needs assembly: ${bp.title_en || id}`,

      description: 'Board pack is still in draft status with meeting date approaching. Assemble and approve.',
      taskType: 'verification',
      priority: 'high',
      entityType: 'board_pack',
      entityId: id,
      triggerSource: 'governance-auto-fire',
    });
    created++;
  }
  return created;
}

// ── Main Auto-Fire Orchestrator ───────────────────────────────────────────

export interface AutoFireResult {
  fireId: string;
  policiesReview: number;
  controlsEvidence: number;
  overdueActions: number;
  committeeMeetings: number;
  proceduresReview: number;
  mandatesExpiring: number;
  enforcementRemediation: number;
  healthImprovement: number;
  expiringDelegations: number;
  overdueObligations: number;
  responsibilityGaps: number;
  expiringCharters: number;
  expiredExceptions: number;
  objectivesAtRisk: number;
  staleBoardPacks: number;
  totalTasksCreated: number;
}

export async function runGovernanceAutoFire(
  tenantId: string,
  triggeredBy = 'scheduler',
): Promise<AutoFireResult> {
  const schema = tenantSchema(tenantId);
  const fireId = uuid();

  // Log start
  await safeQuery(
    `INSERT INTO "${schema}".governance_auto_fire_log
       (fire_id, tenant_id, fire_type, triggered_by, status)
     VALUES ($1, $2, 'scan_cycle', $3, 'running')`,
    [fireId, tenantId, triggeredBy],
  );

  const counts = {
    policiesReview: 0, controlsEvidence: 0, overdueActions: 0, committeeMeetings: 0,
    proceduresReview: 0, mandatesExpiring: 0, enforcementRemediation: 0, healthImprovement: 0,
    expiringDelegations: 0, overdueObligations: 0, responsibilityGaps: 0,
    expiringCharters: 0, expiredExceptions: 0, objectivesAtRisk: 0, staleBoardPacks: 0,
  };

  try {
    // Original 8 scans
    counts.policiesReview = await scanPoliciesNeedingReview(tenantId, schema).catch(() => 0);
    counts.controlsEvidence = await scanControlsWithoutEvidence(tenantId, schema).catch(() => 0);
    counts.overdueActions = await scanOverdueActionItems(tenantId, schema).catch(() => 0);
    counts.committeeMeetings = await scanCommitteesWithoutMeetings(tenantId, schema).catch(() => 0);
    counts.proceduresReview = await scanProceduresWithoutReview(tenantId, schema).catch(() => 0);
    counts.mandatesExpiring = await scanMandatesExpiring(tenantId, schema).catch(() => 0);
    counts.enforcementRemediation = await runEnforcementAndRemediate(tenantId, schema).catch(() => 0);
    counts.healthImprovement = await computeHealthAndImprove(tenantId, schema).catch(() => 0);
    // Additional 7 scans covering all remaining governance pages
    counts.expiringDelegations = await scanExpiringDelegations(tenantId, schema).catch(() => 0);
    counts.overdueObligations = await scanOverdueObligations(tenantId, schema).catch(() => 0);
    counts.responsibilityGaps = await scanResponsibilityGaps(tenantId, schema).catch(() => 0);
    counts.expiringCharters = await scanExpiringCharters(tenantId, schema).catch(() => 0);
    counts.expiredExceptions = await scanExpiredExceptions(tenantId, schema).catch(() => 0);
    counts.objectivesAtRisk = await scanObjectivesAtRisk(tenantId, schema).catch(() => 0);
    counts.staleBoardPacks = await scanStaleBoardPacks(tenantId, schema).catch(() => 0);

    const totalTasksCreated = Object.values(counts).reduce((a, b) => a + b, 0);
    const result: AutoFireResult = { fireId, ...counts, totalTasksCreated };

    await safeQuery(
      `UPDATE "${schema}".governance_auto_fire_log
       SET status = 'completed', completed_at = NOW(), components_fired = $2
       WHERE fire_id = $1`,
      [fireId, JSON.stringify(result)],
    );

    // Emit completion event
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'governance.auto_fire_completed',
          tenantId,
          sourceService: 'governance-auto-fire',
          severity: totalTasksCreated > 10 ? 'warning' : 'info',
          entityType: 'governance_auto_fire',
          entityId: fireId,
          payload: result as unknown as Record<string, unknown>,
        } as any)), { tenantId, operation: 'eventBus:governance.auto_fire_completed' });

    logger.info(`[GovernanceAutoFire] Scan cycle completed for tenant ${tenantId}: ${totalTasksCreated} tasks created`);
    return result;
  } catch (err: unknown) {
    await safeQuery(
      `UPDATE "${schema}".governance_auto_fire_log
       SET status = 'failed', completed_at = NOW(), error_message = $2
       WHERE fire_id = $1`,
      [fireId, toErrorMessage(err)],
    );
    throw err;
  }
}
