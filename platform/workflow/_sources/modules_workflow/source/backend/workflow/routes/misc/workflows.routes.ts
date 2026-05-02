import { Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../../ports/auth.port';
import {

  saveWorkflow, getWorkflows, getWorkflowById,

  executeWorkflow, simulateWorkflow, getWorkflowAnalytics,

  createApprovalStep, resolveApproval, validatePreconditions,

  saveWorkflowTemplate, getWorkflowTemplates, getWorkflowTemplateById,

  instantiateTemplate, executeNotificationStep,

  getExecutionDetail, getExecutionActivity,
} from '../../services/core/workflow.service';
import { emptyResult } from '../../ports/database.port';
import { isTenantWideExecutionRole } from "@shahin/shared-workflow-types";
import { checkEscalations } from '../../ports/platform.port';
import { errMsg } from "../../../../i18n/error-messages";
import { toErrorMessage } from '@dos/module-sdk';
import { emitEvent, eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import { saveWorkflowBody, updateWorkflowBody, createApprovalStepBody, instantiateTemplateBody, startInstanceBody, changeStatusBody, executeWorkflowBody, resumeWorkflowBody, simulateWorkflowBody, bulkCancelBody, createPublishBody, createSeedBody, createCancelBody, createResumeBody, updateResolveBody, createCheckBody, createValidateBody, createNotificationStepBody, createRevertBody } from "../../schemas/workflow.schemas";
import { idParam } from "../../../../schemas/common.schemas";
import { z as _z } from 'zod';
import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, fieldRbacFilter, enforceMandatoryFields, enforceStageGates, lifecycleGate as _lifecycleGate, requireOwnership as _requireOwnership, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';
const router = Router();
router.use(moduleStack('workflow'));
router.use(auditMiddleware("workflows"));
router.use(automationMiddleware("workflows"));
router.use(fieldRbacFilter("workflow"));
router.use(enforceMandatoryFields("workflow"));
router.use(enforceStageGates("workflow"));

function getDepartmentIdFromRequest(req: Request): string | null | undefined {
  const q = req.query?.departmentId;
  if (q !== undefined) return q === "" || q === null ? null : String(q);
  return req.user?.departmentId;
}

function getExecutionContext(req: Request): { userId?: string; departmentId?: string | null; isTenantWideRole?: boolean } | undefined {
  const user = req.user!;
  if (!user) return undefined;
  return {
    userId: user.userId,
    departmentId: user.departmentId ?? null,
    isTenantWideRole: isTenantWideExecutionRole(user.role || ""),
  };
}

/**
 * @swagger
 * /workflows:
 *   get:
 *     summary: List all workflow instances
 *     tags: [Workflow]
 *     responses:
 *       200:
 *         description: Workflow instance list with status and step progress
 */
router.get("/", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const departmentId = getDepartmentIdFromRequest(req);
  const workflows = await getWorkflows(req.tenantId, departmentId !== undefined ? { departmentId } : undefined);
  res.json({ workflows, count: workflows.length });
}));

// === Definition Endpoints (aliases for templates — used by workflow-api.service.ts) ===

/**
 * @swagger
 * /workflows/definitions:
 *   get:
 *     summary: List workflow definitions (templates)
 *     tags: [Workflow]
 *     responses:
 *       200:
 *         description: Workflow definition list
 */
router.get("/definitions", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const departmentId = getDepartmentIdFromRequest(req);
  const templates = await getWorkflowTemplates(req.tenantId, departmentId !== undefined ? { departmentId } : undefined);
  res.json(templates);
}));

router.get("/definitions/:id", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const template = await getWorkflowTemplateById(req.tenantId, req.params.id);
  if (!template) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json(template);
}));

