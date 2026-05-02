// ============================================================
// Shahin — Agent-to-Agent Delegation Service
// Allows AI agents to delegate tasks to other specialized agents
// with full audit trail and governance validation.
// ============================================================

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { emitEvent as publishEvent } from '../../ports/events.port';

// Audit records are emitted as events via the core event bus
// to prevent cross-module architecture violations.// Memoize table creation per schema to avoid repeated DDL on every call
const _ensuredSchemas = new Set<string>();
async function ensureAgentDelegationsTable(schema: string): Promise<void> {
  if (_ensuredSchemas.has(schema)) return;
  await ensureDelegationTables(schema);
  _ensuredSchemas.add(schema);
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface AgentDelegationRequest {
  delegationId: string;
  tenantId: string;
  sourceAgentId: string;        // Agent initiating the delegation
  targetAgentId: string;        // Agent receiving the task
  taskType: string;             // e.g., 'risk_assessment', 'policy_review', 'evidence_validation'
  taskDescription: string;
  context: Record<string, unknown>; // Task context and parameters
  priority: 'low' | 'medium' | 'high' | 'critical';
  expectedOutcome: string;
  deadline?: string;            // ISO 8601
  requiresApproval?: boolean;   // Whether human approval is needed before execution
  createdAt: string;
}

export interface AgentDelegationResult {
  delegationId: string;
  tenantId: string;
  sourceAgentId: string;
  targetAgentId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'failed' | 'timed_out' | 'cancelled';
  acceptanceReason?: string;
  rejectionReason?: string;
  executionResult?: Record<string, unknown>;
  errorMessage?: string;
  confidence?: number;
  governanceCheck?: {
    passed: boolean;
    reason?: string;
    approverRequired?: string;
  };
  acceptedAt?: string;
  completedAt?: string;
  createdAt: string;
}

// ── Delegate task from one agent to another ────────────────────────────────

export async function delegateToAgent(
  tenantId: string,
  sourceAgentId: string,
  targetAgentId: string,
  task: {
    taskType: string;
    taskDescription: string;
    context: Record<string, unknown>;
    priority: 'low' | 'medium' | 'high' | 'critical';
    expectedOutcome: string;
    deadline?: string;
    requiresApproval?: boolean;
  },
  opts?: { userId?: string; sessionId?: string }
): Promise<AgentDelegationRequest | any> {
  const schema = tenantSchema(tenantId);
  const delegationId = uuid();
  const userId = opts?.userId || 'system-agent';
  const sessionId = opts?.sessionId || null;

  // F2: Ensure the agent_delegations table exists (memoized per schema)
  await ensureAgentDelegationsTable(schema);

  // F3: Durable ledger — INSERT MUST succeed before execution starts.
  // If this fails the delegation is aborted; we do not proceed without an audit record.
  const insertResult = await safeQuery(
    `INSERT INTO "${schema}".agent_delegations
       (delegation_id, tenant_id, source_agent_id, target_agent_id, task_type, task_description,
        context, priority, expected_outcome, session_id, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'in_progress', NOW())
     RETURNING delegation_id`,
    [delegationId, tenantId, sourceAgentId, targetAgentId, task.taskType, task.taskDescription,
     JSON.stringify(task.context || {}), task.priority, task.expectedOutcome, sessionId]
  );
  if (!insertResult?.rows?.length) {
    throw new Error(`Delegation ledger INSERT failed for ${delegationId} — aborting delegation without execution.`);
  }

  // F3.5: Emit Orchestration Start Event
  await publishEvent({
    event: 'ai.delegation.action_started',
    tenantId,
    userId: userId,
    module: 'ai_engine',
    entityType: 'agent',
    entityId: delegationId,
    data: { delegationId, sourceAgentId, targetAgentId, taskType: task.taskType, status: 'in_progress' }
  } as any).catch(() => null);

  // 2. Synchronously invoke the target agent using the AI orchestrator
  const orchestrator = await import('../agents/core/agent-tool-executor.service').catch(() => null);
  let finalStatus: 'completed' | 'failed' | 'timed_out' = 'failed';
  let executionResultObj: Record<string, unknown> = {};
  let errorMessage: string | null = null;

  if (orchestrator && orchestrator.runAgentWithTools) {
    // D3: AbortController — cancels child execution on timeout
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), 120000);
    try {
      const runResult: any = await orchestrator.runAgentWithTools(tenantId, targetAgentId, {
        taskType: task.taskType,
        sourceAgentId,
        ...task.context
      }, `Special Assigned Delegation Task: ${task.taskDescription}. Required outcome: ${task.expectedOutcome}`,
      {
        visitedAgents: Array.isArray(task.context?.visitedAgents) ? task.context.visitedAgents : [],
        signal: abortController.signal,
      });

      executionResultObj = {
        raw_text: runResult.finalText || 'Agent finished task without explicit text output.',
        discoveries: runResult.discoveries || []
      };
      finalStatus = 'completed';
    } catch (err: any) {
      const msg = err.message || 'Unknown orchestrator error.';
      errorMessage = msg;
      finalStatus = (abortController.signal.aborted || msg.startsWith('DELEGATION_TIMEOUT:')) ? 'timed_out' : 'failed';
    } finally {
      clearTimeout(timeoutHandle);
    }
  } else {
    errorMessage = 'Delegation failed: Orchestrator unavailable.';
  }

  // 3. Update DB record with final status
  await safeQuery(
    `UPDATE "${schema}".agent_delegations
     SET status = $1, execution_result = $2, error_message = $3, completed_at = NOW()
     WHERE delegation_id = $4`,
    [finalStatus, JSON.stringify(executionResultObj), errorMessage, delegationId]
  ).catch(() => null);

  // F6: Emit Audit via Event Backbone to prevent cross-boundary direct imports
  await publishEvent({
    event: 'audit.recorded',
    tenantId,
    userId,
    module: 'ai_engine',
    data: {
      action: 'delegation',
      entityType: 'agent',
      entityId: delegationId,
      beforeState: { status: 'in_progress', sourceAgentId, targetAgentId },
      afterState: { status: finalStatus, errorMessage }
    }
  } as any).catch(() => null);

  // F7: Emit event bus event for delegation completion
  await publishEvent({
    event: 'ai.delegation.action_executed',
    tenantId,
    userId: userId,
    module: 'ai_engine',
    entityType: 'agent',
    entityId: delegationId,
    data: { delegationId, sourceAgentId, targetAgentId, taskType: task.taskType, status: finalStatus }
  } as any).catch(() => null);

  // Record delegation metrics to Prometheus
  try {
    const { recordAgentDelegation } = await import('@dos/platform-core/observability');
    recordAgentDelegation(sourceAgentId, targetAgentId, finalStatus);
  } catch { /* metrics not available */ }

  return {
    delegationId,
    tenantId,
    sourceAgentId,
    targetAgentId,
    taskType: task.taskType,
    taskDescription: task.taskDescription,
    context: task.context,
    priority: task.priority,
    expectedOutcome: task.expectedOutcome,
    executionResult: executionResultObj,
    errorMessage: errorMessage,
    status: finalStatus,
    createdAt: new Date().toISOString()
  };
}

