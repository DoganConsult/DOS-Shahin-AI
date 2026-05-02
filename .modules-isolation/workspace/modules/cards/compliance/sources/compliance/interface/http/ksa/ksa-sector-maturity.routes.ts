import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
// ============================================
// KSA Sector-Specific Maturity Models Routes
// API endpoints for sector maturity assessment
// ============================================

import { Router } from 'express';
import { authenticate, requirePermission } from '../../../ports/auth.port';

import { validate, auditMiddleware, setAuditData as _setAuditData, moduleStack, mutationEventHook } from '../../../ports/middleware.port';
import { createAssessBody } from '../../../schemas/compliance.schemas';
import {
  getSectorMaturityScore,
  getSectorBenchmark,
  getMaturityTrend as _getMaturityTrend,
  generateMaturityRoadmap as _generateMaturityRoadmap,
} from '../../../infrastructure/integrations/ksa-regulatory/services/ksa-sector-maturity.service';

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));
router.use(mutationEventHook('compliance'));

router.get(
  '/models',
  authenticate,
  requirePermission('compliance.maturity.view'), validate({ query: z.record(z.unknown()) }), async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const result = await getSectorMaturityScore(tenantId);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

router.get(
  '/model',
  authenticate,
  requirePermission('compliance.maturity.view'), validate({ query: z.record(z.unknown()) }), async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const result = await getSectorMaturityScore(tenantId);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

router.post(
  '/assess',
  authenticate,
  requirePermission('compliance.maturity.assess'),
  validate({ body: createAssessBody }),
  async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const result = await getSectorMaturityScore(tenantId);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

router.get(
  '/benchmark/:sectorCode',
  authenticate,
  requirePermission('compliance.maturity.view'), validate({ query: z.record(z.unknown()) }), async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const benchmark = await getSectorBenchmark(tenantId, req.params.sectorCode);
      res.json({ success: true, data: benchmark });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

export default router;

