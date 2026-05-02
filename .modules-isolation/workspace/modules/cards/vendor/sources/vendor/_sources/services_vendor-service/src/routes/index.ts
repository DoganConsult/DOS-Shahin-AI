import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import vendorRouter from './vendor.routes';

const vendor_consultant_centerRouter = loadModuleRoute('vendor/consultant-center', '../../../modules/vendor/dist/vendor/routes/consultant-center.routes');
const vendor_vendor_adminRouter = loadModuleRoute('vendor/vendor-admin', '../../../modules/vendor/dist/vendor/routes/vendor-admin.routes');
const vendor_vendor_advancedRouter = loadModuleRoute('vendor/vendor-advanced', '../../../modules/vendor/dist/vendor/routes/vendor-advanced.routes');
const vendor_vendor_compliance_syncRouter = loadModuleRoute('vendor/vendor-compliance-sync', '../../../modules/vendor/dist/vendor/routes/vendor-compliance-sync.routes');
const vendor_vendor_cyber_ratingRouter = loadModuleRoute('vendor/vendor-cyber-rating', '../../../modules/vendor/dist/vendor/routes/vendor-cyber-rating.routes');
const vendor_vendor_dashboardRouter = loadModuleRoute('vendor/vendor-dashboard', '../../../modules/vendor/dist/vendor/routes/vendor-dashboard.routes');
const vendor_vendor_diagnosticsRouter = loadModuleRoute('vendor/vendor-diagnostics', '../../../modules/vendor/dist/vendor/routes/vendor-diagnostics.routes');
const vendor_vendor_engagementsRouter = loadModuleRoute('vendor/vendor-engagements', '../../../modules/vendor/dist/vendor/routes/vendor-engagements.routes');
const vendor_vendor_issuesRouter = loadModuleRoute('vendor/vendor-issues', '../../../modules/vendor/dist/vendor/routes/vendor-issues.routes');
const vendor_vendor_portalRouter = loadModuleRoute('vendor/vendor-portal', '../../../modules/vendor/dist/vendor/routes/vendor-portal.routes');
const vendor_vendor_reportsRouter = loadModuleRoute('vendor/vendor-reports', '../../../modules/vendor/dist/vendor/routes/vendor-reports.routes');
const vendor_vendor_risk_extRouter = loadModuleRoute('vendor/vendor-risk-ext', '../../../modules/vendor/dist/vendor/routes/vendor-risk-ext.routes');
const vendor_vendor_scoringRouter = loadModuleRoute('vendor/vendor-scoring', '../../../modules/vendor/dist/vendor/routes/vendor-scoring.routes');
const vendor_vendorsRouter = loadModuleRoute('vendor/vendors', '../../../modules/vendor/dist/vendor/routes/vendors.routes');
const vendor_admin_vendor_adminRouter = loadModuleRoute('vendor/admin/vendor-admin', '../../../modules/vendor/dist/vendor/admin/vendor-admin.routes');

// Phase 7 deeper (2026-04-30): top-level FE prefix /api/vendor-risk
// (grc-risk.service.ts, vendor-risk-dashboard.component.ts) was previously
// reachable only nested under /api/vendor-service/vendor/vendor-risk-ext.
// Re-export the underlying router so server.ts can mount it at /api/vendor-risk.
export { vendor_vendor_risk_extRouter as vendorRiskExtRouter };

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'vendor-service', version: '0.1.0', modules: 1 });
});

routes.use('/vendor', vendorRouter);

routes.use('/vendor/consultant-center', vendor_consultant_centerRouter);
routes.use('/vendor/vendor-admin', vendor_vendor_adminRouter);
routes.use('/vendor/vendor-advanced', vendor_vendor_advancedRouter);
routes.use('/vendor/vendor-compliance-sync', vendor_vendor_compliance_syncRouter);
routes.use('/vendor/vendor-cyber-rating', vendor_vendor_cyber_ratingRouter);
routes.use('/vendor/vendor-dashboard', vendor_vendor_dashboardRouter);
routes.use('/vendor/vendor-diagnostics', vendor_vendor_diagnosticsRouter);
routes.use('/vendor/vendor-engagements', vendor_vendor_engagementsRouter);
routes.use('/vendor/vendor-issues', vendor_vendor_issuesRouter);
routes.use('/vendor/vendor-portal', vendor_vendor_portalRouter);
routes.use('/vendor/vendor-reports', vendor_vendor_reportsRouter);
routes.use('/vendor/vendor-risk-ext', vendor_vendor_risk_extRouter);
routes.use('/vendor/vendor-scoring', vendor_vendor_scoringRouter);
routes.use('/vendor', vendor_vendorsRouter);
routes.use('/vendor/admin', vendor_admin_vendor_adminRouter);
routes.use('/modules', modulesDiagnosticRouter());
