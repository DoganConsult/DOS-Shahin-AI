import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Governance RACI Templates Routes
// CRUD for RACI templates with activity-level
// assignments and lifecycle management.
// Serves /api/governance/raci-templates
// ============================================
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listRaciTemplates, getRaciTemplateById, createRaciTemplate,
  updateRaciTemplate, setRaciAssignments, activateTemplate, archiveTemplate,
} from '../../../services/governance/governance-raci-templates.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';

/** Zod schemas for request body validation */
const createRaciTemplateBody = z.object({
  name_en: z.string().min(1),
}).passthrough();

const updateRaciTemplateBody = z.object({}).passthrough();

const setRaciAssignmentsBody = z.object({
  assignments: z.array(z.any()).min(1),
}).passthrough();

import { asyncHandler, validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';
import { createActivateBody, createArchiveBody } from '../../../schemas/governance.schemas';

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));
router.use(automationMiddleware("governance"));

router.get("/", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const templates = await listRaciTemplates(req.tenantId);
  res.json({ templates, count: templates.length });
}));

router.get("/:id", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const template = await getRaciTemplateById(req.tenantId, req.params.id);
  res.json(template);
  } catch (err: unknown) {
  res.status(toErrorMessage(err) === "RACI template not found" ? 404 : 500).json({ error: toErrorMessage(err) });
  }
}));

router.post("/", authenticate, requirePermission("governance.record.write"), validate({ body: createRaciTemplateBody }), asyncHandler(async (req, res) => {
  const { name_en } = req.body;
  if (!name_en) { res.status(400).json({ error: "name_en is required" }); return; }
  const template = await createRaciTemplate(req.tenantId, { ...req.body, created_by: req.user?.userId });

  setAuditData(res as any, { action: "create", entityType: "raci_template", entityId: template.template_id, afterState: template });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_raci_templates', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_raci_templates.created' });
  res.status(201).json(template);
}));

router.put("/:id", authenticate, requirePermission("governance.record.write"), validate({ body: updateRaciTemplateBody }), asyncHandler(async (req, res) => {
  try {
  const template = await updateRaciTemplate(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: "update", entityType: "raci_template", entityId: req.params.id, afterState: template });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_raci_templates', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_raci_templates.updated' });
  res.json(template);
  } catch (err: unknown) {
  res.status(toErrorMessage(err) === "RACI template not found" ? 404 : 500).json({ error: toErrorMessage(err) });
  }
}));

router.post("/:id/assignments", authenticate, requirePermission("governance.record.write"), validate({ body: setRaciAssignmentsBody }), asyncHandler(async (req, res) => {
  const { assignments } = req.body;
  if (!Array.isArray(assignments) || assignments.length === 0) {
  res.status(400).json({ error: "assignments array is required" }); return;
  }
  const result = await setRaciAssignments(req.tenantId, req.params.id, assignments);
  setAuditData(res as any, { action: "update", entityType: "raci_template", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_raci_templates', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_raci_templates.created' });
  res.json(result);
}));

router.post("/:id/activate", authenticate, requirePermission("governance.record.write"), validate({ body: createActivateBody }), asyncHandler(async (req, res) => {
  try {
  const template = await activateTemplate(req.tenantId, req.params.id);
  setAuditData(res as any, { action: "update", entityType: "raci_template", entityId: req.params.id, afterState: template });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_raci_templates', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_raci_templates.created' });
  res.json(template);
  } catch (err: unknown) {
  res.status(toErrorMessage(err) === "RACI template not found" ? 404 : 500).json({ error: toErrorMessage(err) });
  }
}));

router.post("/:id/archive", authenticate, requirePermission("governance.record.write"), validate({ body: createArchiveBody }), asyncHandler(async (req, res) => {
  try {
  const template = await archiveTemplate(req.tenantId, req.params.id);
  setAuditData(res as any, { action: "update", entityType: "raci_template", entityId: req.params.id, afterState: template });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_raci_templates', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_raci_templates.created' });
  res.json(template);
  } catch (err: unknown) {
  res.status(toErrorMessage(err) === "RACI template not found" ? 404 : 500).json({ error: toErrorMessage(err) });
  }
}));

export default router;

