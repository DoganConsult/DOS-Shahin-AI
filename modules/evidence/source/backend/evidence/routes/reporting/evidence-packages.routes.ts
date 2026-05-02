import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Evidence Packages & Exports Routes
// ============================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import { errMsg } from '../../../../i18n/error-messages';
import { toErrorMessage } from '@dos/module-sdk';
import { auditMiddleware, setAuditData, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port';

import { createPackageBody, addItemsBody, exportBody, createValidateBody, packageItemParams } from "../../schemas/evidence.schemas";

const router = Router();
router.use(moduleStack('evidence'));
router.use(auditMiddleware('evidence'));
router.use(mutationEventHook('evidence'));

// GET /api/evidence/packages — list packages
router.get('/', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { listPackages } = await import('../../services/reporting/evidence-package.service.js');
    const filters = {
      packageType: req.query.packageType as string | undefined,
      status: req.query.status as string | undefined,
    };
    const result = await listPackages(req.user!.tenantId!, filters);
    res.json({ items: result.rows, count: result.total });
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/packages — create package
router.post('/', authenticate, requirePermission('evidence.item.write'), validate({ body: createPackageBody }), async (req: Request, res: Response) => {
  try {
    const { createPackage } = await import('../../services/reporting/evidence-package.service.js');
    const pkg = await createPackage(req.user!.tenantId!, { ...req.body, createdBy: req.user!.userId! });
    setAuditData(res as any, { action: 'create', entityType: 'evidence_package', entityId: pkg.id, afterState: pkg });
    res.status(201).json(pkg);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/packages/:id — package detail with items
router.get('/:id', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { getPackageDetail } = await import('../../services/reporting/evidence-package.service.js');
    const pkg = await getPackageDetail(req.user!.tenantId!, req.params.id);
    res.json(pkg);
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/packages/:id/items — add items
router.post('/:id/items', authenticate, requirePermission('evidence.item.write'), validate({ body: addItemsBody }), async (req: Request, res: Response) => {
  try {
    const { addItemToPackage } = await import('../../services/reporting/evidence-package.service.js');
    const evidenceIds: string[] = req.body.evidenceIds;
    const results: unknown[] = [];
    let skipped = 0;
    for (const eid of evidenceIds) {
      try {
        const item = await addItemToPackage(req.user!.tenantId!, req.params.id, eid, req.user!.userId!);
        results.push(item);
      } catch { skipped++; }
    }
    const result = { added: results.length, skipped, items: results };
    setAuditData(res as any, { action: 'update', entityType: 'evidence_package', entityId: req.params.id, afterState: result });
    res.json(result);
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

// DELETE /api/evidence/packages/:id/items/:itemId — remove item
router.delete('/:id/items/:itemId', authenticate, requirePermission('evidence.item.write'), validate({ params: packageItemParams }), async (req: Request, res: Response) => {
  try {
    const { removeItemFromPackage } = await import('../../services/reporting/evidence-package.service.js');
    await removeItemFromPackage(req.user!.tenantId!, req.params.id, req.params.itemId);
    res.status(204).send();
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/packages/:id/validate — freshness validation
router.post('/:id/validate', authenticate, requirePermission('evidence.item.read'), validate({ body: createValidateBody }), async (req: Request, res: Response) => {
  try {
    const { getPackageDetail } = await import('../../services/reporting/evidence-package.service.js');
    const pkg = await getPackageDetail(req.user!.tenantId!, req.params.id);
    // Validate freshness: check each item's freshness_status
    const items = (pkg as Record<string, unknown>).items || [];

    const staleItems = items.filter((i: Record<string, unknown>) => i.freshness_status === 'stale');

    const expiredItems = items.filter((i: Record<string, unknown>) => i.freshness_status === 'expired');

    const currentItems = items.filter((i: Record<string, unknown>) => !['stale', 'expired'].includes((i as any).freshness_status || ''));
    const result = {
      valid: staleItems.length === 0 && expiredItems.length === 0,

      totalItems: items.length,
      currentItems: currentItems.length,
      staleItems,
      expiredItems,
    };
    res.json(result);
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/packages/:id/export — generate export
router.post('/:id/export', authenticate, requirePermission('evidence.item.write'), validate({ body: exportBody }), async (req: Request, res: Response) => {
  try {
    const { exportPackage } = await import('../../services/reporting/evidence-package.service.js');
    const result = await exportPackage(req.user!.tenantId!, req.params.id, req.body.format || 'zip', req.user!.userId!);
    setAuditData(res as any, { action: 'create', entityType: 'evidence_export', entityId: result.id, afterState: result });
    res.status(201).json(result);
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/packages/:id/exports — export history
router.get('/:id/exports', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { getPackageExports } = await import('../../services/reporting/evidence-package.service.js');
    const items = await getPackageExports(req.user!.tenantId!, req.params.id);
    res.json({ items, count: items.length });
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;

