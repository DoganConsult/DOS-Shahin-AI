import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import reportScheduleRouter from './report-schedule.routes';

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
const reporting_board_reportsRouter = loadModuleRoute('reporting/misc/board-reports', '../../../modules/reporting/dist/backend/reporting/routes/misc/board-reports.routes');
const reporting_report_centerRouter = loadModuleRoute('reporting/report/report-center', '../../../modules/reporting/dist/backend/reporting/routes/report/report-center.routes');
const reporting_report_extRouter = loadModuleRoute('reporting/report/report-ext', '../../../modules/reporting/dist/backend/reporting/routes/report/report-ext.routes');
const reporting_report_generatorRouter = loadModuleRoute('reporting/report/report-generator', '../../../modules/reporting/dist/backend/reporting/routes/report/report-generator.routes');
const reporting_report_hubRouter = loadModuleRoute('reporting/report/report-hub', '../../../modules/reporting/dist/backend/reporting/routes/report/report-hub.routes');
const reporting_report_scenarioRouter = loadModuleRoute('reporting/report/report-scenario', '../../../modules/reporting/dist/backend/reporting/routes/report/report-scenario.routes');
const reporting_report_streamRouter = loadModuleRoute('reporting/report/report-stream', '../../../modules/reporting/dist/backend/reporting/routes/report/report-stream.routes');
const reporting_reportRouter = loadModuleRoute('reporting/report/report', '../../../modules/reporting/dist/backend/reporting/routes/report/report.routes');
const reporting_reporting_diagnosticsRouter = loadModuleRoute('reporting/reporting-diagnostics', '../../../modules/reporting/dist/backend/reporting/routes/reporting-diagnostics.routes');
const reporting_reporting_adminRouter = loadModuleRoute('reporting/reporting/reporting-admin', '../../../modules/reporting/dist/backend/reporting/routes/reporting/reporting-admin.routes');
const reporting_reporting_advancedRouter = loadModuleRoute('reporting/reporting/reporting-advanced', '../../../modules/reporting/dist/backend/reporting/routes/reporting/reporting-advanced.routes');
const reporting_reporting_document_advancedRouter = loadModuleRoute('reporting/reporting/reporting-document-advanced', '../../../modules/reporting/dist/backend/reporting/routes/reporting/reporting-document-advanced.routes');
const reporting_sample_reportsRouter = loadModuleRoute('reporting/sample/sample-reports', '../../../modules/reporting/dist/backend/reporting/routes/sample/sample-reports.routes');
const reporting_admin_reporting_adminRouter = loadModuleRoute('reporting/admin/reporting-admin', '../../../modules/reporting/dist/backend/reporting/admin/reporting-admin.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'analytics-reporting-service', version: '0.1.0', modules: 2 });
});

routes.use('/reporting', reportScheduleRouter);

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
routes.use('/reporting/board-reports', reporting_board_reportsRouter);
routes.use('/reporting/report-center', reporting_report_centerRouter);
routes.use('/reporting/report-ext', reporting_report_extRouter);
routes.use('/reporting/report-generator', reporting_report_generatorRouter);
routes.use('/reporting/report-hub', reporting_report_hubRouter);
routes.use('/reporting/report-scenario', reporting_report_scenarioRouter);
routes.use('/reporting/report-stream', reporting_report_streamRouter);
routes.use('/reporting', reporting_reportRouter);
routes.use('/reporting/reporting-diagnostics', reporting_reporting_diagnosticsRouter);
routes.use('/reporting/reporting-admin', reporting_reporting_adminRouter);
routes.use('/reporting/reporting-advanced', reporting_reporting_advancedRouter);
routes.use('/reporting/reporting-document-advanced', reporting_reporting_document_advancedRouter);
routes.use('/reporting/sample-reports', reporting_sample_reportsRouter);
routes.use('/reporting/admin', reporting_admin_reporting_adminRouter);
routes.use('/modules', modulesDiagnosticRouter());
