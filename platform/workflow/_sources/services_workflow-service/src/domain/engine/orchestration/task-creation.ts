import { logger } from '@dos/platform-core/observability';
// ============================================
// Process Orchestration — Task Creation
// THE single entry point for all task creation
// in the platform. Routes through the 5-tier
// resolution chain before inserting.
// @owner DOS
// ============================================

import { safeQuery, tenantSchema } from '@dos/db';
import { eventBus } from '@dos/event-backbone';
import { runNotify, runActionSLA, runSquadAssign, runAuthzCheck, runAuthzLog } from '../contracts/task-hooks.contract';
import { getFirstRow } from '@dos/db';
import { toErrorMessage } from '@dos/platform-core/resilience';

import type { ProcessTaskInput, ProcessTask, RoutingResolution } from './types';
import { EMPTY_RESOLUTION } from './types';
import { tableExists, columnExists, getTaskTypePermissionAction } from './schema-introspection';
import { getEntityModule } from './entity-descriptor-wrappers';
import { resolveByRoleHint, resolveByRecordOwnership, resolveByEnterpriseAuthz, resolveByDynamicRACI, resolveByFallbackMap } from './routing-tiers';
import { lookupSLA } from './sla-enforcement';
import { notifyRACIInformed, logRoutingDecision } from './notification-logging';
import { swallow, EC , catchHandler } from '@dos/platform-core/resilience';

/**
 * Create an orchestrated process task routed through a 5-tier resolution chain:
 *   T0: Explicit assigneeRole hint
 *   T1: Record ownership
 *   T2: Enterprise authz (functional roles + authority + SoD)
 *   T3: Dynamic RACI matrix
 *   T4: Hardcoded fallback map
 *   T5: Unassigned → admin notification
 *
 * This is THE single entry point for all task creation in the platform.
 */
