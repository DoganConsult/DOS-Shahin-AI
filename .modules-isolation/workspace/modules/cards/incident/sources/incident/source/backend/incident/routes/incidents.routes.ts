import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import {
  reportIncident, getIncidents, getIncidentById, updateIncident,
  investigateIncident, recordLessonsLearned, updateIncidentStatus,
} from '../services/incident/incident.service';
import { errMsg } from "../../../i18n/error-messages";
import { emitEvent, eventBus } from '../ports/events.port';
import { enforceStatusTransition } from '../ports/platform.port';
import { getIncidentSlaConfig } from '../services/incident/incident-sla-config.service';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { reportIncidentBody, updateIncidentBody, investigateBody, lessonsLearnedBody, createActionBody, updateActionBody, createRootCauseBody, updateStatusBody } from "../schemas/incident.schemas";
import { idParam } from "../../../schemas/common.schemas";
import { requireOwnership, auditMiddleware, setAuditData, automationMiddleware, lifecycleGate, lifecycleStatusEndpoint, fieldRbacFilter, enforceMandatoryFields, enforceStageGates, validate, moduleStack } from '../ports/middleware.port';
import { swallow, swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';

const router = Router();
router.use(moduleStack('incident'));
router.use(auditMiddleware("incidents"));
router.use(automationMiddleware("incidents"));
router.use(fieldRbacFilter("incident"));
router.use(enforceMandatoryFields("incident"));
router.use(enforceStageGates("incident"));

/**
 * @openapi
 * /incidents/governance-pipeline:
 *   get:
 *     tags: [Incidents]
 *     summary: Get incident governance pipeline (SLA breaches, actions, root causes)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Governance pipeline data
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/governance-pipeline", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("incident.record.read"), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const SLA_HOURS = await getIncidentSlaConfig(req.tenantId!);
  const [breachedRes, actionsRes, rootCauseRes] = await Promise.all([
  // secrets-scan-allow: schema tenantSchema()-validated; filter fragment composed of literals
  swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
  SELECT i.*,
  EXTRACT(EPOCH FROM (COALESCE(i.resolved_at, NOW()) - i.created_at)) / 3600 AS hours_elapsed
  FROM "${schema}".incidents i
  WHERE i.deleted_at IS NULL
  AND i.status NOT IN ('resolved', 'closed')
  AND (
  (i.severity = 'critical' AND i.created_at < NOW() - INTERVAL '${SLA_HOURS.critical} hours')
  OR (i.severity = 'high' AND i.created_at < NOW() - INTERVAL '${SLA_HOURS.high} hours')
  OR (i.severity = 'medium' AND i.created_at < NOW() - INTERVAL '${SLA_HOURS.medium} hours')
  OR (i.severity = 'low' AND i.created_at < NOW() - INTERVAL '${SLA_HOURS.low} hours')
  )
  ORDER BY CASE i.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, i.created_at ASC
  `), { tenantId: req.tenantId!, operation: 'fallback query' }),
  swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
  SELECT ra.*, i.title AS incident_title, i.severity AS incident_severity
  FROM "${schema}".incident_response_actions ra
  JOIN "${schema}".incidents i ON i.incident_id = ra.incident_id
  WHERE ra.deleted_at IS NULL AND ra.status NOT IN ('completed', 'cancelled')
  ORDER BY CASE ra.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, ra.due_date ASC
  `), { tenantId: req.tenantId!, operation: 'query incident_response_actions' }),
  swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
  SELECT rc.*, i.title AS incident_title
  FROM "${schema}".incident_root_causes rc
  JOIN "${schema}".incidents i ON i.incident_id = rc.incident_id
  WHERE rc.deleted_at IS NULL
  ORDER BY rc.created_at DESC LIMIT 100
  `), { tenantId: req.tenantId!, operation: 'query incident_root_causes' }),
  ]);
  const openRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
  SELECT severity, COUNT(*)::int AS count FROM "${schema}".incidents
  WHERE deleted_at IS NULL AND status NOT IN ('resolved','closed')
  GROUP BY severity
  `), { tenantId: req.tenantId!, operation: 'query incident_root_causes' });
  const severityCounts: Record<string, number> = {};

  for (const r of openRes.rows) severityCounts[(r as any).severity] = r.count;

  res.json({
  slaBreaches: breachedRes.rows,
  pendingActions: actionsRes.rows,
  rootCauses: rootCauseRes.rows,
  severityCounts,
  slaConfig: SLA_HOURS,
  counts: {
  breached: breachedRes.rows.length,
  pendingActions: actionsRes.rows.length,
  rootCauses: rootCauseRes.rows.length,
  },
  });
});

router.get("/:id/updates", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("incident.record.read"), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`
  SELECT * FROM "${schema}".incident_updates
  WHERE incident_id = $1 AND deleted_at IS NULL
  ORDER BY created_at DESC
  `, [req.params.id]);
  res.json({ updates: result.rows, count: result.rows.length });
});

router.get("/:id/actions", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("incident.record.read"), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`
  SELECT * FROM "${schema}".incident_response_actions
  WHERE incident_id = $1 AND deleted_at IS NULL
  ORDER BY created_at DESC
  `, [req.params.id]);
  res.json({ actions: result.rows, count: result.rows.length });
});

router.post("/:id/actions", authenticate, requirePermission("incident.write"), validate({ body: createActionBody }), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const { title, description, action_type, assigned_to, due_date, priority } = req.body;
  if (!title) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const result = await safeQuery(`
  INSERT INTO "${schema}".incident_response_actions
  (incident_id, title, description, action_type, assigned_to, due_date, priority, status)
  VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *
  `, [req.params.id, title, description || '', action_type || 'remediation', assigned_to || null, due_date || null, priority || 'medium']);
  setAuditData(res as any, { action: "create", entityType: "incident_action", entityId: getFirstRow(result)?.action_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'incidents', event: 'action_created', entityType: 'incident_action', entityId: getFirstRow(result)?.action_id, data: getFirstRow(result) } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:incidents.incident_action.action_created' });
  res.status(201).json(getFirstRow(result));
});

router.put("/:incidentId/actions/:actionId", authenticate, requirePermission("incident.write"), validate({ body: updateActionBody }), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const { status, outcome } = req.body;
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [req.params.actionId];
  let idx = 2;
  if (status) { sets.push(`status = $${idx++}`); params.push(status); }
  if (outcome) { sets.push(`outcome = $${idx++}`); params.push(outcome); }
  if (status === 'completed') { sets.push(`completed_at = NOW()`); }
  const result = await safeQuery(`
  UPDATE "${schema}".incident_response_actions SET ${sets.join(', ')}
  WHERE action_id = $1 AND deleted_at IS NULL RETURNING *
  `, params);
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: "update", entityType: "incident_action", entityId: req.params.actionId });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'incidents', event: 'action_updated', entityType: 'incident_action', entityId: req.params.actionId, data: getFirstRow(result) } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:incidents.incident_action.action_updated' });
  res.json(getFirstRow(result));
});

router.get("/:id/root-causes", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("incident.record.read"), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`
  SELECT * FROM "${schema}".incident_root_causes
  WHERE incident_id = $1 AND deleted_at IS NULL
  ORDER BY created_at DESC
  `, [req.params.id]);
  res.json({ rootCauses: result.rows, count: result.rows.length });
});

router.post("/:id/root-causes", authenticate, requirePermission("incident.write"), validate({ body: createRootCauseBody }), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const { category, description, contributing_factors, corrective_action, preventive_action, control_id } = req.body;
  if (!category || !description) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const result = await safeQuery(`
  INSERT INTO "${schema}".incident_root_causes
  (incident_id, category, description, contributing_factors, corrective_action, preventive_action, identified_by)
  VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
  `, [req.params.id, category, description, contributing_factors || '', corrective_action || '', preventive_action || '', req.user?.userId]);

  await safeQuery(`UPDATE "${schema}".incidents SET root_cause = $1, updated_at = NOW() WHERE incident_id = $2`,
  [description, req.params.id]).catch(catchHandler(EC.EVENT_BUS, {}));

  const incident = await getIncidentById(req.tenantId!, req.params.id);
  const affectedControls = incident?.affected_controls ?? [];
  try {
  await eventBus.publish(({
    eventType: 'incident.root_cause_identified',
    tenantId: req.tenantId!,
    entityId: req.params.id,
    sourceService: 'incidents',
    severity: 'info',
    payload: {
    incidentId: req.params.id,
    rootCauseId: getFirstRow(result)?.root_cause_id,
    control_id: control_id || null,
    affected_controls: Array.isArray(affectedControls) ? affectedControls : [],
    },
    } as any));
  } catch { /* best-effort */ }

  setAuditData(res as any, { action: "create", entityType: "incident_root_cause", entityId: getFirstRow(result)?.root_cause_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'incidents', event: 'root_cause_created', entityType: 'incident_root_cause', entityId: getFirstRow(result)?.root_cause_id, data: getFirstRow(result) } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:incidents.incident_root_cause.root_cause_created' });
  res.status(201).json(getFirstRow(result));
});

