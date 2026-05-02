import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
// ============================================
// KSA Regulatory Change Tracking Routes
// API endpoints for regulatory change notifications
// ============================================

import { Router } from 'express';
import { authenticate, requirePermission } from '../../../ports/auth.port';

import { validate, auditMiddleware, setAuditData, moduleStack, mutationEventHook } from '../../../ports/middleware.port';
import { createComplianceBody, updateResponseBody, createCheckDeadlinesBody } from '../../../schemas/compliance.schemas';
import {
  trackRegulatoryChanges,
  getRegulatoryChangeHistory,
  acknowledgeChange,
  assessChangeImpact as _assessChangeImpact,
} from '../../../infrastructure/integrations/ksa-regulatory/services/ksa-regulatory-change-tracking.service';

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));
router.use(mutationEventHook('compliance'));

router.post(
  '/',
  authenticate,
  requirePermission('platform.system.admin'),
  validate({ body: createComplianceBody }),
  async (req, res) => {
    try {
      const result = await trackRegulatoryChanges(req.tenantId!);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

router.get(
  '/',
  authenticate,
  requirePermission('compliance.regulatory.view'), validate({ query: z.record(z.unknown()) }), async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const filters = {
        frameworkCode: req.query.frameworkCode as string | undefined,
        changeType: req.query.changeType as string | undefined,
        status: req.query.status as string | undefined,
      };
      const result = await getRegulatoryChangeHistory(tenantId, filters as Record<string, unknown>);
      res.json({ success: true, data: result.changes, count: result.changes.length });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

router.put(
  '/:changeId/response',
  authenticate,
  requirePermission('compliance.regulatory.manage'),
  validate({ body: updateResponseBody }),
  async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const { changeId } = req.params;
      await acknowledgeChange(tenantId, changeId, req.user!.userId!);
      setAuditData(res as any, { action: 'update', entityType: 'regulatory_change', entityId: changeId, afterState: { acknowledged: true } });
      res.json({ success: true, message: 'Response status updated' });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

router.post(
  '/check-deadlines',
  authenticate,
  requirePermission('platform.system.admin'),
  validate({ body: createCheckDeadlinesBody }),
  async (req, res) => {
    try {
      const result = await trackRegulatoryChanges(req.tenantId!);
      res.json({ success: true, message: 'Deadline check completed', data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

export default router;

