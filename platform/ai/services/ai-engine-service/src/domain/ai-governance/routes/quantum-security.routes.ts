// ============================================
// Quantum Security Routes — /security/quantum/*
// Exposes quantum-readiness.service.ts functions as REST endpoints.
// Mounted by ai-engine-service at /security/quantum.
// ============================================

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../ports/middleware.port';
import {
  inventoryCryptoAsset,
  assessVulnerability,
  createMigrationPlan,
  recordPqcTestResult,
  listCryptoAssets,
  getCryptoAssetById,
  listMigrationPlans,
  getMigrationPlanById,
  listPqcTestResults,
  getQuantumReadinessDashboard,
} from '../services/misc/quantum-readiness.service';

const router = Router();

// ── Helper: resolve tenant ID from request context ──
function resolveTenantId(req: Request): string | null {
  return (req as any).tenantId || (req.headers['x-tenant-id'] as string) || null;
}

// ── Helper: map DB row to status string ──
function computeAssetStatus(row: any): string {
  if (row.migration_status === 'completed') return 'active';
  if (row.expiry_date && new Date(row.expiry_date) < new Date()) return 'expired';
  if (row.expiry_date && new Date(row.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) return 'expiring';
  if (row.is_quantum_vulnerable) return 'deprecated';
  return 'active';
}

// ── Helper: map DB vulnerability row to frontend shape ──
function computeVulnType(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical': return 'harvest_now';
    case 'high': return 'store_now_decrypt_later';
    case 'medium': return 'key_compromise';
    default: return 'signature_forgery';
  }
}

function computeTimeToQuantum(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical': return '2-5 years';
    case 'high': return '5-8 years';
    default: return '8-15 years';
  }
}

function computeVulnStatus(migrationStatus: string): string {
  switch (migrationStatus) {
    case 'completed': return 'resolved';
    case 'in_progress': return 'mitigating';
    case 'planned': return 'assessed';
    default: return 'identified';
  }
}

function computeTestStatus(result: string): string {
  switch (result) {
    case 'pass': return 'passed';
    case 'fail': return 'failed';
    case 'running': return 'running';
    default: return 'pending';
  }
}

// ── KPIs / Dashboard ──────────────────────────────────────────
router.get(
  '/kpis',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

    const dashboard = await getQuantumReadinessDashboard(tenantId);

    const totalAssets = dashboard.total_assets as number ?? 0;
    const vulnerableByRisk = (dashboard.vulnerable_by_risk as any[]) ?? [];
    const migrationProgress = (dashboard.migration_progress as any[]) ?? [];

    const quantumVulnerableAssets = vulnerableByRisk.reduce(
      (sum: number, r: any) => sum + Number.parseInt(r.total ?? '0', 10),
      0,
    );
    const migratedRow = migrationProgress.find((r: any) => r.migration_status === 'completed');
    const pqcMigratedAssets = Number.parseInt(migratedRow?.total ?? '0', 10);
    const migrationPct = totalAssets > 0 ? Math.round((pqcMigratedAssets / totalAssets) * 100) : 0;
    const criticalVulns = vulnerableByRisk.find((r: any) => r.hndl_risk_level === 'critical');

    // PQC test stats
    let pqcTestsPassed = 0;
    let pqcTestsFailed = 0;
    try {
      const allTests = await listPqcTestResults(tenantId);
      pqcTestsPassed = allTests.filter((t: any) => t.result === 'pass').length;
      pqcTestsFailed = allTests.filter((t: any) => t.result === 'fail').length;
    } catch { /* tables may not exist yet */ }

    const readinessScore = totalAssets > 0
      ? Math.min(
          Math.round(
            ((pqcMigratedAssets * 40 +
              pqcTestsPassed * 30 +
              (totalAssets - quantumVulnerableAssets) * 30) /
              (totalAssets * 100)) *
              100,
          ),
          100,
        )
      : 0;

    res.json({
      totalCryptoAssets: totalAssets,
      quantumVulnerableAssets,
      pqcMigratedAssets,
      migrationProgress: migrationPct,
      criticalVulnerabilities: Number.parseInt(criticalVulns?.total ?? '0', 10),
      pqcTestsPassed,
      pqcTestsFailed,
      readinessScore,
      lastUpdatedAt: new Date().toISOString(),
    });
  }),
);

// ── Crypto Inventory CRUD ─────────────────────────────────────
router.get(
  '/crypto-inventory',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

    const filters: Record<string, unknown> = {};
    if (req.query.is_quantum_vulnerable !== undefined) {
      filters.is_quantum_vulnerable = req.query.is_quantum_vulnerable === 'true';
    }
    if (req.query.hndl_risk_level) filters.hndl_risk_level = req.query.hndl_risk_level as string;
    if (req.query.migration_status) filters.migration_status = req.query.migration_status as string;

    const assets = await listCryptoAssets(tenantId, filters as any);

    const mapped = assets.map((a: any) => ({
      id: a.id,
      name: a.asset_name,
      assetType: a.asset_type,
      algorithm: a.algorithm,
      keySize: a.key_length ?? 0,
      usage: a.asset_type,
      system: a.system_name ?? '',
      quantumVulnerable: a.is_quantum_vulnerable,
      quantumSafe: !a.is_quantum_vulnerable,
      pqcStatus: a.migration_status,
      riskLevel: a.hndl_risk_level,
      expiresAt: a.expiry_date,
      status: computeAssetStatus(a),
      createdAt: a.created_at,
    }));

    res.json(mapped);
  }),
);

