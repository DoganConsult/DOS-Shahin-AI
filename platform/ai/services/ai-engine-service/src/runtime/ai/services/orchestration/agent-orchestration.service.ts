// @ts-nocheck
import { createHash } from 'node:crypto';
import { logger } from '../../ports/logger.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getAgentRbacEntry, type PlatformMode, type ActionPriority as _ActionPriority } from '../../ports/platform.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '../../ports/platform.port';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';

export type AutonomyLevel = 'L0' | 'L1' | 'L2' | 'L3';

export interface RunInput {
  workflowId?: string;
  agentId?: string;
  tenantId: string;
  userId?: string;
  autonomyLevel?: AutonomyLevel;
  inputs?: Record<string, unknown>;
  parentRunId?: string;
}

export interface RunState {
  run_id: string;
  status: string;
  platform_mode: string;
  autonomy_level: string;
  agent_id: string | null;
  summary: string | null;
  actions_proposed: number;
  actions_executed: number;
  actions_queued: number;
  duration_ms: number | null;
  created_at: string;
  updated_at: string;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  labelAr?: string;
  lane: string;
  status: string;
  owner?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface RunGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  state: Record<string, unknown>;
}

const AUTONOMY_LEVEL_NUM: Record<AutonomyLevel, number> = { L0: 0, L1: 1, L2: 2, L3: 3 };

export function autonomyMeetsThreshold(current: AutonomyLevel, required: AutonomyLevel): boolean {
  return AUTONOMY_LEVEL_NUM[current] >= AUTONOMY_LEVEL_NUM[required];
}

export function mapModeToAutonomy(mode: PlatformMode): AutonomyLevel {
  switch (mode) {
    case 'human': return 'L0';
    case 'hybrid': return 'L1';
    case 'shadow_agent': return 'L2';
    case 'full_autonomous': return 'L3';
    default: return 'L0';
  }
}

export interface HyperRoleResult {
  canExecute: boolean;
  reason: string;
  effectivePermissions: string[];
  gatedBy: 'human_rbac' | 'agent_capability' | 'tenant_policy' | 'autonomy_level' | 'none';
}

export function computeHyperRole(
  userPermissions: string[],
  agentId: string,
  actionType: string,
  autonomyLevel: AutonomyLevel,
  tenantMode: PlatformMode,
): HyperRoleResult {
  const agentEntry = getAgentRbacEntry(agentId);
  if (!agentEntry) {
    return { canExecute: false, reason: `Unknown agent ${agentId}`, effectivePermissions: [], gatedBy: 'agent_capability' };
  }

  const agentPerms = agentEntry.permissions;
  const intersection = userPermissions.filter(p => agentPerms.includes(p));

  if (intersection.length === 0) {
    return {
      canExecute: false,
      reason: `No overlapping permissions between user and ${agentEntry.grcRole}`,
      effectivePermissions: [],
      gatedBy: 'human_rbac',
    };
  }

  const modeAutonomy = mapModeToAutonomy(tenantMode);
  const effectiveAutonomy = AUTONOMY_LEVEL_NUM[autonomyLevel] <= AUTONOMY_LEVEL_NUM[modeAutonomy]
    ? autonomyLevel : modeAutonomy;

  const ALWAYS_REQUIRE_APPROVAL = [
    'CHANGE_PATH', 'CLOSE_RISK', 'MODIFY_CONTROL', 'REASSIGN', 'ESCALATE', 'CREATE_POLICY',
  ];

  if (ALWAYS_REQUIRE_APPROVAL.includes(actionType) && effectiveAutonomy !== 'L3') {
    return {
      canExecute: false,
      reason: `Action ${actionType} always requires human approval (current: ${effectiveAutonomy})`,
      effectivePermissions: intersection,
      gatedBy: 'tenant_policy',
    };
  }

  if (effectiveAutonomy === 'L0') {
    return {
      canExecute: false,
      reason: 'L0 Assist: proposals only, no auto-execution',
      effectivePermissions: intersection,
      gatedBy: 'autonomy_level',
    };
  }

  return {
    canExecute: true,
    reason: `Hyper-Role allows: ${agentEntry.grcRole} ∩ user perms at ${effectiveAutonomy}`,
    effectivePermissions: intersection,
    gatedBy: 'none',
  };
}

