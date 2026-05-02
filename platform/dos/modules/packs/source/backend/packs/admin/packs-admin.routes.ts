import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
/**
 * Packs -- Admin Routes
 *
 * Administrative controls for the packs module:
 * - Module settings management
 * - Health and diagnostics
 * - Pack catalog management (sync, activate/deactivate)
 * - Installation management (force-uninstall, retry)
 * - Version management
 *
 * All routes protected with DAuth authenticate + requirePermission('packs.manage').
 *
 * MP-36 Section 10: Settings / Admin / Runtime Control.
 *
 * @owner DOS
 * @module packs
 */

import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, asyncHandler, moduleStack, auditMiddleware, setAuditData } from '../ports/middleware.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { runDiagnostics, getPacksMetrics } from '../diagnostics/packs-diagnostics.service';
import { PackRegistryService } from '../pack-registry.service';
import { logger } from '../ports/logger.port';
import { updateSettingsBody, createSyncBody, createRetryBody, createForceUninstallBody } from '../schemas/packs.schemas';

const router = Router();
router.use(moduleStack('packs'));
router.use(auditMiddleware('packs'));

const registryService = new PackRegistryService();

// ── GET /settings -- Module settings ────────────────────────────────────

router.get(
  '/settings',
  authenticate,
  requirePermission('packs.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);

    const { rows } = await safeQuery(
      `SELECT key, value FROM "${schema}".module_settings WHERE module_code = $1`,
      ['packs'],
    ).catch(() => ({ rows: [] }));

    res.json({ success: true, data: rows });
  }),
);

// ── PUT /settings -- Update module settings ─────────────────────────────

router.put(
  '/settings',
  authenticate,
  requirePermission('packs.manage'),
  validate({ body: updateSettingsBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);
    const settings = req.body?.settings;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object is required' });
    }

    setAuditData(res as any, {
      action: 'packs.settings.update',
      entityType: 'module',
      entityId: 'packs',
    });

    for (const [key, value] of Object.entries(settings)) {
      await safeQuery(
        `INSERT INTO "${schema}".module_settings (module_code, key, value)
         VALUES ('packs', $1, $2)
         ON CONFLICT (module_code, key) DO UPDATE SET value = $2`,
        [key, JSON.stringify(value)],
      ).catch(() => {
        logger.warn(`[packs-admin] failed to update setting: ${key}`);
      });
    }

    res.json({ success: true, message: 'Settings updated' });
  }),
);

// ── GET /health -- Module health check ──────────────────────────────────

router.get(
  '/health',
  authenticate,
  requirePermission('packs.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const diagnostics = await runDiagnostics(tenantId);
    const metrics = await getPacksMetrics(tenantId);

    res.json({
      success: true,
      ...diagnostics,
      metrics,
    });
  }),
);

// ── POST /catalog/sync -- Force sync pack registry from disk ────────────

router.post(
  '/catalog/sync',
  authenticate,
  requirePermission('packs.manage'),
  validate({ body: createSyncBody }),
  asyncHandler(async (req: Request, res: Response) => {
    setAuditData(res as any, {
      action: 'packs.catalog.sync',
      entityType: 'catalog',
      entityId: 'pack_registry',
    });

    const result = await registryService.syncFromDisk();

    logger.info(`[packs-admin] catalog sync completed: +${result.added} ~${result.updated} =${result.unchanged} !${result.errors.length}`);

    res.json({
      success: true,
      added: result.added,
      updated: result.updated,
      unchanged: result.unchanged,
      errors: result.errors,
    });
  }),
);

// ── POST /installations/:packCode/retry -- Retry failed installation ────

router.post(
  '/installations/:packCode/retry',
  authenticate,
  requirePermission('packs.manage'),
  validate({ body: createRetryBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const packCode = req.params.packCode as string;

    setAuditData(res as any, {
      action: 'packs.installation.retry',
      entityType: 'installation',
      entityId: packCode,
    });

    // Reset status from 'failed' to 'pending' for retry
    const result = await safeQuery(
      `UPDATE public.tenant_pack_installations
       SET status = 'pending', installed_at = NOW()
       WHERE tenant_id = $1 AND pack_code = $2 AND status = 'failed'
       RETURNING pack_code, pack_version`,
      [tenantId, packCode],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'No failed installation found for this pack' });
    }

    res.json({
      success: true,
      packCode,
      message: 'Installation retry initiated',
    });
  }),
);

// ── POST /installations/:packCode/force-uninstall -- Force uninstall ────

router.post(
  '/installations/:packCode/force-uninstall',
  authenticate,
  requirePermission('packs.manage'),
  validate({ body: createForceUninstallBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const packCode = req.params.packCode as string;

    setAuditData(res as any, {
      action: 'packs.installation.force_uninstall',
      entityType: 'installation',
      entityId: packCode,
    });

    const result = await safeQuery(
      `UPDATE public.tenant_pack_installations
       SET status = 'uninstalled', installed_at = NOW()
       WHERE tenant_id = $1 AND pack_code = $2
       RETURNING pack_code, pack_version`,
      [tenantId, packCode],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Installation not found for this pack' });
    }

    logger.warn(`[packs-admin] force-uninstalled pack ${packCode} for tenant ${tenantId}`);

    res.json({
      success: true,
      packCode,
      message: 'Pack force-uninstalled',
    });
  }),
);

export default router;

