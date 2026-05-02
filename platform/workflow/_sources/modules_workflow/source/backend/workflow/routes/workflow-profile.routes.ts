
import type { AuthenticatedRequest as _AuthenticatedRequest } from '@dos/types';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
/**
 * Workflow Profile Routes — User-centric workflow profile endpoints.
 *
 * Provides the authenticated user's workflow profile: their active tasks,
 * pending approvals, workload summary, and personal workflow preferences.
 * Mounted at /api/workflow-profile by the route manifest.
 *
 * @module workflow
 */

import { Router } from 'express';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { auditMiddleware, validate, moduleStack, mutationEventHook } from '../ports/middleware.port';

import { authenticate, requirePermission } from '../ports/auth.port';
import { updatePreferencesBody } from '../schemas/workflow.schemas';
const router = Router();
router.use(moduleStack('workflow'));
router.use(auditMiddleware('workflow'));
router.use(mutationEventHook('workflow'));

/**
 * GET /api/workflow-profile/summary
 * Returns the current user's workflow workload summary: counts of
 * pending tasks, overdue items, pending approvals, and completed this week.
 */
router.get('/summary', authenticate, requirePermission('workflow.instance.read'), validate({ query: z.record(z.unknown()) }), async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.userId!;
  if (!tenantId || !userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const schema = tenantSchema(tenantId);

    const summaryResult = await safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE pt.status IN ('todo','in_progress'))::int AS pending_tasks,
         COUNT(*) FILTER (WHERE pt.status IN ('todo','in_progress') AND pt.due_date < NOW())::int AS overdue_tasks,
         COUNT(*) FILTER (WHERE pt.status = 'completed' AND pt.completed_at >= DATE_TRUNC('week', NOW()))::int AS completed_this_week,
         COUNT(*) FILTER (WHERE pt.status = 'review')::int AS in_review
       FROM "${schema}".process_tasks pt
       WHERE pt.assigned_to = $1 AND pt.deleted_at IS NULL`,
      [userId],
    );

    const approvalResult = await safeQuery(
      `SELECT COUNT(*)::int AS pending_approvals
       FROM "${schema}".process_tasks pt
       WHERE pt.status = 'review'
         AND pt.assigned_to = $1
         AND pt.deleted_at IS NULL`,
      [userId],
    );

    const summary = getFirstRow(summaryResult) || {};
    const approvals = getFirstRow(approvalResult) || {};

    return res.json({
      userId,
      pendingTasks: parseInt(summary.pending_tasks, 10) || 0,
      overdueTasks: parseInt(summary.overdue_tasks, 10) || 0,
      completedThisWeek: parseInt(summary.completed_this_week, 10) || 0,
      inReview: parseInt(summary.in_review, 10) || 0,
      pendingApprovals: parseInt(approvals.pending_approvals, 10) || 0,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to load workflow profile summary',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * GET /api/workflow-profile/my-tasks
 * Returns paginated list of the current user's assigned process tasks.
 * Query params: status, page, limit, sortBy, sortDir.
 */
router.get('/my-tasks', authenticate, requirePermission('workflow.task.read'), validate({ query: z.record(z.unknown()) }), async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.userId!;
  if (!tenantId || !userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const schema = tenantSchema(tenantId);
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;
    const sortBy = ['due_date', 'created_at', 'priority', 'title'].includes(req.query.sortBy as string)
      ? req.query.sortBy as string
      : 'created_at';
    const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = ['pt.assigned_to = $1', 'pt.deleted_at IS NULL'];
    const params: unknown[] = [userId];

    if (status) {
      params.push(status);
      conditions.push(`pt.status = $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${schema}".process_tasks pt WHERE ${where}`,
      params as string[],
    );
    const total = parseInt(getFirstRow(countResult)?.total, 10) || 0;

    params.push(limit, offset);
    const dataResult = await safeQuery(
      `SELECT pt.task_id, pt.title, pt.description, pt.status, pt.priority,
              pt.entity_type, pt.entity_id, pt.due_date, pt.completed_at,
              pt.created_at, pt.updated_at
       FROM "${schema}".process_tasks pt
       WHERE ${where}
       ORDER BY pt.${sortBy} ${sortDir}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params as string[],
    );

    return res.json({
      data: dataResult.rows.map((r: GenericRow) => ({
        taskId: r.task_id,
        title: r.title,
        description: r.description,
        status: r.status,
        priority: r.priority,
        entityType: r.entity_type,
        entityId: r.entity_id,
        dueDate: r.due_date,
        completedAt: r.completed_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to load tasks',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * GET /api/workflow-profile/my-approvals
 * Returns pending approval tasks assigned to the current user.
 * Query params: page, limit.
 */
router.get('/my-approvals', authenticate, requirePermission('workflow.approval.read'), validate({ query: z.record(z.unknown()) }), async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.userId!;
  if (!tenantId || !userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const schema = tenantSchema(tenantId);
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total
       FROM "${schema}".process_tasks pt
       WHERE pt.assigned_to = $1 AND pt.status = 'review' AND pt.deleted_at IS NULL`,
      [userId],
    );
    const total = parseInt(getFirstRow(countResult)?.total, 10) || 0;

    const dataResult = await safeQuery(
      `SELECT pt.task_id, pt.title, pt.description, pt.status, pt.priority,
              pt.entity_type, pt.entity_id, pt.due_date, pt.created_by,
              pt.created_at, pt.updated_at
       FROM "${schema}".process_tasks pt
       WHERE pt.assigned_to = $1 AND pt.status = 'review' AND pt.deleted_at IS NULL
       ORDER BY pt.due_date ASC NULLS LAST, pt.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    return res.json({
      data: dataResult.rows.map((r: GenericRow) => ({
        taskId: r.task_id,
        title: r.title,
        description: r.description,
        status: r.status,
        priority: r.priority,
        entityType: r.entity_type,
        entityId: r.entity_id,
        dueDate: r.due_date,
        requestedBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to load approvals',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * GET /api/workflow-profile/preferences
 * Returns the user's workflow display preferences (notification settings,
 * default views, task board configuration).
 */
router.get('/preferences', authenticate, requirePermission('workflow.instance.read'), validate({ query: z.record(z.unknown()) }), async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.userId!;
  if (!tenantId || !userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT preferences_json
       FROM "${schema}".user_workflow_preferences
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );

    const row = getFirstRow(result)!;
    const defaults = {
      defaultView: 'kanban',
      notifyOnAssignment: true,
      notifyOnDueSoon: true,
      notifyOnOverdue: true,
      dueSoonHours: 24,
      taskSortBy: 'due_date',
      taskSortDir: 'asc',
    };

    return res.json({
      userId,
      preferences: row?.preferences_json ? { ...defaults, ...row.preferences_json } : defaults,
    });
  } catch {
    // Table may not exist — return defaults
    return res.json({
      userId,
      preferences: {
        defaultView: 'kanban',
        notifyOnAssignment: true,
        notifyOnDueSoon: true,
        notifyOnOverdue: true,
        dueSoonHours: 24,
        taskSortBy: 'due_date',
        taskSortDir: 'asc',
      },
    });
  }
});

/**
 * PUT /api/workflow-profile/preferences
 * Saves the user's workflow display preferences.
 */

router.put('/preferences', authenticate, requirePermission('workflow.instance.write'), validate({ body: updatePreferencesBody }), async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.userId!;
  if (!tenantId || !userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const schema = tenantSchema(tenantId);
    const preferences = req.body?.preferences;
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'preferences object required in body' });
    }

    await safeQuery(
      `INSERT INTO "${schema}".user_workflow_preferences (user_id, preferences_json, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET preferences_json = $2, updated_at = NOW()`,
      [userId, JSON.stringify(preferences)],
    );

    return res.json({ userId, preferences, savedAt: new Date().toISOString() });
  } catch {
    // Table may not exist — non-fatal, just return the input
    return res.json({
      userId,
      preferences: req.body?.preferences,
      savedAt: new Date().toISOString(),
      warning: 'Preferences table not available; preferences not persisted',
    });
  }
});

export default router;

