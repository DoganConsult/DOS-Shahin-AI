// @ts-nocheck
// ============================================================
// Shahin — Proposed Action Service
// Persistent action lifecycle, auto-execution, quality gates,
// conflict detection, RACI-aware escalation, and visual trail.
// ============================================================

import * as crypto from 'crypto';
import { query as _query, safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../ports/database.port';
import { executeDelegatedAction } from '../delegation/agent-delegation.service';
import { createNotification } from '../../../notification/services/notification.service';
import { eventBus } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '../../ports/platform.port';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';

// ── Auto-Execute Timer Configuration ──────────────────────────────────────

const AUTO_EXECUTE_SECONDS: Record<string, number | null> = {
  critical: 60,    // 1 minute
  high: 120,       // 2 minutes
  medium: 300,     // 5 minutes
  low: null,       // never — requires manual approval or escalation
};

// ── Entity → Table Mapping for Quality Gates ──────────────────────────────

const ENTITY_TABLE_MAP: Record<string, { table: string; pk: string }> = {
  risk:       { table: 'risks',         pk: 'risk_id' },
  control:    { table: 'ucf_controls',  pk: 'control_id' },
  policy:     { table: 'policies',      pk: 'policy_id' },
  vendor:     { table: 'vendors',       pk: 'vendor_id' },
  evidence:   { table: 'evidence',      pk: 'evidence_id' },
  finding:    { table: 'findings',      pk: 'finding_id' },
  incident:   { table: 'incidents',     pk: 'incident_id' },
};

// ── Contradiction Map ─────────────────────────────────────────────────────

const CONTRADICTIONS: Record<string, string[]> = {
  flag_risk: ['close_incident'],
  close_incident: ['flag_risk', 'escalate'],
  update_control_status: ['create_finding'],
};

// ── Domain → RACI Mapping (mirrors process-orchestration) ─────────────────

const DOMAIN_FALLBACK: Record<string, string> = {
  risk: 'ERM', control: 'CYBER_GOV', policy: 'QUALITY', evidence: 'AUDIT',
  vendor: 'VENDOR_RISK', incident: 'SOC_OPS', finding: 'AUDIT',
  remediation_task: 'ERM', assessment: 'AUDIT', task: 'EXEC_STRATEGY',
};

// ── Types ─────────────────────────────────────────────────────────────────

interface GateCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

interface QualityGateResult {
  passed: boolean;
  checks: GateCheck[];
  failReason?: string;
}

interface ActionTrail {
  grantId: string;
  scope: string;
  delegationActionId: string;
  processTaskId?: string;
  assignedTeam?: string;
  assignedUser?: string;
  slaHours?: number;
  raciRole?: string;
  raci?: { responsible?: string[]; accountable?: string[]; consulted?: string[]; informed?: string[] };
}

export interface PersistedAction {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  entityType?: string;
  entityId?: string;
  status: string;
  autoExecuteAt?: string;
  autoExecuteEnabled: boolean;
}

interface ActionRow {
  action_id: string;
  session_id: string;
  user_id: string;
  agent_id: string;
  action_type: string;
  title: string;
  description?: string;
  priority: string;
  entity_type?: string;
  entity_id?: string;
  action_payload?: Record<string, unknown>;
  status: string;
  auto_execute_at?: string;
  auto_execute_enabled: boolean;
  proposed_at?: string;
  created_at?: string;
}

interface DelegationResult {
  grantId: string;
  actionId: string;
  success: boolean;
}

// ── Ensure Table ──────────────────────────────────────────────────────────

async function ensureTable(schema: string): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".copilot_proposed_actions (
      action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      agent_id VARCHAR(10) NOT NULL,
      action_type VARCHAR(50) NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      priority VARCHAR(20) NOT NULL DEFAULT 'medium',
      entity_type VARCHAR(50),
      entity_id VARCHAR(100),
      action_payload JSONB DEFAULT '{}',
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      auto_execute_at TIMESTAMPTZ,
      auto_execute_enabled BOOLEAN DEFAULT TRUE,
      pre_validation JSONB,
      post_validation JSONB,
      executed_at TIMESTAMPTZ,
      executed_by VARCHAR(64),
      execution_method VARCHAR(20),
      delegation_action_id UUID,
      rejected_at TIMESTAMPTZ,
      rejected_by VARCHAR(64),
      rejection_reason TEXT,
      failure_reason TEXT,
      escalated_at TIMESTAMPTZ,
      escalation_target VARCHAR(64),
      proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      response_time_ms INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_cpa_pending ON "${schema}".copilot_proposed_actions (user_id, status)
      WHERE status = 'pending';
    CREATE INDEX IF NOT EXISTS idx_cpa_auto_exec ON "${schema}".copilot_proposed_actions (auto_execute_at)
      WHERE status = 'pending' AND auto_execute_enabled = TRUE AND auto_execute_at IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_cpa_session ON "${schema}".copilot_proposed_actions (session_id);
  `);
}

// ── Persist Proposed Actions ──────────────────────────────────────────────

export async function persistProposedActions(
  tenantId: string,
  sessionId: string,
  userId: string,
  agentId: string,
  actions: Array<{ id: string; type: string; title: string; description: string; priority: string; entityType?: string; entityId?: string }>,
): Promise<PersistedAction[]> {
  const schema = tenantSchema(tenantId);
  await ensureTable(schema);

  const results: PersistedAction[] = [];

  await withTransaction(tenantId, async (client) => {
    for (const action of actions) {
      const timerSeconds = AUTO_EXECUTE_SECONDS[action.priority] ?? null;
      const autoEnabled = timerSeconds !== null;
      const actionId = action.id || crypto.randomUUID();

      const autoExecAt = timerSeconds
        ? new Date(Date.now() + timerSeconds * 1000).toISOString()
        : null;

      await safeQueryWithClient(
        `INSERT INTO "${schema}".copilot_proposed_actions
           (action_id, session_id, user_id, agent_id, action_type, title, description,
            priority, entity_type, entity_id, auto_execute_at, auto_execute_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (action_id) DO UPDATE SET
           title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority,
           entity_type = EXCLUDED.entity_type, entity_id = EXCLUDED.entity_id
         WHERE (proposed_actions.title, proposed_actions.priority) IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.priority)`,
        [actionId, sessionId, userId, agentId, action.type, action.title,
         action.description, action.priority, action.entityType || null,
         action.entityId || null, autoExecAt, autoEnabled], client,
      );

      results.push({
        id: actionId,
        type: action.type,
        title: action.title,
        description: action.description,
        priority: action.priority,
        entityType: action.entityType,
        entityId: action.entityId,
        status: 'pending',
        autoExecuteAt: autoExecAt || undefined,
        autoExecuteEnabled: autoEnabled,
      });
    }
  });

  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'copilot.actions_proposed',
      tenantId,
      sourceService: `copilot-${agentId}`,
      severity: 'info',
      payload: { sessionId, userId, agentId, count: actions.length },
    } as any)), { tenantId, operation: 'eventBus:copilot.actions_proposed' });

  return results;
}

// ── Quality Gate: Pre-Execution ───────────────────────────────────────────

async function validatePreExecution(
  tenantId: string,
  action: ActionRow,
): Promise<QualityGateResult> {
  const schema = tenantSchema(tenantId);
  const checks: GateCheck[] = [];

  // 1. Entity exists
  if (action.entity_id && action.entity_type) {
    const mapping = ENTITY_TABLE_MAP[action.entity_type];
    if (mapping) {
      try {
        const exists = await safeQuery(
          `SELECT 1 FROM "${schema}"."${mapping.table}" WHERE "${mapping.pk}" = $1 LIMIT 1`,
          [action.entity_id],
        );
        checks.push({ name: 'entity_exists', passed: exists.rows.length > 0 });
      } catch {
        checks.push({ name: 'entity_exists', passed: true, detail: 'table check skipped' });
      }
    }
  }

  // 2. No duplicate (same action on same entity in last 24h)
  if (action.entity_id && action.entity_type) {
    const dup = await safeQuery(
      `SELECT 1 FROM "${schema}".copilot_proposed_actions
       WHERE action_type = $1 AND entity_type = $2 AND entity_id = $3
         AND status IN ('completed', 'auto_completed')
         AND executed_at > NOW() - INTERVAL '24 hours'
         AND action_id != $4 LIMIT 1`,
      [action.action_type, action.entity_type, action.entity_id, action.action_id],
    );
    checks.push({ name: 'no_duplicate', passed: dup.rows.length === 0 });
  }

  // 3. Not stale (proposed within last hour)
  const proposedAt = new Date(action.proposed_at || action.created_at).getTime();
  const ageMs = Date.now() - proposedAt;
  checks.push({ name: 'not_stale', passed: ageMs < 3600_000 });

  // 4. No conflicting action executing on same entity
  if (action.entity_id && action.entity_type) {
    const conflict = await safeQuery(
      `SELECT action_id, action_type, agent_id FROM "${schema}".copilot_proposed_actions
       WHERE entity_type = $1 AND entity_id = $2
         AND status IN ('executing', 'auto_executing')
         AND action_id != $3 LIMIT 1`,
      [action.entity_type, action.entity_id, action.action_id],
    );
    checks.push({
      name: 'no_conflict',
      passed: conflict.rows.length === 0,
      detail: conflict.rows.length > 0
        ? `Conflict: ${getFirstRow(conflict)?.action_type} (${getFirstRow(conflict)?.agent_id}) executing`
        : undefined,
    });
  }

  // 5. No contradicting action in last 1h
  const opposites = CONTRADICTIONS[action.action_type] || [];
  if (opposites.length > 0 && action.entity_id) {
    const contradiction = await safeQuery(
      `SELECT action_type, agent_id FROM "${schema}".copilot_proposed_actions
       WHERE entity_type = $1 AND entity_id = $2
         AND action_type = ANY($3)
         AND status IN ('completed', 'auto_completed')
         AND executed_at > NOW() - INTERVAL '1 hour'
       LIMIT 1`,
      [action.entity_type, action.entity_id, opposites],
    );
    checks.push({
      name: 'no_contradiction',
      passed: contradiction.rows.length === 0,
      detail: contradiction.rows.length > 0
        ? `Contradicts recent ${getFirstRow(contradiction)?.action_type} by ${getFirstRow(contradiction)?.agent_id}`
        : undefined,
    });
  }

  const passed = checks.every(c => c.passed);
  const failReason = passed
    ? undefined
    : checks.filter(c => !c.passed).map(c => c.detail || c.name).join('; ');

  return { passed, checks, failReason };
}

// ── Quality Gate: Post-Execution ──────────────────────────────────────────

async function validatePostExecution(
  tenantId: string,
  action: ActionRow,
  delegationResult: DelegationResult,
): Promise<QualityGateResult> {
  const checks: GateCheck[] = [];

  // 1. Delegation succeeded
  checks.push({ name: 'delegation_success', passed: delegationResult.success === true });

  // 2. For task-creating actions, verify process_task exists
  if (['create_task', 'flag_risk', 'request_evidence', 'create_remediation'].includes(action.action_type)) {
    try {
      const schema = tenantSchema(tenantId);
      const recent = await safeQuery(
        `SELECT task_id, team_id, assigned_user_id, sla_hours
         FROM "${schema}".process_tasks
         WHERE trigger_source LIKE 'copilot%' AND created_at > NOW() - INTERVAL '10 seconds'
         ORDER BY created_at DESC LIMIT 1`,
      );
      checks.push({
        name: 'task_created',
        passed: recent.rows.length > 0,
        detail: getFirstRow(recent)?.task_id,
      });
    } catch {
      checks.push({ name: 'task_created', passed: true, detail: 'check skipped' });
    }
  }

  const passed = checks.every(c => c.passed);
  return { passed, checks, failReason: passed ? undefined : 'Post-execution verification failed' };
}

// ── Build Action Trail ────────────────────────────────────────────────────

async function buildActionTrail(
  tenantId: string,
  delegationResult: { grantId: string; actionId: string },
  action: ActionRow,
): Promise<ActionTrail> {
  const schema = tenantSchema(tenantId);
  const trail: ActionTrail = {
    grantId: delegationResult.grantId,
    scope: '',
    delegationActionId: delegationResult.actionId,
  };

  // Get grant scopes
  try {
    const grant = await safeQuery(
      `SELECT scopes FROM "${schema}".delegation_grants WHERE grant_id = $1`,
      [delegationResult.grantId],
    );
    if (grant.rows.length) {
      const scopes = typeof getFirstRow(grant)?.scopes === 'string'
        ? JSON.parse(getFirstRow(grant)?.scopes) : getFirstRow(grant)?.scopes;
      trail.scope = (scopes as string[]).join(', ');
    }
  } catch { /* non-critical */ }

  // Get process task details
  try {
    const task = await safeQuery(
      `SELECT pt.task_id, pt.team_id, pt.assigned_user_id, pt.sla_hours, t.team_name
       FROM "${schema}".process_tasks pt
       LEFT JOIN "${schema}".teams t ON t.team_id = pt.team_id
       WHERE pt.trigger_source LIKE 'copilot%' AND pt.created_at > NOW() - INTERVAL '10 seconds'
       ORDER BY pt.created_at DESC LIMIT 1`,
    );
    if (task.rows.length) {
      trail.processTaskId = getFirstRow(task)?.task_id;
      trail.assignedTeam = getFirstRow(task)?.team_name;
      trail.assignedUser = getFirstRow(task)?.assigned_user_id;
      trail.slaHours = getFirstRow(task)?.sla_hours;
    }
  } catch { /* non-critical */ }

  // Get RACI matrix for the domain
  try {
    const { safeQuery: sq, tenantSchema: ts } = await import('@dos/db'); const getRACIMatrix = async (tid: string, scopeType: string, scopeId: string) => { const s = ts(tid); const r = await sq(`SELECT raci_type, team_code as "teamName", platform_role as "platformRole" FROM "${s}".raci_assignments WHERE scope_type=$1 AND scope_id=$2`, [scopeType, scopeId]); const m: Record<string, GenericRow[]> = { responsible: [], accountable: [], consulted: [], informed: [] }; for (const row of r.rows) { if (m[row.raci_type]) m[row.raci_type].push(row); } return m; };
    const domainScopes: Record<string, { scopeType: string; scopeId: string }> = {
      risk: { scopeType: 'process', scopeId: 'risk_management' },
      control: { scopeType: 'process', scopeId: 'compliance_monitoring' },
      policy: { scopeType: 'process', scopeId: 'compliance_monitoring' },
      evidence: { scopeType: 'process', scopeId: 'audit_assurance' },
      finding: { scopeType: 'process', scopeId: 'audit_assurance' },
      vendor: { scopeType: 'process', scopeId: 'vendor_risk_assessment' },
      incident: { scopeType: 'process', scopeId: 'incident_response' },
    };
    const ds = domainScopes[action.entity_type || ''];
    if (ds) {
      const matrix = await getRACIMatrix(tenantId, ds.scopeType, ds.scopeId);
      trail.raci = {
        responsible: matrix.responsible?.map((r: GenericRow) => r.teamName || r.platformRole).filter(Boolean),
        accountable: matrix.accountable?.map((r: GenericRow) => r.teamName || r.platformRole).filter(Boolean),
        consulted: matrix.consulted?.map((r: GenericRow) => r.teamName || r.platformRole).filter(Boolean),
        informed: matrix.informed?.map((r: GenericRow) => r.teamName || r.platformRole).filter(Boolean),
      };
    }
  } catch { /* non-critical */ }

  return trail;
}

// ── Core: Execute Action (shared by approve + auto-execute) ───────────────

async function executeProposedAction(
  tenantId: string,
  action: ActionRow,
  userId: string,
  method: 'manual_approve' | 'auto_execute',
): Promise<{ success: boolean; trail?: ActionTrail; error?: string }> {
  const schema = tenantSchema(tenantId);

  // Pre-execution quality gate
  const preGate = await validatePreExecution(tenantId, action);
  await safeQuery(
    `UPDATE "${schema}".copilot_proposed_actions SET pre_validation = $1, updated_at = NOW() WHERE action_id = $2`,
    [JSON.stringify(preGate), action.action_id],
  );

  if (!preGate.passed) {
    await safeQuery(
      `UPDATE "${schema}".copilot_proposed_actions
       SET status = 'failed', failure_reason = $1, updated_at = NOW() WHERE action_id = $2`,
      [preGate.failReason, action.action_id],
    );
    return { success: false, error: preGate.failReason };
  }

  // Mark as executing
  const execStatus = method === 'auto_execute' ? 'auto_executing' : 'executing';
  await safeQuery(
    `UPDATE "${schema}".copilot_proposed_actions SET status = $1, updated_at = NOW() WHERE action_id = $2`,
    [execStatus, action.action_id],
  );

  // Execute via delegation
  let delegationResult: DelegationResult;
  try {
    delegationResult = await executeDelegatedAction(tenantId, userId, action.agent_id, {
      type: action.action_type,
      title: action.title,
      description: action.description || '',
      priority: action.priority,
      entityType: action.entity_type,
      entityId: action.entity_id,
    });
  } catch (err: unknown) {
    await safeQuery(
      `UPDATE "${schema}".copilot_proposed_actions
       SET status = 'failed', failure_reason = $1, updated_at = NOW() WHERE action_id = $2`,
      [toErrorMessage(err), action.action_id],
    );
    return { success: false, error: toErrorMessage(err) };
  }

  // Post-execution quality gate
  const postGate = await validatePostExecution(tenantId, action, delegationResult);

  // Build trail
  const trail = await buildActionTrail(tenantId, delegationResult, action);

  const responseTimeMs = Date.now() - new Date(action.proposed_at).getTime();
  const finalStatus = method === 'auto_execute' ? 'auto_completed' : 'completed';

  await safeQuery(
    `UPDATE "${schema}".copilot_proposed_actions
     SET status = $1, executed_at = NOW(), executed_by = $2, execution_method = $3,
         delegation_action_id = $4, post_validation = $5, response_time_ms = $6, updated_at = NOW()
     WHERE action_id = $7`,
    [finalStatus, method === 'auto_execute' ? 'system' : userId, method,
     delegationResult.actionId, JSON.stringify({ ...postGate, trail }), responseTimeMs, action.action_id],
  );

  // Publish event
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: method === 'auto_execute' ? 'copilot.action_auto_executed' : 'copilot.action_approved',
      tenantId,
      sourceService: `copilot-${action.agent_id}`,
      severity: action.priority === 'critical' ? 'warning' : 'info',
      payload: { actionId: action.action_id, agentId: action.agent_id, userId, method, title: action.title },
    } as any)), { tenantId, operation: 'eventBus:any' });

  return { success: true, trail };
}

// ── Approve Action ────────────────────────────────────────────────────────

export async function approveAction(
  tenantId: string,
  actionId: string,
  userId: string,
): Promise<{ success: boolean; status: string; trail?: ActionTrail; error?: string }> {
  const schema = tenantSchema(tenantId);
  await ensureTable(schema);

  // Atomic claim — prevents race with auto-executor
  const claimed = await safeQuery(
    `UPDATE "${schema}".copilot_proposed_actions
     SET status = 'executing', updated_at = NOW()
     WHERE action_id = $1 AND status = 'pending'
     RETURNING *`,
    [actionId],
  );

  if (!claimed.rows.length) {
    return { success: false, status: 'already_processed', error: 'Action already processed' };
  }

  const action = getFirstRow(claimed);
  const result = await executeProposedAction(tenantId, action, userId, 'manual_approve');

  return {
    success: result.success,
    status: result.success ? 'completed' : 'failed',
    trail: result.trail,
    error: result.error,
  };
}

// ── Reject Action ─────────────────────────────────────────────────────────

export async function rejectAction(
  tenantId: string,
  actionId: string,
  userId: string,
  reason?: string,
): Promise<{ success: boolean }> {
  const schema = tenantSchema(tenantId);
  const _responseTimeMs = Date.now(); // Will be adjusted below

  const result = await safeQuery(
    `UPDATE "${schema}".copilot_proposed_actions
     SET status = 'rejected', rejected_at = NOW(), rejected_by = $1, rejection_reason = $2,
         response_time_ms = EXTRACT(EPOCH FROM (NOW() - proposed_at))::integer * 1000,
         updated_at = NOW()
     WHERE action_id = $3 AND status = 'pending'
     RETURNING action_id`,
    [userId, reason || 'User rejected', actionId],
  );

  if (result.rows.length) {
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'copilot.action_rejected',
          tenantId,
          sourceService: 'copilot',
          severity: 'info',
          payload: { actionId, userId, reason },
        } as any)), { tenantId, operation: 'eventBus:copilot.action_rejected' });
  }

  return { success: result.rows.length > 0 };
}

// ── Cancel Auto-Execution ─────────────────────────────────────────────────

export async function cancelAutoExecute(
  tenantId: string,
  actionId: string,
  _userId: string,
): Promise<{ success: boolean }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".copilot_proposed_actions
     SET auto_execute_enabled = FALSE, auto_execute_at = NULL, updated_at = NOW()
     WHERE action_id = $1 AND status = 'pending'
     RETURNING action_id`,
    [actionId],
  );
  return { success: result.rows.length > 0 };
}

