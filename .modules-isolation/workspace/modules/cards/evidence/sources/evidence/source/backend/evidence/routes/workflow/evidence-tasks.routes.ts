import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());



import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { emitEvent, notifyDomainChange, pushToTenant, buildWSEvent } from '../../ports/events.port';
import { validate, ok, action as _action, NotFoundError, ValidationError as _ValidationError } from "../../../../utils/route-kit";
import { recordActivity, enforceStatusTransition } from '../../ports/platform.port';
import { getFirstRow } from '@dos/db';

import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../ports/middleware.port';
import { swallow, EC , catchHandler } from '@dos/platform-core/resilience';
import { taskIdParam, statusUpdateBody, submitBody, listTasksQuery as _listTasksQuery, scheduleIdParam, patchScheduleBody, createGenerateBody, createGenerateNowBody } from "../../schemas/evidence.schemas";

const router = Router();
router.use(moduleStack('evidence'));
router.use(auditMiddleware("evidence"));
router.use(automationMiddleware("evidence"));

// ── Zod Schemas ──────────────────────────────────────────────────────────
// ══════════════ LIST EVIDENCE TASKS ══════════════

router.get("/", authenticate, requirePermission("evidence.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const colCheck = await safeQuery(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'evidence_tasks'`,
    [schema]
  );
  const cols = new Set(colCheck.rows.map(( r: Record<string, unknown>) => r.column_name));
  if (cols.size === 0) { res.json(ok({ tasks: [], count: 0 }, req)); return; }

  const dueDateExpr = cols.has("due_date") ? "et.due_date" : cols.has("due_at") ? "et.due_at::date AS due_date" : "NULL AS due_date";
  const titleExpr = cols.has("title") ? "et.title" : `'Evidence Task' AS title`;
  const assignedCol = cols.has("assigned_to") ? "et.assigned_to" : "et.assigned_role AS assigned_to";
  const controlCol = cols.has("control_id") ? "et.control_id" : "NULL AS control_id";
  const deptCol = cols.has("department_id") ? "et.department_id" : "NULL AS department_id";
  const buCol = cols.has("business_unit_id") ? "et.business_unit_id" : "NULL AS business_unit_id";

  // Build optional foundation filters
  const filterClauses: string[] = [];
  const filterVals: unknown[] = [];
  let paramIdx = 1;
  if (req.query.department_id && cols.has("department_id")) {
    filterClauses.push(`et.department_id = $${paramIdx++}`);
    filterVals.push(req.query.department_id);
  }
  if (req.query.business_unit_id && cols.has("business_unit_id")) {
    filterClauses.push(`et.business_unit_id = $${paramIdx++}`);
    filterVals.push(req.query.business_unit_id);
  }
  if (req.query.status) {
    filterClauses.push(`et.status = $${paramIdx++}`);
    filterVals.push(req.query.status);
  }
  const whereClause = filterClauses.length > 0 ? `WHERE ${filterClauses.join(' AND ')}` : '';

  const result = await safeQuery(
    `SELECT et.task_id, ${titleExpr}, et.status, ${assignedCol}, ${dueDateExpr},
            ${controlCol}, et.created_at, ${deptCol}, ${buCol}
     FROM "${schema}".evidence_tasks et
     ${whereClause}
     ORDER BY ${cols.has("due_at") ? "et.due_at" : "et.created_at"} ASC NULLS LAST`,
    filterVals
  );
  res.json(ok({ tasks: result.rows, count: result.rows.length }, req));
}));

// ══════════════ GENERATE EVIDENCE TASKS ══════════════

