// ============================================================================
// Shahin-Ai — Agent Governance Service (F53-F55: Tool Permissions + HITL Gates)
//
// Agent governance enforcement:
//   - Tool permission checking and management
//   - Human-in-the-loop (HITL) approval gates
//   - Gate lifecycle (create, resolve, expire)
//   - Combined audit trail for agent actions
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { v4 as uuid } from 'uuid';

// ── Types ──────────────────────────────────────────────────────────────────

export type PermissionAction = 'execute' | 'read' | 'write' | 'delete' | 'admin';
export type PermissionLevel = 'allow' | 'deny' | 'approval_required';
export type GateStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type GateDecision = 'approved' | 'rejected';

export interface ToolPermission {
  permissionId: string;
  agentId: string;
  toolName: string;
  action: PermissionAction;
  level: PermissionLevel;
  conditions?: Record<string, unknown>;
  grantedBy?: string;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ToolPermissionCheck {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
}

export interface HITLGate {
  gateId: string;
  agentId: string;
  toolName: string;
  action: string;
  context: Record<string, unknown>;
  status: GateStatus;
  requestedAt: string;
  expiresAt: string;
  decidedBy?: string;
  decidedAt?: string;
  decision?: GateDecision;
  reason?: string;
  createdAt: string;
}

export interface HITLGateInput {
  agentId: string;
  toolName: string;
  action: string;
  context?: Record<string, unknown>;
  expiresInMinutes?: number;
}

export interface AgentAuditEntry {
  entryId: string;
  agentId: string;
  entryType: 'permission_check' | 'hitl_gate' | 'tool_execution' | 'reasoning';
  action: string;
  result: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

// ── Internal Helpers ──────────────────────────────────────────────────────

function rowToPermission( r: Record<string, unknown>): ToolPermission {
  return {
    permissionId: r.permission_id as string,
    agentId: r.agent_id as string,
    toolName: r.tool_name as string,
    action: r.action as ToolPermission['action'],
    level: r.level as ToolPermission['level'],
    conditions: typeof r.conditions === 'string' ? JSON.parse(r.conditions) : r.conditions as Record<string, unknown> | undefined,
    grantedBy: r.granted_by as string | undefined,
    expiresAt: r.expires_at as string | undefined,
    active: (r.active ?? true) as boolean,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function rowToGate( r: Record<string, unknown>): HITLGate {
  return {
    gateId: r.gate_id as string,
    agentId: r.agent_id as string,
    toolName: r.tool_name as string,
    action: r.action as string,
    context: typeof r.context === 'string' ? JSON.parse(r.context) : ((r.context || {}) as Record<string, unknown>),
    status: r.status as HITLGate['status'],
    requestedAt: (r.requested_at || r.created_at) as string,
    expiresAt: r.expires_at as string,
    decidedBy: r.decided_by as string | undefined,
    decidedAt: r.decided_at as string | undefined,
    decision: r.decision as HITLGate['decision'] | undefined,
    reason: r.reason as string | undefined,
    createdAt: r.created_at as string,
  };
}

function rowToAuditEntry( r: Record<string, unknown>): AgentAuditEntry {
  return {
    entryId: (r.entry_id || r.gate_id || r.permission_id || uuid()) as string,
    agentId: r.agent_id as string,
    entryType: r.entry_type as AgentAuditEntry['entryType'],
    action: r.action as string,
    result: (r.result || r.status || r.level) as string,
    details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details as Record<string, unknown> | undefined,
    createdAt: r.created_at as string,
  };
}

/** Log an audit entry for agent governance actions */
async function logAuditEntry(
  schema: string,
  entry: {
    agentId: string;
    entryType: string;
    action: string;
    result: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO "${schema}".agent_governance_audit
       (entry_id, agent_id, entry_type, action, result, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuid(), entry.agentId, entry.entryType, entry.action,
        entry.result, entry.details ? JSON.stringify(entry.details) : null,
      ]
    );
  } catch {
    // Audit table may not exist yet -- non-fatal
  }
}

// ── Exported Functions ────────────────────────────────────────────────────

/**
 * Check if an agent has permission to perform a specific action with a tool.
 * Evaluates against the agent_tool_permissions table.
 */
export async function checkToolPermission(
  tenantId: string,
  agentId: string,
  toolName: string,
  action: PermissionAction
): Promise<ToolPermissionCheck> {
  const schema = tenantSchema(tenantId);

  // Look for a specific permission matching agent + tool + action
  const specificRes = await safeQuery(
    `SELECT * FROM "${schema}".agent_tool_permissions
     WHERE agent_id = $1 AND tool_name = $2 AND action = $3
       AND active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC LIMIT 1`,
    [agentId, toolName, action]
  );

  if (specificRes.rows.length > 0) {
    const perm = specificRes.rows[0];
    const level: PermissionLevel = perm.level;

    // Check conditions if present
    if (perm.conditions) {
      const conditions = typeof perm.conditions === 'string'
        ? JSON.parse(perm.conditions) : perm.conditions;

      // Time-based conditions
      if (conditions.allowedHours) {
        const currentHour = new Date().getUTCHours();
        const { start, end } = conditions.allowedHours;
        if (currentHour < start || currentHour > end) {
          await logAuditEntry(schema, {
            agentId, entryType: 'permission_check',
            action: `${toolName}:${action}`, result: 'denied_time_restriction',
            details: { toolName, action, currentHour, allowedHours: conditions.allowedHours },
          });
          return {
            allowed: false,
            requiresApproval: false,
            reason: `Tool access restricted outside hours ${start}:00-${end}:00 UTC`,
          };
        }
      }
    }

    await logAuditEntry(schema, {
      agentId, entryType: 'permission_check',
      action: `${toolName}:${action}`, result: level,
      details: { toolName, action, permissionId: perm.permission_id },
    });

    switch (level) {
      case 'allow':
        return { allowed: true, requiresApproval: false, reason: 'Permission granted' };
      case 'deny':
        return { allowed: false, requiresApproval: false, reason: `Tool "${toolName}" action "${action}" is denied for agent ${agentId}` };
      case 'approval_required':
        return { allowed: false, requiresApproval: true, reason: `Tool "${toolName}" action "${action}" requires human approval` };
    }
  }

  // Check for wildcard permissions (tool_name = '*' or action = '*')
  const wildcardRes = await safeQuery(
    `SELECT * FROM "${schema}".agent_tool_permissions
     WHERE agent_id = $1 AND active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (tool_name = '*' OR (tool_name = $2 AND action = '*'))
     ORDER BY
       CASE WHEN tool_name = $2 THEN 0 ELSE 1 END,
       created_at DESC
     LIMIT 1`,
    [agentId, toolName]
  );

  if (wildcardRes.rows.length > 0) {
    const perm = wildcardRes.rows[0];
    const level: PermissionLevel = perm.level;

    await logAuditEntry(schema, {
      agentId, entryType: 'permission_check',
      action: `${toolName}:${action}`, result: `${level} (wildcard)`,
      details: { toolName, action, wildcardPermissionId: perm.permission_id },
    });

    switch (level) {
      case 'allow':
        return { allowed: true, requiresApproval: false, reason: 'Permission granted via wildcard rule' };
      case 'deny':
        return { allowed: false, requiresApproval: false, reason: 'Denied by wildcard rule' };
      case 'approval_required':
        return { allowed: false, requiresApproval: true, reason: 'Approval required by wildcard rule' };
    }
  }

  // Default deny -- no matching permission found
  await logAuditEntry(schema, {
    agentId, entryType: 'permission_check',
    action: `${toolName}:${action}`, result: 'denied_no_permission',
    details: { toolName, action },
  });

  return {
    allowed: false,
    requiresApproval: false,
    reason: `No permission found for agent "${agentId}" to "${action}" tool "${toolName}"`,
  };
}

/**
 * Get all permissions for a specific agent.
 */
export async function getAgentPermissions(
  tenantId: string,
  agentId: string
): Promise<ToolPermission[]> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `SELECT * FROM "${schema}".agent_tool_permissions
     WHERE agent_id = $1
     ORDER BY tool_name, action`,
    [agentId]
  );

