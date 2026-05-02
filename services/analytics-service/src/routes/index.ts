import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import dashboardRouter from './dashboard.routes';

const analytics_advanced_analyticsRouter = loadModuleRoute('analytics/advanced-analytics', '../../../modules/analytics/dist/analytics/routes/advanced-analytics.routes');
const analytics_analytics_adminRouter = loadModuleRoute('analytics/analytics-admin', '../../../modules/analytics/dist/analytics/routes/analytics-admin.routes');
const analytics_analytics_diagnosticsRouter = loadModuleRoute('analytics/analytics-diagnostics', '../../../modules/analytics/dist/analytics/routes/analytics-diagnostics.routes');
const analytics_analyticsRouter = loadModuleRoute('analytics/analytics', '../../../modules/analytics/dist/analytics/routes/analytics.routes');
const analytics_chart_dataRouter = loadModuleRoute('analytics/chart-data', '../../../modules/analytics/dist/analytics/routes/chart-data.routes');
const analytics_clickhouse_analyticsRouter = loadModuleRoute('analytics/clickhouse-analytics', '../../../modules/analytics/dist/analytics/routes/clickhouse-analytics.routes');
const analytics_engagement_analyticsRouter = loadModuleRoute('analytics/engagement-analytics', '../../../modules/analytics/dist/analytics/routes/engagement-analytics.routes');
const analytics_kpi_detailRouter = loadModuleRoute('analytics/kpi-detail', '../../../modules/analytics/dist/analytics/routes/kpi-detail.routes');
const analytics_predictive_analyticsRouter = loadModuleRoute('analytics/predictive-analytics', '../../../modules/analytics/dist/analytics/routes/predictive-analytics.routes');
const analytics_admin_analytics_adminRouter = loadModuleRoute('analytics/admin/analytics-admin', '../../../modules/analytics/dist/analytics/admin/analytics-admin.routes');
const grc_query_grc_queryRouter = loadModuleRoute('grc-query/grc-query', '../../../modules/grc-query/dist/grc-query/routes/grc-query.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'analytics-service', version: '0.1.0', modules: 2 });
});

routes.use('/analytics', dashboardRouter);

routes.use('/analytics/advanced-analytics', analytics_advanced_analyticsRouter);
routes.use('/analytics/analytics-admin', analytics_analytics_adminRouter);
routes.use('/analytics/analytics-diagnostics', analytics_analytics_diagnosticsRouter);
routes.use('/analytics', analytics_analyticsRouter);
routes.use('/analytics/chart-data', analytics_chart_dataRouter);
routes.use('/analytics/clickhouse-analytics', analytics_clickhouse_analyticsRouter);
routes.use('/analytics/engagement-analytics', analytics_engagement_analyticsRouter);
routes.use('/analytics/kpi-detail', analytics_kpi_detailRouter);
routes.use('/analytics/predictive-analytics', analytics_predictive_analyticsRouter);
routes.use('/analytics/admin', analytics_admin_analytics_adminRouter);
routes.use('/grc-query', grc_query_grc_queryRouter);
routes.use('/modules', modulesDiagnosticRouter());

// Dedicated grc-query router mounted separately in server.ts at /api/grc-query
// so panels can hit /api/grc-query/<route> without /analytics/ nesting.
export const grcQueryRoutes: Router = Router();
grcQueryRoutes.use('/', grc_query_grc_queryRouter);
