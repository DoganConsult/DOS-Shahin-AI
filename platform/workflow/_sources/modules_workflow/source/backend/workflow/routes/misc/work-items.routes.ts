import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());

import { auditMiddleware, validate, asyncHandler } from '../../ports/middleware.port';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { getMyTasks, getTeamQueue, claimTask, getQueueStats } from "../../../workflow/services/ops/workflow-queue.service";
import { completeStep } from '../../ports/lifecycle.port';
import { errMsg } from "../../../../i18n/error-messages";
import { emitEvent, eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import { swallow, swallowDefault, EC } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';
import { emptyResult } from '../../ports/database.port';
import { idClaimPostBody, idCompletePostBody } from "../../schemas/workflow.schemas";

// ── Zod Schemas ──────────────────────────────────────────────────────────
const router = Router();
router.use(auditMiddleware('workspaces'));

router.get("/", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { safeQuery, tenantSchema } = await import('../../../../config/database.js');
  const schema = tenantSchema(req.tenantId!);
  const filters: string[] = ["deleted_at IS NULL"];
  const params: (string | number)[] = [];
  let idx = 1;
  if (req.query.assigneeKey) { filters.push(`assignee_key = $${idx++}`); params.push(req.query.assigneeKey as string); }
  if (req.query.status) { filters.push(`status = $${idx++}`); params.push(req.query.status as string); }
  if (req.query.moduleCode) { filters.push(`entity_type = $${idx++}`); params.push(req.query.moduleCode as string); }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `SELECT * FROM "${schema}".process_tasks ${where} ORDER BY created_at DESC LIMIT 200`, params
  ), { tenantId: req.tenantId!, operation: 'query process_tasks' });
  res.json(result.rows);
}));

router.get("/my-tasks", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tasks = await getMyTasks(req.tenantId!, req.user!.userId!, {
  status: req.query.status as string | undefined,
  priority: req.query.priority as string | undefined,
  taskType: req.query.taskType as string | undefined,
  overdue: req.query.overdue === 'true',
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
  offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
  });
  res.json({ tasks, count: tasks.length });
}));

router.get("/team-queue", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const roleCode = req.query.roleCode as string;
  if (!roleCode) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const tasks = await getTeamQueue(req.tenantId!, roleCode, {
  status: req.query.status as string | undefined,
  priority: req.query.priority as string | undefined,
  overdue: req.query.overdue === 'true',
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
  offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
  });
  res.json({ tasks, count: tasks.length });
}));

router.post("/:id/claim", authenticate, requirePermission("workflow.instance.write"), validate({ body: idClaimPostBody }), asyncHandler(async (req, res) => {
  const task = await claimTask(req.tenantId!, req.params.id, req.user!.userId!);
  if (!task) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'work_item', entityId: req.params.id } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.work_item.updated' });
  res.json(task);
}));

router.get("/stats", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const userId = req.query.userId as string | undefined;
  const stats = await getQueueStats(req.tenantId!, userId || req.user!.userId!);
  res.json(stats);
}));

router.post("/:id/complete", authenticate, requirePermission("workflow.instance.write"), validate({ body: idCompletePostBody }), asyncHandler(async (req, res) => {
  const { safeQuery, tenantSchema } = await import('../../../../config/database.js');
  const schema = tenantSchema(req.tenantId!);
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const { outcome, comment } = req.body || {};
  const taskId = req.params.id;

  const wfRow = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `SELECT instance_step_id FROM "${schema}".workflow_tasks WHERE task_id = $1 AND deleted_at IS NULL`,
  [taskId]
  ), { tenantId: req.tenantId!, operation: 'query workflow_tasks' });

  if (wfRow.rows.length > 0) {
  const instanceStepId = getFirstRow(wfRow)?.instance_step_id;
  await safeQuery(
  `UPDATE "${schema}".workflow_tasks SET status = 'completed', updated_at = NOW(), updated_by = $2
  WHERE task_id = $1`,
  [taskId, userId]
  );
  const stepRow = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `SELECT instance_id, step_id FROM "${schema}".workflow_instance_steps WHERE instance_step_id = $1`,
  [instanceStepId]
  ), { tenantId: req.tenantId!, operation: 'query workflow_instance_steps' });
  if (stepRow.rows.length > 0) {
  const { instance_id, step_id } = getFirstRow(stepRow);

  await completeStep(tenantId, instance_id, (step_id as any), { outcome: outcome || 'approved', comment: comment || null }, userId);
  }
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'workflows', event: 'completed', entityType: 'work_item', entityId: taskId } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.work_item.completed' });
  swallow(EC.EVENT_BUS, eventBus.publish(({ eventType: 'workflow.status_changed' as string, tenantId, severity: 'info', payload: { entityId: taskId, moduleCode: 'workflow', fromStatus: 'pending', toStatus: 'completed', actorUserId: userId } } as any)), { tenantId, operation: 'eventBus:workflow.status_changed' });
  return res.json({ task_id: taskId, source: 'workflow_tasks', status: 'completed' });
  }

  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `UPDATE "${schema}".process_tasks SET status = 'completed', outcome = $2, comment = $3, completed_at = NOW(), updated_at = NOW()
  WHERE task_id = $1 RETURNING *`,
  [taskId, outcome || 'done', comment || null]
  ), { tenantId: req.tenantId!, operation: 'update process_tasks' });
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'workflows', event: 'completed', entityType: 'work_item', entityId: taskId } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.work_item.completed' });
  swallow(EC.EVENT_BUS, eventBus.publish(({ eventType: 'workflow.status_changed' as string, tenantId, severity: 'info', payload: { entityId: taskId, moduleCode: 'workflow', fromStatus: 'pending', toStatus: 'completed', actorUserId: userId } } as any)), { tenantId, operation: 'eventBus:workflow.status_changed' });
  res.json(getFirstRow(result));
}));

export default router;

