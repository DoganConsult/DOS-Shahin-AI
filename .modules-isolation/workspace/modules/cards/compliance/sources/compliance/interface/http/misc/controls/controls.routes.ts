import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../../../../ports/auth.port';

const enforceStageGates = (..._gates: string[]) => (_req: any, _res: unknown, next: unknown) => next();
import { NotFoundError, ValidationError } from "../../../../../errors";
import { emptyResult, safeQuery, tenantSchema } from '../../../../ports/database.port';
import { emitEvent } from '../../../../ports/events.port';
import { enforceStatusTransition } from '../../../../ports/platform.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { auditMiddleware, setAuditData, automationMiddleware, requireOwnership, fieldRbac as fieldRbacFilter, mandatoryFields as enforceMandatoryFields, asyncHandler, lifecycleGate, scopeContext as injectScopeContext, validate, moduleStack } from '../../../../ports/middleware.port';
import { swallow, swallowDefault, EC , catchHandler } from '../../../../ports/resilience.port';
import { createAiRecommendationsBody, bulkBulkAiAssessBody, createControlTestBody, resolveFailureBody, createControlBody, updateControlBody, bulkAssignTeamBody, genericComplianceSchema } from '../../../../schemas/compliance.schemas';

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware("controls"));
router.use(automationMiddleware("compliance"));
router.use(fieldRbacFilter({ module: "control" }));
router.use(enforceMandatoryFields("control"));
router.use(enforceStageGates("control"));
router.use(injectScopeContext);

/** @swagger
 * /controls:
 *   get:
 *     summary: List all controls with evidence count and risk linkage
 *     tags: [Controls]
 *     responses:
 *       200:
 *         description: Control list
 */
router.get("/", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const user = req.user!;
  const hasFullScope = user?.is_super_admin === true ||
    ((user as any)?.permissions ?? []).includes('control.record.read_all');
  const needsScope = user && !hasFullScope;
  const result = await safeQuery(
    `SELECT c.*,
            COALESCE(ev.cnt, 0)::int AS evidence_count,
            t.name AS owner_team_name,
            t.team_code AS owner_team_code
     FROM "${schema}".controls c
     LEFT JOIN (
       SELECT control_id, COUNT(*) AS cnt FROM "${schema}".evidence GROUP BY control_id
     ) ev ON ev.control_id = c.control_id
     LEFT JOIN "${schema}".teams t ON t.team_id = c.owner_team_id
     WHERE c.deleted_at IS NULL${needsScope ? ' AND (c.created_by = $1 OR c.owner = $1)' : ''}
     ORDER BY c.created_at DESC`,
    needsScope ? [user.userId] : []
  );
  const riskRes = await safeQuery(
    `SELECT risk_id, title, control_ids FROM "${schema}".risks`
  );
  const riskCountMap = new Map<string, number>();
  for (const r of riskRes.rows) {
    const ids: string[] = Array.isArray(r.control_ids) ? r.control_ids : [];
    for (const cid of ids) riskCountMap.set(cid, (riskCountMap.get(cid) || 0) + 1);
  }
  const controls = result.rows.map((c: GenericRow) => ({
    ...c,
    risk_count: riskCountMap.get(c.control_id) || 0,
  }));
  res.ok({ controls, count: controls.length });
}));