// ── Run management ─────────────────────────────────────────────

export async function createAgentRun(input: RunInput, mode: PlatformMode): Promise<string | null> {
  const schema = tenantSchema(input.tenantId);
  const traceId = `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".agent_runs
         (tenant_id, user_id, workflow_id, agent_id, autonomy_level, platform_mode, status, trace_id, inputs, parent_run_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'running', $7, $8, $9)
       RETURNING run_id`,
      [
        input.tenantId,
        input.userId || null,
        input.workflowId || null,
        input.agentId || null,
        input.autonomyLevel || mapModeToAutonomy(mode),
        mode,
        traceId,
        JSON.stringify(input.inputs || {}),
        input.parentRunId || null,
      ],
    );
    return getFirstRow(result)?.run_id || null;
  } catch (err: unknown) {
    logger.warn(`[AgentOrchestration] createAgentRun failed: ${toErrorMessage(err)}`);
    return null;
  }
}

export async function updateAgentRun(
  tenantId: string,
  runId: string,
  updates: Partial<{
    status: string; summary: string; actionsProposed: number;
    actionsExecuted: number; actionsQueued: number; durationMs: number;
    outputs: object; errorMessage: string; tokensUsed: number;
  }>,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  let idx = 1;

  if (updates.status !== undefined) { sets.push(`status = $${idx++}`); params.push(updates.status); }
  if (updates.summary !== undefined) { sets.push(`summary = $${idx++}`); params.push(updates.summary); }
  if (updates.actionsProposed !== undefined) { sets.push(`actions_proposed = $${idx++}`); params.push(updates.actionsProposed); }
  if (updates.actionsExecuted !== undefined) { sets.push(`actions_executed = $${idx++}`); params.push(updates.actionsExecuted); }
  if (updates.actionsQueued !== undefined) { sets.push(`actions_queued = $${idx++}`); params.push(updates.actionsQueued); }
  if (updates.durationMs !== undefined) { sets.push(`duration_ms = $${idx++}`); params.push(updates.durationMs); }
  if (updates.outputs !== undefined) { sets.push(`outputs = $${idx++}`); params.push(JSON.stringify(updates.outputs)); }
  if (updates.errorMessage !== undefined) { sets.push(`error_message = $${idx++}`); params.push(updates.errorMessage); }
  if (updates.tokensUsed !== undefined) { sets.push(`tokens_used = $${idx++}`); params.push(updates.tokensUsed); }

  params.push(runId);
  swallow(EC.AGENT_ACTION, safeQuery(`UPDATE "${schema}".agent_runs SET ${sets.join(', ')} WHERE run_id = $${idx}`, params), { tenantId, operation: 'updateAgentRun' });
}

