// ============================================
// Shahin-Ai — Data Export Routes
// GDPR Article 20: Tenant data portability
// ============================================

import { Router, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { asyncHandler, auditMiddleware, setAuditData } from '../ports/middleware.port';
import { ok } from '@dos/module-sdk';
import type { AuthenticatedRequest } from '@dos/types';
import { exportTenantData, getExportCatalog } from '../services/tenant-data-export.service';
import { createDsr, getDsr, listDsrs, transitionDsrStatus } from '../services/privacy-dsr-processor.service';

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('privacy'));

// POST /privacy/data-export/request — Create a data export request

router.post('/request', requirePermission('privacy.export.create'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.userId!;

  // Create a DSR record of type 'portability'
  const dsr = await createDsr(tenantId, {
    title: `Data Export Request — ${new Date().toISOString()}`,
    description: req.body.description || 'GDPR Article 20 data portability request',
    requestType: 'portability',
    dataSubjectName: req.body.dataSubjectName || req.user?.name || 'Tenant Export',
    dataSubjectEmail: req.body.dataSubjectEmail || req.user?.email || '',
    createdBy: userId,
    tags: ['gdpr', 'article-20', 'data-export'],
    metadata: {
      categories: req.body.categories || [],
      includeSoftDeleted: req.body.includeSoftDeleted || false,
      requestedBy: userId,
    },
  });

  // Transition to in_progress
  await transitionDsrStatus(tenantId, dsr.id, 'in_progress');

  // Execute export synchronously (for now; can be made async with BullMQ for large tenants)
  try {
    const exportResult = await exportTenantData(tenantId, {
      categories: req.body.categories,
      includeSoftDeleted: req.body.includeSoftDeleted || false,
    });

    // Mark DSR as completed
    await transitionDsrStatus(tenantId, dsr.id, 'completed', 'Export completed successfully');

    setAuditData(res as any, { entityType: 'data_export', entityId: dsr.id, action: 'create' });

    res.json(ok({
      exportId: dsr.id,
      status: 'completed',
      metadata: exportResult.metadata,
      downloadReady: true,
    }, req));
  } catch (err) {
    // Mark DSR as failed but don't lose the error
    await transitionDsrStatus(tenantId, dsr.id, 'rejected', `Export failed: ${(err as Error).message}`);
    throw err;
  }
}));

// GET /privacy/data-export/:exportId/status — Check export status

router.get('/:exportId/status', requirePermission('privacy.export.read'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const dsr = await getDsr(tenantId, req.params.exportId);

  res.json(ok({
    exportId: dsr.id,
    status: dsr.status,
    requestType: dsr.requestType,
    createdAt: dsr.createdAt,
    dueDate: dsr.dueDate,
    resolution: dsr.resolution,
  }, req));
}));

// GET /privacy/data-export/:exportId/download — Download export data

router.get('/:exportId/download', requirePermission('privacy.export.read'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const dsr = await getDsr(tenantId, req.params.exportId);

  if (dsr.status !== 'completed') {
    res.status(400).json({ error: 'Export not ready', status: dsr.status });
    return;
  }

  // Re-generate the export data (or retrieve from cache/storage in production)
  const exportResult = await exportTenantData(tenantId, {
    categories: (dsr.metadata as Record<string, unknown>)?.categories as string[] | undefined,
    includeSoftDeleted: (dsr.metadata as Record<string, unknown>)?.includeSoftDeleted as boolean || false,
  });

  setAuditData(res as any, { entityType: 'data_export', entityId: dsr.id, action: 'download' });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="tenant-export-${tenantId}-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(exportResult);
}));

// GET /privacy/data-export/catalog — List available export categories

router.get('/catalog', requirePermission('privacy.export.read'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const catalog = getExportCatalog();
  res.json(ok({ categories: catalog, totalCategories: catalog.length }, req));
}));

// GET /privacy/data-export/ — List all export requests for this tenant

router.get('/', requirePermission('privacy.export.read'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const exports = await listDsrs(req.tenantId!, { requestType: 'portability' });
  res.json(ok({ exports, total: exports.length }, req));
}));

export default router;
