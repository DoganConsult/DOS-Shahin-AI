import { Request, Response, Router } from 'express';
import { z } from "zod";
import type { AuthenticatedRequest as _AuthenticatedRequest } from '@dos/types';
import { emitEvent as _emitEvent } from '../../../../ports/events.port';

const genericPayloadSchema = z.record(z.unknown());

import { swallow as _swallow, EC } from '@dos/platform-core/resilience';

// ============================================================================
// Knowledge Hub API Routes
// Unified search, gap analysis, regulatory changes, and catalog access
// ============================================================================


import { searchControls, resolveRegulatoryProfileForTenant } from '../../../services/regulatory/regulatory-resolution.service';
import { getPendingImpacts, acknowledgeRegulatoryImpact, resolveRegulatoryImpact } from '../../../services/regulatory/regulatory-change-propagation.service';
import { listPendingFrameworkChanges, logFrameworkChange, listRegulatoryAuthorities } from '../../../services/regulatory/regulatory-content.service';
import { emptyResult, query as _query, safeQuery } from '../../../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { authenticate, requirePermission } from '../../../../ports/auth.port';

import { auditMiddleware, setAuditData as _setAuditData, validate, moduleStack, mutationEventHook } from '../../../../ports/middleware.port';
import { getFirstRow } from '@dos/db';
import { LogFrameworkChangeSchema, NotesBody, emptyBody, RegisterVersionSchema, AddSectorSchema, genericComplianceSchema, CreateAlertSchema, AcceptMappingsSchema, RemediationPlanSchema, NLQuerySchema } from "../../../../schemas/compliance.schemas";

import { swallowNull, swallowDefault, EC } from '../../../../ports/resilience.port';

const router = Router();

router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));

router.use(mutationEventHook('compliance'));
router.use(auditMiddleware('knowledge'));

// All knowledge-hub endpoints require authentication
router.use(authenticate);

// ── Full-Text Search (Issue 18) ──────────────────────────────────────────

router.get("/search", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("knowledge.base.read"), async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || "";
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const framework = req.query.framework as string | undefined;

    if (!q || q.length < 2) {
      return res.json({ results: [], total: 0 });
    }

    const results = await searchControls(q, limit, framework);
    res.json({ results, total: results.length, query: q });
  } catch (err: unknown) {
    res.status(500).json({ error: "Search failed", detail: toErrorMessage(err) });
  }
});

// ── Gap Analysis (Issue 13) ──────────────────────────────────────────────

router.get("/gap-analysis", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("knowledge.base.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) return res.status(401).json({ error: "No tenant context" });

    const schema = `tenant_${tenantId.replace(/-/g, "_")}`;

    const profile = await resolveRegulatoryProfileForTenant(tenantId);


    const actualRes = await safeQuery(
      `SELECT COUNT(*)::int AS actual_count
       FROM "${schema}".controls
       WHERE status = 'active'`,
      []
    );
    const actualCount = getFirstRow(actualRes)?.actual_count ?? 0;

    // Get assessed controls
    const assessedRes = await safeQuery(
      `SELECT COUNT(*)::int AS assessed_count
       FROM "${schema}".controls
       WHERE status = 'active' AND compliance_status IS NOT NULL`,
      []
    );
    const assessedCount = getFirstRow(assessedRes)?.assessed_count ?? 0;

    // Get compliant controls
    const compliantRes = await safeQuery(
      `SELECT COUNT(*)::int AS compliant_count
       FROM "${schema}".controls
       WHERE status = 'active' AND compliance_status = 'compliant'`,
      []
    );
    const compliantCount = getFirstRow(compliantRes)?.compliant_count ?? 0;

    // Per-framework breakdown
    const frameworkBreakdown = await safeQuery(
      `SELECT
         c.framework_code,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE c.compliance_status IS NOT NULL)::int AS assessed,
         COUNT(*) FILTER (WHERE c.compliance_status = 'compliant')::int AS compliant
       FROM "${schema}".controls c
       WHERE c.status = 'active'
       GROUP BY c.framework_code
       ORDER BY c.framework_code`,
      []
    );

    res.json({
      requiredControlCount: profile.controlCount,
      actualControlCount: actualCount,
      assessedControlCount: assessedCount,
      compliantControlCount: compliantCount,
      gap: Math.max(0, profile.controlCount - actualCount),
      complianceRate: actualCount > 0 ? Math.round((compliantCount / actualCount) * 100) : 0,
      assessmentRate: actualCount > 0 ? Math.round((assessedCount / actualCount) * 100) : 0,
      frameworks: profile.frameworks.map((fw) => {
        const actual = frameworkBreakdown.rows.find(( r: Record<string, unknown>) => r.framework_code === fw.code);
        return {
          code: fw.code,
          name: fw.name,
          total: actual?.total ?? 0,
          assessed: actual?.assessed ?? 0,
          compliant: actual?.compliant ?? 0,
          complianceRate: actual?.total > 0
            ? Math.round(((actual?.compliant ?? 0) / actual.total) * 100)
            : 0,
        };
      }),
    });
  } catch (err: unknown) {
    res.status(500).json({ error: "Gap analysis failed", detail: toErrorMessage(err) });
  }
});

