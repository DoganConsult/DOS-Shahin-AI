import { Router, Request, Response } from "express";
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
const genericPayloadSchema = z.record(z.unknown());
// ============================================================================
// CAPA API Routes (F46: Issue/CAPA Lifecycle)
// ============================================================================

import { authenticate, requirePermission } from '../../ports/auth.port';
import { AuthenticatedRequest } from "@dos/types";
import {
  createCapa, getCapa, listCapas, updateCapa,
  updateCapaStatus, reviewEffectiveness, markOverdueCapas,
} from "../../../incident/services/misc/capa.service";

import { validate, auditMiddleware } from '../../ports/middleware.port';
import { createAuditPlanBody, updateAuditPlanBody, statusBody, createCapaEffectivenessBody } from '../../schemas/audit.schemas';

const router = Router();
router.use(authenticate);
router.use(auditMiddleware("compliance"));

router.get("/", validate({ query: z.record(z.unknown()) }), requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const { status, type, controlId, findingId, limit, offset } = req.query;
    const result = await listCapas(
      tenantId,
      { status: status as any, type: type as any, controlId: controlId as string, findingId: findingId as string },
      parseInt(limit as string) || 50,
      parseInt(offset as string) || 0,
    );
    res.json(result);
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.get("/:id", validate({ query: z.record(z.unknown()) }), requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const capa = await getCapa(tenantId, req.params.id);
    if (!capa) { res.status(404).json({ error: "CAPA not found" }); return; }
    res.json(capa);
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.post("/", requirePermission("compliance.program.manage"), validate({ body: createAuditPlanBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const userId = (req as AuthenticatedRequest).userId!;
    const capa = await createCapa(tenantId, { ...req.body, createdBy: userId });
    res.status(201).json(capa);
  } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.put("/:id", requirePermission("compliance.program.manage"), validate({ body: updateAuditPlanBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const capa = await updateCapa(tenantId, req.params.id, req.body);
    if (!capa) { res.status(404).json({ error: "CAPA not found" }); return; }
    res.json(capa);
  } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.post("/:id/status", requirePermission("compliance.program.manage"), validate({ body: statusBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const userId = (req as AuthenticatedRequest).userId!;
    await updateCapaStatus(tenantId, req.params.id, req.body.status, userId);
    res.json({ message: "Status updated" });
  } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.post("/:id/effectiveness", requirePermission("compliance.program.manage"), validate({ body: createCapaEffectivenessBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const userId = (req as AuthenticatedRequest).userId!;
    const { review, rating } = req.body;
    await reviewEffectiveness(tenantId, req.params.id, review, rating, userId);
    res.json({ message: "Effectiveness reviewed" });
  } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.post("/admin/mark-overdue", validate({ body: genericPayloadSchema }), requirePermission("compliance.program.manage"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const count = await markOverdueCapas(tenantId);
    res.json({ markedOverdue: count });
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : String(err) }); }
});

export default router;