router.get("/team-distribution", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT
       team_name,
       COUNT(*) AS total_controls,
       COUNT(CASE WHEN implementation_status = 'implemented' THEN 1 END) AS implemented,
       COUNT(CASE WHEN implementation_status = 'partial' THEN 1 END) AS partial,
       COUNT(CASE WHEN implementation_status = 'not_implemented' THEN 1 END) AS not_implemented,
       ROUND(
         100.0 * COUNT(CASE WHEN implementation_status = 'implemented' THEN 1 END) / NULLIF(COUNT(*), 0), 1
       ) AS completion_pct
     FROM "${schema}".control_team_distribution ctd
     JOIN "${schema}".controls c ON c.control_id = ctd.control_id
     WHERE c.deleted_at IS NULL
     GROUP BY team_name
     ORDER BY total_controls DESC`
  ), { tenantId: req.tenantId!, operation: 'query control_team_distribution' });

  if (!result.rows.length) {
    const fallback = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT
         COALESCE(owner_team, 'Unassigned') AS team_name,
         COUNT(*) AS total_controls,
         COUNT(CASE WHEN implementation_status = 'implemented' THEN 1 END) AS implemented,
         COUNT(CASE WHEN implementation_status = 'partial' THEN 1 END) AS partial,
         COUNT(CASE WHEN implementation_status = 'not_implemented' THEN 1 END) AS not_implemented,
         ROUND(
           100.0 * COUNT(CASE WHEN implementation_status = 'implemented' THEN 1 END) / NULLIF(COUNT(*), 0), 1
         ) AS completion_pct
       FROM "${schema}".controls
       WHERE deleted_at IS NULL
       GROUP BY owner_team
       ORDER BY total_controls DESC`
    ), { tenantId: req.tenantId!, operation: 'query controls' });
    res.ok({ distribution: fallback.rows, count: fallback.rows.length });
    return;
  }

  res.ok({ distribution: result.rows, count: result.rows.length });
}));

router.get("/ccm-dashboard", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const [ctrlRes, _testRes, _failRes, _actRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT status, implementation_status, control_type, test_frequency,
        test_status, last_tested_at, owner, is_sox
      FROM "${schema}".controls WHERE deleted_at IS NULL`), { tenantId: req.tenantId!, operation: 'query controls' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT ct.* FROM "${schema}".control_tests ct
      JOIN "${schema}".controls c ON c.control_id = ct.control_id
      WHERE c.deleted_at IS NULL ORDER BY ct.tested_at DESC LIMIT 200`), { tenantId: req.tenantId!, operation: 'query controls' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT cf.* FROM "${schema}".control_failures cf
      JOIN "${schema}".controls c ON c.control_id = cf.control_id
      WHERE c.deleted_at IS NULL AND cf.resolved_at IS NULL
      ORDER BY cf.detected_at DESC LIMIT 100`), { tenantId: req.tenantId!, operation: 'query control_tests' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT ca.* FROM "${schema}".control_actions ca
      JOIN "${schema}".controls c ON c.control_id = ca.control_id
      WHERE c.deleted_at IS NULL AND ca.status != 'completed'
      ORDER BY ca.created_at DESC LIMIT 100`), { tenantId: req.tenantId!, operation: 'query control_failures' }),
  ]);
  const controls = ctrlRes.rows;
  const total = controls.length;
  const effective = controls.filter((c: GenericRow) => c.implementation_status === 'implemented' || c.status === 'effective').length;
  const effectivenessPct = total ? Math.round((effective / total) * 100) : 0;
  const automatable = controls.filter((c: GenericRow) => c.test_frequency === 'continuous' || c.test_frequency === 'automated').length;
  const testPassed = controls.filter((c: GenericRow) => c.test_status === 'passed').length;
  const testFailed = controls.filter((c: GenericRow) => c.test_status === 'failed').length;
  const now = Date.now();
  const staleTests = controls.filter((c: GenericRow) => {
    if (!c.last_tested_at) return true;
    return (now - new Date(c.last_tested_at).getTime()) > 90 * 86400000;
  }).length;

  const statusMap = new Map<string, number>();
  const freqMap = new Map<string, number>();
  const typeMap = new Map<string, number>();
  for (const c of controls) {
    const s = c.status || c.implementation_status || 'any';
    statusMap.set((s as any), (statusMap.get((s as any)) || 0) + 1);
    const f = c.test_frequency || 'manual';
    freqMap.set((f as any), (freqMap.get((f as any)) || 0) + 1);
    const t = c.control_type || 'other';
    typeMap.set((t as any), (typeMap.get((t as any)) || 0) + 1);
  }
  const byStatus = [...statusMap.entries()].map(([status, count]) => ({ status, count }));
  const byFrequency = [...freqMap.entries()].map(([frequency, count]) => ({ frequency, count }));
  const byType = [...typeMap.entries()].map(([type, count]) => ({ type, count }));

  const soxControls = controls.filter((c: GenericRow) => c.is_sox);
  const sox = {
    total: soxControls.length,
    certified: soxControls.filter((c: GenericRow) => c.status === 'certified').length,
    designOk: soxControls.filter((c: GenericRow) => c.test_status === 'design_effective').length,
    operatingOk: soxControls.filter((c: GenericRow) => c.test_status === 'operating_effective').length,
    deficient: soxControls.filter((c: GenericRow) => c.test_status === 'deficient' || c.test_status === 'failed').length,
  };

  const staleControls = controls.filter((c: GenericRow) => {
    if (!c.last_tested_at) return true;
    return (now - new Date(c.last_tested_at).getTime()) > 90 * 86400000;
  }).slice(0, 20).map((c: GenericRow) => ({
    control_ref: c.control_id,
    title: c.title || c.control_title || '',
    status: c.status || c.implementation_status || 'any',
    test_status: c.test_status || 'not_tested',
    last_tested_at: c.last_tested_at || null,
    control_frequency: c.test_frequency || 'manual',
  }));

  res.ok({
    summary: { effectivenessPct, total, automatable, testPassed, testFailed, staleTests },
    byStatus, byFrequency, byType, sox, staleControls,
  });
}));