/**
 * @openapi
 * /incidents:
 *   get:
 *     tags: [Incidents]
 *     summary: List all incidents with optional filters
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: status
 *         in: query
 *         schema: { type: string, enum: [open, investigating, contained, resolved, closed] }
 *       - name: severity
 *         in: query
 *         schema: { type: string, enum: [critical, high, medium, low] }
 *       - name: category
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of incidents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Incident'
 */
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("incident.record.read"), async (req: Request, res: Response) => {
  const filters = {
  status: req.query.status as string | undefined,
  severity: req.query.severity as string | undefined,
  category: req.query.category as string | undefined,
  };
  const user = req.user!;
  const incidents = await getIncidents(req.tenantId!, filters, user ? { userId: user.userId, role: user.role } : undefined);
  res.json({ incidents, count: incidents.length });
});

/**
 * @openapi
 * /incidents/{id}:
 *   get:
 *     tags: [Incidents]
 *     summary: Get incident by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Incident details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Incident'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("incident.record.read"), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const incident = await getIncidentById(req.tenantId!, id);
  if (!incident) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json(incident);
});

/**
 * @openapi
 * /incidents:
 *   post:
 *     tags: [Incidents]
 *     summary: Report a new incident
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Incident'
 *     responses:
 *       201:
 *         description: Incident created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Incident'
 *       400:
 *         description: Validation error
 */