router.post("/definitions", authenticate, requirePermission("workflow.instance.write"), validate({ body: saveWorkflowBody }), asyncHandler(async (req, res) => {
  const { name, description, definition, parametersSchema, departmentId } = req.body;
  if (!name) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const template = await saveWorkflowTemplate(req.tenantId, {
  name, description, definition: definition || {}, parametersSchema, departmentId,
  createdBy: req.user!.userId!,
  });
  setAuditData(res as any, { action: "create", entityType: "workflow_definition", entityId: template.template_id, afterState: template });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflow', event: 'definition.created', entityType: 'workflow_definition', entityId: template.template_id, data: template } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflow.workflow_definition.definition.created' });
  res.status(201).json(template);
}));

router.put("/definitions/:id", authenticate, requirePermission("workflow.instance.write"), validate({ params: idParam, body: updateWorkflowBody }), asyncHandler(async (req, res) => {
  const { safeQuery, tenantSchema } = await import('../../../../config/database.js');
  const schema = tenantSchema(req.tenantId!);
  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [req.params.id];
  let idx = 2;
  for (const key of ["name", "description", "status"]) {
  if (req.body[key] !== undefined) { sets.push(`${key} = $${idx++}`); params.push(req.body[key]); }
  }
  if (req.body.definition !== undefined) { sets.push(`definition = $${idx++}`); params.push(JSON.stringify(req.body.definition)); }
  if (req.body.departmentId !== undefined) { sets.push(`department_id = $${idx++}`); params.push(req.body.departmentId ?? null); }
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `UPDATE "${schema}".workflow_templates SET ${sets.join(", ")} WHERE template_id = $1 RETURNING *`, params
  ), { tenantId: req.tenantId!, operation: 'update workflow_templates' });
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: "update", entityType: "workflow_definition", entityId: req.params.id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflow', event: 'definition.updated', entityType: 'workflow_definition', entityId: req.params.id, data: getFirstRow(result) } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflow.workflow_definition.definition.updated' });
  res.json(getFirstRow(result));
}));

router.post("/definitions/:id/publish", authenticate, requirePermission("workflow.instance.write"), validate({ body: createPublishBody }), asyncHandler(async (req, res) => {
  const { safeQuery, tenantSchema } = await import('../../../../config/database.js');
  const schema = tenantSchema(req.tenantId!);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `UPDATE "${schema}".workflow_templates SET status = 'published', updated_at = NOW() WHERE template_id = $1 RETURNING *`, [req.params.id]
  ), { tenantId: req.tenantId!, operation: 'update workflow_templates' });
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: "update", entityType: "workflow_definition", entityId: req.params.id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflow', event: 'definition.published', entityType: 'workflow_definition', entityId: req.params.id, data: getFirstRow(result) } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflow.workflow_definition.definition.published' });
  swallow(EC.EVENT_BUS, eventBus.publish(({ eventType: 'workflow.status_changed' as string, tenantId: req.tenantId!, severity: 'info', payload: { entityId: req.params.id, moduleCode: 'workflow', fromStatus: 'draft', toStatus: 'published', actorUserId: req.user!.userId! } } as any)), { tenantId: req.tenantId!, operation: 'eventBus:workflow.status_changed' });
  res.json(getFirstRow(result));
}));

// === Instance Endpoints (used by work-items-api.service.ts) ===

/**
 * @swagger
 * /workflows/instances/start:
 *   post:
 *     summary: Start a new workflow instance from a definition
 *     tags: [Workflow]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [definitionId]
 *             properties:
 *               definitionId: { type: string, format: uuid }
 *               context: { type: object }
 *     responses:
 *       201:
 *         description: Workflow instance started
 */
router.post("/instances/start", authenticate, requirePermission("workflow.instance.execute"), validate({ body: startInstanceBody }), asyncHandler(async (req, res) => {
  try {
  const { definitionId, context } = req.body;
  if (!definitionId) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const workflow = await instantiateTemplate(
  req.tenantId, definitionId, context || {}, req.user!.userId!
  );
  setAuditData(res as any, { action: "create", entityType: "workflow_instance", entityId: workflow.workflow_id, afterState: workflow });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflow', event: 'instance.started', entityType: 'workflow_instance', entityId: workflow.workflow_id, data: workflow } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflow.workflow_instance.instance.started' });
  res.status(201).json(workflow);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes("not found") ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.get("/instances/:id", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const wf = await getWorkflowById(req.tenantId, req.params.id);
  if (!wf) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json(wf);
}));

