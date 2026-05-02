import { Request, Response, NextFunction as _NextFunction, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

/**
 * Bulk Task Management Routes
 *
 * Provides bulk operations for process tasks: status updates, reassignment,
 * and cancellation. Each endpoint validates task IDs (max 100 UUIDs),
 * performs a single UPDATE query, and emits a bulk event.
 */

import { z as _z } from "zod";
import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { emitEvent } from '../../ports/events.port';

import { validate, ok } from "../../utils/route-kit";
import { asyncHandler, auditMiddleware, tenantGuard, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { bulkStatusBody, bulkReassignBody, bulkCancelBody } from "../../schemas/workflow.schemas";
const router = Router();
router.use(moduleStack('workflow'));
router.use(auditMiddleware("workflows"));
router.use(authenticate as any);
router.use(tenantGuard());

// ── Zod Schemas ──────────────────────────────────────────────────────────

const _VALID_STATUSES = [
  "pending", "assigned", "in_progress", "completed",
  "cancelled", "escalated", "blocked", "auto_closed",
] as const;
// ── Bulk Update Status ───────────────────────────────────────────────────

router.post("/status",
  requirePermission("workflow.instance.write"),
  validate({ body: bulkStatusBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const { taskIds, status } = req.body;

    const result = await safeQuery(
      `UPDATE "${schema}".process_tasks
       SET status = $1, updated_at = NOW()
       WHERE task_id = ANY($2::uuid[])
       RETURNING task_id`,
      [status, taskIds],
    );

    const updatedIds = result.rows.map(( r: Record<string, unknown>) => r.task_id);

    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!,
      userId: req.user!.userId!,
      module: "workflows",
      event: "bulk_updated",
      entityType: "process_tasks",
      entityId: updatedIds.join(","),
    }), { tenantId: req.tenantId!, operation: "bulkTasks:statusUpdate" });

    res.json(ok({ updated: updatedIds.length, taskIds: updatedIds }, req));
  }),
);

// ── Bulk Reassign ────────────────────────────────────────────────────────

router.post("/reassign",
  requirePermission("workflow.instance.write"),
  validate({ body: bulkReassignBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const { taskIds, assigneeUserId } = req.body;

    const result = await safeQuery(
      `UPDATE "${schema}".process_tasks
       SET assigned_user_id = $1, updated_at = NOW()
       WHERE task_id = ANY($2::uuid[])
       RETURNING task_id`,
      [assigneeUserId, taskIds],
    );

    const updatedIds = result.rows.map(( r: Record<string, unknown>) => r.task_id);

    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!,
      userId: req.user!.userId!,
      module: "workflows",
      event: "bulk_updated",
      entityType: "process_tasks",
      entityId: updatedIds.join(","),
    }), { tenantId: req.tenantId!, operation: "bulkTasks:reassign" });

    res.json(ok({ updated: updatedIds.length, taskIds: updatedIds }, req));
  }),
);

// ── Bulk Cancel ──────────────────────────────────────────────────────────

router.post("/cancel",
  requirePermission("workflow.instance.write"),
  validate({ body: bulkCancelBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const { taskIds } = req.body;

    const result = await safeQuery(
      `UPDATE "${schema}".process_tasks
       SET status = 'cancelled', updated_at = NOW()
       WHERE task_id = ANY($1::uuid[])
         AND status NOT IN ('completed', 'cancelled')
       RETURNING task_id`,
      [taskIds],
    );

    const updatedIds = result.rows.map(( r: Record<string, unknown>) => r.task_id);

    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!,
      userId: req.user!.userId!,
      module: "workflows",
      event: "bulk_updated",
      entityType: "process_tasks",
      entityId: updatedIds.join(","),
    }), { tenantId: req.tenantId!, operation: "bulkTasks:cancel" });

    res.json(ok({ updated: updatedIds.length, taskIds: updatedIds }, req));
  }),
);

export default router;