router.get("/monitoring", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const [failedRes, overdueRes, actionsRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT c.control_id, c.title AS control_title, c.owner, c.test_status,
        c.last_tested_at, c.test_frequency, c.status,
        cf.failure_id, cf.failure_type, cf.severity, cf.detected_at, cf.description AS failure_description
      FROM "${schema}".controls c
      LEFT JOIN "${schema}".control_failures cf ON cf.control_id = c.control_id AND cf.resolved_at IS NULL
      WHERE c.deleted_at IS NULL AND (c.test_status = 'failed' OR cf.failure_id IS NOT NULL)
      ORDER BY cf.detected_at DESC NULLS LAST
    `), { tenantId: req.tenantId!, operation: 'query controls' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT c.control_id, c.title AS control_title, c.owner, c.test_status,
        c.last_tested_at, c.test_frequency,
        EXTRACT(DAY FROM NOW() - c.last_tested_at)::int AS days_since_test
      FROM "${schema}".controls c
      WHERE c.deleted_at IS NULL
        AND c.last_tested_at IS NOT NULL
        AND (
          (c.test_frequency = 'daily' AND c.last_tested_at < NOW() - INTERVAL '2 days')
          OR (c.test_frequency = 'weekly' AND c.last_tested_at < NOW() - INTERVAL '10 days')
          OR (c.test_frequency = 'monthly' AND c.last_tested_at < NOW() - INTERVAL '35 days')
          OR (c.test_frequency = 'quarterly' AND c.last_tested_at < NOW() - INTERVAL '100 days')
          OR (c.test_frequency = 'annually' AND c.last_tested_at < NOW() - INTERVAL '380 days')
          OR (c.last_tested_at < NOW() - INTERVAL '90 days')
        )
      ORDER BY days_since_test DESC
    `), { tenantId: req.tenantId!, operation: 'fallback query' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT ca.action_id, ca.control_id, ca.title, ca.description, ca.status, ca.priority,
        ca.assigned_to, ca.due_date, ca.created_at, ca.completed_at,
        c.title AS control_title
      FROM "${schema}".control_actions ca
      JOIN "${schema}".controls c ON c.control_id = ca.control_id
      WHERE c.deleted_at IS NULL AND ca.status NOT IN ('completed','deleted')
      ORDER BY CASE ca.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, ca.due_date ASC
    `), { tenantId: req.tenantId!, operation: 'query control_actions' }),
  ]);
  res.ok({
    failedControls: failedRes.rows,
    overdueTests: overdueRes.rows,
    remediationActions: actionsRes.rows,
    counts: {
      failed: failedRes.rows.length,
      overdue: overdueRes.rows.length,
      pendingActions: actionsRes.rows.length,
    },
  });
}));

router.get("/tests", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const controlId = req.query.control_id as string;
  const where = controlId ? `AND ct.control_id = $1` : '';
  const params = controlId ? [controlId] : [];
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT ct.*, c.title AS control_title
    FROM "${schema}".control_tests ct
    JOIN "${schema}".controls c ON c.control_id = ct.control_id
    WHERE c.deleted_at IS NULL ${where}
    ORDER BY ct.tested_at DESC LIMIT 200
  `, params), { tenantId: req.tenantId!, operation: 'query control_tests' });
  res.ok({ tests: result.rows, count: result.rows.length });
}));