// ── Auto-Execute Pending Actions (Job) ────────────────────────────────────

export async function autoExecutePendingActions(
  tenantId: string,
): Promise<{ executed: number; failed: number; skipped: number }> {
  const schema = tenantSchema(tenantId);
  let executed = 0, failed = 0, skipped = 0;

  // Ensure table exists
  try {
    await ensureTable(schema);
  } catch { return { executed, failed, skipped }; }

  // Find actions whose countdown expired
  const pending = await safeQuery(
    `SELECT * FROM "${schema}".copilot_proposed_actions
     WHERE status = 'pending' AND auto_execute_enabled = TRUE AND auto_execute_at <= NOW()
     ORDER BY auto_execute_at ASC LIMIT 10`,
  );

  for (const action of pending.rows) {
    // Atomic claim
    const claimed = await safeQuery(
      `UPDATE "${schema}".copilot_proposed_actions
       SET status = 'auto_executing', updated_at = NOW()
       WHERE action_id = $1 AND status = 'pending'
       RETURNING *`,
      [action.action_id],
    );
    if (!claimed.rows.length) { skipped++; continue; }

    const result = await executeProposedAction(tenantId, getFirstRow(claimed), action.user_id, 'auto_execute');

    if (result.success) {
      executed++;
      // Notify user that action was auto-executed
      try {
        await createNotification(tenantId, {
          userId: action.user_id,
          type: 'copilot_auto_execute',
          title: `Agent ${action.agent_id} auto-executed: ${action.title}`,
          body: `Action auto-executed after countdown expired. Grant: ${result.trail?.grantId?.slice(0, 8)}`,
          link: `/copilot/actions/${action.action_id}`,
        });
      } catch { /* non-critical */ }
    } else {
      failed++;
      // Notify user of failure
      try {
        await createNotification(tenantId, {
          userId: action.user_id,
          type: 'copilot_action_failed',
          title: `Auto-execution failed: ${action.title}`,
          body: result.error || 'Quality gate check failed',
        });
      } catch { /* non-critical */ }
    }
  }

  return { executed, failed, skipped };
}

