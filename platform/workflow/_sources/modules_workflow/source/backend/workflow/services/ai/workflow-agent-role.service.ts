/**
 * Workflow Agent Role Service — AI Agents as First-Class Workflow Participants
 *
 * Enables AI agents to be assigned to workflow tasks, execute them based on
 * platform mode (manual/hybrid/autonomous), escalate to humans when needed,
 * and have all decisions audited per Law 12.
 *
 * Integration chain:
 *   Platform Mode Gate → Agent Policy → DAuth → Workflow Engine → Audit
 *
 * @owner workflow module
 * @patch Patch 8 (AI Agent Stack) + Patch 7 (Workflow Stack)
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import { emitEvent } from '../../ports/events.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ── Types ──────────────────────────────────────────────────────────

export type AgentTaskMode = 'observe' | 'suggest' | 'execute';
export type AgentDecisionOutcome = 'approved' | 'rejected' | 'escalated' | 'deferred' | 'executed';
export type PlatformMode = 'manual' | 'hybrid' | 'autonomous';

export interface AgentTaskAssignment {
  id: string;
  taskId: string;
  agentId: string;
  mode: AgentTaskMode;
  status: string;
  assignedAt: string;
  completedAt: string | null;
}

export interface AgentDecision {
  id: string;
  taskId: string;
  agentId: string;
  decision: AgentDecisionOutcome;
  reasoning: string;
  confidence: number;
  platformMode: PlatformMode;
  reviewedByHuman: boolean;
  createdAt: string;
}

export interface AgentWorkload {
  agentId: string;
  totalAssigned: number;
  pending: number;
  inProgress: number;
  completed: number;
  escalated: number;
  avgConfidence: number;
  escalationRate: number;
}

// ── Mode Resolution ────────────────────────────────────────────────

async function resolvePlatformMode(tenantId: string): Promise<PlatformMode> {
  try {

    const { getTenantPlatformMode } = await import('../../@dos/platform-core/settings/platform-mode-gate.service');
    return await getTenantPlatformMode(tenantId);
  } catch {
    return 'manual'; // Law 11: deny by default
  }
}

function modeAllowsAction(mode: PlatformMode, action: AgentTaskMode): boolean {
  switch (mode) {
    case 'manual': return action === 'observe';
    case 'hybrid': return action === 'observe' || action === 'suggest';
    case 'autonomous': return true;
    default: return false;
  }
}

// ── Assignment ─────────────────────────────────────────────────────

/**
 * Assign an AI agent to a workflow task with a specific operating mode.
 * Mode is constrained by the tenant's platform mode — an agent cannot
 * execute in a hybrid-mode tenant.
 */
