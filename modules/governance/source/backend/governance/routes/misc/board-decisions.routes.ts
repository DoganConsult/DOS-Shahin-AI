import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
const genericPayloadSchema = z.record(z.unknown());
// ============================================================================
// Board Decision Register API Routes (F44-45)
// Governance committee decisions with entity traceability
// ============================================================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import { AuthenticatedRequest } from "@dos/types";

import { validate, auditMiddleware, moduleStack, mutationEventHook } from '../../ports/middleware.port';

import { createGovernanceBody, updateGovernanceBody, createStatusBody, createLinksBody } from '../../schemas/governance.schemas';
import {
  createDecision,
  getDecision,
  listDecisions,
  updateDecision,
  updateDecisionStatus,
  linkEntity,
  unlinkEntity,
  getDecisionLinks,
  getDecisionImpactGraph,
  getDecisionsForEntity,
} from "../../services/board/board-decision.service";
import { genericGovernanceSchema } from "../../schemas/governance.schemas";

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware('governance'));
router.use(mutationEventHook('governance'));
router.use(authenticate);
router.use(auditMiddleware("governance"));

// ── CRUD ───

router.get("/", validate({ query: z.record(z.unknown()) }), requirePermission("governance.record.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const { status, type, committeeId, limit, offset } = req.query;
    const result = await listDecisions(
      tenantId,

      { status: status as string, type: type as string, committeeId: committeeId as string },
      parseInt(limit as string) || 50,
      parseInt(offset as string) || 0
    );
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/:id", validate({ query: z.record(z.unknown()) }), requirePermission("governance.record.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const decision = await getDecision(tenantId, req.params.id);
    if (!decision) { res.status(404).json({ error: "Decision not found" }); return; }
    res.json(decision);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/", requirePermission("governance.record.manage"), validate({ body: createGovernanceBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const userId = (req as AuthenticatedRequest).userId!;
    const decision = await createDecision(tenantId, req.body, userId);
    res.status(201).json(decision);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.put("/:id", requirePermission("governance.record.manage"), validate({ body: updateGovernanceBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const decision = await updateDecision(tenantId, req.params.id, req.body);
    if (!decision) { res.status(404).json({ error: "Decision not found" }); return; }
    res.json(decision);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/:id/status", requirePermission("governance.record.manage"), validate({ body: createStatusBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const userId = (req as AuthenticatedRequest).userId!;
    await updateDecisionStatus(tenantId, req.params.id, req.body.status, userId);
    res.json({ message: "Status updated" });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Entity Linking (F45: Traceability) ───

router.get("/:id/links", validate({ query: z.record(z.unknown()) }), requirePermission("governance.record.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const links = await getDecisionLinks(tenantId, req.params.id);
    res.json({ links });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/:id/links", requirePermission("governance.record.manage"), validate({ body: createLinksBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const { entityType, entityId, linkType, notes } = req.body;
    const link = await linkEntity(tenantId, req.params.id, entityType, entityId, linkType, notes);
    res.status(201).json(link);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.delete("/links/:linkId", requirePermission("governance.record.manage"), validate({ body: genericGovernanceSchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    await unlinkEntity(tenantId, req.params.linkId);
    res.json({ message: "Link removed" });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Impact Graph ───

router.get("/:id/impact", validate({ query: z.record(z.unknown()) }), requirePermission("governance.record.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const graph = await getDecisionImpactGraph(tenantId, req.params.id);
    if (!graph) { res.status(404).json({ error: "Decision not found" }); return; }
    res.json(graph);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Reverse lookup: find decisions for an entity ───

router.get("/for/:entityType/:entityId", validate({ query: z.record(z.unknown()) }), requirePermission("governance.record.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const decisions = await getDecisionsForEntity(tenantId, req.params.entityType, req.params.entityId);
    res.json({ decisions });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;