router.post("/tests", authenticate, requirePermission("control.record.write"), validate({ body: createControlTestBody }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const tenantId = req.tenantId!;
  const { control_id, test_result, tester, notes, evidence_ref } = req.body;
  if (!control_id || !test_result) throw new ValidationError([{ path: "control_id", message: "control_id and test_result are required" }]);

  const ctrl = await safeQuery(`SELECT control_id, title, owner FROM "${schema}".controls WHERE control_id = $1 AND deleted_at IS NULL`, [control_id]);
  if (!getFirstRow(ctrl)) throw new NotFoundError("Control", control_id);

  const result = await safeQuery(`
    INSERT INTO "${schema}".control_tests (control_id, test_result, tester, notes, evidence_ref, tested_at)
    VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *
  `, [control_id, test_result, tester || req.user?.userId, notes || '', evidence_ref || null]);

  const enforcement = await enforceStatusTransition(tenantId, {
    moduleCode: 'compliance', table: 'controls', idColumn: 'control_id',
    entityId: control_id, toStatus: test_result, actorUserId: req.user?.userId || 'system',
    statusColumn: 'test_status', extraSets: 'last_tested_at = NOW()',
  });
  if (!enforcement.success) {
    await safeQuery(`UPDATE "${schema}".controls SET test_status = $1, last_tested_at = NOW(), updated_at = NOW() WHERE control_id = $2`,
      [test_result, control_id]);
  }

  if (test_result === 'failed') {
    await safeQuery(`
      INSERT INTO "${schema}".control_failures (control_id, failure_type, severity, description, detected_at)
      VALUES ($1, 'test_failure', 'high', $2, NOW())
    `, [control_id, `Control test failed. Notes: ${notes || 'N/A'}`]).catch(catchHandler(EC.EVENT_BUS, {}));

    const { createGovernanceActionFromControlFailure } = await import('../../../../governance/services/governance/governance-hooks.service.js');
    await createGovernanceActionFromControlFailure(tenantId, control_id, 'high');
  }

  setAuditData(res as any, { action: "create", entityType: "control_test", entityId: getFirstRow(result)?.test_id, afterState: getFirstRow(result) });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user?.userId || 'system', module: 'controls', event: 'tested', entityType: 'control', entityId: control_id, data: { ...getFirstRow(result), test_result } } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.created(getFirstRow(result));
}));