// === Template Endpoints (MUST be before /:id to prevent route shadowing) ===

router.post("/templates/seed", authenticate, requirePermission("workflow.instance.write"), validate({ body: createSeedBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const { seedWorkflowTemplates: seedPredefined } = await import('../../services/templates/workflow-templates.service.js');
  const count = await seedPredefined(tenantId, userId);
  const { seedWorkflowTemplates: seedData } = await import("../data/seed-workflow-templates.js");
  const dataCount = await seedData(tenantId);
  setAuditData(res as any, { action: "create", entityType: "workflow_template", entityId: "seed", afterState: { seeded: count + dataCount } });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflow', event: 'templates.seeded', entityType: 'workflow_template', entityId: 'seed', data: { seeded: count + dataCount } } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json({ seeded: count + dataCount, predefined: count, data: dataCount });
}));

router.get("/templates", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const departmentId = getDepartmentIdFromRequest(req);
  const templates = await getWorkflowTemplates(req.tenantId, departmentId !== undefined ? { departmentId } : undefined);
  res.json({ templates, count: templates.length });
}));

router.get("/templates/:templateId", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const template = await getWorkflowTemplateById(req.tenantId, req.params.templateId);
  if (!template) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json(template);
}));

router.post("/templates", authenticate, requirePermission("workflow.instance.write"), validate({ body: saveWorkflowBody }), asyncHandler(async (req, res) => {
  const { name, description, definition, parametersSchema, departmentId } = req.body;
  if (!name || !definition) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const template = await saveWorkflowTemplate(req.tenantId, {
  name, description, definition, parametersSchema, departmentId,
  createdBy: req.user!.userId!,
  });
  setAuditData(res as any, { action: "create", entityType: "workflow_template", entityId: template.template_id, afterState: template });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflow', event: 'template.created', entityType: 'workflow_template', entityId: template.template_id, data: template } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflow.workflow_template.template.created' });
  res.status(201).json(template);
}));

router.post("/templates/:templateId/instantiate", authenticate, requirePermission("workflow.instance.execute"), validate({ body: instantiateTemplateBody }), asyncHandler(async (req, res) => {
  try {
  const { templateId } = req.params;
  const { params } = req.body;
  const workflow = await instantiateTemplate(
  req.tenantId, templateId, params || {}, req.user!.userId!
  );
  setAuditData(res as any, { action: "create", entityType: "workflow_instance", entityId: workflow.workflow_id, afterState: workflow });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflow', event: 'template.instantiated', entityType: 'workflow_instance', entityId: workflow.workflow_id, data: workflow } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflow.workflow_instance.template.instantiated' });
  res.status(201).json(workflow);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes("not found") ? 404 : 500;
  res.status(status).json({ error: status === 404 ? errMsg('NOT_FOUND', req) : errMsg('INTERNAL_ERROR', req) });
  }
}));

// === Instance Endpoints (parameterized /:id AFTER static routes) ===

router.get("/:id", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const wf = await getWorkflowById(req.tenantId, id);
  if (!wf) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json(wf);
}));

router.post("/", authenticate, requirePermission("workflow.instance.write"), validate({ body: saveWorkflowBody }), asyncHandler(async (req, res) => {
  const { name, definition, departmentId } = req.body;
  if (!name || !definition) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const wf = await saveWorkflow(req.tenantId, {
  name, definition, departmentId, createdBy: req.user!.userId!,
  });
  setAuditData(res as any, { action: "create", entityType: "workflow", entityId: wf.workflow_id, afterState: wf });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'workflows', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.workflows.created' });
  res.status(201).json(wf);
}));

