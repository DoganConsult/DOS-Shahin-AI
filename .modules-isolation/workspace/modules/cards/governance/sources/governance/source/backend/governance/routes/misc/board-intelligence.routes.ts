import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
const genericPayloadSchema = z.record(z.unknown());
// ============================================================
// Board Intelligence Routes — Pillar 7d
// Executive-level GRC intelligence: board packs, Q&A, regulatory impact
// ============================================================


import { generateBoardPack, answerGrcQuestion, generateRegulatoryImpactBriefing } from '../../services/board/board-intelligence.service';
import { authenticate } from '../../ports/auth.port';
import { toErrorMessage } from '@dos/module-sdk';
import { validate, auditMiddleware, moduleStack, mutationEventHook } from '../../ports/middleware.port';

import { createAskBody, createRegulatoryImpactBody } from '../../schemas/governance.schemas';

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware('governance'));
router.use(mutationEventHook('governance'));
router.use(authenticate);

/**
 * GET /api/intelligence/board-pack
 * Generate a complete board-ready GRC report pack.
 */
router.get('/board-pack', validate({ query: z.record(z.unknown()) }), async (req: Request, res: Response) => {
  try {
    res.json(await generateBoardPack(req.tenantId!));
  } catch (e: unknown) {
    res.status(500).json({ error: toErrorMessage(e) });
  }
});

/**
 * POST /api/intelligence/ask
 * Natural language Q&A over GRC data.
 * Body: { question: string }
 */
router.post('/ask', validate({ body: createAskBody }), async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });
    res.json(await answerGrcQuestion(req.tenantId!, question));
  } catch (e: unknown) {
    res.status(500).json({ error: toErrorMessage(e) });
  }
});

/**
 * POST /api/intelligence/regulatory-impact
 * Generate a regulatory impact briefing for a regulation change.
 * Body: { regulationCode: string, changeDescription: string }
 */

router.post('/regulatory-impact', validate({ body: createRegulatoryImpactBody }), async (req: Request, res: Response) => {
  try {
    const { regulationCode, changeDescription } = req.body;
    if (!regulationCode || !changeDescription) return res.status(400).json({ error: 'regulationCode and changeDescription required' });
    res.json(await generateRegulatoryImpactBriefing(req.tenantId!, regulationCode, changeDescription));
  } catch (e: unknown) {
    res.status(500).json({ error: toErrorMessage(e) });
  }
});

export default router;