// ── Log blocked circular recursion ─────────────────────────────────────────

export async function logBlockedDelegation(
  tenantId: string,
  sourceAgentId: string,
  targetAgentId: string,
  reason: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const delegationId = uuid();

  await safeQuery(
    `INSERT INTO "${schema}".agent_delegations
       (delegation_id, tenant_id, source_agent_id, target_agent_id, task_type, task_description,
        context, priority, expected_outcome, status, error_message, created_at, completed_at)
     VALUES ($1, $2, $3, $4, 'system_guardrail', 'Intercepted circular dependency delegation attempt',
        '{}', 'critical', 'Prevent Infinite Loop', 'failed', $5, NOW(), NOW())`,
    [delegationId, tenantId, sourceAgentId, targetAgentId, `Blocked by Circular Dependency Guardrail: ${reason}`]
  );
}

// ── Accept delegation (target agent accepts the task) ────────────────────────

export async function acceptDelegation(
  tenantId: string,
  delegationId: string,
  targetAgentId: string,
  acceptanceReason?: string
): Promise<AgentDelegationResult> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".agent_delegations SET status = 'accepted', acceptance_reason = $1, accepted_at = NOW() WHERE delegation_id = $2 RETURNING *`,
    [acceptanceReason, delegationId]
  );
  return result.rows.length ? mapDelegationRow(result.rows[0]) : ({} as any);
}

// ── Reject delegation ───────────────────────────────────────────────────────

export async function rejectDelegation(
  tenantId: string,
  delegationId: string,
  targetAgentId: string,
  rejectionReason: string
): Promise<AgentDelegationResult> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".agent_delegations SET status = 'rejected', rejection_reason = $1 WHERE delegation_id = $2 RETURNING *`,
    [rejectionReason, delegationId]
  );
  return result.rows.length ? mapDelegationRow(result.rows[0]) : ({} as any);
}

// ── Complete delegation (target agent completes the task) ───────────────────