// ── Regulatory Changes (Issue 4) ─────────────────────────────────────────

router.get("/regulatory-changes", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("knowledge.base.read"), async (_req: Request, res: Response) => {
  try {
    const changes = await listPendingFrameworkChanges();
    res.json({ changes, total: changes.length });
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to list changes", detail: toErrorMessage(err) });
  }
});

router.post("/regulatory-changes", authenticate, requirePermission("knowledge.base.write"), validate({ body: LogFrameworkChangeSchema }), async (req: Request, res: Response) => {
  try {
    const result = await logFrameworkChange(req.body);
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to log change", detail: toErrorMessage(err) });
  }
});

router.get("/regulatory-impacts", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("knowledge.base.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) return res.status(401).json({ error: "No tenant context" });

    const impacts = await getPendingImpacts(tenantId);
    res.json({ impacts, total: impacts.length });
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to list impacts", detail: toErrorMessage(err) });
  }
});

router.post("/regulatory-impacts/:id/acknowledge", authenticate, requirePermission("knowledge.base.write"), validate({ body: NotesBody }), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId as string | undefined;
    await acknowledgeRegulatoryImpact(req.params.id, userId || '', req.body.notes);
    res.json({ status: "acknowledged" });
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to acknowledge", detail: toErrorMessage(err) });
  }
});

router.post("/regulatory-impacts/:id/resolve", authenticate, requirePermission("knowledge.base.write"), validate({ body: NotesBody }), async (req: Request, res: Response) => {
  try {
    await resolveRegulatoryImpact(req.params.id, req.body.notes);
    res.json({ status: "resolved" });
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to resolve", detail: toErrorMessage(err) });
  }
});

// ── Authorities Catalog (Issue 19 — Public Catalog API) ──────────────────

router.get("/authorities", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("knowledge.base.read"), async (_req: Request, res: Response) => {
  try {
    const authorities = await listRegulatoryAuthorities();
    res.set("Cache-Control", "public, max-age=300");
    res.json({ authorities, total: authorities.length });
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to list authorities", detail: toErrorMessage(err) });
  }
});

router.get("/frameworks", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("knowledge.base.read"), async (req: Request, res: Response) => {
  try {
    const authority = req.query.authority as string | undefined;
    let queryStr = `
      SELECT framework_code, framework_name, framework_version,
             authority_code, mandatory_for_sectors, is_active
      FROM public.lookup_authority_frameworks
      WHERE is_active = true`;
    const params: unknown[] = [];

    if (authority) {
      queryStr += ` AND authority_code = $1`;
      params.push(authority);
    }
    queryStr += ` ORDER BY authority_code, framework_code`;

    const result = await safeQuery(queryStr, params);
    res.set("Cache-Control", "public, max-age=300");
    res.json({ frameworks: result.rows, total: result.rows.length });
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to list frameworks", detail: toErrorMessage(err) });
  }
});

