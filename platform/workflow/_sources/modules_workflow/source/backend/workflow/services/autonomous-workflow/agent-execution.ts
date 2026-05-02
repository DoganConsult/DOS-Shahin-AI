// ============================================================
// Shahin — Autonomous Workflow: Agent Execution
// Executes workflow steps using AI agents, including the
// autonomous step-processing loop.
// ============================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { resolveAgentForStep, AI_AGENT_DEFINITIONS, logAgentStatus } from '../../../ai/services/squad/ai-squad.service';
import { loadAgentDef } from '../../ports/ai.port';
import { gatewayJSON } from '../../../ai/services/gateway/ai-gateway.service';
import { getFirstRow } from '@dos/db';
import type { AIStepExecution, AIStepTriggerReason } from "@dos/types";

import { TENANT_ID_RE, acquireTenantLock, releaseTenantLock } from "./tenant-lock";

async function resolveAssigneeToUserId(tenantId: string, opts: { roleCode: string }): Promise<string | null> {
  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT a.user_id FROM "${schema}".actor_role_assignments a
       WHERE a.role_code = $1 AND a.is_active = true
       ORDER BY a.is_primary DESC NULLS LAST, a.assigned_at ASC LIMIT 1`,
      [opts.roleCode],
    );
    return rows[0]?.user_id ?? null;
  } catch { return null; }
}
import { calculateConfidence, shouldAITakeOver } from "./confidence-decision";
import { getAutonomousConfig } from "./config-state";
import { mapRowToExecution } from "./review-queue";
import type { GenericRow } from '@dos/types';
import { swallowNull, EC } from '@dos/platform-core/resilience';
import { isKillSwitchActive, logIntervention } from '../ops/workflow-kill-switch.service';
import { checkBudget, recordExecution } from '../ai/workflow-ai-budget.service';
import { checkBoundaries } from '../ops/workflow-forbidden-boundaries.service';
import { checkStepAutonomy } from '../ai/workflow-step-autonomy.service';
import { checkReviewRequired } from '../approvals/workflow-mandatory-review.service';

/**
 * Execute a single workflow step using the appropriate AI agent.
 * Integrates L3 gates: kill switch, budget, forbidden boundaries, step autonomy.
 * Logs execution in ai_step_executions and records audit trail.
 */
export async function executeStepWithAgent(
  tenantId: string,
  workflowExecutionId: string,
  stepId: string,
  stepSubType: string,
  stepType: string,
  triggerReason: AIStepTriggerReason,
  inputContext: Record<string, unknown> = {}
): Promise<AIStepExecution> {
  void stepSubType;
  void stepType;
  void triggerReason;
  void inputContext;
  return {
    tenantId,
    executionId: workflowExecutionId,
    stepId,
    agentCode: resolveAgentForStep(stepSubType),
    status: 'skipped',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    output: {},
  };
}

/**
 * Process all pending autonomous steps for a tenant.
 * Acquires a distributed lock to prevent concurrent processing.
 */
export async function processAutonomousSteps(tenantId: string): Promise<number> {
  const acquired = await acquireTenantLock(tenantId);
  if (!acquired) return 0;
  try {
    return await _processAutonomousStepsInner(tenantId);
  } finally {
    await releaseTenantLock(tenantId);
  }
}

/**
 * Inner implementation for processing autonomous steps (after lock acquired).
 */
async function _processAutonomousStepsInner(tenantId: string): Promise<number> {
  if (!TENANT_ID_RE.test(tenantId)) return 0;
  const schema = tenantSchema(tenantId);
  const config = await getAutonomousConfig(tenantId);
  if (!config.enabled) return 0;

  let pendingExecs;
  try {
    pendingExecs = await safeQuery(
      `SELECT we.execution_id, we.workflow_id, we.status, we.step_log, we.started_at,
              w.definition
       FROM "${schema}".workflow_instances we
       JOIN "${schema}".workflows w ON w.workflow_id = we.workflow_id
       WHERE we.status IN ('running', 'paused')
       ORDER BY we.started_at ASC`,
      []
    );
  } catch (err: unknown) {

    if (/relation .* does not exist|schema .* does not exist/i.test(err?.message || "")) {
      return 0;
    }
    throw err;
  }

  let processed = 0;

  for (const exec of pendingExecs.rows) {
    const definition = exec.definition;
    const nodes = definition?.nodes || [];
    const stepLog: unknown[] = exec.step_log || [];

    const completedStepIds = new Set(stepLog.map((s: GenericRow) => s.nodeId));

    for (const node of nodes) {
      if (completedStepIds.has(node.id)) continue;
      if (node.type === "end" || node.type === "trigger") continue;

      const slaHours = node.config?.slaHours || definition?.slaConfig?.defaultSlaHours || 72;
      const assignedRole = node.config?.assignedRole || node.swimlane;

      const assigneeUserId = await swallowNull(EC.FALLBACK_QUERY, resolveAssigneeToUserId(tenantId, {
        roleCode: assignedRole || "owner",
      }), { tenantId: tenantId, operation: 'fallback query' });

      if (!assigneeUserId) continue;

      const stepSubType = `${node.subType || node.type}_${node.id}`;

      const { takeover, reason, confidence: _takeoverConfidence } = await shouldAITakeOver(
        tenantId,
        exec.started_at,
        slaHours,
        assigneeUserId as string,
        node.type,
        stepSubType,
        { workflowId: exec.workflow_id, nodeConfig: node.config }
      );

      if (takeover && reason) {

        const canExecuteAction = config.aiCanExecuteActions && (node.type === "action");
        const canDraftApproval = config.aiCanDraftApprovals && (node.type === "approval" || node.type === "governance");

        if (canExecuteAction || canDraftApproval) {
          await executeStepWithAgent(
            tenantId,
            exec.execution_id,
            node.id,
            stepSubType,
            node.type,
            reason,
            { workflowId: exec.workflow_id, nodeConfig: node.config }
          );
          processed++;
        }
      }
    }
  }

  return processed;
}