router.get("/failures", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const resolved = req.query.resolved === 'true';
  const where = resolved ? '' : 'AND cf.resolved_at IS NULL';
  // secrets-scan-allow: schema tenantSchema()-validated; optional resolved-filter is a literal SQL fragment or empty string
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT cf.*, c.title AS control_title, c.owner
    FROM "${schema}".control_failures cf
    JOIN "${schema}".controls c ON c.control_id = cf.control_id
    WHERE c.deleted_at IS NULL ${where}
    ORDER BY cf.detected_at DESC LIMIT 200
  `), { tenantId: req.tenantId!, operation: 'query control_failures' });
  res.ok({ failures: result.rows, count: result.rows.length });
}));

router.post("/failures/:id/resolve", authenticate, requirePermission("control.record.write"), validate({ body: resolveFailureBody }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const { resolution_note } = req.body;
  const result = await safeQuery(`
    UPDATE "${schema}".control_failures SET resolved_at = NOW(), resolution_note = $2, resolved_by = $3, updated_at = NOW()
    WHERE failure_id = $1 RETURNING *
  `, [req.params.id, resolution_note || '', req.user?.userId]);
  if (!getFirstRow(result)) throw new NotFoundError("ControlFailure", req.params.id);
  setAuditData(res as any, { action: "update", entityType: "control_failure", entityId: req.params.id });
  res.ok(getFirstRow(result));
}));

router.get("/actions", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const statusFilter = req.query.status as string;
  const where = statusFilter ? `AND ca.status = $1` : '';
  const params = statusFilter ? [statusFilter] : [];
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT ca.*, c.title AS control_title
    FROM "${schema}".control_actions ca
    JOIN "${schema}".controls c ON c.control_id = ca.control_id
    WHERE c.deleted_at IS NULL ${where}
    ORDER BY ca.created_at DESC LIMIT 200
  `, params), { tenantId: req.tenantId!, operation: 'query control_actions' });
  res.ok({ actions: result.rows, count: result.rows.length });
}));

/** @swagger
 * /controls/{id}:
 *   get:
 *     summary: Get control by ID with risk linkage
 *     tags: [Controls]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Control detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Control'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT c.*, t.name AS owner_team_name, t.team_code AS owner_team_code
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".teams t ON t.team_id = c.owner_team_id
     WHERE c.control_id = $1`,
    [req.params.id]
  );
  if (!getFirstRow(result)) throw new NotFoundError("Control", req.params.id);
  const [evResult, riskResult] = await Promise.all([
    safeQuery(
      `SELECT evidence_id, title, status, submitted_by, created_at
       FROM "${schema}".evidence WHERE control_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [req.params.id]
    ),
    safeQuery(
      `SELECT risk_id, title, category, risk_score, status
       FROM "${schema}".risks WHERE $1 = ANY(control_ids)`,
      [req.params.id]
    ),
  ]);
  res.ok({
    ...getFirstRow(result),
    evidence_count: evResult.rows.length,
    evidence_items: evResult.rows,
    risk_count: riskResult.rows.length,
    linked_risks: riskResult.rows,
  });
}));

/** @swagger
 * /controls:
 *   post:
 *     summary: Create a new control
 *     tags: [Controls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Control'
 *     responses:
 *       201:
 *         description: Control created
 */
router.post("/", authenticate, requirePermission("control.record.write"), validate({ body: createControlBody }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const { title, description, control_type, status, framework_id } = req.body;
  if (!title) throw new ValidationError([{ path: "title", message: "title is required" }]);
  // Resolve org_unit_id from user's department for enterprise auth scope binding
  const creatorUserId = req.user?.userId;
  let orgUnitId: number | null = null;
  try {
    const deptRes = await safeQuery(
      `SELECT d.id FROM "${schema}".departments d
       JOIN "${schema}".users u ON u.department_id = d.id
       WHERE u.user_id = $1 LIMIT 1`, [creatorUserId]);
    orgUnitId = getFirstRow(deptRes)?.id || null;
  } catch { /* best effort */ }

  const result = await safeQuery(
    `INSERT INTO "${schema}".controls (title, description, control_type, status, framework_id, created_by, owner_user_id, org_unit_id)
     VALUES ($1,$2,$3,$4,$5,$6,$6,$7) RETURNING *`,
    [title, description || '', control_type || 'preventive', status || 'draft', framework_id || null, creatorUserId, orgUnitId]
  );
  setAuditData(res as any, { action: "create", entityType: "control", entityId: getFirstRow(result)?.control_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user?.userId || 'system', module: 'controls', event: 'created', entityType: 'control', entityId: getFirstRow(result)?.control_id, data: getFirstRow(result) } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:controls.control.created' });
  res.created(getFirstRow(result));
}));

/** @swagger
 * /controls/{id}:
 *   put:
 *     summary: Update an existing control
 *     tags: [Controls]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Control updated
 */
