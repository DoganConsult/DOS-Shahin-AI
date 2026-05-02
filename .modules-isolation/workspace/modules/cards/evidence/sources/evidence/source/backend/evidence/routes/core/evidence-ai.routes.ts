import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { validate, auditMiddleware, moduleStack } from '../../ports/middleware.port';
import { toErrorMessage } from '@dos/module-sdk';
import {
  suggestEvidenceMetadata,
  suggestLinkages,
  detectDuplicates,
  getAiSuggestionStatus,
} from '../../services/analysis/evidence-ai.service';

const router = Router();
router.use(auditMiddleware('evidence'));
router.use(moduleStack('evidence'));

const suggestMetadataBody = z.object({
  title: z.string().min(1).max(500),
  content: z.string().optional(),
});

const detectDuplicatesBody = z.object({
  evidenceId: z.string().min(1),
});

router.post(
  '/suggest-metadata',
  authenticate,
  requirePermission('evidence.item.read'),
  validate({ body: suggestMetadataBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId!;
      const result = await suggestEvidenceMetadata(tenantId, req.body.title, req.body.content);
      res.json({ success: true, data: result });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/suggest-linkages/:evidenceId',
  validate({ query: z.record(z.unknown()) }),
  authenticate,
  requirePermission('evidence.item.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId!;
      const evidenceId = req.params.evidenceId as string;
      const result = await suggestLinkages(tenantId, evidenceId);
      res.json({ success: true, data: result });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.post(
  '/detect-duplicates',
  authenticate,
  requirePermission('evidence.item.read'),
  validate({ body: detectDuplicatesBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId!;
      const result = await detectDuplicates(tenantId, req.body.evidenceId);
      res.json({ success: true, data: result });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/status',
  validate({ query: z.record(z.unknown()) }),
  authenticate,
  requirePermission('evidence.item.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId!;
      const result = await getAiSuggestionStatus(tenantId);
      res.json({ success: true, data: result });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

export default router;
