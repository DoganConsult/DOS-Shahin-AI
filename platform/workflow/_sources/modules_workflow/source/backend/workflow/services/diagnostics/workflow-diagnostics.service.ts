/**
 * Workflow Diagnostics Service — MP-02 §3 (Diagnostics/admin family)
 *
 * Canonical diagnostics surface for the workflow module.
 * Provides stuck execution detection, transition failure analysis,
 * execution audit visibility, approval bottleneck analysis, and
 * version compatibility diagnostics.
 *
 * MP-02 §11: Required diagnostics service family.
 * Law 12: Audit by default — every diagnostic query is reconstructable.
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
import type {
  WorkflowDiagnosticsContract,
  StuckExecutionRecord,
  TransitionFailureDiagnostic,
  WorkflowVersionContract,
} from '../../contracts/workflow.contracts';

const STUCK_THRESHOLD_MINUTES = 30;
const STALE_APPROVAL_HOURS = 48;

// ── Health Overview ───────────────────────────────────────────────────────────

export async function getWorkflowDiagnostics(tenantId: string): Promise<WorkflowDiagnosticsContract> {
  const schema = tenantSchema(tenantId);
  try {
    const [health, sla, approvals] = await Promise.all([
      safeQuery(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'running')::int AS active_instances,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_instances,
           ROUND(
             AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)
             FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL)
           , 2) AS avg_completion_hours
         FROM "${schema}".workflow_executions
         WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{}] })),

      safeQuery(
        `SELECT COUNT(*)::int AS sla_breaches
         FROM "${schema}".workflow_executions we
         JOIN "${schema}".workflow_instance_steps wis ON wis.instance_id = we.execution_id AND wis.status = 'active'
         JOIN "${schema}".workflow_tasks wt ON wt.instance_step_id = wis.instance_step_id
         WHERE we.status = 'running'
           AND wt.due_date IS NOT NULL AND wt.due_date < NOW()
           AND wt.deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ sla_breaches: 0 }] })),

      safeQuery(
        `SELECT COUNT(*)::int AS pending_approvals
         FROM "${schema}".workflow_tasks
         WHERE task_type = 'approval' AND status = 'open' AND deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ pending_approvals: 0 }] })),
    ]);

    const stuck = await getStuckExecutions(tenantId);
    const h = health.rows[0] ?? {};

    return {
      tenantId,
      activeInstances: h.active_instances ?? 0,
      stuckInstances: stuck.length,
      failedInstances: h.failed_instances ?? 0,
      pendingApprovals: approvals.rows[0]?.pending_approvals ?? 0,
      slaBreaches: sla.rows[0]?.sla_breaches ?? 0,
      averageCompletionHours: h.avg_completion_hours ? parseFloat(h.avg_completion_hours) : null,
      capturedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[WorkflowDiagnostics] getWorkflowDiagnostics failed', { tenantId, error: toErrorMessage(err) });
    return {
      tenantId,
      activeInstances: 0,
      stuckInstances: 0,
      failedInstances: 0,
      pendingApprovals: 0,
      slaBreaches: 0,
      averageCompletionHours: null,
      capturedAt: new Date().toISOString(),
    };
  }
}

// ── Stuck Execution Detector ──────────────────────────────────────────────────

export async function getStuckExecutions(
  tenantId: string,
  thresholdMinutes: number = STUCK_THRESHOLD_MINUTES,
): Promise<StuckExecutionRecord[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         we.execution_id AS instance_id,
         we.workflow_id AS definition_id,
         COALESCE(wd.code, we.workflow_id::text) AS definition_code,
         wis.step_id AS current_step_id,
         ws.step_code AS current_step_code,
         we.status,
         EXTRACT(EPOCH FROM (NOW() - we.updated_at) / 60)::int AS stuck_since_minutes,
         CASE WHEN wt.due_date IS NOT NULL AND wt.due_date < NOW() THEN TRUE ELSE FALSE END AS is_overdue,
         we.trigger_type AS triggered_by,
         we.created_at AS started_at
       FROM "${schema}".workflow_executions we
       LEFT JOIN "${schema}".workflow_definitions wd ON wd.definition_id = we.workflow_id
       LEFT JOIN "${schema}".workflow_instance_steps wis
         ON wis.instance_id = we.execution_id AND wis.status = 'active'
       LEFT JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
       LEFT JOIN "${schema}".workflow_tasks wt ON wt.instance_step_id = wis.instance_step_id
       WHERE we.status = 'running'
         AND we.updated_at < NOW() - ($1 || ' minutes')::INTERVAL
         AND we.deleted_at IS NULL
       ORDER BY we.updated_at ASC
       LIMIT 100`,
      [String(thresholdMinutes)],
    );

    return result.rows.map((r: Record<string, unknown>) => ({
      instanceId: r.instance_id as string,
      definitionId: r.definition_id as string,
      definitionCode: r.definition_code as string,
      currentStepId: r.current_step_id as string,
      currentStepCode: r.current_step_code as string | null,
      status: r.status as string,
      stuckSinceMinutes: r.stuck_since_minutes as number,
      isOverdue: r.is_overdue as boolean,
      triggeredBy: r.triggered_by as string,
      startedAt: r.started_at as string,
    }));
  } catch (err) {
    logger.warn('[WorkflowDiagnostics] getStuckExecutions query failed', { tenantId, error: toErrorMessage(err) });
    return [];
  }
}

// ── Transition Failure Diagnostics ────────────────────────────────────────────

export async function getTransitionFailureDiagnostics(
  tenantId: string,
  limit: number = 50,
): Promise<TransitionFailureDiagnostic[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         at.entity_id AS instance_id,
         (at.before_state->>'fromStepId')::text AS from_step_id,
         (at.after_state->>'reason')::text AS reason,
         (at.after_state->>'deniedBy')::text AS denied_by,
         (at.after_state->>'moduleCode')::text AS module_code,
         (at.after_state->>'entityType')::text AS entity_type,
         at.created_at AS occurred_at
       FROM "${schema}".audit_trail at
       WHERE at.module = 'workflow'
         AND at.action IN ('transition_denied', 'transition_blocked', 'lifecycle_auth_denied')
         AND at.deleted_at IS NULL
       ORDER BY at.created_at DESC
       LIMIT $1`,
      [limit],
    );

    return result.rows.map((r: Record<string, unknown>) => ({
      instanceId: r.instance_id as string,
      fromStepId: r.from_step_id as string,
      reason: r.reason as string,
      deniedBy: (r.denied_by ?? 'engine_error') as TransitionFailureDiagnostic['deniedBy'],
      moduleCode: (r.module_code ?? 'workflow') as string,
      entityType: (r.entity_type ?? 'workflow_instance') as string,
      occurredAt: r.occurred_at as string,
    }));
  } catch (err) {
    logger.warn('[WorkflowDiagnostics] getTransitionFailureDiagnostics failed', { tenantId, error: toErrorMessage(err) });
    return [];
  }
}

// ── Approval Bottleneck Diagnostics ──────────────────────────────────────────

export interface ApprovalBottleneckRecord {
  approvalId: string;
  entityType: string;
  entityId: string;
  submittedBy: string;
  currentStep: number;
  totalSteps: number;
  staleSinceHours: number;
  assignedTo: string | null;
}

export async function getApprovalBottlenecks(
  tenantId: string,
  staleAfterHours: number = STALE_APPROVAL_HOURS,
): Promise<ApprovalBottleneckRecord[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         ar.request_id AS approval_id,
         ar.entity_type,
         ar.entity_id,
         ar.submitted_by,
         ar.current_step,
         jsonb_array_length(ac.steps::jsonb) AS total_steps,
         EXTRACT(EPOCH FROM (NOW() - ar.updated_at) / 3600)::int AS stale_since_hours,
         ar.current_approver_id AS assigned_to
       FROM "${schema}".approval_requests ar
       LEFT JOIN public.approval_chains ac ON ac.chain_id = ar.chain_id
       WHERE ar.status = 'pending'
         AND ar.updated_at < NOW() - ($1 || ' hours')::INTERVAL
         AND ar.deleted_at IS NULL
       ORDER BY ar.updated_at ASC
       LIMIT 50`,
      [String(staleAfterHours)],
    );

    return result.rows.map((r: Record<string, unknown>) => ({
      approvalId: r.approval_id as string,
      entityType: r.entity_type as string,
      entityId: r.entity_id as string,
      submittedBy: r.submitted_by as string,
      currentStep: r.current_step as number,
      totalSteps: r.total_steps as number,
      staleSinceHours: r.stale_since_hours as number,
      assignedTo: r.assigned_to as string | null,
    }));
  } catch (err) {
    logger.warn('[WorkflowDiagnostics] getApprovalBottlenecks failed', { tenantId, error: toErrorMessage(err) });
    return [];
  }
}

// ── Version Compatibility Diagnostics ────────────────────────────────────────

export async function getVersionCompatibilityDiagnostics(
  tenantId: string,
): Promise<WorkflowVersionContract[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         wd.definition_id,
         wd.code,
         wd.version,
         wd.status,
         wd.promoted_at,
         wd.promoted_by,
         wd.change_notes,
         COUNT(we.execution_id)::int AS active_instance_count
       FROM "${schema}".workflow_definitions wd
       LEFT JOIN "${schema}".workflow_executions we
         ON we.workflow_id = wd.definition_id AND we.status = 'running'
       WHERE wd.deleted_at IS NULL
       GROUP BY wd.definition_id, wd.code, wd.version, wd.status, wd.promoted_at, wd.promoted_by, wd.change_notes
       ORDER BY wd.code, wd.version DESC`,
    ).catch(() => ({ rows: [] }));

    return result.rows.map((r: Record<string, unknown>) => ({
      definitionId: r.definition_id as string,
      code: r.code as string,
      version: r.version as number,
      status: r.status as WorkflowVersionContract['status'],
      promotedAt: r.promoted_at as string | null,
      promotedBy: r.promoted_by as string | null,
      activeInstanceCount: r.active_instance_count as number,
      changeNotes: r.change_notes as string | null,
    }));
  } catch (err) {
    logger.warn('[WorkflowDiagnostics] getVersionCompatibilityDiagnostics failed', { tenantId, error: toErrorMessage(err) });
    return [];
  }
}

// ── Execution Event/Subscription Diagnostics ─────────────────────────────────

export interface EventSubscriptionDiagnostic {
  eventType: string;
  successCount: number;
  failureCount: number;
  lastOccurredAt: string | null;
}

export async function getEventSubscriptionDiagnostics(
  tenantId: string,
): Promise<EventSubscriptionDiagnostic[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         event_type,
         COUNT(*)::int AS success_count,
         0::int AS failure_count,
         MAX(created_at)::text AS last_occurred_at
       FROM "${schema}".workflow_event_log
       WHERE tenant_id = $1
         AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY event_type
       ORDER BY success_count DESC
       LIMIT 30`,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    return result.rows.map((r: Record<string, unknown>) => ({
      eventType: r.event_type as string,
      successCount: r.success_count as number,
      failureCount: r.failure_count as number,
      lastOccurredAt: r.last_occurred_at as string | null,
    }));
  } catch (err) {
    logger.warn('[WorkflowDiagnostics] getEventSubscriptionDiagnostics failed', { tenantId, error: toErrorMessage(err) });
    return [];
  }
}