router.post("/generate", authenticate, requirePermission("evidence.item.write"), validate({ body: createGenerateBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);

  await safeQuery(`
    ALTER TABLE "${schema}".evidence_tasks ADD COLUMN IF NOT EXISTS title VARCHAR(255);
    ALTER TABLE "${schema}".evidence_tasks ADD COLUMN IF NOT EXISTS due_date DATE;
    ALTER TABLE "${schema}".evidence_tasks ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(64);
    ALTER TABLE "${schema}".evidence_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE "${schema}".evidence_tasks ADD COLUMN IF NOT EXISTS submission_notes TEXT;
  `);

  const existingRes = await safeQuery(
    `SELECT control_id FROM "${schema}".evidence_tasks WHERE status IN ('Open','Submitted') LIMIT 1`
  );
  if (existingRes.rows.length > 0) {
    const countRes = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".evidence_tasks`);
    res.json(ok({ message: 'Tasks already exist', generated: 0, total: getFirstRow(countRes)?.cnt || 0 }, req));
    return;
  }

  const reqRes = await safeQuery(
    `SELECT cer.id, cer.control_id, cer.framework_code, cer.evidence_type_code,
            cer.is_mandatory, cer.collection_frequency,
            rc.control_code, rc.control_title_en,
            et.evidence_name_en
     FROM "${schema}".control_evidence_requirements cer
     JOIN public.regulatory_controls rc ON rc.id = cer.control_id
     LEFT JOIN public.evidence_types et ON et.evidence_code = cer.evidence_type_code
     WHERE cer.is_mandatory = true
     ORDER BY cer.framework_code, rc.control_code
     LIMIT 200`
  );

  if (reqRes.rows.length === 0) {
    res.json(ok({ message: 'No mandatory evidence requirements found', generated: 0 }, req));
    return;
  }

  const frequencyToDays: Record<string, number> = {
    daily: 1, weekly: 7, biweekly: 14, monthly: 30, quarterly: 90,
    semiannually: 180, annually: 365, once: 90, continuous: 30,
  };

  let generated = 0;
  for (const r of reqRes.rows) {
    const freq = r.collection_frequency || 'quarterly';
    const days = frequencyToDays[freq] || 90;
    const dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const title = `${r.evidence_name_en || r.evidence_type_code}: ${r.control_code} — ${(r.control_title_en || '').slice(0, 80)}`;

    await safeQuery(
      `INSERT INTO "${schema}".evidence_tasks
        (tenant_id, workspace_id, control_id, evidence_requirement_id, due_at, due_date, status, title, cadence, created_at)
       VALUES ($1, $1, $2, $3, $4::timestamptz, $4::date, 'Open', $5, $6, NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, r.control_id, r.id, dueDate, title, freq]
    );
    generated++;
  }

  setAuditData(res as any, { action: "create", entityType: "evidence_task", entityId: "batch", afterState: { generated } });
  emitEvent({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'tasks_generated', entityType: 'evidence_task', entityId: 'batch', data: { generated } }).catch(catchHandler(EC.EVENT_BUS, {}));
  pushToTenant(tenantId, buildWSEvent('evidence_tasks_generated' as any, { generated }));

  res.status(201).json(ok({ message: `Generated ${generated} evidence tasks from mandatory requirements`, generated }, req));
}));

// ══════════════ GET SINGLE EVIDENCE TASK ══════════════

router.get("/:id", authenticate, requirePermission("evidence.item.read"),
  validate({ params: taskIdParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const result = await safeQuery(
      `SELECT * FROM "${schema}".evidence_tasks WHERE task_id = $1`,
      [req.params.id]
    );
    if (!getFirstRow(result)) throw new NotFoundError('evidence_task', req.params.id);
    res.json(ok(getFirstRow(result), req));
  }),
);

// ══════════════ UPDATE EVIDENCE TASK STATUS ══════════════

router.put("/:id/status", authenticate, requirePermission("evidence.item.write"),
  validate({ params: taskIdParam, body: statusUpdateBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const tenantId = req.tenantId!;
    const { status } = req.body;
    const enforcement = await enforceStatusTransition(tenantId, {
      moduleCode: 'evidence', table: 'evidence_tasks', idColumn: 'task_id',
      entityId: req.params.id, toStatus: status, actorUserId: req.user!.userId!,
    });
    if (!enforcement.success && enforcement.blocked) {
      res.status(403).json({ error: 'Transition denied', reason: enforcement.reason }); return;
    }
    if (!enforcement.success && enforcement.reason === 'entity_not_found') throw new NotFoundError('evidence_task', req.params.id);
    if (!enforcement.success) {
      await safeQuery(`UPDATE "${schema}".evidence_tasks SET status = $2 WHERE task_id = $1`, [req.params.id, status]);
    }
    const result = await safeQuery(`SELECT * FROM "${schema}".evidence_tasks WHERE task_id = $1`, [req.params.id]);
    if (!getFirstRow(result)) throw new NotFoundError('evidence_task', req.params.id);
    setAuditData(res as any, { action: "update", entityType: "evidence_task", entityId: req.params.id, afterState: getFirstRow(result) });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'updated', entityType: 'evidence_task', entityId: req.params.id, data: getFirstRow(result) }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_task.updated' });
    notifyDomainChange(tenantId, 'evidence', 'update', req.params.id);
    res.json(ok(getFirstRow(result), req));
  }),
);

// ══════════════ SUBMIT EVIDENCE TASK ══════════════

router.post("/:id/submit", authenticate, requirePermission("evidence.item.write"),
  validate({ params: taskIdParam, body: submitBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const { notes } = req.body;
    const sets = [`status = 'Submitted'`];
    const vals: unknown[] = [];
    let idx = 1;

    const colCheck = await safeQuery(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'evidence_tasks' AND column_name = 'submission_notes'`,
      [schema]
    );
    if (colCheck.rows.length > 0 && notes) {
      sets.push(`submission_notes = $${idx}`);
      vals.push(notes);
      idx++;
    }
    vals.push(req.params.id);

    const result = await safeQuery(
      `UPDATE "${schema}".evidence_tasks SET ${sets.join(", ")}, updated_at = NOW() WHERE task_id = $${idx} RETURNING *`,
      vals
    );
    if (!getFirstRow(result)) throw new NotFoundError('evidence_task', req.params.id);

    const tenantId = req.tenantId!;
    setAuditData(res as any, { action: "update", entityType: "evidence_task", entityId: req.params.id, afterState: getFirstRow(result) });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'task_submitted', entityType: 'evidence_task', entityId: req.params.id, data: getFirstRow(result) }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_task.task_submitted' });
    notifyDomainChange(tenantId, 'evidence', 'update', req.params.id);
    pushToTenant(tenantId, buildWSEvent('evidence_task_submitted' as any, { taskId: req.params.id, status: 'Submitted', submittedBy: req.user?.userId }));
    try { await recordActivity(tenantId, { userId: req.user!.userId!, module: 'evidence', action: 'submit', entityType: 'evidence_task', entityId: req.params.id, summary: `Evidence task submitted`, changes: {} }); } catch { }
    res.json(ok(getFirstRow(result), req));
  }),
);

