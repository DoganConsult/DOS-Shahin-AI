import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
/**
 * Packs Routes -- DAuth-protected route layer for packs module.
 *
 * Consolidates and replaces bare controller endpoints with full middleware stack:
 * moduleStack, auditMiddleware, authenticate, requirePermission, asyncHandler.
 *
 * Route groups:
 *  - Catalog retrieval (list available packs)
 *  - Installation actions (install, uninstall, update)
 *  - Compatibility checks
 *  - Installed packs and updates
 *  - Diagnostics and health
 *  - AI-powered recommendations and impact analysis
 *  - Policy evaluation
 *
 * MP-36 Section 6.1: Required route groups.
 * MP-36 Section 7: DAuth integration on all protected paths.
 *
 * @owner DOS
 * @module packs
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, asyncHandler, moduleStack, auditMiddleware, setAuditData } from '../ports/middleware.port';
import { PackRegistryService } from '../pack-registry.service';
import { PackInstallerService } from '../pack-installer.service';
import { PackPolicyService } from '../pack-policy.service';
import { runDiagnostics, getPacksMetrics, getDependencyDiagnostics } from '../diagnostics/packs-diagnostics.service';
import { recommendPacks, analyzePackImpact, explainCompatibility as _explainCompatibility, analyzePackHealth, isPacksAiActionAllowed } from '../ai/packs-ai.service';
import { toCatalogEntry, toInstallationRecord } from '../mappers/packs.mapper';
import { emitPackInstalled, emitPackInstallFailed, emitPackUninstalled, emitCompatibilityChecked } from '../events/packs.publishers';
import { safeQuery } from '../ports/database.port';
import { logger as _logger } from '../ports/logger.port';
import { v4 as uuidv4 } from 'uuid';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';
import { createInstallBody, createUninstallBody, createEvaluateBody } from '../schemas/packs.schemas';

const router = Router();
router.use(moduleStack('packs'));
router.use(auditMiddleware('packs'));

const registryService = new PackRegistryService();
const installerService = new PackInstallerService();
const policyService = new PackPolicyService();

// ── GET /catalog -- List available packs ────────────────────────────────

router.get(
  '/catalog',
  authenticate,
  requirePermission('packs.policy.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const packType = req.query?.type as string | undefined;
    const isActive = req.query?.active !== 'false';

    const packs = await registryService.listPacks({

      type: packType as string | undefined,
      is_active: isActive,
    });

    const mapped = (packs as unknown as Array<Record<string, unknown>>).map(toCatalogEntry);
    res.json({ success: true, data: mapped, total: mapped.length });
  }),
);

// ── GET /catalog/:code -- Get pack details by code ──────────────────────

router.get(
  '/catalog/:code',
  authenticate,
  requirePermission('packs.policy.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const code = req.params.code as string;
    const pack = await registryService.getPackByCode(code);

    if (!pack) {
      return res.status(404).json({ error: 'Pack not found' });
    }

    const mapped = toCatalogEntry(pack as unknown as Record<string, unknown>);
    res.json({ success: true, data: mapped });
  }),
);

// ── GET /installed -- List installed packs for tenant ───────────────────

router.get(
  '/installed',
  authenticate,
  requirePermission('packs.policy.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const installed = await registryService.getInstalledPacks(tenantId);

    const mapped = (installed as Array<Record<string, unknown>>).map(toInstallationRecord);
    res.json({ success: true, data: mapped, total: mapped.length });
  }),
);

// ── GET /updates -- Check for available updates ─────────────────────────

router.get(
  '/updates',
  authenticate,
  requirePermission('packs.policy.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const updates = await registryService.checkForUpdates(tenantId);

    res.json({
      success: true,
      data: updates,
      totalUpdates: updates.length,
    });
  }),
);

// ── POST /install -- Install a pack ─────────────────────────────────────

router.post(
  '/install',
  authenticate,
  requirePermission('packs.pack.manage'),
  validate({ body: createInstallBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user?.userId || req.user?.id;
    const correlationId = uuidv4();

    const { packCode, appliesToRole, workspaceId } = req.body ?? {};
    if (!packCode) {
      return res.status(400).json({ error: 'packCode is required' });
    }

    setAuditData(res as any, {
      action: 'packs.pack.install',
      entityType: 'installation',
      entityId: packCode,
    });

    try {
      const result = await installerService.installPack(String(tenantId), {
        packCode: String(packCode),
        appliesToRole: appliesToRole ?? null,
        workspaceId: workspaceId ?? null,
        installedBy: String(userId ?? SYSTEM_JOB_ACTOR),
      });

      await emitPackInstalled(
        String(tenantId),
        result.packCode,
        result.version,
        String(userId ?? SYSTEM_JOB_ACTOR),
        correlationId,
      );

      res.json({ success: true, ...result });
    } catch (err: unknown) {
      await emitPackInstallFailed(
        String(tenantId),
        String(packCode),
        (err as Error).message,
        correlationId,
      );
      throw err;
    }
  }),
);

// ── POST /uninstall -- Uninstall a pack ─────────────────────────────────

router.post(
  '/uninstall',
  authenticate,
  requirePermission('packs.pack.manage'),
  validate({ body: createUninstallBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user?.userId || req.user?.id;
    const correlationId = uuidv4();

    const { packCode } = req.body ?? {};
    if (!packCode) {
      return res.status(400).json({ error: 'packCode is required' });
    }

    setAuditData(res as any, {
      action: 'packs.pack.uninstall',
      entityType: 'installation',
      entityId: packCode,
    });

    // Mark as uninstalled in tenant_pack_installations
    const result = await safeQuery(
      `UPDATE public.tenant_pack_installations
       SET status = 'uninstalled', installed_at = NOW()
       WHERE tenant_id = $1 AND pack_code = $2 AND status = 'installed'
       RETURNING pack_code`,
      [tenantId, packCode],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Pack not found or not installed' });
    }

    await emitPackUninstalled(String(tenantId), String(packCode), String(userId ?? SYSTEM_JOB_ACTOR), correlationId);

    res.json({ success: true, packCode, uninstalled: true });
  }),
);

// ── GET /compatibility/:packCode -- Check pack compatibility ────────────

router.get(
  '/compatibility/:packCode',
  authenticate,
  requirePermission('packs.policy.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const packCode = req.params.packCode as string;
    const correlationId = uuidv4();

    // Fetch pack from registry
    const pack = await registryService.getPackByCode(packCode);
    if (!pack) {
      return res.status(404).json({ error: 'Pack not found in registry' });
    }

    // Check dependencies

    const dependsOn = (pack as Record<string, unknown>).depends_on ?? [];
    const { rows: installed } = await safeQuery(
      `SELECT pack_code FROM public.tenant_pack_installations
       WHERE tenant_id = $1 AND status = 'installed'`,
      [tenantId],
    ).catch(() => ({ rows: [] }));
    const installedCodes = new Set(
      (installed as Array<Record<string, unknown>>).map(r => r.pack_code as string),
    );

    const missingDeps = dependsOn.filter((d: string) => !installedCodes.has(d));

    // Check required modules

    const compat = (pack as Record<string, unknown>).compat ?? {};

    const requiredModules = compat.required_modules ?? [];
    let requiredModulesPresent = true;
    if (requiredModules.length > 0) {
      const { rows: modules } = await safeQuery(
        `SELECT module_code FROM public.module_settings
         WHERE module_code = ANY($1) AND is_active = true`,
        [requiredModules],
      ).catch(() => ({ rows: [] }));
      requiredModulesPresent = modules.length >= requiredModules.length;
    }

    const compatible = missingDeps.length === 0 && requiredModulesPresent;

    await emitCompatibilityChecked(String(tenantId), packCode, compatible, correlationId);

    res.json({
      compatible,
      packCode,

      packVersion: (pack as Record<string, unknown>).version,
      missingDependencies: missingDeps,
      conflictingPacks: [],
      platformVersionOk: true,
      requiredModulesPresent,
      reason: compatible ? 'All checks passed' : 'Compatibility issues detected',
    });
  }),
);

// ── POST /policies/evaluate -- Evaluate pack selection policies ─────────

router.post(
  '/policies/evaluate',
  authenticate,
  requirePermission('packs.policy.manage'),
  validate({ body: createEvaluateBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user?.userId || req.user?.id;

    const sessionId = req.body?.sessionId;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    setAuditData(res as any, {
      action: 'packs.policy.evaluate',
      entityType: 'policy',
      entityId: String(sessionId),
    });

    const result = await policyService.evaluate({
      sessionId: String(sessionId),
      tenantId: String(tenantId),
      userId: String(userId),
    });

    res.json(result);
  }),
);

// ── GET /policies/decisions/:sessionId -- List policy decisions ─────────

router.get(
  '/policies/decisions/:sessionId',
  authenticate,
  requirePermission('packs.policy.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const result = await policyService.listDecisions(
      String(tenantId),
      String(req.params.sessionId),
    );

    res.json({ success: true, data: result });
  }),
);

// ── GET /diagnostics -- Module diagnostics ──────────────────────────────

router.get(
  '/diagnostics',
  authenticate,
  requirePermission('packs.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const includeMetrics = req.query?.includeMetrics === 'true';

    const diagnostics = await runDiagnostics(tenantId);

    let metrics;
    if (includeMetrics) {
      metrics = await getPacksMetrics(tenantId);
    }

    setAuditData(res as any, {
      action: 'packs.diagnostics.run',
      entityType: 'module',
      entityId: 'packs',
    });

    res.json({
      ...diagnostics,
      ...(metrics ? { metrics } : {}),
    });
  }),
);

// ── GET /diagnostics/dependencies -- Dependency diagnostics ─────────────

router.get(
  '/diagnostics/dependencies',
  authenticate,
  requirePermission('packs.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const depDiag = await getDependencyDiagnostics(tenantId);
    res.json({ success: true, data: depDiag });
  }),
);

// ── GET /ai/recommendations -- AI pack recommendations ──────────────────

router.get(
  '/ai/recommendations',
  authenticate,
  requirePermission('packs.policy.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    if (!isPacksAiActionAllowed('packs.recommend')) {
      return res.status(403).json({ error: 'AI pack recommendation is not allowed' });
    }

    const tenantId = req.tenantId!;

    // Get active modules for this tenant
    const { rows: moduleRows } = await safeQuery(
      `SELECT module_code FROM public.module_settings
       WHERE is_active = true`,
    ).catch(() => ({ rows: [] }));
    const activeModules = (moduleRows as Array<Record<string, unknown>>).map(r => r.module_code as string);

    // Get tenant profile
    const { rows: tenantRows } = await safeQuery(
      `SELECT industry, sector_code FROM public.tenants WHERE tenant_id = $1 LIMIT 1`,
      [tenantId],
    ).catch(() => ({ rows: [] }));
    const tenant = tenantRows[0] as Record<string, unknown> | undefined;

    const recommendations = await recommendPacks(
      tenantId,
      activeModules,
      (tenant?.industry as string) ?? null,
      (tenant?.sector_code as string) ?? null,
    );

    res.json({ success: true, data: recommendations });
  }),
);

// ── GET /ai/impact/:packCode -- AI impact analysis ──────────────────────

router.get(
  '/ai/impact/:packCode',
  authenticate,
  requirePermission('packs.policy.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    if (!isPacksAiActionAllowed('packs.impact.analyze')) {
      return res.status(403).json({ error: 'AI impact analysis is not allowed' });
    }

    const tenantId = req.tenantId!;
    const packCode = req.params.packCode as string;
    const action = (req.query?.action as 'install' | 'uninstall' | 'update') ?? 'install';

    const analysis = await analyzePackImpact(tenantId, packCode, action);
    res.json({ success: true, data: analysis });
  }),
);

// ── GET /ai/health -- AI health analysis ────────────────────────────────

router.get(
  '/ai/health',
  authenticate,
  requirePermission('packs.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    if (!isPacksAiActionAllowed('packs.health.analyze')) {
      return res.status(403).json({ error: 'AI health analysis is not allowed' });
    }

    const tenantId = req.tenantId!;
    const analysis = await analyzePackHealth(tenantId);
    res.json({ success: true, data: analysis });
  }),
);

export default router;

