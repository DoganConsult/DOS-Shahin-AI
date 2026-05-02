import { Request, Response, Router } from 'express';
import { z } from "zod";
import type { AuthenticatedRequest as _AuthenticatedRequest } from '@dos/types';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Chart Data API Routes
// Widget data, batch queries, Monte Carlo, insights
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import { queryWidgetData, queryBatchWidgetData } from '../../dashboard/services/dashboard-query.service';
import { runSimulation } from '../../risk/services/scoring/monte-carlo.service';
import { getChartInsight } from '../../dashboard/services/widget-insights.service';
import { getAnalyticalDashboard } from '../../reporting/services/chart/chart-analytical.service';
import { getExecutiveDashboard } from '../../reporting/services/chart/chart-executive.service';
import { getGrcCoreDashboard } from '../../reporting/services/chart/chart-grc-core.service';
import {
  getIncidentDashboardWidget, getBcpDashboardWidget, getVendorDashboardWidget, getTrainingDashboardWidget,
  getRemediationDashboardWidget, getActionDashboardWidget, getWorkflowDashboardWidget,
  getAssetDashboardWidget, getIntegrationsDashboardWidget, getAdminDashboardWidget,
} from '../../dashboard/services/dashboard-widgets.service';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { safeQuery, tenantSchema } from '../ports/database.port';

async function getWidgetAccessForRole(tenantId: string, role: string): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `SELECT dashboard_widgets FROM "${schema}".role_profiles WHERE role = $1 LIMIT 1`,
      [role],
    );
    const widgets = rows[0]?.dashboard_widgets;
    if (Array.isArray(widgets)) return widgets;
    if (typeof widgets === 'string') {
      try { return JSON.parse(widgets); } catch { return []; }
    }
  } catch { /* table may not exist yet */ }
  return [];
}

async function canAccessWidget(tenantId: string, role: string, widgetId: string): Promise<boolean> {
  const allowed = await getWidgetAccessForRole(tenantId, role);
  if (allowed.length === 0) return false;
  return allowed.includes(widgetId);
}


// ── Zod Validation Schemas ──
import { auditMiddleware, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createWidgetsBatchBody } from "../schemas/analytics.schemas";

const router = Router();
router.use(auditMiddleware('analytics'));
router.use(moduleStack('analytics'));

// GET /api/dashboard/widgets — widget definitions for user's role
router.get('/widgets', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('analytics.report.read'), async (req: Request, res: Response) => {
  try {
  const role = req.user?.role || 'viewer';
  const tenantId = req.tenantId!;
  const widgetIds = await getWidgetAccessForRole(tenantId, role);
  res.json({
  success: true,
  data: { role, widgetIds },
  meta: { cached: false, generatedAt: new Date().toISOString() },
  });
  } catch (_err: unknown) {
  res.status(500).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } });
  }
});

// GET /api/dashboard/widgets/:widgetId/data — widget data with tenant isolation + RBAC
router.get('/widgets/:widgetId/data', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('analytics.report.read'), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const role = req.user?.role || 'viewer';
  const { widgetId } = req.params;

  if (!(await canAccessWidget(tenantId, role, widgetId))) {
  res.status(403).json({
  success: false,
  data: null,
  meta: { cached: false, generatedAt: new Date().toISOString(), error: 'WIDGET_ACCESS_DENIED' },
  });
  return;
  }

  const result = await queryWidgetData(tenantId, widgetId, req.query);
  if (!result.success && result.data === null) {
  res.status(404).json({
  success: false,
  data: null,
  meta: { cached: false, generatedAt: new Date().toISOString(), error: 'WIDGET_NOT_FOUND' },
  });
  return;
  }
  res.json(result);
  } catch (_err: unknown) {
  res.status(500).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } });
  }
});

// POST /api/dashboard/widgets/batch — batch widget data (max 20 IDs)
router.post('/widgets/batch', authenticate, requirePermission('analytics.report.read'), validate({ body: createWidgetsBatchBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const role = req.user?.role || 'viewer';
  const { widgetIds } = req.body;

  if (!Array.isArray(widgetIds)) {
  res.status(400).json({ success: false, data: null, meta: { error: 'widgetIds must be an array' } });
  return;
  }
  if (widgetIds.length > 20) {
  res.status(400).json({ success: false, data: null, meta: { error: 'Maximum 20 widget IDs per batch request' } });
  return;
  }

  // Filter to only accessible widgets
  const allowed = await getWidgetAccessForRole(tenantId, role);
  const allowedSet = new Set(allowed);
  const accessibleIds = widgetIds.filter((id: string) => allowedSet.has(id));
  const results = await queryBatchWidgetData(tenantId, accessibleIds, req.query);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'chart_data', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.chart_data.created' });
  res.json({
  success: true,
  data: results,
  meta: { cached: false, generatedAt: new Date().toISOString(), requested: widgetIds.length, returned: accessibleIds.length },
  });
  } catch (_err: unknown) {
  res.status(500).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } });
  }
});

