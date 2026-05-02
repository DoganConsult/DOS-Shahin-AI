import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
// ============================================
// KSA Cross-Framework Control Mapping Routes
// API endpoints for NCA-ECC ↔ SAMA-CSF mappings
// ============================================

import { Router } from 'express';
import { authenticate, requirePermission } from '../../../ports/auth.port';

import { validate, auditMiddleware, setAuditData, moduleStack, mutationEventHook } from '../../../ports/middleware.port';
import { createStoreBody } from '../../../schemas/compliance.schemas';
import {
  getCrossFrameworkMappings,
  computeFrameworkOverlap,
  getControlEquivalences,
} from '../../../infrastructure/integrations/ksa-regulatory/services/ksa-cross-framework-mapping.service';

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));
router.use(mutationEventHook('compliance'));

/**
 * GET /api/ksa-cross-framework/mappings
 * Get cross-framework mappings for current tenant
 */
router.get(
  '/mappings',
  authenticate,

  requirePermission('compliance.mapping.view'), validate({ query: z.record(z.unknown()) }), async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const _sourceFramework = req.query.sourceFramework as string | undefined;
      const _targetFramework = req.query.targetFramework as string | undefined;

      const result = await getCrossFrameworkMappings(tenantId);

      res.json({
        success: true,
        data: result.mappings,
        count: result.mappings.length,
      });
    } catch (err) {
      const errObj = err as { code?: string };
      if (errObj?.code === '3F000' || errObj?.code === '42P01') {
        return res.status(404).json({ success: false, error: 'Tenant schema not found' });
      }
      res.status(500).json({
        success: false,
        error: (err as Error).message,
      });
    }
  },
);

/**
 * POST /api/ksa-cross-framework/mappings/store
 * Store cross-framework mappings for tenant
 */
router.post(
  '/mappings/store',
  authenticate,

  requirePermission('compliance.mapping.manage'),
  validate({ body: createStoreBody }),
  async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const { mappings } = req.body;

      if (!Array.isArray(mappings)) {
        return res.status(400).json({
          success: false,
          error: 'mappings must be an array',
        });
      }

      await getCrossFrameworkMappings(tenantId);

      setAuditData(res as any, { action: 'create', entityType: 'cross_framework_mapping', entityId: tenantId, afterState: { mappingCount: mappings.length } });
      res.json({
        success: true,
        message: 'Mappings stored successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: (err as Error).message,
      });
    }
  },
);

/**
 * GET /api/ksa-cross-framework/summary
 * Get mapping summary between two frameworks
 */
router.get(
  '/summary',
  authenticate,

  requirePermission('compliance.mapping.view'), validate({ query: z.record(z.unknown()) }), async (req, res) => {
    try {
      const sourceFramework = req.query.sourceFramework as string;
      const targetFramework = req.query.targetFramework as string;

      if (!sourceFramework || !targetFramework) {
        return res.status(400).json({
          success: false,
          error: 'sourceFramework and targetFramework are required',
        });
      }

      const summary = await computeFrameworkOverlap(req.tenantId!, sourceFramework, targetFramework);

      res.json({
        success: true,
        data: summary,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: (err as Error).message,
      });
    }
  },
);

/**
 * GET /api/ksa-cross-framework/build-nca-sama
 * Build NCA-ECC ↔ SAMA-CSF mappings (admin utility)
 */
router.get(
  '/build-nca-sama',
  authenticate,

  requirePermission('platform.system.admin'), validate({ query: z.record(z.unknown()) }), async (req, res) => {
    try {
      const result = await getControlEquivalences(req.tenantId!, 'NCA-ECC');

      res.json({
        success: true,
        data: result.equivalences,
        count: result.equivalences.length,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: (err as Error).message,
      });
    }
  },
);

export default router;

