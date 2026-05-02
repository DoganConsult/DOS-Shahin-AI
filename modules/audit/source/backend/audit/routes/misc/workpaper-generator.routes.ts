// ============================================
// Workpaper Generator Routes
// API endpoints for automated workpaper generation
// ============================================

import { z } from "zod";
import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { validate, auditMiddleware, setAuditData, automationMiddleware } from '../../ports/middleware.port';
import {

  generateWorkpapers,
  generateBatchWorkpapers,
} from '../../services/misc/workpaper-generator.service';

const genericPayloadSchema = z.record(z.unknown());
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { swallow, EC } from '@dos/platform-core/resilience';
import { generatePostBody, generateBatchPostBody } from "../../schemas/audit.schemas";

// ── Zod Schemas ──────────────────────────────────────────────────────────
const router = Router();
router.use(auditMiddleware('audit'));
router.use(automationMiddleware('audit'));

// POST /generate — generate workpapers for assessment/audit
router.post('/generate', authenticate, requirePermission('audit.record.read'), validate({ body: generatePostBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { frameworkId, frameworkIds, assessmentId, auditId, includeNotTested } = req.body;

      if (!frameworkId && (!frameworkIds || frameworkIds.length === 0) && !assessmentId && !auditId) {
        res.status(400).json({ error: 'frameworkId, frameworkIds, assessmentId, or auditId is required' });
        return;
      }

      const workpaper = await generateWorkpapers(tenantId, {
        frameworkId,
        frameworkIds,
        assessmentId,
        auditId,
        generatedBy: req.user!.userId!,
        includeNotTested: includeNotTested ?? false,
      });

      setAuditData(req, {
        action: 'generate',
        entityType: 'workpaper',
        entityId: workpaper.workpaperId,
        afterState: { summary: workpaper.summary },
      });
      swallow(EC.EVENT_BUS, emitEvent(({
              tenantId,
              userId: req.user!.userId!,
              module: 'audit',
              event: 'workpaper_generated',
              entityType: 'workpaper',
              entityId: workpaper.workpaperId,
            } as any)), { tenantId: tenantId, operation: 'grcEvent:audit.workpaper.workpaper_generated' });
      res.json({ data: workpaper });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

// POST /generate/batch — generate workpapers for multiple frameworks
router.post('/generate/batch', authenticate, requirePermission('audit.record.read'), validate({ body: generateBatchPostBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { frameworkIds, includeNotTested } = req.body;

      if (!frameworkIds || !Array.isArray(frameworkIds) || frameworkIds.length === 0) {
        res.status(400).json({ error: 'frameworkIds must be a non-empty array' });
        return;
      }

      const workpapers = await generateBatchWorkpapers(tenantId, {
        frameworkIds,
        generatedBy: req.user!.userId!,
        includeNotTested: includeNotTested ?? false,
      });

      setAuditData(req, {
        action: 'generate_batch',
        entityType: 'workpaper',
        entityId: 'batch',
        afterState: { count: workpapers.length },
      });
      swallow(EC.EVENT_BUS, emitEvent(({
              tenantId,
              userId: req.user!.userId!,
              module: 'audit',
              event: 'workpaper_generated',
              entityType: 'workpaper',
              entityId: 'batch',
            } as any)), { tenantId: tenantId, operation: 'grcEvent:audit.workpaper.workpaper_generated' });
      res.json({ data: workpapers });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
);

export default router;