export async function getAgentRun(tenantId: string, runId: string): Promise<RunState | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT run_id, status, platform_mode, autonomy_level, agent_id, summary,
              actions_proposed, actions_executed, actions_queued, duration_ms,
              created_at, updated_at
       FROM "${schema}".agent_runs WHERE run_id = $1`,
      [runId],
    );
    return getFirstRow(result) || null;
  } catch { return null; }
}

export async function listAgentRuns(
  tenantId: string,
  opts?: { status?: string; agentId?: string; limit?: number },
): Promise<RunState[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (opts?.status) { conditions.push(`status = $${idx++}`); params.push(opts.status); }
  if (opts?.agentId) { conditions.push(`agent_id = $${idx++}`); params.push(opts.agentId); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = opts?.limit || 50;

  try {
    const result = await safeQuery(
      `SELECT run_id, status, platform_mode, autonomy_level, agent_id, summary,
              actions_proposed, actions_executed, actions_queued, duration_ms,
              created_at, updated_at
       FROM "${schema}".agent_runs ${where}
       ORDER BY created_at DESC LIMIT ${Math.min(500, Math.max(1, parseInt(String(limit)) || 50))}`,
      params,
    );
    return result.rows;
  } catch { return []; }
}

// ── Steps within a run ─────────────────────────────────────────

export async function recordAgentStep(
  tenantId: string,
  runId: string,
  step: {
    nodeId: string; agentId: string; stepType?: string; lane?: string;
    label?: string; labelAr?: string; status: string;
    ownerUserId?: string; inputsRef?: Record<string, unknown>; outputsRef?: Record<string, unknown>; slaHours?: number;
  },
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".agent_steps
         (run_id, node_id, agent_id, step_type, lane, label, label_ar, status,
          owner_user_id, inputs_ref, outputs_ref, sla_hours,
          started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       ON CONFLICT (run_id, node_id) DO UPDATE SET
         status = EXCLUDED.status, outputs_ref = EXCLUDED.outputs_ref,
         ended_at = CASE WHEN EXCLUDED.status IN ('done','failed','skipped') THEN NOW() ELSE agent_steps.ended_at END
       RETURNING step_id`,
      [
        runId, step.nodeId, step.agentId, step.stepType || 'task',
        step.lane || null, step.label || null, step.labelAr || null,
        step.status, step.ownerUserId || null,
        step.inputsRef ? JSON.stringify(step.inputsRef) : null,
        step.outputsRef ? JSON.stringify(step.outputsRef) : null,
        step.slaHours || null,
      ],
    );

    if (step.status === 'done' || step.status === 'failed') {
      try {
        const { snapshotGraph } = await import('../../workflow/services/templates/workflow-versioning.service');
        const graph = await getRunGraph(tenantId, runId);
        await snapshotGraph(tenantId, runId, graph, {
          changeSummary: `Step ${step.nodeId} → ${step.status}`,
          changeType: 'auto',
        });
      } catch { /* versioning non-fatal */ }
    }

    return getFirstRow(result)?.step_id || null;
  } catch (err: unknown) {
    logger.warn(`[AgentOrchestration] recordAgentStep failed: ${toErrorMessage(err)}`);
    return null;
  }
}

export async function getRunGraph(tenantId: string, runId: string): Promise<RunGraph> {
  const schema = tenantSchema(tenantId);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const state: Record<string, unknown> = {};

  try {
    const stepsResult = await safeQuery(
      `SELECT node_id, step_type, lane, label, label_ar, status,
              owner_user_id, started_at, ended_at, sla_hours
       FROM "${schema}".agent_steps WHERE run_id = $1 ORDER BY created_at`,
      [runId],
    );

    for (const row of stepsResult.rows) {
      nodes.push({
        id: row.node_id,
        type: row.step_type,
        label: row.label || row.node_id,
        labelAr: row.label_ar,
        lane: row.lane || 'Default',
        status: row.status,
        owner: row.owner_user_id,
        startedAt: row.started_at,
        endedAt: row.ended_at,
      });
      state[row.node_id] = {
        status: row.status,
        owner: row.owner_user_id,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        slaHours: row.sla_hours,
      };
    }

    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `e_${i}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        condition: 'sequential',
      });
    }
  } catch {}

  return { nodes, edges, state };
}

// ── Proposals ──────────────────────────────────────────────────

export async function createProposal(
  tenantId: string,
  proposal: {
    runId?: string; nodeId?: string; agentId: string; type: string;
    payload: Record<string, unknown>; reason?: string; priority?: string;
    requiredApprovers?: string[]; autoExecutable?: boolean; createdBy?: string;
  },
): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".agent_proposals
         (run_id, node_id, agent_id, tenant_id, type, payload_json, reason,
          priority, required_approvers, auto_executable, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING proposal_id`,
      [
        proposal.runId || null,
        proposal.nodeId || null,
        proposal.agentId,
        tenantId,
        proposal.type,
        JSON.stringify(proposal.payload || {}),
        proposal.reason || null,
        proposal.priority || 'medium',
        proposal.requiredApprovers || [],
        proposal.autoExecutable || false,
        proposal.createdBy || `agent-${proposal.agentId}`,
      ],
    );
    return getFirstRow(result)?.proposal_id || null;
  } catch (err: unknown) {
    logger.warn(`[AgentOrchestration] createProposal failed: ${toErrorMessage(err)}`);
    return null;
  }
}