router.get(
  '/inventory',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

    const page = Math.max(1, Number.parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit as string, 10) || 10));

    const allAssets = await listCryptoAssets(tenantId);
    const start = (page - 1) * limit;
    const pageAssets = allAssets.slice(start, start + limit);

    const mapped = pageAssets.map((a: any) => ({
      id: a.id,
      name: a.asset_name,
      assetType: a.asset_type,
      algorithm: a.algorithm,
      quantumVulnerable: a.is_quantum_vulnerable,
      pqcStatus: a.migration_status,
      riskLevel: a.hndl_risk_level,
      createdAt: a.created_at,
    }));

    res.json({ assets: mapped, page, limit, total: allAssets.length });
  }),
);

router.get(
  '/crypto-inventory/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

    const asset = await getCryptoAssetById(tenantId, req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
  }),
);

router.post(
  '/crypto-inventory',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

    const result = await inventoryCryptoAsset(tenantId, req.body);
    res.status(201).json(result);
  }),
);

// ── Vulnerability Assessment ──────────────────────────────────
router.get(
  '/vulnerabilities',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

    const assets = await listCryptoAssets(tenantId, { is_quantum_vulnerable: true });

    const mapped = assets.map((a: any) => ({
      id: a.id,
      system: a.system_name ?? a.asset_name,
      algorithm: a.algorithm,
      vulnerabilityType: computeVulnType(a.hndl_risk_level || 'medium'),
      riskLevel: a.hndl_risk_level || 'medium',
      dataClassification: a.data_sensitivity ?? 'internal',
      estimatedTimeToQuantum: computeTimeToQuantum(a.hndl_risk_level || 'medium'),
      remediationPlan: a.migration_status === 'not_started'
        ? 'Pending PQC migration plan'
        : `Migration: ${a.migration_status}`,
      status: computeVulnStatus(a.migration_status),
    }));

    res.json(mapped);
  }),
);

router.post(
  '/vulnerabilities/:assetId/assess',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

    const result = await assessVulnerability(tenantId, req.params.assetId);
    res.json(result);
  }),
);

// ── Migration Plans CRUD ──────────────────────────────────────
router.get(
  '/migration-plans',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

    const filters: Record<string, string> = {};
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.priority) filters.priority = req.query.priority as string;

    const plans = await listMigrationPlans(tenantId, filters as any);

    const mapped = plans.map((p: any) => {
      let progress = 0;
      if (p.status === 'completed') progress = 100;
      else if (p.status === 'testing') progress = 75;
      else if (p.status === 'in_progress') progress = 50;

      return {
        id: p.id,
        name: p.name_en,
        targetAlgorithm: p.target_algorithm ?? 'ML-KEM',
        affectedSystems: Array.isArray(p.target_assets) ? p.target_assets.length : 0,
        priority: p.priority,
        status: p.status,
        progress,
        deadline: p.target_completion,
        owner: p.responsible ?? 'Unassigned',
      };
    });

    res.json(mapped);
  }),
);

router.get(
  '/migration-plans/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

    const plan = await getMigrationPlanById(tenantId, req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  }),
);

router.post(
  '/migration-plans',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

    const result = await createMigrationPlan(tenantId, req.body);
    res.status(201).json(result);
  }),
);

// ── PQC Test Results CRUD ─────────────────────────────────────
router.get(
  '/pqc-tests',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

    const filters: Record<string, string> = {};
    if (req.query.plan_id) filters.plan_id = req.query.plan_id as string;
    if (req.query.asset_id) filters.asset_id = req.query.asset_id as string;
    if (req.query.result) filters.result = req.query.result as string;

    const tests = await listPqcTestResults(tenantId, filters as any);

    const mapped = tests.map((t: any) => ({
      id: t.id,
      name: `${t.test_type} — ${t.algorithm_tested}`,
      algorithm: t.algorithm_tested,
      testType: t.test_type,
      status: computeTestStatus(t.result),
      executedAt: t.test_date,
      latencyMs: t.latency_ms ?? 0,
      throughputOps: t.throughput_ops ?? 0,
      notes: t.notes ?? '',
    }));

    res.json(mapped);
  }),
);

router.post(
  '/pqc-tests',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

    const result = await recordPqcTestResult(tenantId, req.body);
    res.status(201).json(result);
  }),
);

export default router;
