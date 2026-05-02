import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { z as _z } from "zod";
import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { emitEvent } from '../../ports/events.port';
import { completeProcessTask } from '../../ports/lifecycle.port';
import { validate, ok, paginated, action as _action, NotFoundError, parsePagination } from "../../utils/route-kit";
import { getFirstRow } from '@dos/db';
import { enrichProcessTaskRow } from '../../utils/process-task-sla.mapper';

import { asyncHandler, auditMiddleware, tenantGuard, automationMiddleware, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { taskListQuery, taskIdParam, taskIdParamAlt, statusUpdateBody, slaBreachesQuery } from "../../schemas/workflow.schemas";
const router = Router();
router.use(moduleStack('workflow'));
router.use(auditMiddleware("workflows"));
router.use(automationMiddleware("workflows"));
router.use(authenticate as any);
router.use(tenantGuard());

// ── Zod Schemas ──────────────────────────────────────────────────────────

const _VALID_STATUSES = ["pending", "assigned", "in_progress", "completed", "cancelled", "escalated", "blocked", "auto_closed"] as const;
const _VALID_PRIORITIES = ["critical", "high", "medium", "low"] as const;
// ── Constants ────────────────────────────────────────────────────────────

const FULL_SCOPE_PERM = 'workflow.task.read_all';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Cache workflow column existence per schema (5-min TTL) to avoid information_schema query on every request */
const _wfColCache = new Map<string, { has: boolean; at: number }>();
async function hasWorkflowColumns(schema: string): Promise<boolean> {
  const cached = _wfColCache.get(schema);
  if (cached && Date.now() - cached.at < 300_000) return cached.has;
  const r = await safeQuery(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'process_tasks' AND column_name = 'workflow_execution_id'`,
    [schema]
  );
  const has = r.rows.length > 0;
  _wfColCache.set(schema, { has, at: Date.now() });
  return has;
}

/** Build WHERE conditions for scope (user/team/assignee/priority/assigneeRole). Shared by task list, count, and statusCounts. */
function buildScopeFilters(opts: {
  userId?: string; role?: string; teamId?: string; assignedTo?: string; priority?: string;
  assigneeRole?: string;
  includeStatus?: string;
  moduleCode?: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
}): { conditions: string[]; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const hasFullScope = opts.isSuperAdmin === true ||
    (opts.permissions ?? []).includes(FULL_SCOPE_PERM);
  if (opts.userId && !hasFullScope && !opts.assignedTo) {
    conditions.push(`(pt.assigned_user_id = $${idx} OR pt.created_by = $${idx})`);
    params.push(opts.userId); idx++;
  }
  if (opts.assigneeRole) {
    conditions.push(`u.role = $${idx++}`);
    params.push(opts.assigneeRole);
  }
  if (opts.includeStatus) {
    conditions.push(`pt.status = $${idx++}`);
    params.push(opts.includeStatus);
  }
  if (opts.priority) {
    conditions.push(`pt.priority = $${idx++}`);
    params.push(opts.priority);
  }
  if (opts.teamId) {
    conditions.push(`pt.team_id = $${idx++}`);
    params.push(opts.teamId);
  }
  if (opts.moduleCode) {
    conditions.push(`pt.entity_type = $${idx++}`);
    params.push(opts.moduleCode);
  }
  if (opts.assignedTo === "me" && opts.userId) {
    conditions.push(`pt.assigned_user_id = $${idx++}`);
    params.push(opts.userId);
  } else if (opts.assignedTo) {
    conditions.push(`pt.assigned_user_id = $${idx++}`);
    params.push(opts.assignedTo);
  }
  return { conditions, params };
}

function toWhere(conditions: string[]): string {
  return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
}

// ══════════════ TASK LIST (paginated) ══════════════

router.get("/",
  requirePermission('workflow.task.read'),
  validate({ query: taskListQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const userId = req.user!.userId!;
    const role = req.user?.role;
    const { status, teamId, assignedTo, priority, role: assigneeRole, moduleCode } = req.query;
    const { page, pageSize, offset } = parsePagination((req as any), { pageSize: 100 });

    // Main query filters (includes status + priority; assigneeRole filters by assigned user's role)
    const main = buildScopeFilters({

      userId, role, teamId, assignedTo: assignedTo as string,
      priority: priority as string, assigneeRole: assigneeRole as string,
      includeStatus: status as string,
      moduleCode: moduleCode as string | undefined,
      isSuperAdmin: req.user?.is_super_admin === true,
      permissions: req.user?.permissions,
    });
    const where = toWhere(main.conditions);

    const wfSelect = (await hasWorkflowColumns(schema)) ? ', pt.workflow_execution_id, pt.workflow_step_id' : '';

    const result = await safeQuery(
      `SELECT pt.task_id, pt.title, pt.description, pt.task_type, pt.priority,
              pt.status, pt.team_id, pt.assigned_user_id, pt.control_id,
              pt.entity_type, pt.entity_id, pt.sla_hours, pt.due_date,
              pt.breached_at, pt.escalation_level, pt.created_at, pt.completed_at,
              pt.routing_tier, pt.routing_metadata, pt.trigger_source
              ${wfSelect},
              t.name_en AS team_name,
              COALESCE(u.full_name, u.email) AS assigned_user_name
       FROM "${schema}".process_tasks pt
       LEFT JOIN "${schema}".teams t ON t.team_id = pt.team_id
       LEFT JOIN public.users u ON u.user_id = pt.assigned_user_id
       ${where}
       ORDER BY
         CASE pt.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         pt.due_date ASC NULLS LAST
       LIMIT $${main.params.length + 1} OFFSET $${main.params.length + 2}`,
      [...main.params, pageSize, offset]
    );

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${schema}".process_tasks pt
       LEFT JOIN public.users u ON u.user_id = pt.assigned_user_id
       ${where}`,
      main.params
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const rowsWithSla = result.rows.map((r) => enrichProcessTaskRow(r as Record<string, unknown>));

    // Status counts -- same scope filters but WITHOUT status/priority so tiles show all statuses
    const scope = buildScopeFilters({

      userId, role, teamId, assignedTo: assignedTo as string, assigneeRole: assigneeRole as string,
      moduleCode: moduleCode as string | undefined,
      isSuperAdmin: req.user?.is_super_admin === true,
      permissions: req.user?.permissions,
    });
    const scopeWhere = toWhere(scope.conditions);

    const statusCountsResult = await safeQuery(
      `SELECT pt.status, COUNT(*)::int AS cnt FROM "${schema}".process_tasks pt
       LEFT JOIN public.users u ON u.user_id = pt.assigned_user_id
       ${scopeWhere} GROUP BY pt.status`,
      scope.params
    );
    const statusCounts: Record<string, number> = {};
    for (const row of statusCountsResult.rows) {
      statusCounts[row.status] = row.cnt;
    }

    res.json({
      ...paginated(rowsWithSla, total, page, pageSize, req),
      statusCounts,
    });
  }),
);