// ══════════════ APPROVE EVIDENCE TASK ══════════════

router.post("/:id/approve", authenticate, requirePermission("evidence.item.write"),
  validate({ params: taskIdParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);
    const enforcement = await enforceStatusTransition(tenantId, {
      moduleCode: 'evidence', table: 'evidence_tasks', idColumn: 'task_id',
      entityId: req.params.id, toStatus: 'Approved', actorUserId: req.user!.userId!,
    });
    if (!enforcement.success && enforcement.blocked) {
      res.status(403).json({ error: 'Transition denied', reason: enforcement.reason }); return;
    }
    if (!enforcement.success) {
      await safeQuery(`UPDATE "${schema}".evidence_tasks SET status = 'Approved', updated_at = NOW() WHERE task_id = $1`, [req.params.id]);
    }
    const result = await safeQuery(`SELECT * FROM "${schema}".evidence_tasks WHERE task_id = $1`, [req.params.id]);
    if (!getFirstRow(result)) throw new NotFoundError('evidence_task', req.params.id);
    setAuditData(res as any, { action: "update", entityType: "evidence_task", entityId: req.params.id, afterState: getFirstRow(result) });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'task_approved', entityType: 'evidence_task', entityId: req.params.id, data: getFirstRow(result) }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_task.task_approved' });
    notifyDomainChange(tenantId, 'evidence', 'update', req.params.id);
    pushToTenant(tenantId, buildWSEvent('evidence_task_approved' as any, { taskId: req.params.id, status: 'Approved', approvedBy: req.user?.userId }));
    try { await recordActivity(tenantId, { userId: req.user!.userId!, module: 'evidence', action: 'approve', entityType: 'evidence_task', entityId: req.params.id, summary: `Evidence task approved`, changes: {} }); } catch { }
    res.json(ok(getFirstRow(result), req));
  }),
);

// ══════════════ REJECT EVIDENCE TASK ══════════════