router.put("/:id", authenticate, requirePermission("workflow.instance.write"), validate({ params: idParam, body: updateWorkflowBody }), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { name, definition, departmentId } = req.body;
  if (!name || !definition) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const wf = await saveWorkflow(req.tenantId, {
  name, definition, workflowId: id, departmentId, createdBy: req.user!.userId!,
  });
  setAuditData(res as any, { action: "update", entityType: "workflow", entityId: id, afterState: wf });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'workflows', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.workflows.updated' });
  res.json(wf);
}));

// PUT /:id/status — Change workflow status (activate, deactivate, archive)
router.put("/:id/status", authenticate, requirePermission("workflow.instance.write"), validate({ body: changeStatusBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const id = req.params.id as string;
  const { status } = req.body;
  if (!status || !['active', 'template', 'archived', 'draft'].includes(status)) {
  res.status(400).json({ error: errMsg('INVALID_INPUT', req) });
  return;
  }
  const { query: dbQuery } = await import('../../../../config/database.js');
  const { tenantSchema: ts } = await import('../../../../config/database.js');
  const schema = ts(tenantId);
  const existing = await dbQuery(`SELECT * FROM "${schema}".workflows WHERE workflow_id = $1`, [id]);
  if (existing.rows.length === 0) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  await dbQuery(`UPDATE "${schema}".workflows SET status = $1, updated_at = NOW() WHERE workflow_id = $2`, [status, id]);
  setAuditData(res as any, { action: "update", entityType: "workflow", entityId: id, afterState: { ...getFirstRow(existing), status } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'workflows', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.workflows.updated' });
  swallow(EC.EVENT_BUS, eventBus.publish(({ eventType: 'workflow.status_changed' as string, tenantId, severity: 'info', payload: { entityId: id, moduleCode: 'workflow', fromStatus: getFirstRow(existing)?.status, toStatus: status, actorUserId: req.user!.userId! } } as any)), { tenantId: req.tenantId!, operation: 'eventBus:workflow.status_changed' });
  res.json({ workflow_id: id, status, message: `Workflow status changed to ${status}` });
}));

// DELETE /:id — Delete a workflow
router.delete("/:id", authenticate, requirePermission("workflow.delete"), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const before = await getWorkflowById(req.tenantId, id);
  if (!before) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  await saveWorkflow(req.tenantId, { ...before, status: 'deleted', workflowId: id, createdBy: req.user!.userId! });
  setAuditData(res as any, { action: "delete", entityType: "workflow", entityId: id, beforeState: before });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'deleted', entityType: 'workflows', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.workflows.deleted' });
  res.json({ message: "Workflow deleted", workflow_id: id });
}));

