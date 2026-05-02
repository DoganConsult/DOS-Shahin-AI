import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getActionSeedData, seedActionModule } from '../data/action-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as actionQuery from '../repositories/action-query.repo';
import { ACTION_LIMITS, ACTION_TIMEOUTS, ACTION_BUSINESS_THRESHOLDS as _ACTION_BUSINESS_THRESHOLDS } from '../data/action-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getActionSeedData();
  res.json(ok({ moduleCode: 'action', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'action_config', entityId: 'action' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedActionModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'action', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getActionSeedData();

  const [statusStats, overdueStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'pending_review')::int AS pending_review,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue_status
       FROM "${schema}".action_action_items WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled', 'archived'))::int AS overdue,
         COUNT(*) FILTER (WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '48 hours' AND status NOT IN ('completed', 'cancelled', 'archived'))::int AS due_soon,
         COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('completed', 'cancelled', 'archived'))::int AS critical_open
       FROM "${schema}".action_action_items WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const os = overdueStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((os.overdue || 0) > 10 || (os.critical_open || 0) > 5) healthStatus = 'critical';
  else if ((os.overdue || 0) > 3 || (os.due_soon || 0) > 5) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'action',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length ?? 0,
    roles: seedData.roles?.length ?? 0,
    actions: seedData.actions?.length ?? 0,
    counts: {
      total: ss.total || 0,
      open: ss.open_count || 0,
      inProgress: ss.in_progress || 0,
      pendingReview: ss.pending_review || 0,
      completed: ss.completed || 0,
    },
    urgency: {
      overdue: os.overdue || 0,
      dueSoon: os.due_soon || 0,
      criticalOpen: os.critical_open || 0,
    },
    limits: ACTION_LIMITS,
    timeouts: ACTION_TIMEOUTS,
  }, req));
}

export async function getOverdueAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, sourceBreakdown, priorityBreakdown] = await Promise.all([
    actionQuery.getKpiMetrics(tenantId),
    actionQuery.getSourceBreakdown(tenantId),
    actionQuery.getPriorityBreakdown(tenantId),
  ]);
  res.json(ok({ kpis, sourceBreakdown, priorityBreakdown }, req));
}

export async function getAssigneeWorkload(req: AuthenticatedRequest, res: Response): Promise<void> {
  const workload = await actionQuery.getAssigneeWorkload(req.tenantId!);
  res.json(ok({ workload, total: workload.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'action', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'action', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
