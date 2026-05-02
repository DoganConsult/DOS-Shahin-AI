import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Evidence Freshness Routes
// ============================================

import { authenticate, requirePermission } from '../../ports/auth.port';
import { errMsg } from '../../../../i18n/error-messages';
import { toErrorMessage } from '@dos/module-sdk';
import { auditMiddleware, setAuditData, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { bulkStaleBody, bulkExtendBody, bulkRefreshBody, createRequestBody as createRefreshBody, verifyBody } from '../../schemas/evidence.schemas';

const router = Router();
router.use(moduleStack('evidence'));
router.use(auditMiddleware('evidence'));
router.use(mutationEventHook('evidence'));

// GET /api/evidence/freshness — overview stats
router.get('/', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { getFreshnessOverview } = await import('../../services/collection/evidence-freshness.service.js');
    const overview = await getFreshnessOverview(req.user!.tenantId!);
    res.json(overview);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/freshness/expiring — expiring within N days (default 30)
router.get('/expiring', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 30;
    const { getExpiringEvidenceByDays } = await import('../../services/collection/evidence-freshness.service.js');
    const items = await getExpiringEvidenceByDays(req.user!.tenantId!, days);
    res.json({ items, count: items.length });
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/freshness/stale — stale evidence
router.get('/stale', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { getStaleEvidence } = await import('../../services/collection/evidence-freshness.service.js');
    const items = await getStaleEvidence(req.user!.tenantId!);
    res.json({ items, count: items.length });
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/freshness/:id/history — verification history
router.get('/:id/history', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { getFreshnessHistory } = await import('../../services/collection/evidence-freshness.service.js');
    const history = await getFreshnessHistory(req.user!.tenantId!, req.params.id);
    res.json({ history, count: history.length });
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/freshness/:id/verify — record verification
router.post('/:id/verify', authenticate, requirePermission('evidence.item.write'), validate({ body: verifyBody }), async (req: Request, res: Response) => {
  try {
    const { verifyEvidence } = await import('../../services/collection/evidence-freshness.service.js');
    const result = await verifyEvidence(req.user!.tenantId!, req.params.id, req.user!.userId!, req.body.method, req.body.notes);
    setAuditData(res as any, { action: 'update', entityType: 'evidence', entityId: req.params.id, afterState: result });
    res.json(result);
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/freshness/:id/refresh — trigger refresh
router.post('/:id/refresh', authenticate, requirePermission('evidence.item.write'), validate({ body: createRefreshBody }), async (req: Request, res: Response) => {
  try {
    const { refreshEvidence } = await import('../../services/collection/evidence-freshness.service.js');
    const result = await refreshEvidence(req.user!.tenantId!, req.params.id, req.user!.userId!);
    setAuditData(res as any, { action: 'update', entityType: 'evidence', entityId: req.params.id, afterState: result });
    res.json(result);
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/freshness/bulk-stale — bulk mark as stale
router.post('/bulk-stale', authenticate, requirePermission('evidence.item.write'), validate({ body: bulkStaleBody }), async (req: Request, res: Response) => {
  try {
    const { bulkMarkAsStale } = await import('../../services/collection/evidence-freshness.service.js');
    const result = await bulkMarkAsStale(req.user!.tenantId!, req.body.evidenceIds, req.user!.userId!);
    res.json(result);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/freshness/bulk-extend — bulk extend expiration
router.post('/bulk-extend', authenticate, requirePermission('evidence.item.write'), validate({ body: bulkExtendBody }), async (req: Request, res: Response) => {
  try {
    const { bulkExtendExpiration } = await import('../../services/collection/evidence-freshness.service.js');
    const result = await bulkExtendExpiration(req.user!.tenantId!, req.body.evidenceIds, req.body.daysToAdd, req.user!.userId!);
    res.json(result);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/freshness/bulk-refresh — bulk request refresh
router.post('/bulk-refresh', authenticate, requirePermission('evidence.item.write'), validate({ body: bulkRefreshBody }), async (req: Request, res: Response) => {
  try {
    const { bulkRefreshEvidence } = await import('../../services/collection/evidence-freshness.service.js');
    const result = await bulkRefreshEvidence(req.user!.tenantId!, req.body.evidenceIds, req.user!.userId!);
    res.json(result);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;