router.post("/:id/execute", authenticate, requirePermission("workflow.instance.execute"), validate({ body: executeWorkflowBody }), asyncHandler(async (req, res) => {
  try {
  const id = req.params.id as string;
  const { triggerType, data, simulate } = req.body;
  if (simulate) {
  const result = await simulateWorkflow(req.tenantId, id, data || {});
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'workflows', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.workflows.created' });
  res.json(result);
  return;
  }
  const executionContext = getExecutionContext(req);
  const result = await executeWorkflow(req.tenantId, id, {
  type: triggerType || 'manual', data,
  }, executionContext);
  res.json(result);
  } catch (err: unknown) {
  const code = toErrorMessage(err).includes("department-scoped") ? 403 : (toErrorMessage(err).includes("not found") ? 404 : 500);
  res.status(code).json({ error: toErrorMessage(err).includes("not found") ? errMsg('NOT_FOUND', req) : toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
}));

router.post("/:id/resume", authenticate, requirePermission("workflow.instance.execute"), validate({ body: resumeWorkflowBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { query: dbQuery } = await import('../../../../config/database.js');
  const { tenantSchema: ts } = await import('../../../../config/database.js');
  const schema = ts(tenantId);
  const { executionId } = req.body;
  if (!executionId) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const exec = await dbQuery(
  `SELECT * FROM "${schema}".workflow_instances WHERE execution_id = $1 AND workflow_id = $2 AND status = 'paused'`,
  [executionId, req.params.id]
  );
  if (exec.rows.length === 0) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  const pending = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: '0' }]), dbQuery(
  `SELECT COUNT(*) AS cnt FROM "${schema}".approvals WHERE execution_id = $1 AND status = 'pending'`,
  [executionId]
  ), { tenantId: req.tenantId!, operation: 'query workflow_instances' });
  if (parseInt(String(getFirstRow(pending)?.cnt ?? '0'), 10) > 0) {
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'workflows', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.workflows.created' });
  res.json({ message: "Execution still has pending approvals", pendingApprovals: parseInt(String(getFirstRow(pending)?.cnt ?? '0'), 10) });
  return;
  }
  const rejected = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: '0' }]), dbQuery(
  `SELECT COUNT(*) AS cnt FROM "${schema}".approvals WHERE execution_id = $1 AND status = 'rejected'`,
  [executionId]
  ), { tenantId: req.tenantId!, operation: 'query approvals' });
  if (parseInt(String(getFirstRow(rejected)?.cnt ?? '0'), 10) > 0) {
  await dbQuery(`UPDATE "${schema}".workflow_instances SET status = 'failed', completed_at = NOW() WHERE execution_id = $1`, [executionId]);
  res.json({ message: "Execution failed — approval was rejected", status: 'failed' });
  return;
  }
  const stepLog = getFirstRow(exec)?.step_log || [];
  const lastStep = stepLog[stepLog.length - 1];
  if (lastStep) lastStep.status = 'approved';
  const wf = await dbQuery(`SELECT definition FROM "${schema}".workflows WHERE workflow_id = $1`, [req.params.id]);
  const definition = getFirstRow(wf)?.definition || {};
  const _nodes = definition.nodes || [];
  const edges = (definition.edges || []).map((e: Record<string, unknown>) => ({
  source: (e.source || e.from || '') as string, target: (e.target || e.to || '') as string,
  label: (e.label || e.condition) as string, condition: (e.condition || e.label) as string,
  }));
  const approvedNodeId = lastStep?.nodeId;
  const nextEdge = edges.find((e: any) => e.source === approvedNodeId && (e.label === 'approved' || e.condition === 'approved'))
  || edges.find((e: any) => e.source === approvedNodeId);
  if (nextEdge?.target) {
  const executionContext = getExecutionContext(req);
  const result = await executeWorkflow(tenantId, req.params.id, { type: 'resume', data: { resumeFromNode: nextEdge.target } }, executionContext);
  res.json(result);
  } else {
  await dbQuery(`UPDATE "${schema}".workflow_instances SET status = 'completed', completed_at = NOW(), step_log = $1 WHERE execution_id = $2`,
  [JSON.stringify(stepLog), executionId]);
  res.json({ message: "Execution completed after approval", status: 'completed' });
  }
}));

router.post("/:id/simulate", authenticate, requirePermission("workflow.instance.read"), validate({ body: simulateWorkflowBody }), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const result = await simulateWorkflow(req.tenantId, id, req.body.testData || {});
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'workflows', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.workflows.created' });
  res.json(result);
}));

router.get("/executions/list", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { tenantSchema: ts, safeQuery: sq } = await import('../../../../config/database.js');
  const schema = ts(tenantId);
  const limit = parseInt(String(req.query.limit || '50'));
  const result = await sq(
  `SELECT we.execution_id, we.workflow_id, w.name AS workflow_name, we.trigger_type,
  we.status, we.started_at, we.completed_at, we.step_log, we.is_simulation,
  jsonb_array_length(COALESCE(we.step_log, '[]'::jsonb)) AS steps_executed
  FROM "${schema}".workflow_instances we
  LEFT JOIN "${schema}".workflows w ON w.workflow_id = we.workflow_id
  ORDER BY we.started_at DESC
  LIMIT $1`,
  [limit]
  );
  res.json({ executions: result.rows, count: result.rows.length });
}));