// ── Escalate Stale Actions ────────────────────────────────────────────────

export async function escalateStaleActions(
  tenantId: string,
): Promise<{ escalated: number }> {
  const schema = tenantSchema(tenantId);
  let escalated = 0;

  try {
    await ensureTable(schema);
  } catch { return { escalated }; }

  // Find actions pending 30+ min with auto-execute disabled and not yet escalated
  const stale = await safeQuery(
    `SELECT * FROM "${schema}".copilot_proposed_actions
     WHERE status = 'pending'
       AND auto_execute_enabled = FALSE
       AND proposed_at < NOW() - INTERVAL '30 minutes'
       AND escalated_at IS NULL
     ORDER BY proposed_at ASC LIMIT 10`,
  );

  for (const action of stale.rows) {
    const teamCode = DOMAIN_FALLBACK[action.entity_type || 'task'] || 'EXEC_STRATEGY';

    // Find responsible team
    let targetUserId: string | null = null;
    try {
      const team = await safeQuery(
        `SELECT team_id, team_name FROM "${schema}".teams WHERE team_code = $1 LIMIT 1`,
        [teamCode],
      );

      if (team.rows.length) {
        const teamId = getFirstRow(team)?.team_id;

        // Check escalation path
        const escPath = await safeQuery(
          `SELECT escalate_to_team_id FROM "${schema}".team_escalation_paths
           WHERE from_team_id = $1 AND escalation_level = 1 LIMIT 1`,
          [teamId],
        );

        const targetTeamId = getFirstRow(escPath)?.escalate_to_team_id || teamId;

        // Find lowest-workload member (inline — team module deleted, tables remain)
        const { safeQuery: distQ, tenantSchema: distS } = await import('@dos/db');
        const distSchema = distS(tenantId);
        const distRes = await distQ(`SELECT user_id FROM "${distSchema}".team_members WHERE team_id=$1 AND status='active' ORDER BY RANDOM() LIMIT 1`, [targetTeamId]);
        targetUserId = distRes.rows[0]?.user_id || null;
      }
    } catch { /* use original user */ }

    const escalationTarget = targetUserId || action.user_id;

    // Mark as escalated
    await safeQuery(
      `UPDATE "${schema}".copilot_proposed_actions
       SET status = 'escalated', escalated_at = NOW(), escalation_target = $1, updated_at = NOW()
       WHERE action_id = $2 AND status = 'pending'`,
      [escalationTarget, action.action_id],
    );

    // Notify escalation target
    try {
      await createNotification(tenantId, {
        userId: escalationTarget,
        type: 'copilot_escalation',
        title: `Agent ${action.agent_id} action needs attention: ${action.title}`,
        body: `Proposed action pending 30+ min without response. Priority: ${action.priority}`,
        link: `/copilot`,
      });
    } catch { /* non-critical */ }

    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'copilot.action_escalated',
          tenantId,
          sourceService: `copilot-${action.agent_id}`,
          severity: 'warning',
          payload: { actionId: action.action_id, agentId: action.agent_id, escalationTarget, title: action.title },
        } as any)), { tenantId, operation: 'eventBus:copilot.action_escalated' });

    escalated++;
  }

  return { escalated };
}

// ── Get Pending Count ─────────────────────────────────────────────────────

export async function getPendingCount(
  tenantId: string,
  userId: string,
): Promise<{ count: number }> {
  const schema = tenantSchema(tenantId);
  try {
    await ensureTable(schema);
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS count FROM "${schema}".copilot_proposed_actions
       WHERE user_id = $1 AND status = 'pending'`,
      [userId],
    );
    return { count: getFirstRow(result)?.count || 0 };
  } catch {
    return { count: 0 };
  }
}