router.put("/:id", authenticate, requirePermission("control.record.write"), requireOwnership("control"), lifecycleGate('compliance'), validate({ body: updateControlBody }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const ALLOWED = ['title','description','control_type','status','framework_id','owner','owner_team_id','secondary_owner_team_id'];
  const cols = Object.keys(req.body).filter(k => ALLOWED.includes(k));
  if (cols.length === 0) throw new ValidationError([{ path: "body", message: "No valid fields provided" }]);
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => req.body[c]);
  const result = await safeQuery(`UPDATE "${schema}".controls SET ${sets.join(', ')}, updated_at = NOW() WHERE control_id = $1 RETURNING *`, [req.params.id, ...vals]);
  if (!getFirstRow(result)) throw new NotFoundError("Control", req.params.id);
  setAuditData(res as any, { action: "update", entityType: "control", entityId: req.params.id as string, afterState: getFirstRow(result) });
  const ctrlEvent = req.body.status ? 'status_changed' : 'updated';
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user?.userId || 'system', module: 'controls', event: ctrlEvent, entityType: 'control', entityId: req.params.id as string, data: getFirstRow(result) } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:controls.control.any' });
  res.ok(getFirstRow(result));
}));

router.post("/bulk-assign-team", authenticate, requirePermission("control.record.write"), validate({ body: bulkAssignTeamBody }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const { control_ids, owner_team_id } = req.body;
  if (!Array.isArray(control_ids) || control_ids.length === 0) {
    throw new ValidationError([{ path: "control_ids", message: "control_ids array is required" }]);
  }
  const placeholders = control_ids.map((_: string, i: number) => `$${i + 2}`).join(',');
  await safeQuery(
    `UPDATE "${schema}".controls SET owner_team_id = $1, updated_at = NOW()
     WHERE control_id IN (${placeholders}) AND deleted_at IS NULL`,
    [owner_team_id || null, ...control_ids]
  );
  setAuditData(res as any, { action: "update", entityType: "controls", entityId: control_ids.join(',') });
  res.ok({ updated: control_ids.length, owner_team_id: owner_team_id || null });
}));

router.delete("/:id", authenticate, requirePermission("control.record.delete"), requireOwnership("control"), validate({ body: genericComplianceSchema }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`UPDATE "${schema}".controls SET deleted_at = NOW() WHERE control_id = $1 AND deleted_at IS NULL RETURNING control_id`, [req.params.id]);
  if (!getFirstRow(result)) throw new NotFoundError("Control", req.params.id);
  setAuditData(res as any, { action: "delete", entityType: "control", entityId: req.params.id as string });
  res.deleted("Control deleted");
}));

// ═══════════════════════════════════════════════════════════════
// AI-First Enhancements — Dynamic, DB-driven, AI-powered
// ═══════════════════════════════════════════════════════════════

// GET /controls/:id/ai-analysis — AI-powered control analysis
router.get("/:id/ai-analysis", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const control = await safeQuery(
    `SELECT c.*,
       (SELECT COUNT(*) FROM "${schema}".control_tests ct WHERE ct.control_id = c.control_id AND ct.test_result = 'fail' AND ct.tested_at > NOW() - INTERVAL '90 days') AS recent_failures,
       (SELECT COUNT(*) FROM "${schema}".evidence e WHERE e.control_id = c.control_id) AS evidence_count,
       (SELECT json_agg(json_build_object('risk_id', r.risk_id, 'title', r.title, 'severity', r.severity)) FROM "${schema}".risks r WHERE r.control_ids @> ARRAY[c.control_id]) AS linked_risks
     FROM "${schema}".controls c WHERE c.control_id = $1 AND c.deleted_at IS NULL`,
    [req.params.id]
  );
  if (!control.rows[0]) { res.status(404).json({ error: 'Control not found' }); return; }

  const { claudeJSON } = await import('../../../../../config/app/claude-client.js');
  const analysis = await claudeJSON({
    systemPrompt: `You are an AI-first GRC control analyst. Analyze the control and provide structured JSON:
{
  effectiveness_score: number (0-100),
  risk_level: "low"|"medium"|"high"|"critical",
  maturity_level: "initial"|"managed"|"defined"|"measured"|"optimizing",
  key_findings: string[],
  improvement_areas: string[],
  recommendations: [{action: string, priority: "high"|"medium"|"low", expected_impact: string}],
  evidence_gaps: string[],
  regulatory_alignment: {aligned: boolean, gaps: string[]},
  predicted_next_failure_window: string,
  confidence: number (0-1)
}`,
    userMessage: `Analyze this GRC control:\n${JSON.stringify(control.rows[0], null, 2)}`,
    maxTokens: 1536,
    temperature: 0.2,
  });

  res.json({ control_id: req.params.id, ...analysis });
}));