router.get("/frameworks/:code/controls", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("knowledge.base.read"), async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await safeQuery(
      `SELECT rc.control_code, rc.control_number, rc.control_title_en,
              rc.control_title_ar, rc.criticality_level, rc.automation_possible,
              cd.domain_name_en, cd.domain_code
       FROM public.regulatory_controls rc
       JOIN public.control_domains cd ON cd.id = rc.domain_id
       WHERE cd.framework_code = $1
       ORDER BY cd.domain_number, rc.control_number
       LIMIT $2 OFFSET $3`,
      [req.params.code, limit, offset]
    );

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total
       FROM public.regulatory_controls rc
       JOIN public.control_domains cd ON cd.id = rc.domain_id
       WHERE cd.framework_code = $1`,
      [req.params.code]
    );

    res.set("Cache-Control", "public, max-age=300");
    res.json({
      controls: result.rows,
      total: getFirstRow(countResult)?.total ?? 0,
      limit,
      offset,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to list controls", detail: toErrorMessage(err) });
  }
});

// ── Compliance Benchmarks (Issue 20) ─────────────────────────────────────

router.get("/benchmarks", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("knowledge.base.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) return res.status(401).json({ error: "No tenant context" });

    const { getComplianceBenchmarks } = await import('../../../services/compliance/compliance-benchmark.service.js');
    const benchmarks = await getComplianceBenchmarks(tenantId);
    res.json({ benchmarks, total: benchmarks.length });
  } catch (err: unknown) {
    res.status(500).json({ error: "Benchmark calculation failed", detail: toErrorMessage(err) });
  }
});

// ── Auto Risk Scoring (Issue 17) ─────────────────────────────────────────

router.post("/recalculate-risk-scores", authenticate, requirePermission("risk.record.write"), validate({ body: emptyBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) return res.status(401).json({ error: "No tenant context" });

    const { recalculateRiskScores } = await import('../../../../risk/services/scoring/auto-risk-scoring.service.js');
    const result = await recalculateRiskScores(tenantId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: "Risk scoring failed", detail: toErrorMessage(err) });
  }
});

// ── Framework Version Lifecycle (Issue 11) ───────────────────────────────

router.get("/version-transitions", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("knowledge.base.read"), async (_req: Request, res: Response) => {
  try {
    const { getActiveTransitions } = await import('../../../services/compliance/framework-version-lifecycle.service.js');
    const transitions = await getActiveTransitions();
    res.json({ transitions, total: transitions.length });
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to get transitions", detail: toErrorMessage(err) });
  }
});

router.post("/version-transitions", authenticate, requirePermission("knowledge.base.write"), validate({ body: RegisterVersionSchema }), async (req: Request, res: Response) => {
  try {
    const { registerNewVersion } = await import('../../../services/compliance/framework-version-lifecycle.service.js');
    const result = await registerNewVersion(req.body);
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to register version", detail: toErrorMessage(err) });
  }
});

// ── Incremental Sector Resolution (Issue 12) ─────────────────────────────

router.post("/sectors/add", authenticate, requirePermission("knowledge.base.write"), validate({ body: AddSectorSchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string | undefined;
    const userId = req.user?.userId as string | undefined;
    if (!tenantId) return res.status(401).json({ error: "No tenant context" });

    const { addSectorToTenant } = await import('@dos/platform-core/core/infrastructure/incremental-resolution.service');
    const result = await addSectorToTenant(tenantId, req.body.sectorCode, userId);
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to add sector", detail: toErrorMessage(err) });
  }
});

router.delete("/sectors/:code", authenticate, requirePermission("knowledge.base.write"), validate({ body: genericComplianceSchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) return res.status(401).json({ error: "No tenant context" });

    const { removeSectorFromTenant } = await import('@dos/platform-core/core/infrastructure/incremental-resolution.service');
    await removeSectorFromTenant(tenantId, req.params.code);
    res.json({ removed: true });
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to remove sector", detail: toErrorMessage(err) });
  }
});

// ── Regulatory Alerts (Issue 16) ──────────────────────────────────────────

router.get("/alerts", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("knowledge.base.read"), async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const sector = req.query.sector as string | undefined;
    const { listRecentAlerts } = await import('../../../services/regulatory/regulatory-alert.service.js');
    const alerts = await listRecentAlerts(limit, sector);
    res.json({ alerts, total: alerts.length });
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to list alerts", detail: toErrorMessage(err) });
  }
});

router.post("/alerts", authenticate, requirePermission("knowledge.base.write"), validate({ body: CreateAlertSchema }), async (req: Request, res: Response) => {
  try {
    const { createRegulatoryAlert } = await import('../../../services/regulatory/regulatory-alert.service.js');
    const result = await createRegulatoryAlert(req.body);
    res.status(201).json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to create alert", detail: toErrorMessage(err) });
  }
});

// ── Evidence Auto-Collection (Issue 15) ──────────────────────────────────

router.post("/evidence/auto-collect", authenticate, requirePermission("evidence.item.write"), validate({ body: emptyBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) return res.status(401).json({ error: "No tenant context" });

    const { runAutoCollection } = await import('../../../../evidence/services/collection/evidence-auto-collection.service.js');
    const result = await runAutoCollection(tenantId);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: "Auto-collection failed", detail: toErrorMessage(err) });
  }
});

// ── AI Cross-Framework Mapping (Issue 14) ────────────────────────────────

router.get("/mapping-suggestions", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("knowledge.base.read"), async (req: Request, res: Response) => {
  try {
    const source = req.query.source as string;
    const target = req.query.target as string;
    const minConfidence = parseFloat(req.query.minConfidence as string) || 0.6;

    if (!source || !target) {
      return res.status(400).json({ error: "source and target framework codes required" });
    }

    const { suggestCrossFrameworkMappings } = await import('../../../../ai/services/governance/compliance/ai-control-mapping.service.js');
    const suggestions = await suggestCrossFrameworkMappings(source, target, minConfidence);
    res.json({ suggestions, total: suggestions.length });
  } catch (err: unknown) {
    res.status(500).json({ error: "Mapping suggestion failed", detail: toErrorMessage(err) });
  }
});

router.post("/mapping-suggestions/accept", authenticate, requirePermission("knowledge.base.write"), validate({ body: AcceptMappingsSchema }), async (req: Request, res: Response) => {
  try {
    const { acceptMappingSuggestions } = await import('../../../../ai/services/governance/compliance/ai-control-mapping.service.js');
    const result = await acceptMappingSuggestions(req.body.suggestions || []);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: "Accept failed", detail: toErrorMessage(err) });
  }
});

// ── AI Remediation Plan (W2-6) ────────────────────────────────────────────

router.post("/remediation-plan", authenticate, requirePermission("knowledge.base.write"), validate({ body: RemediationPlanSchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) return res.status(401).json({ error: "No tenant context" });

    const { frameworkCode } = req.body;
    if (!frameworkCode) {
      return res.status(400).json({ error: "frameworkCode is required in request body" });
    }

    const { generateRemediationPlan } = await import('../../../../ai/services/workflow/ai-remediation.service.js');
    const plan = await generateRemediationPlan(tenantId, frameworkCode);
    res.json(plan);
  } catch (err: unknown) {
    res.status(500).json({ error: "Remediation plan generation failed", detail: toErrorMessage(err) });
  }
});

// ── Natural Language Compliance Query (W2-7) ──────────────────────────────

router.post("/ask", authenticate, requirePermission("knowledge.base.read"), validate({ body: NLQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) return res.status(401).json({ error: "No tenant context" });

    const { question } = req.body;
    if (!question || typeof question !== "string" || question.trim().length < 3) {
      return res.status(400).json({ error: "question is required (minimum 3 characters)" });
    }

    const { queryCompliance } = await import('../../../../platform/services/misc/compliance/nl-compliance-query.service.js');
    const result = await queryCompliance(tenantId, question);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: "Compliance query failed", detail: toErrorMessage(err) });
  }
});

// ── Executive Report (W2-16) ─────────────────────────────────────────────

router.get("/executive-report", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("knowledge.base.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) return res.status(401).json({ error: "No tenant context" });

    const periodDays = Math.min(parseInt(req.query.period as string) || 30, 365);
    const { generateExecutiveReport } = await import('../../../../reporting/services/misc/executive-report.service.js');
    const report = await generateExecutiveReport(tenantId, periodDays);
    res.json(report);
  } catch (err: unknown) {
    res.status(500).json({ error: "Report generation failed", detail: toErrorMessage(err) });
  }
});

// ── Registry Stats (uses materialized views when available) ──────────────

router.get("/stats", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("knowledge.base.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId as string | undefined;
    if (!tenantId) return res.status(401).json({ error: "No tenant context" });
    const schema = `tenant_${tenantId.replace(/-/g, "_")}`;


    const mvResult = await swallowNull(EC.FALLBACK_QUERY, safeQuery(
      `SELECT * FROM public.mv_regulatory_catalog_summary LIMIT 1`, []
    ), { tenantId: tenantId, operation: 'fallback query' });

    if (mvResult && mvResult.rows.length > 0) {
      res.set("Cache-Control", "public, max-age=60");
      return res.json(getFirstRow(mvResult));
    }

    // Fallback to live query (tenant-scoped for control_evidence_requirements)
    const result = await safeQuery(
      `SELECT
         (SELECT COUNT(*) FROM public.lookup_ksa_regulatory_authorities WHERE is_active)::int AS authorities,
         (SELECT COUNT(*) FROM public.lookup_authority_frameworks WHERE is_active)::int AS frameworks,
         (SELECT COUNT(*) FROM public.regulatory_controls)::int AS controls,
         (SELECT COUNT(*) FROM "${schema}".control_evidence_requirements)::int AS evidence_requirements,
         (SELECT COUNT(*) FROM public.control_cross_mappings)::int AS cross_mappings,
         (SELECT COUNT(DISTINCT cd.framework_code) FROM public.control_domains cd)::int AS frameworks_with_controls`,
      []
    );
    res.set("Cache-Control", "public, max-age=60");
    res.json(getFirstRow(result));
  } catch (err: unknown) {
    res.status(500).json({ error: "Stats query failed", detail: toErrorMessage(err) });
  }
});

// ── Framework Distribution (uses materialized view) ──────────────────────

router.get("/framework-distribution", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("knowledge.base.read"), async (_req: Request, res: Response) => {
  try {
    const result = await safeQuery(
      `SELECT * FROM public.mv_framework_control_distribution ORDER BY control_count DESC`, []
    ).catch(() => safeQuery(
      `SELECT cd.framework_code, COUNT(rc.id)::int AS control_count
       FROM public.control_domains cd
       LEFT JOIN public.regulatory_controls rc ON rc.domain_id = cd.id
       GROUP BY cd.framework_code ORDER BY control_count DESC`, []
    ));
    res.set("Cache-Control", "public, max-age=300");
    res.json({ frameworks: result.rows, total: result.rows.length });
  } catch (err: unknown) {
    res.status(500).json({ error: "Distribution query failed", detail: toErrorMessage(err) });
  }
});

// ── Sector Regulatory Burden (uses materialized view) ────────────────────

router.get("/sector-burden", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("knowledge.base.read"), async (_req: Request, res: Response) => {
  try {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT * FROM public.mv_sector_regulatory_burden ORDER BY framework_count DESC`, []
    ), { operation: 'knowledge:sector-burden' });
    res.set("Cache-Control", "public, max-age=300");
    res.json({ sectors: result.rows, total: result.rows.length });
  } catch (err: unknown) {
    res.status(500).json({ error: "Sector burden query failed", detail: toErrorMessage(err) });
  }
});

export default router;

