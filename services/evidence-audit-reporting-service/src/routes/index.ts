import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import evidenceRouter from './evidence.routes';
import findingRouter from './finding.routes';

const evidence_evidence_collectorsRouter = loadModuleRoute('evidence/collection/evidence-collectors', '../../../modules/evidence/dist/backend/evidence/routes/collection/evidence-collectors.routes');
const evidence_evidence_freshnessRouter = loadModuleRoute('evidence/collection/evidence-freshness', '../../../modules/evidence/dist/backend/evidence/routes/collection/evidence-freshness.routes');
const evidence_evidence_schedulesRouter = loadModuleRoute('evidence/collection/evidence-schedules', '../../../modules/evidence/dist/backend/evidence/routes/collection/evidence-schedules.routes');
const evidence_pipeline_webhookRouter = loadModuleRoute('evidence/collection/pipeline-webhook', '../../../modules/evidence/dist/backend/evidence/routes/collection/pipeline-webhook.routes');
const evidence_evidence_adminRouter = loadModuleRoute('evidence/core/evidence-admin', '../../../modules/evidence/dist/backend/evidence/routes/core/evidence-admin.routes');
const evidence_evidence_analysisRouter = loadModuleRoute('evidence/core/evidence-analysis', '../../../modules/evidence/dist/backend/evidence/routes/core/evidence-analysis.routes');
const evidence_evidence_attachmentsRouter = loadModuleRoute('evidence/core/evidence-attachments', '../../../modules/evidence/dist/backend/evidence/routes/core/evidence-attachments.routes');
const evidence_evidence_catalogRouter = loadModuleRoute('evidence/core/evidence-catalog', '../../../modules/evidence/dist/backend/evidence/routes/core/evidence-catalog.routes');
const evidence_evidence_core_serviceRouter = loadModuleRoute('evidence/core/evidence-core-service', '../../../modules/evidence/dist/backend/evidence/routes/core/evidence-core-service.routes');
const evidence_evidence_coreRouter = loadModuleRoute('evidence/core/evidence-core', '../../../modules/evidence/dist/backend/evidence/routes/core/evidence-core.routes');
const evidence_evidence_entity_integrationRouter = loadModuleRoute('evidence/core/evidence-entity-integration', '../../../modules/evidence/dist/backend/evidence/routes/core/evidence-entity-integration.routes');
const evidence_evidence_filesRouter = loadModuleRoute('evidence/core/evidence-files', '../../../modules/evidence/dist/backend/evidence/routes/core/evidence-files.routes');
const evidence_evidence_healthRouter = loadModuleRoute('evidence/core/evidence-health', '../../../modules/evidence/dist/backend/evidence/routes/core/evidence-health.routes');
const evidence_evidenceRouter = loadModuleRoute('evidence/core/evidence', '../../../modules/evidence/dist/backend/evidence/routes/core/evidence.routes');
const evidence_evidence_diagnosticsRouter = loadModuleRoute('evidence/evidence-diagnostics', '../../../modules/evidence/dist/backend/evidence/routes/evidence-diagnostics.routes');
const evidence_evidence_dashboardRouter = loadModuleRoute('evidence/reporting/evidence-dashboard', '../../../modules/evidence/dist/backend/evidence/routes/reporting/evidence-dashboard.routes');
const evidence_evidence_packagesRouter = loadModuleRoute('evidence/reporting/evidence-packages', '../../../modules/evidence/dist/backend/evidence/routes/reporting/evidence-packages.routes');
const evidence_evidence_reportsRouter = loadModuleRoute('evidence/reporting/evidence-reports', '../../../modules/evidence/dist/backend/evidence/routes/reporting/evidence-reports.routes');
const evidence_evidence_reuseRouter = loadModuleRoute('evidence/reporting/evidence-reuse', '../../../modules/evidence/dist/backend/evidence/routes/reporting/evidence-reuse.routes');
const evidence_evidence_requestsRouter = loadModuleRoute('evidence/workflow/evidence-requests', '../../../modules/evidence/dist/backend/evidence/routes/workflow/evidence-requests.routes');
const evidence_evidence_requirementsRouter = loadModuleRoute('evidence/workflow/evidence-requirements', '../../../modules/evidence/dist/backend/evidence/routes/workflow/evidence-requirements.routes');
const evidence_evidence_reviewsRouter = loadModuleRoute('evidence/workflow/evidence-reviews', '../../../modules/evidence/dist/backend/evidence/routes/workflow/evidence-reviews.routes');
const evidence_evidence_tasksRouter = loadModuleRoute('evidence/workflow/evidence-tasks', '../../../modules/evidence/dist/backend/evidence/routes/workflow/evidence-tasks.routes');
const evidence_admin_evidence_adminRouter = loadModuleRoute('evidence/admin/evidence-admin', '../../../modules/evidence/dist/backend/evidence/admin/evidence-admin.routes');
const reporting_board_reportsRouter = loadModuleRoute('reporting/misc/board-reports', '../../../modules/reporting/dist/backend/reporting/routes/misc/board-reports.routes');
const reporting_report_centerRouter = loadModuleRoute('reporting/report/report-center', '../../../modules/reporting/dist/backend/reporting/routes/report/report-center.routes');
const reporting_report_extRouter = loadModuleRoute('reporting/report/report-ext', '../../../modules/reporting/dist/backend/reporting/routes/report/report-ext.routes');
const reporting_report_generatorRouter = loadModuleRoute('reporting/report/report-generator', '../../../modules/reporting/dist/backend/reporting/routes/report/report-generator.routes');
const reporting_report_hubRouter = loadModuleRoute('reporting/report/report-hub', '../../../modules/reporting/dist/backend/reporting/routes/report/report-hub.routes');
const reporting_report_scenarioRouter = loadModuleRoute('reporting/report/report-scenario', '../../../modules/reporting/dist/backend/reporting/routes/report/report-scenario.routes');
const reporting_report_streamRouter = loadModuleRoute('reporting/report/report-stream', '../../../modules/reporting/dist/backend/reporting/routes/report/report-stream.routes');
const reporting_reportRouter = loadModuleRoute('reporting/report/report', '../../../modules/reporting/dist/backend/reporting/routes/report/report.routes');
const reporting_reporting_adminRouter = loadModuleRoute('reporting/reporting/reporting-admin', '../../../modules/reporting/dist/backend/reporting/routes/reporting/reporting-admin.routes');
const reporting_reporting_advancedRouter = loadModuleRoute('reporting/reporting/reporting-advanced', '../../../modules/reporting/dist/backend/reporting/routes/reporting/reporting-advanced.routes');
const reporting_reporting_document_advancedRouter = loadModuleRoute('reporting/reporting/reporting-document-advanced', '../../../modules/reporting/dist/backend/reporting/routes/reporting/reporting-document-advanced.routes');
const reporting_reporting_diagnosticsRouter = loadModuleRoute('reporting/reporting-diagnostics', '../../../modules/reporting/dist/backend/reporting/routes/reporting-diagnostics.routes');
const reporting_sample_reportsRouter = loadModuleRoute('reporting/sample/sample-reports', '../../../modules/reporting/dist/backend/reporting/routes/sample/sample-reports.routes');
const reporting_admin_reporting_adminRouter = loadModuleRoute('reporting/admin/reporting-admin', '../../../modules/reporting/dist/backend/reporting/admin/reporting-admin.routes');
// Phase 11 (M5 scope): dashboard, dashboard-editor, widgets, records,
// attestation are NOT in M5 scope per the Wave-1 plan and belong in
// their own service certifications (dashboard-widgets-service,
// analytics-service, etc.). They are not mounted by this aggregator;
// the FE must reach them via their own gateway prefixes, not via
// /api/evidence-audit-reporting/*. See docs/certifications/
// M5-evidence-reporting.md for the full disabled-with-reason register.