// POST /controls/ai-recommendations — AI recommendations for control improvements
router.post("/ai-recommendations", authenticate, requirePermission("control.record.read"), validate({ body: createAiRecommendationsBody }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const { scope, framework_id } = req.body;

  // Gather control landscape
  const [controls, recentFailures, evidenceGaps] = await Promise.all([
    safeQuery(`SELECT control_id, title, implementation_status, test_status, owner, control_type, last_tested_at
               FROM "${schema}".controls WHERE deleted_at IS NULL${framework_id ? ' AND framework_id = $1' : ''}
               ORDER BY CASE WHEN test_status = 'failed' THEN 0 WHEN implementation_status = 'not_implemented' THEN 1 ELSE 2 END
               LIMIT 100`, framework_id ? [framework_id] : []),
    safeQuery(`SELECT ct.control_id, c.title, ct.test_result, ct.tested_at
               FROM "${schema}".control_tests ct
               JOIN "${schema}".controls c ON c.control_id = ct.control_id
               WHERE ct.test_result = 'fail' AND ct.tested_at > NOW() - INTERVAL '90 days'
               ORDER BY ct.tested_at DESC LIMIT 20`),
    safeQuery(`SELECT c.control_id, c.title, COUNT(e.evidence_id) AS evidence_count
               FROM "${schema}".controls c
               LEFT JOIN "${schema}".evidence e ON e.control_id = c.control_id
               WHERE c.deleted_at IS NULL
               GROUP BY c.control_id, c.title
               HAVING COUNT(e.evidence_id) = 0
               LIMIT 20`),
  ]);

  const { claudeJSON } = await import('../../../../../config/app/claude-client.js');
  const recommendations = await claudeJSON({
    systemPrompt: `You are an AI-first GRC platform providing actionable control improvement recommendations.
Respond with JSON: {
  recommendations: [{
    priority: "critical"|"high"|"medium"|"low",
    category: "remediation"|"evidence"|"testing"|"documentation"|"automation",
    title_en: string, title_ar: string,
    description: string,
    affected_controls: string[],
    expected_effort: "hours"|"days"|"weeks",
    compliance_impact: string,
    auto_actionable: boolean
  }],
  summary: { total_issues: number, critical_count: number, quick_wins: number },
  overall_health_score: number (0-100)
}`,
    userMessage: `Scope: ${scope || 'all'}\nControls (${controls.rows.length}):\n${JSON.stringify(controls.rows)}\n\nRecent Failures:\n${JSON.stringify(recentFailures.rows)}\n\nEvidence Gaps:\n${JSON.stringify(evidenceGaps.rows)}`,
    maxTokens: 2048,
    temperature: 0.3,
  });

  res.json(recommendations);
}));

