import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { z as _z } from 'zod';

import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  seedAIAgents,
  getAISquad,
  getAgentProfile,
  getAgentStatusLog,
} from '../../services/squad/ai-squad.service';
import { emitModuleEvent } from '../../services/emit-event';
import { toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────────
import { asyncHandler as _asyncHandler, validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';
import { seedPostBody } from "../../schemas/ai.schemas";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware("ai-squad"));
router.use(automationMiddleware("ai-squad"));

router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.squad.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const squad = await getAISquad(tenantId);
    res.json(squad);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get("/:agentId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.squad.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const { agentId } = req.params;
    const profile = await getAgentProfile(tenantId, agentId);
    if (!profile) {
      res.status(404).json({ error: `Agent ${agentId} not found` });
      return;
    }
    res.json(profile);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.get("/:agentId/status-log", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.squad.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const { agentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await getAgentStatusLog(tenantId, agentId, limit, offset);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

router.post("/seed", authenticate, requirePermission("ai.squad.manage"), validate({ body: seedPostBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const result = await seedAIAgents(tenantId);
    setAuditData(res as any, { action: "create", entityType: "ai_squad", entityId: tenantId, afterState: result });
    swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'ai-squad', event: 'created', entityType: 'ai_squad', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:ai-squad.ai_squad.created' });
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;

let genericPayloadSchema = z.record(z.unknown());