router.get("/executions/:executionId/detail", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { executionId } = req.params;
  const detail = await getExecutionDetail(tenantId, executionId);
  if (!detail) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json(detail);
}));

router.get("/executions/:executionId/activity", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { executionId } = req.params;
  const result = await getExecutionActivity(tenantId, executionId);
  res.json(result);
}));

router.post("/executions/:executionId/cancel", authenticate, requirePermission("workflow.instance.execute"), validate({ body: createCancelBody }), asyncHandler(async (req, res) => {
  const { executionId } = req.params;
  const tenantId = req.tenantId!;
  const { query: dbQuery } = await import('../../../../config/database.js');
  const { tenantSchema } = await import('../../../../config/database.js');
  const schema = tenantSchema(tenantId);
  const r = await dbQuery(
  `UPDATE "${schema}".workflow_instances SET status = 'cancelled', completed_at = NOW() WHERE execution_id = $1 RETURNING execution_id`,
  [executionId]
  );
  if (r.rowCount === 0) { res.status(404).json({ error: errMsg("NOT_FOUND", req) }); return; }
  swallow(EC.EVENT_BUS, eventBus.publish(({ eventType: 'workflow.status_changed' as string, tenantId, severity: 'info', payload: { entityId: executionId, moduleCode: 'workflow', fromStatus: 'active', toStatus: 'cancelled', actorUserId: req.user!.userId! } } as any)), { tenantId: req.tenantId!, operation: 'eventBus:workflow.status_changed' });
  res.json({ message: "Execution cancelled", executionId });
}));

// POST /workflows/executions/:executionId/resume — Retry/resume by execution id (resolves workflow_id from execution)
router.post("/executions/:executionId/resume", authenticate, requirePermission("workflow.instance.execute"), validate({ body: createResumeBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { executionId } = req.params;
  const { query: dbQuery } = await import('../../../../config/database.js');
  const { tenantSchema: ts } = await import('../../../../config/database.js');
  const schema = ts(tenantId);
  const execRows = await dbQuery(
  `SELECT workflow_id, status, step_log FROM "${schema}".workflow_instances WHERE execution_id = $1`,
  [executionId]
  );
  if (execRows.rows.length === 0) { res.status(404).json({ error: errMsg("NOT_FOUND", req) }); return; }
  const workflowId = getFirstRow(execRows)?.workflow_id;
  if (getFirstRow(execRows)?.status !== "paused") {
  res.status(400).json({ error: "Execution is not paused; only paused executions can be resumed." });
  return;
  }
  const pending = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: "0" }]), dbQuery(
  `SELECT COUNT(*) AS cnt FROM "${schema}".approvals WHERE execution_id = $1 AND status = 'pending'`,
  [executionId]
  ), { tenantId: req.tenantId!, operation: 'query approvals' });
  if (parseInt(String(getFirstRow(pending)?.cnt ?? '0'), 10) > 0) {
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: "workflows", event: "created", entityType: "workflows", entityId: workflowId } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.workflows.created' });
  res.json({ message: "Execution still has pending approvals", pendingApprovals: parseInt(String(getFirstRow(pending)?.cnt ?? '0'), 10) });
  return;
  }
  const rejected = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: "0" }]), dbQuery(
  `SELECT COUNT(*) AS cnt FROM "${schema}".approvals WHERE execution_id = $1 AND status = 'rejected'`,
  [executionId]
  ), { tenantId: req.tenantId!, operation: 'query approvals' });
  if (parseInt(String(getFirstRow(rejected)?.cnt ?? '0'), 10) > 0) {
  await dbQuery(`UPDATE "${schema}".workflow_instances SET status = 'failed', completed_at = NOW() WHERE execution_id = $1`, [executionId]);
  res.json({ message: "Execution failed — approval was rejected", status: "failed" });
  return;
  }
  const stepLog = (getFirstRow(execRows)?.step_log || []) as any[];
  const lastStep = stepLog[stepLog.length - 1];
  let resumeFromNode: string | undefined;
  if (lastStep?.status === "waiting_at_delay" && lastStep?.nextNodeId) {
  resumeFromNode = lastStep.nextNodeId;
  } else {
  if (lastStep) lastStep.status = "approved";
  await dbQuery(`UPDATE "${schema}".workflow_instances SET step_log = $1 WHERE execution_id = $2`, [JSON.stringify(stepLog), executionId]);
  const wf = await dbQuery(`SELECT definition FROM "${schema}".workflows WHERE workflow_id = $1`, [workflowId]);
  const definition = getFirstRow(wf)?.definition || {};
  const edges = (definition.edges || []).map((e: Record<string, unknown>) => ({
  source: (e.source || e.from || "") as string,
  target: (e.target || e.to || "") as string,
  label: (e.label || e.condition) as string,
  condition: (e.condition || e.label) as string,
  }));
  const approvedNodeId = lastStep?.nodeId;
  const nextEdge = edges.find((e: any) => e.source === approvedNodeId && (e.label === "approved" || e.condition === "approved"))
  || edges.find((e: any) => e.source === approvedNodeId);
  resumeFromNode = nextEdge?.target;
  }
  if (resumeFromNode) {
  const executionContext = getExecutionContext(req);
  const result = await executeWorkflow(tenantId, workflowId, { type: "resume", data: { executionId, resumeFromNode } }, executionContext);
  res.json(result);
  } else {
  await dbQuery(
  `UPDATE "${schema}".workflow_instances SET status = 'completed', completed_at = NOW(), step_log = $1 WHERE execution_id = $2`,
  [JSON.stringify(stepLog), executionId]
  );
  res.json({ message: "Execution completed after approval", status: "completed" });
  }
}));