// POST /controls/bulk-ai-assess — Bulk AI assessment of controls
router.post("/bulk-ai-assess", authenticate, requirePermission("control.record.read"), validate({ body: bulkBulkAiAssessBody }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const { control_ids } = req.body;

  const controlsQuery = control_ids?.length
    ? `SELECT * FROM "${schema}".controls WHERE control_id = ANY($1) AND deleted_at IS NULL`
    : `SELECT * FROM "${schema}".controls WHERE deleted_at IS NULL LIMIT 50`;
  const controls = await safeQuery(controlsQuery, control_ids?.length ? [control_ids] : []);

  const { claudeJSON } = await import('../../../../../config/app/claude-client.js');
  const assessment = await claudeJSON({
    systemPrompt: `You are an AI-first GRC bulk control assessor. For each control, provide:
{assessments: [{control_id, effectiveness_score (0-100), risk_level, gaps: string[], priority_action: string}],
 portfolio_risk_score: number (0-100), systemic_issues: string[], cross_cutting_recommendations: string[]}`,
    userMessage: `Assess these ${controls.rows.length} controls:\n${JSON.stringify(controls.rows.map((c: GenericRow) => ({ control_id: c.control_id, title: c.title, status: c.implementation_status, test_status: c.test_status, type: c.control_type })))}`,
    maxTokens: 2048,
    temperature: 0.2,
  });

  res.json(assessment);
}));

// GET /controls/field-config — Dynamic field configuration from DB
router.get("/field-config", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const config = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".endpoint_config WHERE endpoint_pattern LIKE '%controls%' AND enabled = true`
  ), { tenantId: req.tenantId!, operation: 'query endpoint_config' });

  const fieldDefs = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = 'controls'
     ORDER BY ordinal_position`,
    [schema]
  ), { tenantId: req.tenantId!, operation: 'query endpoint_config' });

  res.json({
    endpoint_config: config.rows[0] || null,
    field_definitions: fieldDefs.rows,
    searchable: config.rows[0]?.searchable_fields || ['title', 'description', 'control_id'],
    filterable: config.rows[0]?.filterable_fields || ['status', 'implementation_status', 'control_type', 'framework_id'],
    sortable: fieldDefs.rows.map((f: GenericRow) => f.column_name),
  });
}));

// GET /controls/search — AI-powered semantic search
router.get("/search", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const { q, framework_id, limit: maxResults } = req.query;

  if (!q) { res.status(400).json({ error: 'Query parameter q is required' }); return; }

  // Full-text search with ts_rank scoring
  const textResults = await safeQuery(
    `SELECT control_id, title, description, implementation_status, control_type, owner,
            ts_rank(to_tsvector('english', COALESCE(title,'') || ' ' || COALESCE(description,'')), plainto_tsquery('english', $1)) AS rank
     FROM "${schema}".controls
     WHERE deleted_at IS NULL
       AND (to_tsvector('english', COALESCE(title,'') || ' ' || COALESCE(description,'')) @@ plainto_tsquery('english', $1)
            OR title ILIKE '%' || $1 || '%' OR description ILIKE '%' || $1 || '%')
     ${framework_id ? 'AND framework_id = $2' : ''}
     ORDER BY rank DESC LIMIT $${framework_id ? '3' : '2'}`,
    framework_id ? [q, framework_id, parseInt(maxResults as string) || 20] : [q, parseInt(maxResults as string) || 20]
  );

  // If few text results, use AI for semantic matching
  let aiSuggestions: unknown[] = [];
  if (textResults.rows.length < 5) {
    try {
      const allControls = await safeQuery(
        `SELECT control_id, title, description FROM "${schema}".controls WHERE deleted_at IS NULL LIMIT 200`
      );
      const { claudeJSON } = await import('../../../../../config/app/claude-client.js');
      const semantic = await claudeJSON({
        systemPrompt: 'You are a semantic search engine for GRC controls. Return JSON: {matches: [{control_id, relevance_score (0-1), reason: string}]}',
        userMessage: `Query: "${q}"\nControls:\n${JSON.stringify(allControls.rows.map((c: GenericRow) => ({ id: c.control_id, title: c.title, desc: c.description?.slice(0, 100) })))}`,
        maxTokens: 1024,
        temperature: 0.1,
      });
      aiSuggestions = semantic.matches || [];
    } catch { /* AI search is best-effort */ }
  }

  res.json({ results: textResults.rows, ai_suggestions: aiSuggestions, total: textResults.rows.length });
}));

export default router;