router.post("/", authenticate, requirePermission("incident.write"), validate({ body: reportIncidentBody }), async (req: Request, res: Response) => {
  const { title, description, category } = req.body;
  if (!title || !category) {
  res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return;
  }
  // Resolve org_unit_id from user's department for enterprise auth scope binding
  let orgUnitId: number | null = null;
  try {
  const _schema = tenantSchema(req.tenantId!);
  const _deptRes = await safeQuery(
  `SELECT d.id FROM "${_schema}".departments d JOIN "${_schema}".users u ON u.department_id = d.id WHERE u.user_id = $1 LIMIT 1`,
  [req.user?.userId]);
  orgUnitId = getFirstRow(_deptRes)?.id || null;
  } catch { /* best effort */ }
  const incident = await reportIncident(req.tenantId!, {
  ...req.body,
  description: description ?? "",
  reportedBy: req.user!.userId!,
  org_unit_id: orgUnitId,
  });

  setAuditData(res as any, { action: "create", entityType: "incident", entityId: incident.incident_id, afterState: incident });

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'incidents', event: 'created', entityType: 'incident', entityId: incident.incident_id, data: incident } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:incidents.incident.created' });
  res.status(201).json(incident);
});

// PUT /:id — General edit of incident fields
/**
 * @openapi
 * /incidents/{id}:
 *   put:
 *     tags: [Incidents]
 *     summary: Update an incident
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Incident'
 *     responses:
 *       200:
 *         description: Updated incident
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put("/:id", authenticate, requirePermission("incident.write"), validate({ params: idParam, body: updateIncidentBody }), requireOwnership("incident"), lifecycleGate('incident'), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const before = await getIncidentById(req.tenantId!, id);
  if (!before) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  const incident = await updateIncident(req.tenantId!, id, req.body);
  const _s = tenantSchema(req.tenantId!);
  safeQuery(`INSERT INTO "${_s}".incident_updates (incident_id, update_type, update_text, updated_by) VALUES ($1, 'field_edit', $2, $3)`,
  [id, `Fields updated: ${Object.keys(req.body).join(', ')}`, req.user?.userId || null]).catch(catchHandler(EC.EVENT_BUS, {}));
  setAuditData(res as any, { action: "update", entityType: "incident", entityId: id, beforeState: before, afterState: incident });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'incidents', event: 'updated', entityType: 'incident', entityId: id, data: incident, previousData: before } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:incidents.incident.updated' });
  res.json(incident);
});

router.put("/:id/investigate", authenticate, requirePermission("incident.write"), validate({ params: idParam, body: investigateBody }), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const before = await getIncidentById(req.tenantId!, id);
  const incident = await investigateIncident(req.tenantId!, id, {
  ...req.body, assignedTo: req.body.assignedTo || req.user!.userId!,
  });
  const _s = tenantSchema(req.tenantId!);
  safeQuery(`INSERT INTO "${_s}".incident_updates (incident_id, update_type, update_text, status_change_from, status_change_to, updated_by) VALUES ($1, 'investigation', $2, $3, $4, $5)`,
  [id, `Investigation started, assigned to ${req.body.assignedTo || req.user!.userId!}`, before?.status || null, 'investigating', req.user!?.userId || null]).catch(catchHandler(EC.EVENT_BUS, {}));
  setAuditData(res as any, { action: "update", entityType: "incident", entityId: id, beforeState: before, afterState: incident });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'incidents', event: 'investigated', entityType: 'incident', entityId: id, data: incident, previousData: before } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:incidents.incident.investigated' });
  res.json(incident);
});

router.put("/:id/lessons", authenticate, requirePermission("incident.write"), validate({ params: idParam, body: lessonsLearnedBody }), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { lessonsLearned } = req.body;
  if (!lessonsLearned) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const before = await getIncidentById(req.tenantId!, id);
  const incident = await recordLessonsLearned(req.tenantId!, id, { lessonsLearned });
  const _s = tenantSchema(req.tenantId!);
  safeQuery(`INSERT INTO "${_s}".incident_updates (incident_id, update_type, update_text, status_change_from, status_change_to, updated_by) VALUES ($1, 'lessons_learned', $2, $3, 'closed', $4)`,
  [id, lessonsLearned.substring(0, 500), before?.status || null, req.user?.userId || null]).catch(catchHandler(EC.EVENT_BUS, {}));
  setAuditData(res as any, { action: "update", entityType: "incident", entityId: id, beforeState: before, afterState: incident });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'incidents', event: 'lessons_recorded', entityType: 'incident', entityId: id, data: incident, previousData: before } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:incidents.incident.lessons_recorded' });
  res.json(incident);
});

router.put("/:id/status", authenticate, requirePermission("incident.write"), validate({ body: updateStatusBody }), lifecycleStatusEndpoint('incident'), async (req: Request, res: Response) => {
  try {
  const id = req.params.id as string;
  const { status } = req.body;
  if (!status) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const before = await getIncidentById(req.tenantId!, id);
  const incident = await updateIncidentStatus(req.tenantId!, id, status);
  const schema = tenantSchema(req.tenantId!);
  safeQuery(`INSERT INTO "${schema}".incident_updates (incident_id, update_type, status_change_from, status_change_to, updated_by) VALUES ($1, 'status_change', $2, $3, $4)`,
  [id, before?.status || null, status, req.user?.userId || null]).catch(catchHandler(EC.EVENT_BUS, {}));
  setAuditData(res as any, { action: "update", entityType: "incident", entityId: id, beforeState: before, afterState: incident });
  const incEvt = status === 'resolved' ? 'resolved' : 'status_changed';

  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'incidents', event: incEvt, entityType: 'incident', entityId: id, data: { ...incident, status }, previousData: before } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json(incident);
  } catch (err: unknown) {
  const code = toErrorMessage(err).includes("not found") ? 404 : toErrorMessage(err).includes("Invalid") ? 400 : 500;
  res.status(code).json({ error: code === 404 ? errMsg('NOT_FOUND', req) : code === 400 ? errMsg('INVALID_INPUT', req) : errMsg('INTERNAL_ERROR', req) });
  }
});

// DELETE /:id — Soft-delete an incident
/**
 * @openapi
 * /incidents/{id}:
 *   delete:
 *     tags: [Incidents]
 *     summary: Delete an incident (soft delete)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Incident deleted
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete("/:id", validate({ body: genericPayloadSchema }), authenticate, requirePermission("incident.delete"), requireOwnership("incident"), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const schema = tenantSchema(req.tenantId!);
  const before = await getIncidentById(req.tenantId!, id);
  if (!before) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  const tenantId = req.tenantId!;
  const enforcement = await enforceStatusTransition(tenantId, {
  moduleCode: 'incident', table: 'incidents', idColumn: 'incident_id',
  entityId: id, toStatus: 'closed', actorUserId: req.user!.userId!,
  extraSets: 'deleted_at = NOW(), resolved_at = COALESCE(resolved_at, NOW())',
  });
  if (!enforcement.success && enforcement.blocked) {
  res.status(403).json({ error: 'Transition denied', reason: enforcement.reason }); return;
  }
  if (!enforcement.success) {
  await safeQuery(`UPDATE "${schema}".incidents SET status = 'closed', deleted_at = NOW(), resolved_at = COALESCE(resolved_at, NOW()) WHERE incident_id = $1`, [id]);
  }
  safeQuery(`INSERT INTO "${schema}".incident_updates (incident_id, update_type, update_text, status_change_from, status_change_to, updated_by) VALUES ($1, 'deleted', 'Incident soft-deleted', $2, 'closed', $3)`,
  [id, before?.status || null, req.user?.userId || null]).catch(catchHandler(EC.EVENT_BUS, {}));
  setAuditData(res as any, { action: "delete", entityType: "incident", entityId: id, beforeState: before });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'incidents', event: 'deleted', entityType: 'incident', entityId: id, data: { status: 'closed' }, previousData: before } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json({ message: "Incident deleted", incident_id: id });
});

export default router;

