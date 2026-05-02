import { Request, Response, Router } from 'express';
import { z } from "zod";
import { logger } from '../../ports/logger.port';
// ============================================================
// AGRC-OS — Audit Knowledge Base (AKB) Routes
// Full REST API for building, querying, and exporting AKB packages
// ============================================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import { buildAkbPackage, exportAkbZip, AkbPackage as _AkbPackage } from '../../services/misc/akb.service';
import { toErrorMessage } from '@dos/module-sdk';

import { moduleStack } from '../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('audit'));

// ── GET /api/akb/build — Build full AKB package (JSON) ─────
router.get('/build', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('audit.record.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.headers['x-tenant-id'] as string;
    const userId = req.userId!;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    const options: Record<string, unknown> = {};
    if (req.query.frameworkFilter) options.frameworkFilter = req.query.frameworkFilter;
    if (req.query.dateFrom) options.dateFrom = req.query.dateFrom;
    if (req.query.dateTo) options.dateTo = req.query.dateTo;

    const akb = await buildAkbPackage(tenantId, userId, options);
    res.json(akb);
  } catch (err: unknown) {
    logger.error('[AKB] Build failed:', toErrorMessage(err));
    res.status(500).json({ error: 'AKB build failed', details: toErrorMessage(err) });
  }
});

// ── GET /api/akb/download — Export AKB as ZIP ──────────────
router.get('/download', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('audit.record.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.headers['x-tenant-id'] as string;
    const userId = req.userId!;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    const options: Record<string, unknown> = {};
    if (req.query.frameworkFilter) options.frameworkFilter = req.query.frameworkFilter;
    if (req.query.dateFrom) options.dateFrom = req.query.dateFrom;
    if (req.query.dateTo) options.dateTo = req.query.dateTo;

    const akb = await buildAkbPackage(tenantId, userId, options);
    const zip = await exportAkbZip(akb);

    const filename = `AGRC-OS-AKB-${tenantId.substring(0, 8)}-${new Date().toISOString().slice(0, 10)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', zip.length.toString());
    res.send(zip);
  } catch (err: unknown) {
    logger.error('[AKB] ZIP export failed:', toErrorMessage(err));
    res.status(500).json({ error: 'AKB ZIP export failed', details: toErrorMessage(err) });
  }
});

// ── GET /api/akb/summary — Quick summary stats ────────────
router.get('/summary', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('audit.record.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.headers['x-tenant-id'] as string;
    const userId = req.userId!;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    const akb = await buildAkbPackage(tenantId, userId);
    res.json({
      metadata: akb.metadata,
      statistics: akb.statistics,
      executiveSummary: akb.executiveSummary,
      scorecard: {
        compliance: akb.scorecard.overallComplianceScore,
        maturity: akb.scorecard.overallMaturityScore,
        confidence: akb.scorecard.overallConfidenceScore,
        freshness: akb.scorecard.overallFreshnessScore,
      },
      sectorProfile: akb.sectorProfile,
      regulatorCount: akb.regulators.length,
      frameworkCount: akb.frameworks.length,
      controlCount: akb.controls.length,
      evidenceCount: akb.evidence.length,
      gapCount: akb.traceabilityMatrix.filter(r => r.gap).length,
      hashManifest: {
        rootHash: akb.hashManifest.rootHash,
        algorithm: akb.hashManifest.algorithm,
        entryCount: akb.hashManifest.entries.length,
        chainIntegrity: akb.hashManifest.chainIntegrity,
      },
    });
  } catch (err: unknown) {
    logger.error('[AKB] Summary failed:', toErrorMessage(err));
    res.status(500).json({ error: 'AKB summary failed', details: toErrorMessage(err) });
  }
});

// ── GET /api/akb/traceability — Traceability matrix only ──
router.get('/traceability', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('audit.record.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.headers['x-tenant-id'] as string;
    const userId = req.userId!;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    const akb = await buildAkbPackage(tenantId, userId);
    res.json({
      totalRows: akb.traceabilityMatrix.length,
      gaps: akb.traceabilityMatrix.filter(r => r.gap).length,
      verified: akb.traceabilityMatrix.filter(r => r.evidenceStatus === 'verified').length,
      rows: akb.traceabilityMatrix,
    });
  } catch (err: unknown) {
    logger.error('[AKB] Traceability failed:', toErrorMessage(err));
    res.status(500).json({ error: 'Traceability query failed', details: toErrorMessage(err) });
  }
});

// ── GET /api/akb/hash-manifest — Hash manifest only ───────
router.get('/hash-manifest', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('audit.record.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.headers['x-tenant-id'] as string;
    const userId = req.userId!;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

    const akb = await buildAkbPackage(tenantId, userId);
    res.json(akb.hashManifest);
  } catch (err: unknown) {
    logger.error('[AKB] Hash manifest failed:', toErrorMessage(err));
    res.status(500).json({ error: 'Hash manifest query failed', details: toErrorMessage(err) });
  }
});

export default router;