// ══════════════ SLA BY ROLE (dashboard widget) ══════════════

/** GET /sla-by-role -- open tasks grouped by assignee role with total, at-risk, breached counts */
router.get("/sla-by-role",
  requirePermission('workflow.task.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const openStatuses = ["pending", "assigned", "in_progress", "blocked", "escalated", "overdue"];
    const placeholders = openStatuses.map((_, i) => `$${i + 1}`).join(", ");
    const result = await safeQuery(
      `SELECT
         COALESCE(u.role, 'unassigned') AS role,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE pt.breached_at IS NOT NULL OR (pt.due_date IS NOT NULL AND pt.due_date < NOW()))::int AS breached,
         COUNT(*) FILTER (WHERE pt.breached_at IS NULL AND pt.due_date IS NOT NULL AND pt.due_date >= NOW() AND pt.due_date <= NOW() + INTERVAL '24 hours')::int AS at_risk
       FROM "${schema}".process_tasks pt
       LEFT JOIN public.users u ON u.user_id = pt.assigned_user_id
       WHERE pt.status IN (${placeholders})
       GROUP BY COALESCE(u.role, 'unassigned')
       ORDER BY total DESC`,
      openStatuses
    );
    res.json(ok(result.rows, req));
  }),
);

// ══════════════ SINGLE TASK DETAIL ══════════════

