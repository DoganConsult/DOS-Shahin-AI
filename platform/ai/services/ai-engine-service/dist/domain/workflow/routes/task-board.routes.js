import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '@dos/dauth-shared';
import { auditMiddleware, asyncHandler, moduleStack, validate, setAuditData } from '@dos/platform-core/http';
import { publishEvent } from '@dos/module-sdk';
import { getKanbanBoard, createTask, updateTaskStatus, getTaskProgress, isValidTransition, } from '../services/tasks/task-board.service.js';
import { createTasksBody, updateTasksidStatusBody } from '../schemas/task-board.schemas.js';
const VALID_STATUSES = ['todo', 'in_progress', 'review', 'done'];
const router = Router();
router.use(moduleStack('workflow'));
router.use(auditMiddleware('compliance'));
// GET / — Kanban board grouped by status
router.get('/', validate({ query: z.record(z.unknown()) }), authenticate, asyncHandler(async (req, res) => {
    const tenantId = req.user.tenantId;
    const board = await getKanbanBoard(tenantId);
    res.json(board);
}));
// POST /tasks — Create task
router.post('/tasks', authenticate, requirePermission('workflow.instance.write'), validate({ body: createTasksBody }), asyncHandler(async (req, res) => {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const { title, description, assignedTo, dueDate, entityType, entityId } = req.body;
    const task = await createTask(tenantId, {
        title,
        description,
        assignedTo,
        dueDate,
        entityType,
        entityId,
    });
    setAuditData(res, {
        action: 'create',
        entityType: 'task',
        entityId: task.taskId,
        afterState: task,
    });
    void publishEvent({
        tenantId,
        userId,
        module: 'workflows',
        event: 'created',
        entityType: 'task_board',
        entityId: task.taskId,
    }).catch(() => {
        // event-bus failure must not fail the request
    });
    res.status(201).json(task);
}));
// PUT /tasks/:id/status — Update task status with transition validation
router.put('/tasks/:id/status', authenticate, requirePermission('workflow.instance.write'), validate({ body: updateTasksidStatusBody }), asyncHandler(async (req, res) => {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
        res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
        return;
    }
    try {
        const task = await updateTaskStatus(tenantId, req.params.id, status);
        setAuditData(res, {
            action: 'update',
            entityType: 'task',
            entityId: req.params.id,
            afterState: task,
        });
        void publishEvent({
            tenantId,
            userId,
            module: 'workflows',
            event: 'updated',
            entityType: 'task_board',
            entityId: req.params.id,
        }).catch(() => {
            /* event-bus failure must not fail the request */
        });
        res.json(task);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'Task not found') {
            res.status(404).json({ error: msg });
            return;
        }
        if (msg.startsWith('Invalid transition')) {
            res.status(400).json({ error: msg });
            return;
        }
        throw err;
    }
}));
// DELETE /tasks/:id — Mark a task done (matches monolith semantic)
router.delete('/tasks/:id', authenticate, requirePermission('workflow.instance.write'), asyncHandler(async (req, res) => {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    try {
        await updateTaskStatus(tenantId, req.params.id, 'done');
        setAuditData(res, { action: 'delete', entityType: 'task', entityId: req.params.id });
        void publishEvent({
            tenantId,
            userId,
            module: 'workflows',
            event: 'deleted',
            entityType: 'task_board',
            entityId: req.params.id,
        }).catch(() => {
            /* event-bus failure must not fail the request */
        });
        res.json({ message: 'Task deleted', id: req.params.id });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'Task not found') {
            res.status(404).json({ error: msg });
            return;
        }
        throw err;
    }
}));
// GET /progress/:entityType/:entityId — Progress percentage
router.get('/progress/:entityType/:entityId', validate({ query: z.record(z.unknown()) }), authenticate, asyncHandler(async (req, res) => {
    const tenantId = req.user.tenantId;
    const progress = await getTaskProgress(tenantId, req.params.entityType, req.params.entityId);
    res.json(progress);
}));
// Internal helper export — not mounted, used by tests
export { isValidTransition };
export default router;
//# sourceMappingURL=task-board.routes.js.map