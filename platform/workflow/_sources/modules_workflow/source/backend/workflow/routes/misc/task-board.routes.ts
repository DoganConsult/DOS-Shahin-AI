import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Task Board Routes
// ============================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import { getKanbanBoard, createTask, updateTaskStatus, getTaskProgress, TaskStatus } from '../../services/tasks/task-board.service';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { z as _z } from 'zod';


// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createTasksBody, updateTasksidStatusBody } from "../../schemas/workflow.schemas";
const router = Router();
router.use(moduleStack('workflow'));
router.use(auditMiddleware("compliance"));
router.use(automationMiddleware("compliance"));

// GET /api/task-board — Kanban board grouped by status
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const board = await getKanbanBoard(tenantId);
    res.json(board);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/task-board/tasks — Create task
router.post("/tasks", authenticate, requirePermission("workflow.instance.write"), validate({ body: createTasksBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { title, description, assignedTo, dueDate, entityType, entityId } = req.body;
    if (!title) { res.status(400).json({ error: "title is required" }); return; }
    const task = await createTask(tenantId, { title, description, assignedTo, dueDate, entityType, entityId });
    setAuditData(res as any, { action: "create", entityType: "task", entityId: (task as any).taskId ?? (task as any).task_id, afterState: task });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user!.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'task_board', entityId: req.params.id || '' } as any)), { tenantId: req.user!.tenantId!, operation: 'grcEvent:workflows.task_board.created' });
    res.status(201).json(task);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// PUT /api/task-board/tasks/:id/status — Update task status with transition validation
router.put("/tasks/:id/status", authenticate, requirePermission("workflow.instance.write"), validate({ body: updateTasksidStatusBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const { status } = req.body;
    const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
      return;
    }
    const task = await updateTaskStatus(tenantId, req.params.id, status);
    setAuditData(res as any, { action: "update", entityType: "task", entityId: req.params.id, afterState: task });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user!.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'task_board', entityId: req.params.id || '' } as any)), { tenantId: req.user!.tenantId!, operation: 'grcEvent:workflows.task_board.updated' });
    res.json(task);
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Task not found') { res.status(404).json({ error: toErrorMessage(err) }); return; }
    if (toErrorMessage(err).startsWith('Invalid transition')) { res.status(400).json({ error: toErrorMessage(err) }); return; }
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// DELETE /api/task-board/tasks/:id — Delete a task
router.delete("/tasks/:id", validate({ body: genericPayloadSchema }), authenticate, requirePermission("workflow.instance.write"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const _task = await updateTaskStatus(tenantId, req.params.id, 'done');
    setAuditData(res as any, { action: "delete", entityType: "task", entityId: req.params.id });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.user!.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'deleted', entityType: 'task_board', entityId: req.params.id || '' } as any)), { tenantId: req.user!.tenantId!, operation: 'grcEvent:workflows.task_board.deleted' });
    res.json({ message: "Task deleted", id: req.params.id });
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Task not found') { res.status(404).json({ error: toErrorMessage(err) }); return; }
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/task-board/progress/:entityType/:entityId — Progress percentage
router.get("/progress/:entityType/:entityId", validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const progress = await getTaskProgress(tenantId, req.params.entityType, req.params.entityId);
    res.json(progress);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;

