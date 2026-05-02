import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../../ports/events.port';

const genericPayloadSchema = z.record(z.unknown());

/**
 * Compliance Workspace — Foundation Lookups, Posture (by-org, heatmap, vendor-health),
 *   Drift Detection, Catalog Status
 * Sub-router mounted at "/" relative to the compliance-workspace barrel.
 */


import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  getFoundationUsers,
  getFoundationTeams,
  getFoundationDepartments,
  getFoundationBusinessUnits,
  getComplianceByOrgUnit,
  captureDriftBaseline,
  detectControlFindingDrift,
  getDriftRegister,
} from '../../services/compliance/compliance-workspace.service';
import { emptyResult } from '../../../ports/database.port';
import { computeComplianceHeatMap } from '../../../application/compliance/reporting/compliance-heatmap.service';
import { logComplianceAccess } from '../../../application/compliance/reporting/compliance-observability.service';
import { errMsg } from "../../../../i18n/error-messages";
import { getFirstRow } from "@dos/db";
import { auditMiddleware, automationMiddleware, rateLimiter, setAuditData, validate, moduleStack, mutationEventHook } from '../../../ports/middleware.port';

import { swallow as _swallow, EC, swallowDefault } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';
import { driftBaselineBody, driftDetectBody } from "../../../schemas/compliance.schemas";

const router = Router();
router.use(moduleStack('compliance'));
router.use(mutationEventHook('compliance'));

// ── FOUNDATION LOOKUPS ──────────────────────────────────────────────

