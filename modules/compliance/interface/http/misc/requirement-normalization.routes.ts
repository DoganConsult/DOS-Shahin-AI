import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
// ============================================================================
// Requirement Normalization API Routes (F8)
// ============================================================================


import { authenticate, requirePermission } from '../../../ports/auth.port';
import { AuthenticatedRequest } from "@dos/types";

import { validate, auditMiddleware, setAuditData as _setAuditData, moduleStack, mutationEventHook } from '../../../ports/middleware.port';

import { createComplianceBody, createMappingsBody, genericComplianceSchema } from '../../../schemas/compliance.schemas';
import {
  createCanonicalRequirement, getCanonicalRequirement, getByCode,
  listCanonicalRequirements, addSourceMapping, removeSourceMapping,
  findByFrameworkRef, findByFramework, getNormalizationStats,
} from "../../services/misc/requirement-normalization.service";

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));
router.use(mutationEventHook('compliance'));
router.use(authenticate);
router.use(auditMiddleware("compliance"));

router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const { category, domain, frameworkId, limit, offset } = req.query;
    const result = await listCanonicalRequirements(
      tenantId,
      { category: category as string, domain: domain as string, frameworkId: frameworkId as string },
      parseInt(limit as string) || 100,
      parseInt(offset as string) || 0,
    );
    res.json(result);
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.get("/stats", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const stats = await getNormalizationStats(tenantId);
    res.json(stats);
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.get("/by-code/:code", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const req_ = await getByCode(tenantId, req.params.code);
    if (!req_) { res.status(404).json({ error: "Not found" }); return; }
    res.json(req_);
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.get("/by-framework/:frameworkId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const reqs = await findByFramework(tenantId, req.params.frameworkId);
    res.json({ requirements: reqs });
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.get("/lookup/:frameworkId/:ref", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const reqs = await findByFrameworkRef(tenantId, req.params.frameworkId, req.params.ref);
    res.json({ requirements: reqs });
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.get("/:id", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const req_ = await getCanonicalRequirement(tenantId, req.params.id);
    if (!req_) { res.status(404).json({ error: "Not found" }); return; }
    res.json(req_);
  } catch (err: unknown) { res.status(500).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.post("/", authenticate, requirePermission("compliance.program.manage"), validate({ body: createComplianceBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const result = await createCanonicalRequirement(tenantId, req.body);
    res.status(201).json(result);
  } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.post("/:id/mappings", authenticate, requirePermission("compliance.program.manage"), validate({ body: createMappingsBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const result = await addSourceMapping(tenantId, req.params.id, req.body);
    if (!result) { res.status(404).json({ error: "Not found" }); return; }
    res.json(result);
  } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : String(err) }); }
});

router.delete("/:id/mappings", authenticate, requirePermission("compliance.program.manage"), validate({ body: genericComplianceSchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const { frameworkId, ref } = req.body;
    const result = await removeSourceMapping(tenantId, req.params.id, frameworkId, ref);
    if (!result) { res.status(404).json({ error: "Not found" }); return; }
    res.json(result);
  } catch (err: unknown) { res.status(400).json({ error: err instanceof Error ? err.message : String(err) }); }
});

export default router;