router.post("/:id/reject", authenticate, requirePermission("evidence.item.write"),
  validate({ params: taskIdParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);
    const enforcement = await enforceStatusTransition(tenantId, {
      moduleCode: 'evidence', table: 'evidence_tasks', idColumn: 'task_id',
      entityId: req.params.id, toStatus: 'Rejected', actorUserId: req.user!.userId!,
    });
    if (!enforcement.success && enforcement.blocked) {
      res.status(403).json({ error: 'Transition denied', reason: enforcement.reason }); return;
    }
    if (!enforcement.success) {
      await safeQuery(`UPDATE "${schema}".evidence_tasks SET status = 'Rejected', updated_at = NOW() WHERE task_id = $1`, [req.params.id]);
    }
    const result = await safeQuery(`SELECT * FROM "${schema}".evidence_tasks WHERE task_id = $1`, [req.params.id]);
    if (!getFirstRow(result)) throw new NotFoundError('evidence_task', req.params.id);
    setAuditData(res as any, { action: "update", entityType: "evidence_task", entityId: req.params.id, afterState: getFirstRow(result) });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'task_rejected', entityType: 'evidence_task', entityId: req.params.id, data: getFirstRow(result) }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence_task.task_rejected' });
    notifyDomainChange(tenantId, 'evidence', 'update', req.params.id);
    pushToTenant(tenantId, buildWSEvent('evidence_task_rejected' as any, { taskId: req.params.id, status: 'Rejected', rejectedBy: req.user?.userId }));
    try { await recordActivity(tenantId, { userId: req.user!.userId!, module: 'evidence', action: 'reject', entityType: 'evidence_task', entityId: req.params.id, summary: `Evidence task rejected`, changes: {} }); } catch { }
    res.json(ok(getFirstRow(result), req));
  }),
);

// ══════════════ EVIDENCE AUTO-GENERATION VISIBILITY ══════════════

/** GET /schedules -- List evidence auto-collection schedules */
router.get("/schedules", authenticate, requirePermission("evidence.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT es.schedule_id, es.control_id, es.evidence_type, es.cron_expression,
            es.enabled, es.last_reminded_at, es.created_at,
            c.title AS control_title
     FROM "${schema}".evidence_schedules es
     LEFT JOIN "${schema}".controls c ON c.control_id = es.control_id
     ORDER BY es.enabled DESC, es.created_at DESC LIMIT 200`,
  );
  res.json(ok(result.rows, req));
}));

/** PATCH /schedules/:id -- Toggle schedule enabled/update cron */
router.patch("/schedules/:id", authenticate, requirePermission("evidence.item.manage"),
  validate({ params: scheduleIdParam, body: patchScheduleBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const { enabled, cron_expression } = req.body;
    const sets: string[] = [];
    const vals: unknown[] = [req.params.id];
    let idx = 2;
    if (typeof enabled === 'boolean') { sets.push(`enabled = $${idx++}`); vals.push(enabled); }
    if (cron_expression) { sets.push(`cron_expression = $${idx++}`); vals.push(cron_expression); }

    const result = await safeQuery(
      `UPDATE "${schema}".evidence_schedules SET ${sets.join(', ')} WHERE schedule_id = $1 RETURNING *`,
      vals,
    );
    if (!result.rows.length) throw new NotFoundError('evidence_schedule', req.params.id);
    res.json(ok(getFirstRow(result), req));
  }),
);

/** POST /generate-now -- Manually trigger evidence generation */
router.post("/generate-now", authenticate, requirePermission("evidence.item.manage"), validate({ body: createGenerateNowBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { generateEvidenceRequests } = await import("../../services/workflow/evidence-request-generator.service.js");
  const result = await generateEvidenceRequests(tenantId);
  res.json(ok({ triggered: true, ...result }, req));
}));

/** GET /generation-history -- Last evidence generation runs (from job execution log) */
router.get("/generation-history", authenticate, requirePermission("evidence.item.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await safeQuery(
      `SELECT execution_id, job_name, started_at, completed_at, status, duration_ms, error_message
       FROM job_execution_log
       WHERE job_name = 'evidence-request-generator'
       ORDER BY started_at DESC LIMIT 20`,
    );
    res.json(ok(result.rows, req));
  } catch {
    // Table may not exist yet
    res.json(ok([], req));
  }
}));

export default router;

