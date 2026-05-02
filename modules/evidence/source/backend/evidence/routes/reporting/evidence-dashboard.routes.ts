// ============================================
// Evidence Dashboard & Work Queue Routes
// ============================================

import { Router, Request, Response, NextFunction as _NextFunction } from 'express';
import { z } from "zod";
import { authenticate, requirePermission } from '../../ports/auth.port';
import { errMsg } from '../../../../i18n/error-messages';
import { validate } from "../ports/middleware.port";
const router = Router();

// GET /api/evidence/overview — home dashboard widgets
router.get('/overview', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { computeCommandCenterWidgets } = await import('../../services/reporting/evidence-dashboard.service.js');
    const widgets = await computeCommandCenterWidgets(req.user!.tenantId!);
    res.json(widgets);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/work-queue — personal work queue for current user
router.get('/work-queue', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { computeWorkQueueItems } = await import('../../services/reporting/evidence-dashboard.service.js');
    const queue = await computeWorkQueueItems(req.user!.tenantId!, req.user!.userId!);
    res.json(queue);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/source-health — connector health summary
router.get('/source-health', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { getSourceHealth } = await import('../../services/reporting/evidence-dashboard.service.js');
    const health = await getSourceHealth(req.user!.tenantId!);
    res.json({ items: health, count: health.length });
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/recent-activity — recent evidence activity
router.get('/recent-activity', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const { getRecentActivity } = await import('../../services/reporting/evidence-dashboard.service.js');
    const activity = await getRecentActivity(req.user!.tenantId!, limit);
    res.json({ items: activity, count: activity.length });
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/by-status — evidence breakdown by status
router.get('/by-status', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { getEvidenceByStatus } = await import('../../services/reporting/evidence-dashboard.service.js');
    const breakdown = await getEvidenceByStatus(req.user!.tenantId!);
    res.json(breakdown);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/by-source — evidence breakdown by source system
router.get('/by-source', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { getEvidenceBySource } = await import('../../services/reporting/evidence-dashboard.service.js');
    const breakdown = await getEvidenceBySource(req.user!.tenantId!);
    res.json(breakdown);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;