export async function assignAgentToTask(
  tenantId: string,
  taskId: string,
  agentId: string,
  requestedMode: AgentTaskMode,
  assignedBy: string = 'system',
): Promise<AgentTaskAssignment | null> {
  const schema = tenantSchema(tenantId);
  const platformMode = await resolvePlatformMode(tenantId);

  // Constrain mode to platform mode
  let effectiveMode = requestedMode;
  if (!modeAllowsAction(platformMode, requestedMode)) {
    if (platformMode === 'manual') effectiveMode = 'observe';
    else if (platformMode === 'hybrid') effectiveMode = 'suggest';
    logger.info('[AgentRole] Mode constrained by platform', {
      tenantId, agentId, requested: requestedMode, effective: effectiveMode, platformMode,
    });
  }

  try {
    // Verify task exists
    const { rows: taskRows } = await safeQuery(
      `SELECT id, status, module_code, assigned_to FROM "${schema}".process_tasks WHERE id = $1`,
      [taskId],
    ).catch(() => ({ rows: [] }));
    if (taskRows.length === 0) {
      logger.warn('[AgentRole] Task not found', { tenantId, taskId });
      return null;
    }

    // Check agent eligibility via policy
    try {
      const { evaluateAgentEligibility } = await import('./workflow-ai-agent-policy.service.js');
      const eligible = await evaluateAgentEligibility(tenantId, agentId, taskRows[0].module_code || 'general');
      if (!eligible.allowed) {
        logger.warn('[AgentRole] Agent not eligible', { tenantId, agentId, reason: eligible.reason });
        return null;
      }
    } catch { /* Policy service may not exist yet */ }

    // Create assignment
    const { rows } = await safeQuery(
      `INSERT INTO "${schema}".workflow_agent_assignments
         (task_id, agent_id, mode, status, assigned_by, assigned_at)
       VALUES ($1, $2, $3, 'active', $4, NOW())
       RETURNING id, task_id, agent_id, mode, status, assigned_at, completed_at`,
      [taskId, agentId, effectiveMode, assignedBy],
    );

    if (rows.length === 0) return null;

    // Update task with agent assignment
    await safeQuery(
      `UPDATE "${schema}".process_tasks SET assigned_to = $1, updated_at = NOW() WHERE id = $2`,
      [`agent:${agentId}`, taskId],
    ).catch(catchHandler(EC.EVENT_BUS));

    await emitEvent(({
          tenantId, userId: assignedBy, module: 'workflow',
          event: 'workflow.agent.assigned', entityType: 'task', entityId: taskId,
          data: { agentId, mode: effectiveMode, platformMode },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

    return {
      id: rows[0].id,
      taskId: rows[0].task_id,
      agentId: rows[0].agent_id,
      mode: rows[0].mode,
      status: rows[0].status,
      assignedAt: rows[0].assigned_at,
      completedAt: rows[0].completed_at,
    };
  } catch (err) {
    logger.error('[AgentRole] assignAgentToTask failed', {
      tenantId, taskId, agentId, error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Get all task assignments for an agent.
 */
export async function getAgentTaskAssignments(
  tenantId: string,
  agentId: string,
  status?: string,
): Promise<AgentTaskAssignment[]> {
  const schema = tenantSchema(tenantId);
  const conditions = ['wa.agent_id = $1'];
  const params: unknown[] = [agentId];
  if (status) { params.push(status); conditions.push(`wa.status = $${params.length}`); }

  const { rows } = await safeQuery(
    `SELECT wa.id, wa.task_id, wa.agent_id, wa.mode, wa.status, wa.assigned_at, wa.completed_at
     FROM "${schema}".workflow_agent_assignments wa
     WHERE ${conditions.join(' AND ')}
     ORDER BY wa.assigned_at DESC LIMIT 100`,
    params as string[],
  ).catch(() => ({ rows: [] }));

  return rows.map(( r: Record<string, unknown>) => ({
    id: r.id, taskId: r.task_id, agentId: r.agent_id,
    mode: r.mode, status: r.status,
    assignedAt: r.assigned_at, completedAt: r.completed_at,
  }));
}

/**
 * Evaluate whether an agent action is allowed based on platform mode + DAuth.
 */
export async function evaluateAgentAction(
  tenantId: string,
  taskId: string,
  agentId: string,
  proposedAction: string,
): Promise<{ allowed: boolean; reason: string; effectiveMode: AgentTaskMode }> {
  const platformMode = await resolvePlatformMode(tenantId);
  const _schema = tenantSchema(tenantId);

  // Check restricted actions
  try {
    const { getRestrictedActions } = await import('./workflow-ai-agent-policy.service.js');
    const restricted = await getRestrictedActions(tenantId);
    if (restricted.includes(proposedAction)) {
      return { allowed: false, reason: `Action '${proposedAction}' is restricted for agents`, effectiveMode: 'observe' };
    }
  } catch { /* pass */ }

  // Check platform mode
  if (platformMode === 'manual') {
    return { allowed: false, reason: 'Platform is in manual mode — agents can only observe', effectiveMode: 'observe' };
  }

  // Check if action requires human approval in hybrid mode
  if (platformMode === 'hybrid') {
    const highRiskActions = ['delete', 'approve', 'publish', 'deploy', 'terminate', 'revoke'];
    if (highRiskActions.some(a => proposedAction.toLowerCase().includes(a))) {
      return { allowed: false, reason: 'High-risk action requires human approval in hybrid mode', effectiveMode: 'suggest' };
    }
    return { allowed: true, reason: 'Hybrid mode — action allowed with audit trail', effectiveMode: 'suggest' };
  }

  // Autonomous mode — check DAuth
  try {

    const { evaluateAccess } = await import('../../../../platform/dauth');
    const authResult = await evaluateAccess({
      tenantId,
      userId: `agent:${agentId}`,
      role: 'agent',
      actorId: `agent:${agentId}`,
      permissionCode: `workflow.task.${proposedAction}`,
      moduleCode: 'workflow',
    });
    if (!authResult.allowed) {
      return { allowed: false, reason: authResult.reason || 'DAuth denied', effectiveMode: 'observe' };
    }
  } catch { /* DAuth may not be available */ }

  return { allowed: true, reason: 'Autonomous mode — action within boundaries', effectiveMode: 'execute' };
}

/**
 * Agent executes a task — checks mode, executes, records decision.
 */
export async function executeAgentTask(
  tenantId: string,
  taskId: string,
  agentId: string,
  action: string = 'complete',
  reasoning: string = '',
  confidence: number = 0.8,
): Promise<{ success: boolean; outcome: AgentDecisionOutcome; reason: string }> {
  const evaluation = await evaluateAgentAction(tenantId, taskId, agentId, action);

  if (!evaluation.allowed) {
    // Auto-escalate if not allowed
    await escalateToHuman(tenantId, taskId, agentId, evaluation.reason);
    await recordAgentDecision(tenantId, taskId, agentId, 'escalated', evaluation.reason, confidence);
    return { success: false, outcome: 'escalated', reason: evaluation.reason };
  }

  const schema = tenantSchema(tenantId);

  try {
    // Execute the task
    await safeQuery(
      `UPDATE "${schema}".process_tasks SET status = 'completed', completed_at = NOW(), completed_by = $1 WHERE id = $2`,
      [`agent:${agentId}`, taskId],
    );

    // Mark assignment complete
    await safeQuery(
      `UPDATE "${schema}".workflow_agent_assignments SET status = 'completed', completed_at = NOW() WHERE task_id = $1 AND agent_id = $2`,
      [taskId, agentId],
    ).catch(catchHandler(EC.EVENT_BUS));

    await recordAgentDecision(tenantId, taskId, agentId, 'executed', reasoning, confidence);

    await emitEvent(({
          tenantId, userId: `agent:${agentId}`, module: 'workflow',
          event: 'workflow.agent.task_executed', entityType: 'task', entityId: taskId,
          data: { agentId, action, confidence, reasoning: reasoning.slice(0, 500) },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

    return { success: true, outcome: 'executed', reason: 'Task completed by agent' };
  } catch (err) {
    logger.error('[AgentRole] executeAgentTask failed', { tenantId, taskId, agentId });
    return { success: false, outcome: 'deferred', reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Agent escalates task to human — used when confidence is low or action restricted.
 */
export async function escalateToHuman(
  tenantId: string,
  taskId: string,
  agentId: string,
  reason: string,
): Promise<{ success: boolean }> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `UPDATE "${schema}".process_tasks
       SET assigned_to = NULL, status = 'pending', notes = COALESCE(notes, '') || $1
       WHERE id = $2`,
      [`\n[Agent ${agentId} escalated: ${reason}]`, taskId],
    );

    await safeQuery(
      `UPDATE "${schema}".workflow_agent_assignments SET status = 'escalated', completed_at = NOW() WHERE task_id = $1 AND agent_id = $2`,
      [taskId, agentId],
    ).catch(catchHandler(EC.EVENT_BUS));

    await emitEvent(({
          tenantId, userId: `agent:${agentId}`, module: 'workflow',
          event: 'workflow.agent.escalated', entityType: 'task', entityId: taskId,
          data: { agentId, reason },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

    logger.info('[AgentRole] Task escalated to human', { tenantId, taskId, agentId, reason });
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Record an agent decision for audit trail (Law 12).
 */
export async function recordAgentDecision(
  tenantId: string,
  taskId: string,
  agentId: string,
  decision: AgentDecisionOutcome,
  reasoning: string,
  confidence: number,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const platformMode = await resolvePlatformMode(tenantId);

  await safeQuery(
    `INSERT INTO "${schema}".workflow_agent_decisions
       (task_id, agent_id, decision, reasoning, confidence, platform_mode, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [taskId, agentId, decision, reasoning.slice(0, 2000), confidence, platformMode],
  ).catch(() => {
    // Table may not exist — log to audit_trail as fallback
    safeQuery(
      `INSERT INTO "${schema}".audit_trail
         (tenant_id, user_id, module, action, entity_type, entity_id, after_state, created_at)
       VALUES ($1, $2, 'workflow', 'agent_decision', 'task', $3, $4::jsonb, NOW())`,
      [tenantId, `agent:${agentId}`, taskId, JSON.stringify({ decision, reasoning: reasoning.slice(0, 500), confidence, platformMode })],
    ).catch(catchHandler(EC.EVENT_BUS));
  });
}

/**
 * Review recent agent decisions for human oversight.
 */
export async function reviewAgentDecisions(
  tenantId: string,
  options: { agentId?: string; limit?: number; onlyUnreviewed?: boolean } = {},
): Promise<AgentDecision[]> {
  const schema = tenantSchema(tenantId);
  const conditions = ['1=1'];
  const params: unknown[] = [];

  if (options.agentId) { params.push(options.agentId); conditions.push(`agent_id = $${params.length}`); }
  if (options.onlyUnreviewed) { conditions.push('reviewed_by_human = FALSE'); }

  const { rows } = await safeQuery(
    `SELECT id, task_id, agent_id, decision, reasoning, confidence, platform_mode, reviewed_by_human, created_at
     FROM "${schema}".workflow_agent_decisions
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC LIMIT $${params.length + 1}`,
    [...params, options.limit ?? 50],
  ).catch(() => ({ rows: [] }));

  return rows.map(( r: Record<string, unknown>) => ({
    id: r.id, taskId: r.task_id, agentId: r.agent_id,
    decision: r.decision, reasoning: r.reasoning,
    confidence: parseFloat((r as any).confidence) || 0,
    platformMode: r.platform_mode,
    reviewedByHuman: r.reviewed_by_human ?? false,
    createdAt: r.created_at,
  }));
}

/**
 * Get agent workload summary across all workflows.
 */
export async function getAgentWorkloadSummary(
  tenantId: string,
  agentId: string,
): Promise<AgentWorkload> {
  const schema = tenantSchema(tenantId);

  const { rows } = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'active')::int AS pending,
       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
       COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated
     FROM "${schema}".workflow_agent_assignments
     WHERE agent_id = $1`,
    [agentId],
  ).catch(() => ({ rows: [{ total: 0, pending: 0, in_progress: 0, completed: 0, escalated: 0 }] }));

  const { rows: decisionRows } = await safeQuery(
    `SELECT AVG(confidence) AS avg_conf FROM "${schema}".workflow_agent_decisions WHERE agent_id = $1`,
    [agentId],
  ).catch(() => ({ rows: [{ avg_conf: 0 }] }));

  const r = rows[0];
  const total = r.total || 0;
  const escalated = r.escalated || 0;

  return {
    agentId,
    totalAssigned: total,
    pending: r.pending || 0,
    inProgress: r.in_progress || 0,
    completed: r.completed || 0,
    escalated,
    avgConfidence: parseFloat(decisionRows[0]?.avg_conf) || 0,
    escalationRate: total > 0 ? Math.round((escalated / total) * 100) : 0,
  };
}
