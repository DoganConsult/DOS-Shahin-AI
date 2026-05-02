import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — UCF (Unified Control Framework) Routes
// List, create, map, export, and activate
// UCF controls. Viewer + Admin access.
// Requirements: 2.1, 2.2, 2.4, 2.6
// ============================================


import { authenticate, requirePermission } from '../../../../ports/auth.port';
import {
  getControls,
  getControlById,
  createControl,
  addMapping,
  getControlDictionary,
  activateControl,
} from '../../../services/misc/ucf.service';
import { emitEvent } from '../../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
/** Zod schemas for UCF route validation */
const createUCFControlBody = z.object({
  code: z.string().min(1),
}).passthrough();

const addUCFMappingBody = z.object({
  sourceControlId: z.string().min(1),
  targetRequirementId: z.string().min(1),
}).passthrough();

const activateControlBody = z.object({
  controlId: z.string().min(1),
}).passthrough();

import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../../../ports/middleware.port';
import { swallow, EC } from '../../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware("compliance"));
router.use(automationMiddleware("compliance"));

// GET /api/ucf/controls — List controls with optional filters
router.get("/controls", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const filters = {
    framework: req.query.framework as string | undefined,
    domain: req.query.domain as string | undefined,
    entity: req.query.entity as string | undefined,
    owner: req.query.owner as string | undefined,
    lang: req.query.lang as "ar" | "en" | undefined,
  };
  const controls = await getControls(tenantId, filters);
  res.json({ controls, count: controls.length });
});

// GET /api/ucf/controls/:id — Get single control
router.get("/controls/:id", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const control = await getControlById(tenantId, req.params.id);
  if (!control) {
    res.status(404).json({ error: "Control not found" });
    return;
  }
  res.json(control);
});

// POST /api/ucf/controls — Create a new control
router.post("/controls", authenticate, requirePermission("framework.record.manage"), validate({ body: createUCFControlBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const control = req.body;
  if (!control || !control.code) {
    res.status(400).json({ error: "Control data with code is required" });
    return;
  }
  const result = await createControl(tenantId, control);

  setAuditData(res as any, { action: "create", entityType: "ucf", entityId: (result as Record<string, unknown>).controlId ?? (result as Record<string, unknown>).control_id ?? control.code, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'frameworks', event: 'created', entityType: 'ucf', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:frameworks.ucf.created' });
  res.status(201).json(result);
});

// POST /api/ucf/mappings — Add crosswalk mapping
router.post("/mappings", authenticate, requirePermission("framework.record.manage"), validate({ body: addUCFMappingBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const mapping = req.body;
    if (!mapping || !mapping.sourceControlId || !mapping.targetRequirementId) {
      res.status(400).json({ error: "sourceControlId and targetRequirementId are required" });
      return;
    }
    const result = await addMapping(tenantId, mapping);

    setAuditData(res as any, { action: "create", entityType: "ucf", entityId: (result as Record<string, unknown>).mappingId ?? (result as Record<string, unknown>).mapping_id, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'frameworks', event: 'created', entityType: 'ucf', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:frameworks.ucf.created' });
    res.status(201).json(result);
  } catch (err: unknown) {
    const status = toErrorMessage(err).includes("Invalid") ? 400 : 500;
    res.status(status).json({ error: toErrorMessage(err) });
  }
});

// GET /api/ucf/dictionary — Export control dictionary
router.get("/dictionary", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const lang = (req.query.lang as "ar" | "en") || "en";
  const dictionary = await getControlDictionary(tenantId, lang);
  res.json({ dictionary, count: dictionary.length });
});

// POST /api/ucf/activate — Activate a control
router.post("/activate", authenticate, requirePermission("framework.record.manage"), validate({ body: activateControlBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { controlId } = req.body;
    if (!controlId) {
      res.status(400).json({ error: "controlId is required" });
      return;
    }
    const result = await activateControl(tenantId, controlId);
    setAuditData(res as any, { action: "update", entityType: "ucf", entityId: controlId, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'frameworks', event: 'created', entityType: 'ucf', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:frameworks.ucf.created' });
    res.json(result);
  } catch (err: unknown) {
    const status = toErrorMessage(err).includes("at least one") ? 400 : 500;
    res.status(status).json({ error: toErrorMessage(err) });
  }
});

export default router;

