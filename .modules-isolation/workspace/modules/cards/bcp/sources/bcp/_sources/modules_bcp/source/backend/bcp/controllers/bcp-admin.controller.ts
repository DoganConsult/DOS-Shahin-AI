import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';
import { getBcpSeedData, seedBcpModule } from '../data/bcp-seed';
import { safeQuery, tenantSchema } from '../ports/database.port';
import * as bcpQuery from '../repositories/bcp-query.repo';
import { BCP_LIMITS, BCP_TIMEOUTS, BCP_BUSINESS_THRESHOLDS } from '../data/bcp-constants';

export async function getModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  const seedData = getBcpSeedData();
  res.json(ok({ moduleCode: 'bcp', config: seedData.defaultConfigs }, req));
}

export async function updateModuleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'update', entityType: 'bcp_config', entityId: 'bcp' });
  res.json(action('Configuration updated', req));
}

export async function reseedModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = req.tenantSchema || `tenant_${tenantId}`;
  await seedBcpModule(tenantId, schema);
  setAuditData(res as any, { action: 'reseed', entityType: 'bcp', entityId: tenantId });
  res.json(action('Module reseeded', req));
}

export async function getModuleHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const seedData = getBcpSeedData();

  const [statusStats, testingStats] = await Promise.all([
    safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'testing')::int AS testing,
         COUNT(*) FILTER (WHERE status = 'failed_test')::int AS failed_test,
         COUNT(*) FILTER (WHERE status = 'review')::int AS review,
         COUNT(*) FILTER (WHERE status = 'retired')::int AS retired
       FROM "${schema}".bcp_plans WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active' AND (last_tested IS NULL OR last_tested < NOW() - INTERVAL '${BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS} days'))::int AS overdue_testing,
         COUNT(*) FILTER (WHERE status = 'active' AND last_tested > NOW() - INTERVAL '${BCP_BUSINESS_THRESHOLDS.TEST_FREQUENCY_DAYS} days')::int AS tested_recently,
         COUNT(*) FILTER (WHERE status = 'failed_test')::int AS failed_tests
       FROM "${schema}".bcp_plans WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] })),
  ]);

  const ss = statusStats.rows[0] || {};
  const ts = testingStats.rows[0] || {};

  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if ((ts.overdue_testing || 0) > 5 || (ts.failed_tests || 0) > 3) healthStatus = 'critical';
  else if ((ts.overdue_testing || 0) > 2 || (ts.failed_tests || 0) > 0) healthStatus = 'degraded';

  res.json(ok({
    moduleCode: 'bcp',
    status: healthStatus,
    lastCheck: new Date().toISOString(),
    permissions: seedData.permissions?.length,
    roles: seedData.roles?.length,
    actions: seedData.actions?.length,
    counts: {
      total: ss.total || 0,
      draft: ss.draft || 0,
      approved: ss.approved || 0,
      active: ss.active || 0,
      testing: ss.testing || 0,
      failedTest: ss.failed_test || 0,
      review: ss.review || 0,
      retired: ss.retired || 0,
    },
    testingReadiness: {
      overdueForTesting: ts.overdue_testing || 0,
      testedRecently: ts.tested_recently || 0,
      failedTests: ts.failed_tests || 0,
    },
    limits: BCP_LIMITS,
    timeouts: BCP_TIMEOUTS,
  }, req));
}

export async function getReadinessAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const [kpis, planTypeBreakdown, testingHistory] = await Promise.all([
    bcpQuery.getKpiMetrics(tenantId),
    bcpQuery.getPlanTypeBreakdown(tenantId),
    bcpQuery.getTestingOverdue(tenantId),
  ]);
  res.json(ok({ kpis, planTypeBreakdown, testingHistory }, req));
}

export async function getTestingOverdue(req: AuthenticatedRequest, res: Response): Promise<void> {
  const overdue = await bcpQuery.getTestingOverdue(req.tenantId!);
  res.json(ok({ plans: overdue, total: overdue.length }, req));
}

export async function reindexModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'reindex', entityType: 'bcp', entityId: req.tenantId });
  res.json(action('Reindex initiated', req));
}

export async function backfillModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  setAuditData(res as any, { action: 'backfill', entityType: 'bcp', entityId: req.tenantId });
  res.json(action('Backfill initiated', req));
}