router.get("/executions/:executionId/export", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { executionId } = req.params;
  const detail = await getExecutionDetail(tenantId, executionId);
  if (!detail) { res.status(404).json({ error: errMsg("NOT_FOUND", req) }); return; }
  const text = [
  `Workflow: ${(detail.execution as Record<string, unknown>)?.workflow_name ?? "—"}`,
  `Execution: ${executionId}`,
  `Status: ${(detail.execution as Record<string, unknown>)?.status ?? "—"}`,
  "",
  "=== Step log ===",
  JSON.stringify(detail.steps ?? [], null, 2),
  "",
  "=== Mermaid ===",
  detail.mermaid || "",
  ].join("\n");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="execution-${executionId.slice(0, 8)}.txt"`);
  res.send(text);
}));

router.post("/executions/bulk-cancel", authenticate, requirePermission("workflow.instance.execute"), validate({ body: bulkCancelBody }), asyncHandler(async (req, res) => {
  const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const tenantId = req.tenantId!;
  const { query: dbQuery } = await import('../../../../config/database.js');
  const { tenantSchema } = await import('../../../../config/database.js');
  const schema = tenantSchema(tenantId);
  const results: { id: string; ok: boolean }[] = [];
  for (const executionId of ids) {
  try {
  const r = await dbQuery(
  `UPDATE "${schema}".workflow_instances SET status = 'cancelled', completed_at = NOW() WHERE execution_id = $1 RETURNING 1`,
  [executionId]
  );
  results.push({ id: executionId, ok: r.rowCount !== 0 });
  } catch {
  results.push({ id: executionId, ok: false });
  }
  }
  res.json({ message: "Bulk cancel completed", results });
}));

router.get("/:id/analytics", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const analytics = await getWorkflowAnalytics(req.tenantId, id);
  res.json(analytics);
}));

// === Approval Endpoints ===

router.post("/approvals", authenticate, requirePermission("workflow.approve"), validate({ body: createApprovalStepBody }), asyncHandler(async (req, res) => {
  const { executionId, approverId, slaHours, escalationChain } = req.body;
  if (!executionId || !approverId) {
  res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
  return;
  }
  const approval = await createApprovalStep(
  req.tenantId, executionId, approverId, slaHours || 24, escalationChain || []
  );
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'workflows', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.workflows.created' });
  res.status(201).json(approval);
}));

router.put("/approvals/:approvalId/resolve", authenticate, requirePermission("workflow.approve"), validate({ body: updateResolveBody }), asyncHandler(async (req, res) => {
  try {
  const { approvalId } = req.params;
  const { decision, comment } = req.body;
  if (!decision || !['approved', 'rejected'].includes(decision)) {
  res.status(400).json({ error: errMsg('INVALID_INPUT', req) });
  return;
  }
  await resolveApproval(req.tenantId, approvalId, decision, comment);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'updated', entityType: 'workflows', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.workflows.updated' });
  res.json({ message: "Approval resolved", approvalId, decision });
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes("not found") ? 404 : 500;
  res.status(status).json({ error: status === 404 ? errMsg('NOT_FOUND', req) : errMsg('INTERNAL_ERROR', req) });
  }
}));

router.post("/escalations/check", authenticate, requirePermission("workflow.instance.execute"), validate({ body: createCheckBody }), asyncHandler(async (req, res) => {
  const results = await checkEscalations(req.tenantId!);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'workflows', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.workflows.created' });
  res.json({ escalations: results, count: results.length });
}));

// === Precondition Validation ===

router.post("/executions/:executionId/validate", authenticate, requirePermission("workflow.instance.read"), validate({ body: createValidateBody }), asyncHandler(async (req, res) => {
  const { executionId } = req.params;
  const { stepId, requiredApprovals, requiredEvidence } = req.body;
  const result = await validatePreconditions(
  req.tenantId, executionId, stepId || '', requiredApprovals, requiredEvidence
  );
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'workflows', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.workflows.created' });
  res.json(result);
}));

// === Notification Step ===

router.post("/notification-step", authenticate, requirePermission("workflow.instance.write"), validate({ body: createNotificationStepBody }), asyncHandler(async (req, res) => {
  const { userId, type, title, body, link } = req.body;
  if (!userId || !title) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  await executeNotificationStep(req.tenantId, { userId, type, title, body, link });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'created', entityType: 'workflows', entityId: '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.workflows.created' });
  res.json({ message: "Notification sent" });
}));

// === Workflow Versioning ===

router.get("/:id/versions", authenticate, requirePermission("workflow.instance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getGraphVersions } = await import('../../services/templates/workflow-versioning.service.js');
  const versions = await getGraphVersions(req.tenantId!, req.params.id);
  res.json({ items: versions, count: versions.length });
}));

router.post("/:id/versions/:versionId/revert", authenticate, requirePermission("workflow.instance.write"), validate({ body: createRevertBody }), asyncHandler(async (req, res) => {
  const { getGraphVersion, snapshotGraph, bumpWorkflowVersion } = await import('../../services/templates/workflow-versioning.service.js');
  const version = await getGraphVersion(req.tenantId!, req.params.versionId);
  if (!version) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  await bumpWorkflowVersion(req.tenantId!, req.params.id, version.graph_snapshot, `Revert to v${version.version_number}`, {
    changedBy: req.user!.userId!,
  });
  await snapshotGraph(req.tenantId!, req.params.id, version.graph_snapshot, {
    changedBy: req.user!.userId!,
    changeSummary: `Reverted to v${version.version_number}`,
    changeType: 'revert',
  });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'workflows', event: 'reverted', entityType: 'workflows', entityId: req.params.id } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:workflows.workflows.reverted' });
  res.json({ success: true, message: 'Workflow reverted successfully' });
}));

export default router;