export async function completeDelegation(
  tenantId: string,
  delegationId: string,
  targetAgentId: string,
  executionResult: Record<string, unknown>,
  errorMessage?: string
): Promise<AgentDelegationResult> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".agent_delegations SET status = $1, execution_result = $2, error_message = $3, completed_at = NOW() WHERE delegation_id = $4 RETURNING *`,
    [errorMessage ? 'failed' : 'completed', JSON.stringify(executionResult), errorMessage || null, delegationId]
  );
  return result.rows.length ? mapDelegationRow(result.rows[0]) : ({} as any);
}

// ── Get delegation history ──────────────────────────────────────────────────

export async function getDelegationHistory(
  tenantId: string,
  filters?: {
    sourceAgentId?: string;
    targetAgentId?: string;
    status?: string;
    limit?: number;
  }
): Promise<AgentDelegationResult[]> {
  const schema = tenantSchema(tenantId);
  const conditions = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (filters?.sourceAgentId) {
    conditions.push(`source_agent_id = $${idx++}`);
    params.push(filters.sourceAgentId);
  }
  if (filters?.targetAgentId) {
    conditions.push(`target_agent_id = $${idx++}`);
    params.push(filters.targetAgentId);
  }
  if (filters?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }

  const limit = filters?.limit || 50;
  const result = await safeQuery(
    `SELECT * FROM "${schema}".agent_delegations
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT ${Math.min(500, Math.max(1, parseInt(String(limit)) || 50))}`,
    params
  );

  return result.rows.map(row => mapDelegationRow(row));
}

// ── Get pending delegations for an agent ────────────────────────────────────

export async function getPendingDelegations(
  tenantId: string,
  targetAgentId: string
): Promise<AgentDelegationRequest[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".agent_delegations
     WHERE tenant_id = $1 AND target_agent_id = $2 AND status = 'pending'
     ORDER BY 
       CASE priority
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         WHEN 'low' THEN 4
       END,
       created_at ASC`,
    [tenantId, targetAgentId]
  );

  return result.rows.map(row => ({
    delegationId: row.delegation_id,
    tenantId: row.tenant_id,
    sourceAgentId: row.source_agent_id,
    targetAgentId: row.target_agent_id,
    taskType: row.task_type,
    taskDescription: row.task_description,
    context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context,
    priority: row.priority,
    expectedOutcome: row.expected_outcome,
    deadline: row.deadline,
    requiresApproval: row.requires_approval,
    createdAt: row.created_at,
  }));
}

// ── Table setup ─────────────────────────────────────────────────────────────

async function ensureDelegationTables(schema: string): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".agent_delegations (
      delegation_id UUID PRIMARY KEY,
      tenant_id VARCHAR(64) NOT NULL,
      source_agent_id VARCHAR(10) NOT NULL,
      target_agent_id VARCHAR(10) NOT NULL,
      task_type VARCHAR(100) NOT NULL,
      task_description TEXT NOT NULL,
      context JSONB DEFAULT '{}',
      priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
      expected_outcome TEXT,
      deadline TIMESTAMPTZ,
      requires_approval BOOLEAN DEFAULT FALSE,
      confidence DECIMAL(3,2),
      governance_check JSONB,
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'failed', 'timed_out', 'cancelled')),
      acceptance_reason TEXT,
      rejection_reason TEXT,
      execution_result JSONB,
      error_message TEXT,
      accepted_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      session_id VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_agent_delegations_target_status
      ON "${schema}".agent_delegations (target_agent_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_delegations_source
      ON "${schema}".agent_delegations (source_agent_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_delegations_tenant_status
      ON "${schema}".agent_delegations (tenant_id, status, created_at DESC);
  `);
}

// ── Row mapper ──────────────────────────────────────────────────────────────

function mapDelegationRow(
  row: any,
  overrideStatus?: AgentDelegationResult['status'],
  completedAt?: string
): AgentDelegationResult {
  return {
    delegationId: row.delegation_id,
    tenantId: row.tenant_id,
    sourceAgentId: row.source_agent_id,
    targetAgentId: row.target_agent_id,
    status: overrideStatus || row.status,
    acceptanceReason: row.acceptance_reason,
    rejectionReason: row.rejection_reason,
    executionResult: row.execution_result
      ? (typeof row.execution_result === 'string'
          ? JSON.parse(row.execution_result)
          : row.execution_result)
      : undefined,
    errorMessage: row.error_message,
    confidence: row.confidence ? parseFloat(row.confidence) : undefined,
    governanceCheck: row.governance_check
      ? (typeof row.governance_check === 'string'
          ? JSON.parse(row.governance_check)
          : row.governance_check)
      : undefined,
    acceptedAt: row.accepted_at,
    completedAt: completedAt || row.completed_at,
    createdAt: row.created_at,
  };
}
