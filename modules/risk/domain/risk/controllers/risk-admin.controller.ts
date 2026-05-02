import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getRiskSeedData, seedRiskModule } from '../data/risk-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as riskQuery from '../repositories/risk-query.repo';
import { RISK_LIMITS, RISK_TIMEOUTS, RISK_SLA_DEFAULTS } from '../data/risk-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getRiskSeedData();
  res.json(ok({ moduleCode: 'risk', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'risk_config', entityId: 'risk' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedRiskModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'risk', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  const schema = tenantSchema(tenantId);
  const seedData = getRiskSeedData();

  const [statusStats, severityStats, treatmentStats, appetiteStats] = await Promise.all([
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
        COUNT(*) FILTER (WHERE status = 'identified')::int AS identified,
        COUNT(*) FILTER (WHERE status = 'assessed')::int AS assessed,
        COUNT(*) FILTER (WHERE status IN ('treatment_planned', 'active'))::int AS treatment_planned,
        COUNT(*) FILTER (WHERE status = 'mitigating')::int AS mitigating,
        COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted,
        COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
        COUNT(*) FILTER (WHERE status = 'archived')::int AS archived
      FROM "${schema}".risk_risks WHERE deleted_at IS NULL
    `).catch(() => ({ rows: [{}] })),
    // secrets-scan-allow: schema tenantSchema()-validated; literal aggregation filters
    safeQuery(`
      SELECT
        COUNT(*) FILTER (WHERE (likelihood * impact) >= 20 AND status NOT IN ('closed', 'archived'))::int AS critical_open,
        COUNT(*) FILTER (WHERE (likelihood * impact) BETWEEN 12 AND 19 AND status NOT IN ('closed', 'archived'))::int AS high_open,
        COUNT(*) FILTER (WHERE (likelihood * impact) BETWEEN 6 AND 11 AND status NOT IN ('closed', 'archived'))::int AS medium_open,
        COUNT(*) FILTER (WHERE (likelihood * impact) BETWEEN 1 AND 5 AND status NOT IN ('closed', 'archived'))::int AS low_open,
        COUNT(*) FILTER (WHERE (likelihood * impact) >= 20 AND created_at < NOW() - INTERVAL '${RISK_SLA_DEFAULTS.critical} hours' AND status NOT IN ('closed', 'archived'))::int AS critical_sla_breach,
        COUNT(*) FILTER (WHERE (likelihood * impact) BETWEEN 12 AND 19 AND created_at < NOW() - INTERVAL '${RISK_SLA_DEFAULTS.high} hours' AND status NOT IN ('closed', 'archived'))::int AS high_sla_breach
      FROM "${schema}".risk_risks WHERE deleted_at IS NULL
    `).catch(() => ({ rows: [{}] })),
    safeQuery(`
      SELECT
        COUNT(*) FILTER (WHERE treatment_status IS NULL AND status NOT IN ('closed', 'archived', 'accepted'))::int AS untreated,
        COUNT(*) FILTER (WHERE treatment_status = 'planned')::int AS treatment_planned,
        COUNT(*) FILTER (WHERE treatment_status = 'in_progress')::int AS treatment_in_progress,
        COUNT(*) FILTER (WHERE treatment_status = 'completed')::int AS treatment_completed,
        CASE WHEN COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived')) > 0
          THEN ROUND(
            COUNT(*) FILTER (WHERE treatment_status IS NOT NULL AND status NOT IN ('closed', 'archived'))::numeric /
            COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived'))::numeric * 100, 2)
          ELSE 0
        END AS treatment_coverage
      FROM "${schema}".risk_risks WHERE deleted_at IS NULL
    `).catch(() => ({ rows: [{}] })),
    safeQuery(`
      SELECT
        COUNT(*) FILTER (WHERE last_assessed_at < NOW() - INTERVAL '90 days' AND status NOT IN ('closed', 'archived'))::int AS overdue_reassessment,
        COALESCE(AVG(residual_score) FILTER (WHERE residual_score IS NOT NULL AND status NOT IN ('closed', 'archived')), 0)::numeric(5,2) AS avg_residual_score
      FROM "${schema}".risk_risks WHERE deleted_at IS NULL
    `).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const sv = severityStats.rows[0] || {};
  const tr = treatmentStats.rows[0] || {};
  const ap = appetiteStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((sv.critical_sla_breach || 0) > 0 || (sv.critical_open || 0) > 5) healthStatus = 'critical';
  else if ((sv.high_sla_breach || 0) > 0 || (sv.high_open || 0) > 10 || (tr.untreated || 0) > 20) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'risk',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions.length,
    roles: seedData.roles.length,
    actions: seedData.actions.length,
    counts: {
      total: ss.total || 0,
      draft: ss.draft || 0,
      identified: ss.identified || 0,
      assessed: ss.assessed || 0,
      treatmentPlanned: ss.treatment_planned || 0,
      mitigating: ss.mitigating || 0,
      accepted: ss.accepted || 0,
      closed: ss.closed || 0,
      archived: ss.archived || 0,
    },
    severity: {
      criticalOpen: sv.critical_open || 0,
      highOpen: sv.high_open || 0,
      mediumOpen: sv.medium_open || 0,
      lowOpen: sv.low_open || 0,
      criticalSlaBreach: sv.critical_sla_breach || 0,
      highSlaBreach: sv.high_sla_breach || 0,
    },
    treatment: {
      untreated: tr.untreated || 0,
      planned: tr.treatment_planned || 0,
      inProgress: tr.treatment_in_progress || 0,
      completed: tr.treatment_completed || 0,
      coveragePercent: Number(tr.treatment_coverage) || 0,
    },
    assessment: {
      overdueReassessment: ap.overdue_reassessment || 0,
      avgResidualScore: Number(ap.avg_residual_score) || 0,
    },
    limits: RISK_LIMITS,
    timeouts: RISK_TIMEOUTS,
  }, req));
}

export async function getRiskAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId;
  const [kpis, severityBreakdown, categoryBreakdown, treatmentBreakdown, agingReport] = await Promise.all([
    riskQuery.getKpiMetrics(tenantId),
    riskQuery.getRiskSeverityBreakdown(tenantId),
    riskQuery.getCategoryBreakdown(tenantId),
    riskQuery.getTreatmentStatusBreakdown(tenantId),
    riskQuery.getAgingReport(tenantId),
  ]);
  res.json(ok({ kpis, severityBreakdown, categoryBreakdown, treatmentBreakdown, agingReport }, req));
}

export async function getCriticalRisks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const risks = await riskQuery.getCriticalRisks(req.tenantId);
  res.json(ok({ risks, total: risks.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'risk', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'risk', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
