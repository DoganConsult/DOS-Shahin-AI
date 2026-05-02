import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

// ── Agent Invocation ────────────────────────────────────────────────

export interface AgentRunRecord {
  run_id: string;
  tenant_id: string;
  agent_id: string;
  status: string;
  mode: string;
  task: string | null;
  context: Record<string, unknown>;
  result: Record<string, unknown> | null;
  discovery_count: number;
  action_count: number;
  token_usage: number;
  duration_ms: number | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

const RUN_COLUMNS = `run_id, tenant_id, agent_id, status, mode, task, context, result, discovery_count, action_count, token_usage, duration_ms, error, created_at, completed_at`;

export async function invokeAgent(
  tenantId: string,
  input: { agentId: string; task?: string; context?: Record<string, unknown>; mode?: string },
): Promise<AgentRunRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.agrc_agent_runs (run_id, tenant_id, agent_id, status, mode, task, context, discovery_count, action_count, token_usage, created_at)
       VALUES ($1, $2, $3, 'running', $4, $5, $6, 0, 0, 0, NOW())
       RETURNING ${RUN_COLUMNS}`,
      [id, tenantId, input.agentId, input.mode || 'hybrid', input.task || null, JSON.stringify(input.context || {})],
    );
    logger.info('[agrc-os] Agent invoked', { runId: id, agentId: input.agentId, tenantId });
    return result.rows[0] as AgentRunRecord;
  } catch (err) {
    logger.error('[agrc-os] Failed to invoke agent', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function listAgentRuns(
  tenantId: string,
  agentId: string,
  page = 1,
  pageSize = 25,
): Promise<{ data: AgentRunRecord[]; total: number; page: number; pageSize: number }> {
  const offset = (page - 1) * pageSize;
  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM dos.agrc_agent_runs WHERE tenant_id = $1 AND agent_id = $2`,
    [tenantId, agentId],
  );
  const dataResult = await safeQuery(
    `SELECT ${RUN_COLUMNS} FROM dos.agrc_agent_runs WHERE tenant_id = $1 AND agent_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
    [tenantId, agentId, pageSize, offset],
  );
  return { data: dataResult.rows as AgentRunRecord[], total: countResult.rows[0]?.total || 0, page, pageSize };
}

// ── Discoveries ─────────────────────────────────────────────────────

export interface DiscoveryRecord {
  discovery_id: string;
  tenant_id: string;
  cycle_id: string | null;
  agent_id: string;
  run_id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function listDiscoveries(
  tenantId: string,
  options: { page?: number; pageSize?: number; agentId?: string; cycleId?: string; severity?: string } = {},
): Promise<{ data: DiscoveryRecord[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 25));
  const offset = (page - 1) * pageSize;
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (options.agentId) { conditions.push(`agent_id = $${idx}`); params.push(options.agentId); idx++; }
  if (options.cycleId) { conditions.push(`cycle_id = $${idx}`); params.push(options.cycleId); idx++; }
  if (options.severity) { conditions.push(`severity = $${idx}`); params.push(options.severity); idx++; }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM dos.agrc_discoveries ${where}`, params);
  const dataResult = await safeQuery(
    `SELECT * FROM dos.agrc_discoveries ${where} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
    params,
  );
  return { data: dataResult.rows as DiscoveryRecord[], total: countResult.rows[0]?.total || 0, page, pageSize };
}

// ── Proposed Actions (approval workflow) ────────────────────────────

export async function approveAction(
  tenantId: string,
  actionId: string,
  approved: boolean,
  reason?: string,
): Promise<Record<string, unknown>> {
  const status = approved ? 'approved' : 'rejected';
  const result = await safeQuery(
    `UPDATE dos.agrc_proposed_actions SET status = $3, review_reason = $4, reviewed_at = NOW()
     WHERE tenant_id = $1 AND action_id = $2 AND status = 'pending'
     RETURNING *`,
    [tenantId, actionId, status, reason || null],
  );
  if (result.rows.length === 0) {
    throw new Error('Action not found or not pending');
  }
  logger.info('[agrc-os] Action reviewed', { actionId, status, tenantId });
  return result.rows[0] as Record<string, unknown>;
}

export async function listPendingActions(tenantId: string): Promise<Record<string, unknown>[]> {
  const result = await safeQuery(
    `SELECT * FROM dos.agrc_proposed_actions WHERE tenant_id = $1 AND status = 'pending' ORDER BY created_at ASC`,
    [tenantId],
  );
  return result.rows as Record<string, unknown>[];
}

// ── Agent Memory ────────────────────────────────────────────────────

export async function getAgentMemory(tenantId: string, agentId: string): Promise<Record<string, unknown>> {
  const result = await safeQuery(
    `SELECT * FROM dos.agrc_agent_memory WHERE tenant_id = $1 AND agent_id = $2 ORDER BY created_at DESC LIMIT 50`,
    [tenantId, agentId],
  );
  return { agentId, entries: result.rows, count: result.rows.length };
}

// ── Agent Handoffs ──────────────────────────────────────────────────

export interface HandoffRecord {
  handoff_id: string;
  tenant_id: string;
  from_agent: string;
  to_agent: string;
  payload: Record<string, unknown>;
  priority: string;
  status: string;
  created_at: string;
}

export async function createHandoff(
  tenantId: string,
  input: { fromAgent: string; toAgent: string; payload: Record<string, unknown>; priority?: string },
): Promise<HandoffRecord> {
  const id = randomUUID();
  const result = await safeQuery(
    `INSERT INTO dos.agrc_handoffs (handoff_id, tenant_id, from_agent, to_agent, payload, priority, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
     RETURNING *`,
    [id, tenantId, input.fromAgent, input.toAgent, JSON.stringify(input.payload), input.priority || 'medium'],
  );
  logger.info('[agrc-os] Handoff created', { handoffId: id, from: input.fromAgent, to: input.toAgent });
  return result.rows[0] as HandoffRecord;
}