export async function createProcessTask(
  tenantId: string,
  input: ProcessTaskInput,
): Promise<ProcessTask> {
  const schema = tenantSchema(tenantId);

  // ── 5-Tier Resolution ──────────────────────────────────────────────────
  let resolution: RoutingResolution = { ...EMPTY_RESOLUTION };

  // Tier 0: Explicit role hint
  if (input.assigneeRole) {
    resolution = await resolveByRoleHint(tenantId, input.assigneeRole);
  }

  // Tier 1: Record ownership
  if (!resolution.assignedUserId && input.entityType && input.entityId) {
    const ownerRes = await resolveByRecordOwnership(tenantId, input.entityType, input.entityId, input.taskType);
    if (ownerRes.assignedUserId) resolution = ownerRes;
  }

  // Tier 2: Enterprise authz (functional roles + authority + scope + SoD)
  if (!resolution.assignedUserId && input.entityType) {
    const authzRes = await resolveByEnterpriseAuthz(
      tenantId, input.entityType, input.taskType, input.priority, resolution.orgUnitId,
    );
    if (authzRes.assignedUserId) resolution = authzRes;
  }

  // Tier 3: Dynamic RACI matrix lookup
  if (!resolution.assignedUserId && input.entityType) {
    const raciRes = await resolveByDynamicRACI(tenantId, input.entityType, input.entityId);
    if (raciRes.assignedUserId) resolution = raciRes;
  }

  // Tier 4: Hardcoded fallback map
  if (!resolution.assignedUserId) {
    const fallbackRes = await resolveByFallbackMap(tenantId, input.entityType);
    if (fallbackRes.assignedUserId || fallbackRes.teamId) resolution = fallbackRes;
  }

  const { _teamId, assignedUserId, scopeType, scopeId } = resolution;

  // ── Enterprise Auth Pre-Check: verify assigned user has required permission ──
  if (assignedUserId && input.entityType && resolution.tier.startsWith('T0:')) {
    // T0 resolves by role hint without checking specific permission — verify now
    try {
      const moduleCode = getEntityModule(input.entityType);
      const actionSuffix = await getTaskTypePermissionAction(tenantId, input.taskType);
      if (moduleCode) {
        const permCode = `${moduleCode}.${actionSuffix}`;
        const decision = await runAuthzCheck(
          tenantId,
          assignedUserId,
          permCode,
        );
        if (!decision) {
          // Assigned user lacks permission — fall back to Tier 2
          const authzRes = await resolveByEnterpriseAuthz(
            tenantId, input.entityType, input.taskType, input.priority, resolution.orgUnitId,
          );
          if (authzRes.assignedUserId) {
            Object.assign(resolution, { ...authzRes });
          }
          // Log the permission gap
          try {
            await runAuthzLog(tenantId, {
              userId: assignedUserId,
              tenantId,
              permissionCode: permCode,
              moduleCode,
            });
          } catch { /* best effort */ }
        }
      }
    } catch { /* enterprise auth pre-check non-fatal */ }
  }

  // ── SLA ────────────────────────────────────────────────────────────────
  const slaHours = input.dueInHours ?? await lookupSLA(tenantId, input.taskType, input.priority, input.assigneeRole);
  const dueDate = new Date(Date.now() + slaHours * 3600_000);

  // ── Insert ─────────────────────────────────────────────────────────────
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const safeControlId = input.controlId && uuidRegex.test(input.controlId) ? input.controlId : null;
  const taskStatus = resolution.assignedUserId ? 'assigned' : 'pending';

  const hasRoutingCols = await tableExists(schema, 'process_tasks')
    && await columnExists(schema, 'process_tasks', 'routing_tier');

  // Build column/value lists dynamically to handle optional schema features
  const cols: string[] = [
    'control_id', 'team_id', 'assigned_user_id', 'task_type', 'title', 'description',
    'priority', 'status', 'sla_hours', 'due_date', 'parent_task_id', 'blocking_tasks',
    'auto_initiated', 'trigger_source', 'trigger_data', 'entity_type', 'entity_id',
  ];
  const insertParams: unknown[] = [
    safeControlId, resolution.teamId, resolution.assignedUserId, input.taskType, input.title,
    input.description ?? null, input.priority, taskStatus, slaHours,
    dueDate.toISOString(), input.parentTaskId ?? null,
    input.blockingTaskIds?.length ? input.blockingTaskIds : null,
    true, // auto_initiated
    input.triggerSource ?? null,
    input.triggerData ? JSON.stringify(input.triggerData) : null,
    input.entityType ?? null, input.entityId ?? null,
  ];
  if (hasRoutingCols) {
    cols.push('routing_tier', 'routing_metadata');
    insertParams.push(resolution.tier, JSON.stringify(resolution.metadata));
  }
  // Module code for inbox filtering (migration 709)
  const hasModuleCode = await columnExists(schema, 'process_tasks', 'module_code');
  if (hasModuleCode && input.entityType) {
    cols.push('module_code');
    insertParams.push(input.entityType);
  }
  // Workflow linkage — atomic INSERT avoids orphan risk from two-phase UPDATE
  if (input.workflowExecutionId) {
    cols.push('workflow_execution_id', 'workflow_step_id');
    insertParams.push(input.workflowExecutionId, input.workflowStepId ?? null);
  }
  const insertVals = insertParams.map((_, i) => `$${i + 1}`).join(', ');

  const res = await safeQuery(
    `INSERT INTO "${schema}".process_tasks (${cols.join(', ')})
     VALUES (${insertVals})
     RETURNING task_id, team_id, assigned_user_id, title, task_type, priority, status, sla_hours, due_date`,
    insertParams,
  );

  const task: ProcessTask = {
    taskId: getFirstRow(res)?.task_id,
    teamId: getFirstRow(res)?.team_id,
    assignedUserId: getFirstRow(res)?.assigned_user_id,
    title: getFirstRow(res)?.title,
    taskType: getFirstRow(res)?.task_type,
    priority: getFirstRow(res)?.priority,
    status: getFirstRow(res)?.status,
    slaHours: Number(getFirstRow(res)?.sla_hours),
    dueDate: getFirstRow(res)?.due_date,
    routingTier: resolution.tier,
  };

  // ── Action-Hub Delegated Temporal SLA Registration ─────────────────────────
  // Completely bypasses archaic cron jobs by enqueuing highly exact time-bound 
  // execution instructions securely to the BullMQ cluster.
  if (task.taskId && slaHours > 0) {
    await swallow(EC.EVENT_BUS, runActionSLA({
      actionId: task.taskId,
      tenantId,
      actionType: task.taskType,
      priority: task.priority as 'critical'|'high'|'medium'|'low',
      dueInHours: slaHours
    }), { tenantId, operation: `actionHub:registerActionSLA:${task.taskId}` });
  }

  // ── Notify ─────────────────────────────────────────────────────────────
  if (resolution.assignedUserId) {
    await runNotify(tenantId, {
      userId: resolution.assignedUserId,
      type: 'task_assigned',
      title: `New task: ${input.title}`,
      body: `Priority: ${input.priority} | SLA: ${slaHours}h | Due: ${dueDate.toISOString().split('T')[0]}`,
      link: '/task-board',
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  } else {
    logger.warn(`[ProcessOrchestration] Task ${task.taskId} (${input.taskType}) created with no assignee — all 5 tiers returned null for tenant ${tenantId}`);
    await swallow(EC.EVENT_BUS, eventBus.publish({
      eventType: 'process_task.unassigned',
      tenantId,
      sourceService: input.triggerSource ?? 'orchestrator',
      severity: input.priority === 'critical' ? 'critical' : 'warning',
      entityType: input.entityType ?? input.taskType,
      entityId: task.taskId,
      payload: { taskId: task.taskId, teamId: resolution.teamId, taskType: input.taskType, priority: input.priority, title: input.title, routingTier: resolution.tier },
    }), { tenantId, operation: 'eventBus:process_task.unassigned' });
    // Notify the tenant platform admin so no task is silently abandoned
    try {
      const adminRes = await safeQuery(
        `SELECT user_id FROM public.users WHERE tenant_id = $1 AND role IN ('tenant_admin','platform_admin') AND status = 'active' ORDER BY created_at ASC LIMIT 1`,
        [tenantId],
      );
      const adminUserId = getFirstRow(adminRes)?.user_id;
      if (adminUserId) {
        await runNotify(tenantId, {
          userId: adminUserId,
          type: 'unassigned_task',
          title: `Unassigned Task: ${input.title}`,
          body: `Task (${input.taskType} / ${input.priority}) could not be assigned — no owner, enterprise role, RACI, or team found. Manual assignment required.`,
          link: `/task-board?taskId=${task.taskId}`,
        }).catch(catchHandler(EC.EVENT_BUS, {}));
      }
    } catch (e: unknown) {
      logger.warn(`[ProcessOrchestration] Could not notify admin of unassigned task: ${toErrorMessage(e)}`);
    }
  }

  // ── Agent squad delivery (A01–A10) ──────────────────────────────────────
  if (resolution.assignedUserId && /^AGENT-A\d{2}$/i.test(resolution.assignedUserId)) {
    await swallow(EC.EVENT_BUS, runSquadAssign(tenantId, task.taskId, resolution.assignedUserId), {
      tenantId, operation: `squadAssignTask:${resolution.assignedUserId}`,
    });
  }

  // ── Publish event ──────────────────────────────────────────────────────
  await swallow(EC.EVENT_BUS, eventBus.publish({
    eventType: 'process_task.created',
    tenantId,
    sourceService: input.triggerSource ?? 'orchestrator',
    severity: input.priority === 'critical' ? 'critical' : input.priority === 'high' ? 'warning' : 'info',
    entityType: input.entityType ?? input.taskType,
    entityId: task.taskId,
    payload: { taskId: task.taskId, teamId: resolution.teamId, assignedUserId: resolution.assignedUserId, taskType: input.taskType, priority: input.priority, slaHours, routingTier: resolution.tier },
  }), { tenantId, operation: 'eventBus:process_task.created' });

  // ── Notify RACI "informed" teams ───────────────────────────────────────
  if (scopeType && scopeId) {
    await notifyRACIInformed(tenantId, scopeType, scopeId, task).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  // ── Log routing decision ───────────────────────────────────────────────
  logRoutingDecision(tenantId, task.taskId, resolution, input).catch(catchHandler(EC.EVENT_BUS, {}));

  return task;
}