// GET /api/charts/monte-carlo/:riskId — Monte Carlo simulation
router.get('/monte-carlo/:riskId', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('risk.record.read'), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const { riskId } = req.params;
  const iterations = Math.min(parseInt(req.query.iterations as string) || 1000, 10000);
  const result = await runSimulation(tenantId, riskId, iterations);
  res.json({
  success: true,
  data: result,
  meta: { cached: false, generatedAt: new Date().toISOString() },
  });
  } catch (err: unknown) {
  const status = toErrorMessage(err) === 'Risk not found' ? 404 : 500;
  res.status(status).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString(), error: toErrorMessage(err) } });
  }
});

// GET /api/charts/insights/:widgetId — AI insight strings
router.get('/insights/:widgetId', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('analytics.report.read'), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const { widgetId } = req.params;
  const insight = await getChartInsight(tenantId, widgetId);
  res.json({
  success: true,
  data: insight,
  meta: { cached: false, generatedAt: new Date().toISOString() },
  });
  } catch (_err: unknown) {
  res.status(500).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } });
  }
});

// GET /api/charts/analytical — Pre-aggregated analytical dashboard data
router.get('/analytical', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('analytics.report.read'), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const data = await getAnalyticalDashboard(tenantId);
  res.json({ success: true, data, meta: { cached: false, generatedAt: new Date().toISOString() } });
  } catch (_err: unknown) {
  res.status(500).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } });
  }
});

// GET /api/charts/executive — Pre-aggregated executive dashboard data
router.get('/executive', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('analytics.report.read'), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const data = await getExecutiveDashboard(tenantId);
  res.json({ success: true, data, meta: { cached: false, generatedAt: new Date().toISOString() } });
  } catch (_err: unknown) {
  res.status(500).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } });
  }
});

// GET /api/charts/grc-core — Pre-aggregated GRC core dashboard data
router.get('/grc-core', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('analytics.report.read'), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const data = await getGrcCoreDashboard(tenantId);
  res.json({ success: true, data, meta: { cached: false, generatedAt: new Date().toISOString() } });
  } catch (_err: unknown) {
  res.status(500).json({ success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } });
  }
});

router.get('/module-widgets/incidents', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('analytics.report.read'), async (req: Request, res: Response) => {
  const data = await getIncidentDashboardWidget(req.tenantId!);
  res.json({ success: true, data, meta: { cached: false, generatedAt: new Date().toISOString() } });
});

router.get('/module-widgets/bcp', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('analytics.report.read'), async (req: Request, res: Response) => {
  const data = await getBcpDashboardWidget(req.tenantId!);
  res.json({ success: true, data, meta: { cached: false, generatedAt: new Date().toISOString() } });
});

router.get('/module-widgets/vendors', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('analytics.report.read'), async (req: Request, res: Response) => {
  const data = await getVendorDashboardWidget(req.tenantId!);
  res.json({ success: true, data, meta: { cached: false, generatedAt: new Date().toISOString() } });
});

router.get('/module-widgets/training', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('analytics.report.read'), async (req: Request, res: Response) => {
  const data = await getTrainingDashboardWidget(req.tenantId!);
  res.json({ success: true, data, meta: { cached: false, generatedAt: new Date().toISOString() } });
});

router.get('/widgets/remediation', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('remediation.task.read'), async (req: Request, res: Response) => {
  try { res.json(await getRemediationDashboardWidget(req.tenantId!)); } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/widgets/action', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('action.item.read'), async (req: Request, res: Response) => {
  try { res.json(await getActionDashboardWidget(req.tenantId!)); } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/widgets/workflow', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'), async (req: Request, res: Response) => {
  try { res.json(await getWorkflowDashboardWidget(req.tenantId!)); } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/widgets/asset', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('asset.record.read'), async (req: Request, res: Response) => {
  try { res.json(await getAssetDashboardWidget(req.tenantId!)); } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/widgets/integrations', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('integrations.connector.read'), async (req: Request, res: Response) => {
  try { res.json(await getIntegrationsDashboardWidget(req.tenantId!)); } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/widgets/admin', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('admin.system.read'), async (req: Request, res: Response) => {
  try { res.json(await getAdminDashboardWidget(req.tenantId!)); } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

export default router;