// Constrain :id to UUID shape so specific paths like /sla-stats,
// /sla-warnings, /sla-breaches (defined further down) don't get
// matched here first and rejected by the UUID validator. Pre-fix
// these returned 400 "Invalid uuid" because Express matched /:id
// for /sla-stats etc. (route order matters in Express).
router.get("/:id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})",
  requirePermission('workflow.task.read'),
  validate({ params: taskIdParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const wfSelect = (await hasWorkflowColumns(schema)) ? ', pt.workflow_execution_id, pt.workflow_step_id' : '';

    const result = await safeQuery(
      `SELECT pt.task_id, pt.title, pt.description, pt.task_type, pt.priority,
              pt.status, pt.team_id, pt.assigned_user_id, pt.control_id,
              pt.entity_type, pt.entity_id, pt.sla_hours, pt.due_date,
              pt.breached_at, pt.escalation_level, pt.created_at, pt.completed_at,
              pt.started_at, pt.routing_tier, pt.routing_metadata, pt.trigger_source
              ${wfSelect},
              pt.parent_task_id, pt.blocking_tasks, pt.trigger_data,
              pt.completion_evidence, pt.created_by,
              t.name_en AS team_name,
              COALESCE(u.full_name, u.email) AS assigned_user_name
       FROM "${schema}".process_tasks pt
       LEFT JOIN "${schema}".teams t ON t.team_id = pt.team_id
       LEFT JOIN public.users u ON u.user_id = pt.assigned_user_id
       WHERE pt.task_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) throw new NotFoundError(`process_task ${req.params.id} not found`);
    res.json(ok(enrichProcessTaskRow(getFirstRow(result) as Record<string, unknown>), req));
  }),
);

// ══════════════ UPDATE TASK STATUS ══════════════

router.put("/:id/status",
  requirePermission('workflow.task.act'),
  validate({ params: taskIdParam, body: statusUpdateBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const { status, completionEvidence } = req.body;

    // For 'completed': delegate to completeProcessTask() which handles the UPDATE,
    // auto-scoring, and workflow feedback in one atomic flow.
    if (status === "completed") {
      const existCheck = await safeQuery(
        `SELECT task_id FROM "${schema}".process_tasks WHERE task_id = $1`,
        [req.params.id]
      );
      if (existCheck.rows.length === 0) throw new NotFoundError(`process_task ${req.params.id} not found`);

      await completeProcessTask(req.tenantId!, req.params.id, completionEvidence);
      const row = await safeQuery(
        `SELECT pt.*, t.name_en AS team_name, COALESCE(u.full_name, u.email) AS assigned_user_name
         FROM "${schema}".process_tasks pt
         LEFT JOIN "${schema}".teams t ON t.team_id = pt.team_id
         LEFT JOIN public.users u ON u.user_id = pt.assigned_user_id
         WHERE pt.task_id = $1`,
        [req.params.id]
      );
      if (row.rowCount === 0) throw new NotFoundError(`process_task ${req.params.id} not found`);

      swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!,
              module: 'workflows', event: 'completed',
              entityType: 'process_tasks', entityId: req.params.id || '',
            } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.process_tasks.completed' });

      res.json(ok(getFirstRow(row), req));
      return;
    }

    const updates: string[] = [`status = $1`];
    const params: unknown[] = [status];
    let idx = 2;

    if (status === "in_progress") {
      updates.push(`started_at = COALESCE(started_at, NOW())`);
    }

    params.push(req.params.id);
    const result = await safeQuery(
      `UPDATE "${schema}".process_tasks
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE task_id = $${idx}
       RETURNING *`,
      params
    );

    if (result.rowCount === 0) throw new NotFoundError(`process_task ${req.params.id} not found`);

    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!,
          module: 'workflows', event: 'updated',
          entityType: 'process_tasks', entityId: req.params.id || '',
        } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.process_tasks.updated' });

    res.json(ok(getFirstRow(result), req));
  }),
);

// ══════════════ RACI RESOLUTION AUDIT TRAIL ══════════════

/** GET /:taskId/resolution -- RACI routing resolution details */
router.get("/:taskId([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/resolution",
  validate({ params: taskIdParamAlt }),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const hasRoutingCols = await hasWorkflowColumns(schema);
    const routingSelect = hasRoutingCols ? ', routing_tier, routing_metadata' : '';
    const result = await safeQuery(
      `SELECT task_id, title, task_type, priority, team_id, assigned_user_id, status,
              entity_type, entity_id, trigger_source, trigger_data, auto_initiated,
              sla_hours, due_date, created_at${routingSelect}
       FROM "${schema}".process_tasks WHERE task_id = $1`,
      [req.params.taskId],
    );
    if (!result.rows.length) throw new NotFoundError(`process_task ${req.params.taskId} not found`);
    const task = getFirstRow(result)!;

    // Enrich with team name if team_id exists
    if (task.team_id) {
      const teamResult = await safeQuery(
        `SELECT team_name, team_code FROM "${schema}".teams WHERE team_id = $1`,
        [task.team_id],
      );
      task.team_name = getFirstRow(teamResult)?.team_name || null;
      task.team_code = getFirstRow(teamResult)?.team_code || null;
    }

    res.json(ok(task, req));
  }),
);

// ══════════════ SLA BREACH MONITORING ══════════════

/** GET /sla-breaches -- Tasks that have breached SLA */
router.get("/sla-breaches",
  validate({ query: slaBreachesQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const since = req.query.since as string || '24h';
    const hoursAgo = since.endsWith('h') ? parseInt(since) : since.endsWith('d') ? parseInt(since) * 24 : 24;
    const result = await safeQuery(
      `SELECT task_id, title, task_type, priority, entity_type, entity_id, status,
              assigned_user_id, team_id, sla_deadline, breached_at, escalation_level, created_at
       FROM "${schema}".process_tasks
       WHERE breached_at IS NOT NULL AND breached_at > NOW() - INTERVAL '${hoursAgo} hours'
       ORDER BY breached_at DESC LIMIT 100`,
    );
    res.json(ok(result.rows, req));
  }),
);

/** GET /sla-warnings -- Tasks approaching SLA (>75% elapsed) */
router.get("/sla-warnings", requirePermission('workflow.task.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT task_id, title, task_type, priority, entity_type, entity_id, status,
            assigned_user_id, team_id, sla_deadline, created_at,
            EXTRACT(EPOCH FROM (sla_deadline - NOW())) / 3600.0 AS hours_remaining,
            EXTRACT(EPOCH FROM (sla_deadline - created_at)) / 3600.0 AS total_hours,
            CASE WHEN sla_deadline IS NOT NULL AND sla_deadline > NOW()
                 THEN ROUND(100.0 * (1.0 - EXTRACT(EPOCH FROM (sla_deadline - NOW())) / NULLIF(EXTRACT(EPOCH FROM (sla_deadline - created_at)), 0)), 1)
                 ELSE 100 END AS percent_elapsed
     FROM "${schema}".process_tasks
     WHERE status NOT IN ('completed', 'cancelled')
       AND breached_at IS NULL
       AND sla_deadline IS NOT NULL
       AND sla_deadline > NOW()
       AND EXTRACT(EPOCH FROM (sla_deadline - NOW())) / NULLIF(EXTRACT(EPOCH FROM (sla_deadline - created_at)), 0) < 0.25
     ORDER BY sla_deadline ASC LIMIT 50`,
  );
  res.json(ok(result.rows, req));
}));

/** GET /sla-stats -- Aggregate SLA statistics */
router.get("/sla-stats", requirePermission('workflow.task.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT
      COUNT(*) FILTER (WHERE breached_at IS NOT NULL AND breached_at > NOW() - INTERVAL '24 hours')::int AS breached_24h,
      COUNT(*) FILTER (WHERE breached_at IS NOT NULL AND breached_at > NOW() - INTERVAL '7 days')::int AS breached_7d,
      COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled') AND breached_at IS NULL AND sla_deadline IS NOT NULL
        AND sla_deadline > NOW() AND EXTRACT(EPOCH FROM (sla_deadline - NOW())) / NULLIF(EXTRACT(EPOCH FROM (sla_deadline - created_at)),0) < 0.25)::int AS warnings_active,
      COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled'))::int AS open_tasks,
      ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at)) / 3600.0) FILTER (WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '7 days'), 1) AS avg_resolution_hours
     FROM "${schema}".process_tasks`,
  );
  res.json(ok(getFirstRow(result) || {}, req));
}));

export default router;