export async function listProposals(
  tenantId: string,
  opts?: { status?: string; agentId?: string; runId?: string; limit?: number },
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [`tenant_id = $1`];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (opts?.status) { conditions.push(`status = $${idx++}`); params.push(opts.status); }
  if (opts?.agentId) { conditions.push(`agent_id = $${idx++}`); params.push(opts.agentId); }
  if (opts?.runId) { conditions.push(`run_id = $${idx++}`); params.push(opts.runId); }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = opts?.limit || 50;

  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".agent_proposals ${where} ORDER BY created_at DESC LIMIT ${Math.min(500, Math.max(1, parseInt(String(limit)) || 50))}`,
      params,
    );
    return result.rows;
  } catch { return []; }
}

export async function approveProposal(
  tenantId: string,
  proposalId: string,
  approverUserId: string,
  comment?: string,
): Promise<{ success: boolean; proposal?: Record<string, unknown> }> {
  const schema = tenantSchema(tenantId);

  const propResult = await safeQuery(
    `UPDATE "${schema}".agent_proposals
     SET status = 'approved', updated_at = NOW()
     WHERE proposal_id = $1 AND status = 'pending_approval'
     RETURNING *`,
    [proposalId],
  );
  if (propResult.rows.length === 0) return { success: false };

  swallow(EC.AGENT_ACTION, safeQuery(
    `INSERT INTO "${schema}".agent_approvals (proposal_id, approver_user_id, decision, comment)
     VALUES ($1, $2, 'approve', $3)`,
    [proposalId, approverUserId, comment || null],
  ), { tenantId, operation: 'approveProposal:insert_approval' });

  return { success: true, proposal: getFirstRow(propResult) };
}

export async function rejectProposal(
  tenantId: string,
  proposalId: string,
  approverUserId: string,
  comment?: string,
): Promise<{ success: boolean }> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `UPDATE "${schema}".agent_proposals
     SET status = 'rejected', updated_at = NOW()
     WHERE proposal_id = $1 AND status = 'pending_approval'
     RETURNING proposal_id`,
    [proposalId],
  );
  if (result.rows.length === 0) return { success: false };

  swallow(EC.AGENT_ACTION, safeQuery(
    `INSERT INTO "${schema}".agent_approvals (proposal_id, approver_user_id, decision, comment)
     VALUES ($1, $2, 'reject', $3)`,
    [proposalId, approverUserId, comment || null],
  ), { tenantId, operation: 'rejectProposal:insert_approval' });

  return { success: true };
}

// ── Events ─────────────────────────────────────────────────────

/**
 * Law 6: Compute agent action signature for audit non-repudiation.
 * SHA-256 hash of (agentId + eventType + data + timestamp) ensures
 * each recorded event can be verified as unmodified.
 */
function computeAgentSignature(agentId: string, eventType: string, data: unknown, timestamp: string): string {
  const payload = `${agentId}:${eventType}:${JSON.stringify(data)}:${timestamp}`;
  return createHash('sha256').update(payload).digest('hex');
}

