import { Router } from 'express';
import { z } from "zod";
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack, fieldRbacFilter } from '../ports/middleware.port';
import { getDashboardSummary } from '../services/asset-reports.service';
import { getAssetStats } from '../services/asset-registry.service';
import { getLifecycleDistribution } from '../services/asset-lifecycle.service';
import { getClassificationDistribution } from '../services/asset-classification.service';
import { getDependencyStats } from '../services/dependency.service';
import { getOwnershipStats, getUnownedEntities } from '../services/asset-ownership.service';
import { getCriticalAssets } from '../services/asset-criticality.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('asset'));
router.use(auditMiddleware('asset'));
router.use(fieldRbacFilter('asset'));

// Full dashboard summary
router.get('/', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const summary = await getDashboardSummary(req.tenantId!);
  res.json(summary);
}));

// KPIs endpoint — aggregated data matching frontend AssetHomeKpis contract
router.get('/kpis', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const [summary, lifecycle, classification, criticalData, _unowned] = await Promise.all([
    getDashboardSummary(req.tenantId!),
    getLifecycleDistribution(req.tenantId!),
    getClassificationDistribution(req.tenantId!),
    getCriticalAssets(req.tenantId!),
    getUnownedEntities(req.tenantId!, 'asset'),
  ]);
  const criticalityBreakdown: Record<string, number> = {};
  for (const a of (criticalData?.data ?? [])) {
    const c = (a as Record<string, unknown>).criticality as string || 'unknown';
    criticalityBreakdown[c] = (criticalityBreakdown[c] || 0) + 1;
  }
  const classificationDistribution: Record<string, number> = {};
  for (const row of (classification ?? [])) {
    const r = row as Record<string, unknown>;
    classificationDistribution[r.classification as string || 'unclassified'] = r.count as number || 0;
  }
  const lifecycleDistribution: Record<string, number> = {};
  for (const row of (lifecycle ?? [])) {
    const r = row as Record<string, unknown>;
    lifecycleDistribution[r.stage as string || 'unknown'] = r.count as number || 0;
  }
  res.json({
    totalAssets: (summary as Record<string, unknown>)?.total_assets ?? 0,
    totalApplications: (summary as Record<string, unknown>)?.total_applications ?? 0,
    totalServices: (summary as Record<string, unknown>)?.total_services ?? 0,
    criticalAssets: (summary as Record<string, unknown>)?.critical_assets ?? 0,
    unownedAssets: Math.max(0, ((summary as Record<string, unknown>)?.total_assets as number || 0) - ((summary as Record<string, unknown>)?.owned_assets as number || 0)),
    criticalityBreakdown,
    classificationDistribution,
    lifecycleDistribution,
  });
}));

// Asset health stats
router.get('/stats', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const stats = await getAssetStats(req.tenantId!);
  res.json(stats);
}));

// Lifecycle distribution
router.get('/lifecycle', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const dist = await getLifecycleDistribution(req.tenantId!);
  res.json({ distribution: dist });
}));

// Classification distribution
router.get('/classification', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const dist = await getClassificationDistribution(req.tenantId!);
  res.json({ distribution: dist });
}));

// Dependency stats
router.get('/dependencies', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const stats = await getDependencyStats(req.tenantId!);
  res.json(stats);
}));

// Ownership stats
router.get('/ownership', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const stats = await getOwnershipStats(req.tenantId!);
  res.json(stats);
}));

export default router;
