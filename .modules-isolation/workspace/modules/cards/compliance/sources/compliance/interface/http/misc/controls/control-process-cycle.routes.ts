import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../../../../ports/auth.port';
import { assertTenantId, safeQuery, tenantSchema } from '../../../../ports/database.port';
import {
  launchControlProcessCycle,
  getControlProcessCycle,
  getControlLinkedItems,
} from '../../../services/misc/control-process-cycle.service';
import { emitEvent } from '../../../../ports/events.port';
import { enforceStatusTransition } from '../../../../ports/platform.port';
import { getFirstRow } from '@dos/db';
import { auditMiddleware, setAuditData, asyncHandler, validate } from '../../../../ports/middleware.port';
import { swallow, EC } from '../../../../ports/resilience.port';
import { createLaunchBody, createCompleteBody } from '../../../../schemas/compliance.schemas';

/** Zod schemas for control-process-cycle route validation */
const reassignTaskBody = z.object({
  userId: z.string().min(1),
}).passthrough();

const router = Router({ mergeParams: true });
router.use(auditMiddleware("compliance"));

// GET /api/controls/:id/process-cycle
router.get(
  '/',
  authenticate,
  requirePermission('control.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    assertTenantId(req.tenantId);
    const tasks = await getControlProcessCycle(req.tenantId, req.params.id);
    const grouped: Record<string, any[]> = {};
    for (const t of tasks) {
      const key = t.entity_type ?? 'other';
      if (!grouped[(key as any)]) grouped[(key as any)] = [];
      grouped[(key as any)].push(t);
    }
    res.json({ controlId: req.params.id, tasks, grouped, count: tasks.length });
  }),
);

// POST /api/controls/:id/process-cycle/launch
router.post(
  '/launch',
  authenticate,
  requirePermission('control.record.write'),
  validate({ body: createLaunchBody }),
  asyncHandler(async (req: Request, res: Response) => {
    assertTenantId(req.tenantId);
    const result = await launchControlProcessCycle(
      req.tenantId,
      req.params.id,
      req.user?.userId ?? 'manual',
    );
    setAuditData(res as any, { action: "create", entityType: "control_process_cycle", entityId: req.params.id, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user?.userId || 'system', module: 'controls', event: 'created', entityType: 'control_process_cycle', entityId: req.params.id } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:controls.control_process_cycle.created' });
    res.status(201).json(result);
  }),
);

// GET /api/controls/:id/process-cycle/linked-items
router.get(
  '/linked-items',
  authenticate,
  requirePermission('control.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    assertTenantId(req.tenantId);
    const items = await getControlLinkedItems(req.tenantId, req.params.id);
    res.json(items);
  }),
);

// POST /api/controls/:id/process-cycle/tasks/:taskId/reassign
router.post(
  '/tasks/:taskId/reassign',
  authenticate,
  requirePermission('control.record.write'),
  validate({ body: reassignTaskBody }),
  asyncHandler(async (req: Request, res: Response) => {
    assertTenantId(req.tenantId);
    const { userId } = req.body;
    if (!userId) { res.status(400).json({ error: 'userId required' }); return; }
    const schema = tenantSchema(req.tenantId);
    const enforcement = await enforceStatusTransition(req.tenantId, {
      moduleCode: 'compliance', table: 'process_tasks', idColumn: 'task_id',
      entityId: req.params.taskId, toStatus: 'assigned', actorUserId: req.user?.userId || 'system',
      extraSets: 'assigned_user_id = $2',
      extraParams: [userId],
    });
    if (enforcement.blocked) { res.status(403).json({ error: 'Transition denied', reason: enforcement.reason }); return; }
    if (!enforcement.success) {
      await safeQuery(
        `UPDATE "${schema}".process_tasks SET assigned_user_id = $1, status = 'assigned', updated_at = NOW()
         WHERE task_id = $2 AND control_id::text = $3`, [userId, req.params.taskId, req.params.id]);
    }
    const result = await safeQuery(`SELECT task_id, status FROM "${schema}".process_tasks WHERE task_id = $1`, [req.params.taskId]);
    if (!getFirstRow(result)) { res.status(404).json({ error: 'Task not found' }); return; }
    setAuditData(res as any, { action: "update", entityType: "process_task", entityId: req.params.taskId, afterState: getFirstRow(result) });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user?.userId || 'system', module: 'controls', event: 'updated', entityType: 'process_task', entityId: req.params.taskId } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:controls.process_task.updated' });
    res.json(getFirstRow(result));
  }),
);

// POST /api/controls/:id/process-cycle/tasks/:taskId/complete
router.post(
  '/tasks/:taskId/complete',
  authenticate,
  requirePermission('control.record.write'),
  validate({ body: createCompleteBody }),
  asyncHandler(async (req: Request, res: Response) => {
    assertTenantId(req.tenantId);
    const schema = tenantSchema(req.tenantId);
    const enforcement = await enforceStatusTransition(req.tenantId, {
      moduleCode: 'compliance', table: 'process_tasks', idColumn: 'task_id',
      entityId: req.params.taskId, toStatus: 'completed', actorUserId: req.user?.userId || 'system',
      extraSets: 'completed_at = NOW()',
    });
    if (enforcement.blocked) { res.status(403).json({ error: 'Transition denied', reason: enforcement.reason }); return; }
    if (!enforcement.success) {
      await safeQuery(
        `UPDATE "${schema}".process_tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW()
         WHERE task_id = $1 AND control_id::text = $2`, [req.params.taskId, req.params.id]);
    }
    const result = await safeQuery(
      `SELECT task_id, status, completed_at FROM "${schema}".process_tasks WHERE task_id = $1`, [req.params.taskId]);
    if (!getFirstRow(result)) { res.status(404).json({ error: 'Task not found' }); return; }
    setAuditData(res as any, { action: "update", entityType: "process_task", entityId: req.params.taskId, afterState: getFirstRow(result) });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user?.userId || 'system', module: 'controls', event: 'updated', entityType: 'process_task', entityId: req.params.taskId } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:controls.process_task.updated' });
    res.json(getFirstRow(result));
  }),
);

export default router;

