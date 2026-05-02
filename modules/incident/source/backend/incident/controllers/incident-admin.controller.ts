import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getIncidentSeedData, seedIncidentModule } from '../data/incident-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as incidentQuery from '../repositories/incident-query.repo';
import { INCIDENT_LIMITS, INCIDENT_TIMEOUTS, INCIDENT_SLA_DEFAULTS } from '../data/incident-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getIncidentSeedData();
  res.json(ok({ moduleCode: 'incident', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'incident_config', entityId: 'incident' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedIncidentModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'incident', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getIncidentSeedData();

  const [statusStats, slaStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'detected')::int AS detected,
         COUNT(*) FILTER (WHERE status = 'triaged')::int AS triaged,
         COUNT(*) FILTER (WHERE status = 'contained')::int AS contained,
         COUNT(*) FILTER (WHERE status = 'investigating')::int AS investigating,
         COUNT(*) FILTER (WHERE status = 'remediated')::int AS remediated,
         COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
         COUNT(*) FILTER (WHERE status = 'closed')::int AS closed
       FROM "${schema}".incident_incidents WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('resolved', 'closed', 'archived'))::int AS critical_open,
         COUNT(*) FILTER (WHERE severity = 'high' AND status NOT IN ('resolved', 'closed', 'archived'))::int AS high_open,
         COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '${INCIDENT_SLA_DEFAULTS.critical} hours' AND severity = 'critical' AND status NOT IN ('resolved', 'closed', 'archived'))::int AS critical_sla_breach,
         COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '${INCIDENT_SLA_DEFAULTS.high} hours' AND severity = 'high' AND status NOT IN ('resolved', 'closed', 'archived'))::int AS high_sla_breach
       FROM "${schema}".incident_incidents WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const sl = slaStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((sl.critical_sla_breach || 0) > 0 || (sl.critical_open || 0) > 3) healthStatus = 'critical';
  else if ((sl.high_sla_breach || 0) > 0 || (sl.high_open || 0) > 5) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'incident',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      total: ss.total || 0,
      detected: ss.detected || 0,
      triaged: ss.triaged || 0,
      contained: ss.contained || 0,
      investigating: ss.investigating || 0,
      remediated: ss.remediated || 0,
      resolved: ss.resolved || 0,
      closed: ss.closed || 0,
    },
    sla: {
      criticalOpen: sl.critical_open || 0,
      highOpen: sl.high_open || 0,
      criticalSlaBreach: sl.critical_sla_breach || 0,
      highSlaBreach: sl.high_sla_breach || 0,
    },
    limits: INCIDENT_LIMITS,
    timeouts: INCIDENT_TIMEOUTS,
  }, req));
}

export async function getIncidentAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, severityBreakdown, typeBreakdown] = await Promise.all([
    incidentQuery.getKpiMetrics(tenantId),
    incidentQuery.getSeverityBreakdown(tenantId),
    incidentQuery.getTypeBreakdown(tenantId),
  ]);
  res.json(ok({ kpis, severityBreakdown, typeBreakdown }, req));
}

export async function getActiveIncidents(req: AuthenticatedRequest, res: Response): Promise<void> {
  const active = await incidentQuery.getActiveIncidents(req.tenantId!);
  res.json(ok({ incidents: active, total: active.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'incident', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'incident', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