// Phase 6 deeper (2026-04-30): top-level FE prefix /api/evidence-tasks
// (evidence-api.service.ts.getTasks) was previously reachable only nested
// under /api/evidence-audit-reporting/evidence/evidence-tasks. Re-export
// the underlying router so server.ts can mount it at the canonical path.
export { evidence_evidence_tasksRouter as evidenceTasksRouter };

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'evidence-audit-reporting-service', version: '0.1.0', modules: 7 });
});

routes.use('/evidence', evidenceRouter);
routes.use('/finding', findingRouter);

routes.use('/evidence/evidence-collectors', evidence_evidence_collectorsRouter);
routes.use('/evidence/evidence-freshness', evidence_evidence_freshnessRouter);
routes.use('/evidence/evidence-schedules', evidence_evidence_schedulesRouter);
routes.use('/evidence/pipeline-webhook', evidence_pipeline_webhookRouter);
routes.use('/evidence/evidence-admin', evidence_evidence_adminRouter);
routes.use('/evidence/evidence-analysis', evidence_evidence_analysisRouter);
routes.use('/evidence/evidence-attachments', evidence_evidence_attachmentsRouter);
routes.use('/evidence/evidence-catalog', evidence_evidence_catalogRouter);
routes.use('/evidence/evidence-core-service', evidence_evidence_core_serviceRouter);
routes.use('/evidence/evidence-core', evidence_evidence_coreRouter);
routes.use('/evidence/evidence-entity-integration', evidence_evidence_entity_integrationRouter);
routes.use('/evidence/evidence-files', evidence_evidence_filesRouter);
routes.use('/evidence/evidence-health', evidence_evidence_healthRouter);
routes.use('/evidence', evidence_evidenceRouter);
routes.use('/evidence/evidence-diagnostics', evidence_evidence_diagnosticsRouter);
routes.use('/evidence/evidence-dashboard', evidence_evidence_dashboardRouter);
routes.use('/evidence/evidence-packages', evidence_evidence_packagesRouter);
routes.use('/evidence/evidence-reports', evidence_evidence_reportsRouter);
routes.use('/evidence/evidence-reuse', evidence_evidence_reuseRouter);
routes.use('/evidence/evidence-requests', evidence_evidence_requestsRouter);
routes.use('/evidence/evidence-requirements', evidence_evidence_requirementsRouter);
routes.use('/evidence/evidence-reviews', evidence_evidence_reviewsRouter);
routes.use('/evidence/evidence-tasks', evidence_evidence_tasksRouter);
routes.use('/evidence/admin', evidence_admin_evidence_adminRouter);
routes.use('/reporting/board-reports', reporting_board_reportsRouter);
routes.use('/reporting/report-center', reporting_report_centerRouter);
routes.use('/reporting/report-ext', reporting_report_extRouter);
routes.use('/reporting/report-generator', reporting_report_generatorRouter);
routes.use('/reporting/report-hub', reporting_report_hubRouter);
routes.use('/reporting/report-scenario', reporting_report_scenarioRouter);
routes.use('/reporting/report-stream', reporting_report_streamRouter);
routes.use('/reporting/report', reporting_reportRouter);
routes.use('/reporting/reporting-admin', reporting_reporting_adminRouter);
routes.use('/reporting/reporting-advanced', reporting_reporting_advancedRouter);
routes.use('/reporting/reporting-document-advanced', reporting_reporting_document_advancedRouter);
routes.use('/reporting/reporting-diagnostics', reporting_reporting_diagnosticsRouter);
routes.use('/reporting/sample-reports', reporting_sample_reportsRouter);
routes.use('/reporting/admin', reporting_admin_reporting_adminRouter);
// Non-M5 mounts (/dashboard, /dashboard-editor, /widgets, /records,
// /attestation) are removed. See the const-declaration comment above
// for rationale.
routes.use('/modules', modulesDiagnosticRouter());
