import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Process Orchestration — Notification & Audit Logging
// RACI "informed" notifications and routing decision
// audit log entries.
// ============================================

import { safeQuery, tenantSchema } from '@dos/db';
import { runNotify } from '../contracts/task-hooks.contract';
type ScopeType = 'tenant' | 'organization' | 'department' | 'team' | 'position' | 'process' | 'policy' | 'workflow';

import type { ProcessTask, ProcessTaskInput } from './types';
import type { RoutingResolution } from './types';
import { tableExists } from './schema-introspection';
import { getEntityModule } from './entity-descriptor-wrappers';

// ── Notify RACI Informed ─────────────────────────────────────────────────────

export async function notifyRACIInformed(
  tenantId: string,
  scopeType: ScopeType,
  scopeId: string,
  task: ProcessTask,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT DISTINCT tm.user_id
     FROM "${schema}".team_raci_assignments tra
     JOIN "${schema}".team_members tm ON tm.team_id = tra.team_id
     WHERE tra.scope_type = $1 AND tra.scope_id = $2 AND tra.raci_role = 'informed'`,
    [scopeType, scopeId],
  );
  for (const row of res.rows) {
    if (row.user_id !== task.assignedUserId) {
      await runNotify(tenantId, {
        userId: row.user_id,
        type: 'raci_informed',
        title: `FYI: ${task.title}`,
        body: `A ${task.taskType} task has been assigned (${task.priority} priority)`,
        link: '/task-board',
      }).catch(catchHandler(EC.EVENT_BUS, {}));
    }
  }
}

// ── Routing Decision Audit Log ───────────────────────────────────────────────

export async function logRoutingDecision(
  tenantId: string,
  taskId: string,
  resolution: RoutingResolution,
  input: ProcessTaskInput,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    if (!await tableExists(schema, 'authz_decision_log')) return;
    await safeQuery(
      `INSERT INTO "${schema}".authz_decision_log
       (user_id, permission_code, module_code, decision, reason,
        matched_role, matched_scope_type, matched_scope_id, authority_level, record_context)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        resolution.assignedUserId ?? 'unassigned',
        'orchestration.task.assign',
        getEntityModule(input.entityType ?? '') ?? 'orchestration',
        resolution.assignedUserId ? 'allow' : 'deny',
        resolution.tier,
        resolution.metadata?.functionalRoleCode ?? null,
        resolution.scopeType ?? null,
        resolution.scopeId && /^\d+$/.test(resolution.scopeId) ? Number(resolution.scopeId) : null,
        resolution.metadata?.authorityLevel ?? null,
        JSON.stringify({ taskId, taskType: input.taskType, entityType: input.entityType, entityId: input.entityId, priority: input.priority, routingMetadata: resolution.metadata }),
      ],
    );
  } catch {
    // non-critical
  }
}