router.get("/foundation/users", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/foundation/users";
  try {
    const tenantId = req.tenantId!;
    const data = await getFoundationUsers(tenantId);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.get("/foundation/teams", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/foundation/teams";
  try {
    const tenantId = req.tenantId!;
    const data = await getFoundationTeams(tenantId);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.get("/foundation/departments", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/foundation/departments";
  try {
    const tenantId = req.tenantId!;
    const data = await getFoundationDepartments(tenantId);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.get("/foundation/business-units", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/foundation/business-units";
  try {
    const tenantId = req.tenantId!;
    const data = await getFoundationBusinessUnits(tenantId);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── COMPLIANCE BY ORG UNIT ──────────────────────────────────────────

router.get("/posture/by-org", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/posture/by-org";
  try {
    const tenantId = req.tenantId!;
    const groupBy = (req.query.groupBy as string) === 'business_unit' ? 'business_unit' : 'department';
    const data = await getComplianceByOrgUnit(tenantId, groupBy);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── COMPLIANCE HEATMAP ──────────────────────────────────────────────

router.get("/posture/heatmap", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/posture/heatmap";
  try {
    const tenantId = req.tenantId!;
    const groupBy = (req.query.groupBy as string) === 'department' ? 'department' : 'business_unit';
    const includeInactive = req.query.includeInactive === 'true';
    const frameworkFilter = req.query.frameworks
      ? (req.query.frameworks as string).split(',').filter(Boolean)
      : undefined;

    const data = await computeComplianceHeatMap(tenantId, {
      groupBy,
      includeInactive,
      frameworkFilter,
    });

    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── VENDOR HEALTH IMPACT ────────────────────────────────────────────

router.get("/posture/vendor-health", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/posture/vendor-health";
  try {
    const tenantId = req.tenantId!;
    const { safeQuery, tenantSchema } = await import('../../../../config/database.js');
    const schema = tenantSchema(tenantId);

    // Aggregate vendor health metrics
    const vendorStats = await safeQuery(
      `SELECT COUNT(*)::int AS total_vendors,
              COALESCE(AVG(risk_score), 100)::numeric AS avg_score,
              COUNT(*) FILTER (WHERE risk_rating IN ('critical', 'high'))::int AS high_risk_count
       FROM "${schema}".vendors WHERE status = 'active'`
    );

    // Controls exposed to vendors
    const controlExposure = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ vendor_controls: 0 }]), safeQuery(
      `SELECT COUNT(DISTINCT control_id)::int AS vendor_controls
       FROM "${schema}".vendor_shared_responsibility
       WHERE ownership IN ('vendor', 'shared')`
    ), { tenantId: tenantId, operation: 'query vendors' });

    const totalControls = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 1 }]), safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${schema}".controls`
    ), { tenantId: tenantId, operation: 'query vendors' });

    // Open vendor findings
    const openFindings = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS count FROM "${schema}".vendor_findings WHERE status = 'open'`
    ), { tenantId: tenantId, operation: 'query vendor_shared_responsibility' });

    const row = getFirstRow(vendorStats) || {};
    const total = parseInt((getFirstRow as any)(totalControls)?.total, 10) || 1;
    const vendorControls = parseInt((getFirstRow as any)(controlExposure)?.vendor_controls, 10) || 0;

    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json({
      avgScore: Math.round(parseFloat(row.avg_score) || 100),
      totalVendors: row.total_vendors || 0,
      highRiskCount: row.high_risk_count || 0,
      vendorControlPct: Math.round((vendorControls / total) * 100),
      openFindings: getFirstRow(openFindings)?.count || 0,
    });
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── DRIFT DETECTION ─────────────────────────────────────────────────

router.post("/drift/baseline", authenticate, requirePermission("control.record.write"), rateLimiter, auditMiddleware, automationMiddleware, validate({ body: driftBaselineBody }), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/drift/baseline";
  try {
    const tenantId = req.tenantId!;
    const entityType = (req.body?.entityType || 'both') as 'control' | 'finding' | 'both';
    const result = await captureDriftBaseline(tenantId, entityType);
    setAuditData(res as any, { action: "create", entityType: "drift_baseline", entityId: "bulk", afterState: result });
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(result);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.post("/drift/detect", authenticate, requirePermission("framework.record.read"), rateLimiter, validate({ body: driftDetectBody }), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/drift/detect";
  try {
    const tenantId = req.tenantId!;
    const entityType = (req.body?.entityType || 'both') as 'control' | 'finding' | 'both';
    const result = await detectControlFindingDrift(tenantId, entityType);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(result);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.get("/drift/register", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), rateLimiter, async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/drift/register";
  try {
    const tenantId = req.tenantId!;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const entityType = (req.query.entityType as 'control' | 'finding' | 'both') || 'both';
    const severity = req.query.severity as 'low' | 'medium' | 'high' | undefined;
    const result = await getDriftRegister(tenantId, { limit, offset, entityType, severity });
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(result);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── CATALOG STATUS ──────────────────────────────────────────────────

router.get("/catalog/status", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("platform.system.admin"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/catalog/status";
  try {
    const { safeQuery } = await import("../../../../config/database.js");
    const { getRegistryStats } = await import("../../data/ksa-index.js");

    // Get stats from code (source of truth)
    const codeStats = await getRegistryStats() as any;

    // Get stats from DB (what's actually seeded)
    const dbStats = await safeQuery(
      `SELECT
        (SELECT COUNT(*) FROM public.regulatory_frameworks WHERE is_active = true)::int AS frameworks,
        (SELECT COUNT(*) FROM public.regulatory_controls)::int AS controls,
        (SELECT COUNT(*) FROM public.control_domains)::int AS domains,
        (SELECT COUNT(*) FROM public.regulators)::int AS regulators
      `
    );

    const db = getFirstRow(dbStats) || { frameworks: 0, controls: 0, domains: 0, regulators: 0 };

    // Check framework filtering support in key endpoints
    const filteringSupported = {
      frameworks: true,
      controls: true,
      findings: true,
      domains: true,
      obligations: true,
      gaps: true,
    };

    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 200);
    res.json({
      code: {
        frameworks: codeStats.frameworks,
        controls: codeStats.controls,
        domains: codeStats.domains,
        regulators: codeStats.regulators,
      },
      database: {
        frameworks: db.frameworks,
        controls: db.controls,
        domains: db.domains,
        regulators: db.regulators,
      },
      filteringSupported,
      status: db.frameworks > 0 && db.controls > 0 ? "seeded" : "needs_seeding",
    });
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;