export async function recordAgentEvent(
  tenantId: string,
  event: {
    runId?: string; agentId?: string; eventType: string;
    nodeId?: string; data?: Record<string, unknown>;
  },
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const timestamp = new Date().toISOString();
  const signature = computeAgentSignature(
    event.agentId || 'any', event.eventType, event.data || {}, timestamp,
  );
  const dataWithSignature = { ...event.data, _signature: signature, _signedAt: timestamp };
  swallow(EC.AGENT_ACTION, safeQuery(
    `INSERT INTO "${schema}".agent_events (run_id, tenant_id, agent_id, event_type, node_id, data_json)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      event.runId || null,
      tenantId,
      event.agentId || null,
      event.eventType,
      event.nodeId || null,
      JSON.stringify(dataWithSignature),
    ],
  ), { tenantId, operation: 'recordAgentEvent:insert' });

  try {
    const { pushToTenant } = await import('../../../../platform/dos/events/websocket.service');
    pushToTenant(tenantId, {
      type: `agent.${event.eventType}`,
      data: { runId: event.runId, agentId: event.agentId, nodeId: event.nodeId, ...event.data },
      timestamp: new Date().toISOString(),
    });
  } catch { /* WebSocket broadcast non-fatal */ }
}

export async function getRunEvents(
  tenantId: string,
  runId: string,
  limit = 100,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".agent_events
       WHERE run_id = $1 ORDER BY created_at LIMIT ${Math.min(500, Math.max(1, parseInt(String(limit)) || 50))}`,
      [runId],
    );
    return result.rows;
  } catch { return []; }
}

// ── Shadow Agent Config ────────────────────────────────────────

export async function getShadowAgentConfig(tenantId: string, userId: string): Promise<Record<string, unknown> | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".shadow_agent_config WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId],
    );
    return getFirstRow(result) || null;
  } catch { return null; }
}

