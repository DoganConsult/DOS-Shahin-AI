import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { createNotification } from '../../../notification/services/notification.service';
import { logger } from '../../ports/logger.port';

export type KillSwitchScope = 'all_autonomous' | 'workflow_specific' | 'step_type' | 'agent_specific' | 'module_specific';

export interface WorkflowKillSwitch {
  switch_id: string;
  tenant_id: string;
  activated_by: string;
  scope: KillSwitchScope;
  scope_filter: Record<string, unknown>;
  reason: string;
  is_active: boolean;
  activated_at: string;
  deactivated_at: string | null;
  deactivated_by: string | null;
}

export async function activateKillSwitch(
  tenantId: string,
  userId: string,
  input: {
    scope: KillSwitchScope;
    scopeFilter?: Record<string, unknown>;
    reason: string;
    notifyUsers?: string[];
  },
): Promise<WorkflowKillSwitch> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_kill_switch
       (tenant_id, activated_by, scope, scope_filter, reason)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [tenantId, userId, input.scope, JSON.stringify(input.scopeFilter || {}), input.reason],
  );
  const row = getFirstRow(result)!;

  await recordAudit({
    tenantId,
    userId,
    module: 'workflow',
    action: 'create',
    entityType: 'workflow_kill_switch',
    entityId: row.switch_id,
    afterState: { scope: input.scope, reason: input.reason },
  });

  if (input.notifyUsers && input.notifyUsers.length > 0) {
    for (const uid of input.notifyUsers) {
      try {
        await createNotification(tenantId, {
          userId: uid,
          type: 'workflow_kill_switch',
          title: 'Workflow Kill Switch Activated',
          body: `Autonomous workflow operations have been halted. Scope: ${input.scope}. Reason: ${input.reason}`,
          link: '/workspace/workflow/admin/kill-switch',
        });
      } catch (err) {
        logger.warn(`[KillSwitch] Failed to notify user ${uid}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  await logIntervention(tenantId, {
    interventionType: 'kill_switch_activated',
    details: { switchId: row.switch_id, scope: input.scope, reason: input.reason },
    notifiedUsers: input.notifyUsers || [],
  });

  return mapRow(row);
}

export async function deactivateKillSwitch(
  tenantId: string,
  switchId: string,
  userId: string,
): Promise<WorkflowKillSwitch | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".workflow_kill_switch
     SET is_active = FALSE, deactivated_at = NOW(), deactivated_by = $1
     WHERE switch_id = $2 AND is_active = TRUE
     RETURNING *`,
    [userId, switchId],
  );
  if (result.rows.length === 0) return null;

  await recordAudit({
    tenantId,
    userId,
    module: 'workflow',
    action: 'update',
    entityType: 'workflow_kill_switch',
    entityId: switchId,
    afterState: { is_active: false },
  });

  return mapRow(getFirstRow(result));
}

export async function getActiveKillSwitches(tenantId: string): Promise<WorkflowKillSwitch[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_kill_switch
     WHERE tenant_id = $1 AND is_active = TRUE
     ORDER BY activated_at DESC`,
    [tenantId],
  );
  return result.rows.map(mapRow);
}

export async function isKillSwitchActive(
  tenantId: string,
  context?: { workflowId?: string; stepType?: string; agentId?: string; moduleCode?: string },
): Promise<{ blocked: boolean; switches: WorkflowKillSwitch[] }> {
  const active = await getActiveKillSwitches(tenantId);
  if (active.length === 0) return { blocked: false, switches: [] };

  const matching = active.filter(sw => {
    if (sw.scope === 'all_autonomous') return true;
    if (sw.scope === 'workflow_specific' && context?.workflowId) {
      return sw.scope_filter.workflowId === context.workflowId;
    }
    if (sw.scope === 'step_type' && context?.stepType) {
      return sw.scope_filter.stepType === context.stepType;
    }
    if (sw.scope === 'agent_specific' && context?.agentId) {
      return sw.scope_filter.agentId === context.agentId;
    }
    if (sw.scope === 'module_specific' && context?.moduleCode) {
      return sw.scope_filter.moduleCode === context.moduleCode;
    }
    return false;
  });

  return { blocked: matching.length > 0, switches: matching };
}

export async function logIntervention(
  tenantId: string,
  input: {
    instanceId?: string;
    stepId?: string;
    interventionType: string;
    agentId?: string;
    details?: Record<string, unknown>;
    notifiedUsers?: string[];
  },
): Promise<string> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_intervention_log
       (instance_id, step_id, intervention_type, agent_id, details, notified_users)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING intervention_id`,
    [
      input.instanceId || null,
      input.stepId || null,
      input.interventionType,
      input.agentId || null,
      JSON.stringify(input.details || {}),
      input.notifiedUsers || [],
    ],
  );
  return getFirstRow(result).intervention_id;
}

export async function getInterventionLog(
  tenantId: string,
  opts?: { instanceId?: string; interventionType?: string; limit?: number },
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const where: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (opts?.instanceId) {
    where.push(`instance_id = $${idx}`); params.push(opts.instanceId); idx++;
  }
  if (opts?.interventionType) {
    where.push(`intervention_type = $${idx}`); params.push(opts.interventionType); idx++;
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const limit = Math.min(opts?.limit || 100, 500);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_intervention_log ${whereClause}
     ORDER BY created_at DESC LIMIT ${limit}`,
    params,
  );
  return result.rows;
}

export async function acknowledgeIntervention(
  tenantId: string,
  interventionId: string,
  userId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".workflow_intervention_log
     SET acknowledged_by = $1, acknowledged_at = NOW()
     WHERE intervention_id = $2 AND acknowledged_by IS NULL`,
    [userId, interventionId],
  );
  return (result.rowCount ?? 0) > 0;
}

function mapRow(row: Record<string, unknown>): WorkflowKillSwitch {
  return {

    switch_id: row.switch_id,

    tenant_id: row.tenant_id,

    activated_by: row.activated_by,

    scope: row.scope,
    scope_filter: typeof row.scope_filter === 'string' ? JSON.parse(row.scope_filter) : (row.scope_filter || {}),

    reason: row.reason,

    is_active: row.is_active ?? true,

    activated_at: row.activated_at,

    deactivated_at: row.deactivated_at || null,

    deactivated_by: row.deactivated_by || null,
  };
}
