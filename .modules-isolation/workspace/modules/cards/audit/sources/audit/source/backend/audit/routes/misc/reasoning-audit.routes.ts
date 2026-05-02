import { Request, Response, Router } from 'express';
import { z } from "zod";
/**
 * Reasoning Audit API Routes — Pillar 3: Explainability
 *
 * Exposes endpoints for retrieving agent reasoning traces
 * and historical reasoning data for audit and transparency.
 */


import { authenticate, requirePermission } from '../../ports/auth.port';
import { getReasoningTrace, getAgentReasoningHistory } from '../../../ai/services/reasoning/reasoning-audit.service';
import { validate } from "../ports/middleware.port";
const router = Router();

router.get('/runs/:runId/reasoning', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('audit.record.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const trace = await getReasoningTrace(tenantId, req.params.runId);
    if (!trace) return res.status(404).json({ error: 'Reasoning trace not found' });
    res.json(trace);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/agents/reasoning/agents/:agentId/history
 * Retrieve paginated reasoning history for a specific agent.
 */
router.get('/agents/:agentId/reasoning-history', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('audit.record.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const history = await getAgentReasoningHistory(tenantId, req.params.agentId, limit);
    res.json({ items: history, count: history.length });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