export async function upsertShadowAgentConfig(
  tenantId: string,
  userId: string,
  config: {
    enabled?: boolean;
    autonomyLevel?: AutonomyLevel;
    allowedAgents?: string[];
    delegationRules?: Record<string, unknown>;
    preferences?: Record<string, unknown>;
    maxActionsPerDay?: number;
  },
): Promise<Record<string, unknown> | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".shadow_agent_config
         (tenant_id, user_id, enabled, autonomy_level, allowed_agents,
          delegation_rules, preferences, max_actions_per_day, memory_namespace)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (tenant_id, user_id) DO UPDATE SET
         enabled = COALESCE(EXCLUDED.enabled, shadow_agent_config.enabled),
         autonomy_level = COALESCE(EXCLUDED.autonomy_level, shadow_agent_config.autonomy_level),
         allowed_agents = COALESCE(EXCLUDED.allowed_agents, shadow_agent_config.allowed_agents),
         delegation_rules = COALESCE(EXCLUDED.delegation_rules, shadow_agent_config.delegation_rules),
         preferences = COALESCE(EXCLUDED.preferences, shadow_agent_config.preferences),
         max_actions_per_day = COALESCE(EXCLUDED.max_actions_per_day, shadow_agent_config.max_actions_per_day),
         updated_at = NOW()
       RETURNING *`,
      [
        tenantId,
        userId,
        config.enabled ?? false,
        config.autonomyLevel || 'L0',
        config.allowedAgents || ['A01','A02','A03','A04','A05','A06','A07','A08','A09','A10','A11'],
        JSON.stringify(config.delegationRules || {}),
        JSON.stringify(config.preferences || {}),
        config.maxActionsPerDay || 25,
        `mem:tenant:${tenantId}:user:${userId}:personal`,
      ],
    );
    return getFirstRow(result) || null;
  } catch (err: unknown) {
    logger.warn(`[AgentOrchestration] upsertShadowAgentConfig failed: ${toErrorMessage(err)}`);
    return null;
  }
}

export async function listShadowAgents(
  tenantId: string,
  opts?: { enabledOnly?: boolean; limit?: number },
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const where = opts?.enabledOnly ? 'AND enabled = TRUE' : '';
  try {
    const result = await safeQuery(
      `SELECT sac.*, u.full_name, u.email, u.role
       FROM "${schema}".shadow_agent_config sac
       LEFT JOIN users u ON u.user_id = sac.user_id AND u.tenant_id = sac.tenant_id
       WHERE sac.tenant_id = $1 ${where}
       ORDER BY sac.updated_at DESC
       LIMIT ${Math.min(500, Math.max(1, parseInt(String(opts?.limit || 100)) || 50))}`,
      [tenantId],
    );
    return result.rows;
  } catch { return []; }
}

// ── Autonomy Policy lookup ─────────────────────────────────────

export async function getAutonomyPolicy(
  tenantId: string,
  actionType: string,
): Promise<{ minAutonomy: AutonomyLevel; requiresApproval: boolean; maxAutoPerDay: number } | null> {
  const schema = tenantSchema(tenantId);
  try {
    let result = await safeQuery(
      `SELECT min_autonomy, requires_approval, max_auto_per_day
       FROM "${schema}".agent_autonomy_policies
       WHERE tenant_id = $1 AND action_type = $2`,
      [tenantId, actionType],
    );
    if (result.rows.length === 0) {
      result = await safeQuery(
        `SELECT min_autonomy, requires_approval, max_auto_per_day
         FROM "${schema}".agent_autonomy_policies
         WHERE tenant_id = '_default' AND action_type = $1`,
        [actionType],
      );
    }
    if (result.rows.length === 0) {
      return { minAutonomy: 'L0', requiresApproval: true, maxAutoPerDay: 50 };
    }
    const row = getFirstRow(result);
    return {
      minAutonomy: row.min_autonomy as AutonomyLevel,
      requiresApproval: row.requires_approval,
      maxAutoPerDay: row.max_auto_per_day || 50,
    };
  } catch {
    return { minAutonomy: 'L0', requiresApproval: true, maxAutoPerDay: 50 };
  }
}

// ── Agent run stats for dashboard ──────────────────────────────

export async function getAgentRunStats(tenantId: string): Promise<{
  totalRuns: number;
  runningRuns: number;
  completedRuns: number;
  failedRuns: number;
  totalProposals: number;
  pendingProposals: number;
  totalActions: number;
  agentBreakdown: { agentId: string; runs: number; actions: number }[];
}> {
  const schema = tenantSchema(tenantId);
  const defaultStats = {
    totalRuns: 0, runningRuns: 0, completedRuns: 0, failedRuns: 0,
    totalProposals: 0, pendingProposals: 0, totalActions: 0, agentBreakdown: [],
  };

  try {
    const [runsResult, proposalsResult, breakdownResult] = await Promise.allSettled([
      safeQuery(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'running') as running,
           COUNT(*) FILTER (WHERE status = 'completed') as completed,
           COUNT(*) FILTER (WHERE status = 'failed') as failed,
           SUM(actions_executed) as total_actions
         FROM "${schema}".agent_runs WHERE tenant_id = $1`,
        [tenantId],
      ),
      safeQuery(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'pending_approval') as pending
         FROM "${schema}".agent_proposals WHERE tenant_id = $1`,
        [tenantId],
      ),
      safeQuery(
        `SELECT agent_id,
                COUNT(*) as runs,
                SUM(actions_executed) as actions
         FROM "${schema}".agent_runs
         WHERE tenant_id = $1 AND agent_id IS NOT NULL
         GROUP BY agent_id ORDER BY agent_id`,
        [tenantId],
      ),
    ]);

    const runsValue = runsResult.status === 'fulfilled' ? runsResult.value : undefined;
    const proposalsValue = proposalsResult.status === 'fulfilled' ? proposalsResult.value : undefined;
    const breakdownValue = breakdownResult.status === 'fulfilled' ? breakdownResult.value : undefined;
    const runs: Record<string, unknown> = getFirstRow(runsValue) || {};
    const proposals: Record<string, unknown> = getFirstRow(proposalsValue) || {};
    const breakdown: GenericRow[] = breakdownValue?.rows || [];

    return {
      totalRuns: Number(runs.total || 0),
      runningRuns: Number(runs.running || 0),
      completedRuns: Number(runs.completed || 0),
      failedRuns: Number(runs.failed || 0),
      totalProposals: Number(proposals.total || 0),
      pendingProposals: Number(proposals.pending || 0),
      totalActions: Number(runs.total_actions || 0),
      agentBreakdown: breakdown.map((r: GenericRow) => ({
        agentId: r.agent_id,
        runs: Number(r.runs || 0),
        actions: Number(r.actions || 0),
      })),
    };
  } catch {
    return defaultStats;
  }
}