  return (res.rows || []).map(rowToPermission);
}

/**
 * Update an existing tool permission.
 */
export async function updateToolPermission(
  tenantId: string,
  permissionId: string,
  updates: Partial<{
    level: PermissionLevel;
    conditions: Record<string, unknown>;
    active: boolean;
    expiresAt: string;
  }>
): Promise<ToolPermission | null> {
  const schema = tenantSchema(tenantId);
  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (updates.level !== undefined) {
    fields.push(`level = $${idx++}`);
    params.push(updates.level);
  }
  if (updates.conditions !== undefined) {
    fields.push(`conditions = $${idx++}`);
    params.push(JSON.stringify(updates.conditions));
  }
  if (updates.active !== undefined) {
    fields.push(`active = $${idx++}`);
    params.push(updates.active);
  }
  if (updates.expiresAt !== undefined) {
    fields.push(`expires_at = $${idx++}`);
    params.push(updates.expiresAt);
  }

  if (fields.length === 0) {
    const res = await safeQuery(
      `SELECT * FROM "${schema}".agent_tool_permissions WHERE permission_id = $1`,
      [permissionId]
    );
    return res.rows.length > 0 ? rowToPermission(res.rows[0]) : null;
  }

  fields.push('updated_at = NOW()');
  params.push(permissionId);

  await safeQuery(
    `UPDATE "${schema}".agent_tool_permissions
     SET ${fields.join(', ')}
     WHERE permission_id = $${idx}`,
    params
  );

  const res = await safeQuery(
    `SELECT * FROM "${schema}".agent_tool_permissions WHERE permission_id = $1`,
    [permissionId]
  );

  if (res.rows.length === 0) return null;

  const perm = rowToPermission(res.rows[0]);

  eventBus.publish({
    event_type: 'constitution.updated',
    tenant_id: tenantId,
    payload: {
      type: 'agent_permission_updated',
      permissionId,
      agentId: perm.agentId,
      toolName: perm.toolName,
    },
  });

  return perm;
}

/**
 * Create a new human-in-the-loop approval gate.
 * Returns the gate ID which can be polled or resolved via resolveHITLGate.
 */
export async function createHITLGate(
  tenantId: string,
  input: HITLGateInput
): Promise<HITLGate> {
  const schema = tenantSchema(tenantId);
  const gateId = uuid();
  const expiresInMinutes = input.expiresInMinutes || 60;
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

  await safeQuery(
    `INSERT INTO "${schema}".hitl_gates
     (gate_id, agent_id, tool_name, action, context, status, requested_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), $6)`,
    [
      gateId, input.agentId, input.toolName, input.action,
      JSON.stringify(input.context || {}), expiresAt,
    ]
  );

  await logAuditEntry(schema, {
    agentId: input.agentId, entryType: 'hitl_gate',
    action: `gate_created:${input.toolName}:${input.action}`,
    result: 'pending',
    details: { gateId, toolName: input.toolName, action: input.action, expiresAt },
  });

  eventBus.publish({
    event_type: 'gate.blocked',
    tenant_id: tenantId,
    payload: {
      type: 'hitl_gate_created',
      gateId,
      agentId: input.agentId,
      toolName: input.toolName,
      action: input.action,
      expiresAt,
    },
  });

  return {
    gateId,
    agentId: input.agentId,
    toolName: input.toolName,
    action: input.action,
    context: input.context || {},
    status: 'pending',
    requestedAt: new Date().toISOString(),
    expiresAt,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Resolve a HITL gate by approving or rejecting it.
 */
export async function resolveHITLGate(
  tenantId: string,
  gateId: string,
  decision: GateDecision,
  decidedBy: string,
  reason?: string
): Promise<HITLGate | null> {
  const schema = tenantSchema(tenantId);

  // Fetch the gate
  const gateRes = await safeQuery(
    `SELECT * FROM "${schema}".hitl_gates WHERE gate_id = $1`,
    [gateId]
  );
  if (!gateRes.rows.length) return null;
  const gate = gateRes.rows[0];

  // Check expiry
  if (new Date(gate.expires_at) < new Date()) {
    throw new Error(`Gate ${gateId} has expired and cannot be resolved.`);
  }

  // Update status
  await safeQuery(
    `UPDATE "${schema}".hitl_gates
     SET status = $1, decision = $1, decided_by = $2, reason = $3, updated_at = NOW()
     WHERE gate_id = $4`,
    [decision, decidedBy, reason || null, gateId]
  );

  await logAuditEntry(schema, {
    agentId: gate.agent_id, entryType: 'hitl_gate',
    action: `gate_resolved:${gate.tool_name}:${gate.action}`,
    result: decision,
    details: { gateId, decision, decidedBy, reason },
  });

  // Fetch updated
  const updatedRes = await safeQuery(
    `SELECT * FROM "${schema}".hitl_gates WHERE gate_id = $1`,
    [gateId]
  );
  const updatedGate = updatedRes.rows[0] || gate;

  eventBus.publish({
    event_type: `gate.${decision === 'approved' ? 'allowed' : 'blocked'}`,
    tenant_id: tenantId,
    payload: {
      type: `hitl_gate_${decision}`,
      gateId,
      agentId: gate.agent_id,
      decision,
      decidedBy,
    },
  });

  return rowToGate(updatedGate);
}

/**
 * Get all active (pending) gates, optionally filtered by agent.
 */
export async function getActiveGates(
  tenantId: string,
  agentId?: string
): Promise<HITLGate[]> {
  const schema = tenantSchema(tenantId);

  let query = `SELECT * FROM "${schema}".hitl_gates WHERE status = 'pending'`;
  const params: unknown[] = [];

  if (agentId) {
    query += ` AND agent_id = $1`;
    params.push(agentId);
  }

  query += ` ORDER BY requested_at ASC`;

  const res = await safeQuery(query, params);
  return (res.rows || []).map(rowToGate);
}

/**
 * Auto-expire HITL gates that are past their expiry time.
 * Returns the number of gates expired.
 */
export async function expireOverdueGates(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `UPDATE "${schema}".hitl_gates
     SET status = 'expired', updated_at = NOW()
     WHERE status = 'pending' AND expires_at < NOW()
     RETURNING gate_id, agent_id, tool_name, action`,
    []
  );

  const expiredGates = res.rows || [];

  // Log audit entries for each expired gate
  for (const gate of expiredGates) {
    await logAuditEntry(schema, {
      agentId: gate.agent_id, entryType: 'hitl_gate',
      action: `gate_expired:${gate.tool_name}:${gate.action}`,
      result: 'expired',
      details: { gateId: gate.gate_id },
    });

    eventBus.publish({
      event_type: 'gate.blocked',
      tenant_id: tenantId,
      payload: {
        type: 'hitl_gate_expired',
        gateId: gate.gate_id,
        agentId: gate.agent_id,
      },
    });
  }

  return expiredGates.length;
}

/**
 * Get the combined audit trail for an agent including permission checks,
 * HITL gate decisions, and reasoning chain entries.
 */
export async function getAgentAuditTrail(
  tenantId: string,
  agentId: string,
  limit: number = 100
): Promise<AgentAuditEntry[]> {
  const schema = tenantSchema(tenantId);
  const entries: AgentAuditEntry[] = [];

  // Fetch from governance audit log
  try {
    const auditRes = await safeQuery(
      `SELECT entry_id, agent_id, entry_type, action, result, details, created_at
       FROM "${schema}".agent_governance_audit
       WHERE agent_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [agentId, limit]
    );
    for (const row of auditRes.rows || []) {
      entries.push(rowToAuditEntry(row));
    }
  } catch {
    // Table may not exist -- fall back to HITL gates
  }

  // Also include HITL gate history
  try {
    const gateRes = await safeQuery(
      `SELECT gate_id, agent_id, tool_name, action, status, decision,
              decided_by, reason, requested_at AS created_at, context AS details
       FROM "${schema}".hitl_gates
       WHERE agent_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [agentId, limit]
    );
    for (const row of gateRes.rows || []) {
      entries.push({
        entryId: row.gate_id,
        agentId: row.agent_id,
        entryType: 'hitl_gate',
        action: `${row.tool_name}:${row.action}`,
        result: row.decision || row.status,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
        createdAt: row.created_at,
      });
    }
  } catch {
    // hitl_gates table may not exist
  }

  // Include reasoning chain entries if available
  try {
    const reasoningRes = await safeQuery(
      `SELECT chain_id AS entry_id, agent_id, 'reasoning' AS entry_type,
              step_name AS action, outcome AS result, context AS details, created_at
       FROM "${schema}".reasoning_chains
       WHERE agent_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [agentId, limit]
    );
    for (const row of reasoningRes.rows || []) {
      entries.push(rowToAuditEntry(row));
    }
  } catch {
    // Table may not exist
  }

  // Sort combined entries by date descending and limit
  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return entries.slice(0, limit);
}
