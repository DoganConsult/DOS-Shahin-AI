import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import bcpPlanRouter from './bcp-plan.routes';

const bcp_bcm_advancedRouter = loadModuleRoute('bcp/bcm-advanced', '../../../modules/bcp/dist/bcp/routes/bcm-advanced.routes');
const bcp_bcm_crisisRouter = loadModuleRoute('bcp/bcm-crisis', '../../../modules/bcp/dist/bcp/routes/bcm-crisis.routes');
const bcp_bcm_findingsRouter = loadModuleRoute('bcp/bcm-findings', '../../../modules/bcp/dist/bcp/routes/bcm-findings.routes');
const bcp_bcm_metricsRouter = loadModuleRoute('bcp/bcm-metrics', '../../../modules/bcp/dist/bcp/routes/bcm-metrics.routes');
const bcp_bcp_adminRouter = loadModuleRoute('bcp/bcp-admin', '../../../modules/bcp/dist/bcp/routes/bcp-admin.routes');
const bcp_bcp_diagnosticsRouter = loadModuleRoute('bcp/bcp-diagnostics', '../../../modules/bcp/dist/bcp/routes/bcp-diagnostics.routes');
const bcp_bcpRouter = loadModuleRoute('bcp/bcp', '../../../modules/bcp/dist/bcp/routes/bcp.routes');
const bcp_business_servicesRouter = loadModuleRoute('bcp/business-services', '../../../modules/bcp/dist/bcp/routes/business-services.routes');
const bcp_admin_bcp_adminRouter = loadModuleRoute('bcp/admin/bcp-admin', '../../../modules/bcp/dist/bcp/admin/bcp-admin.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'bcp-service', version: '0.1.0', modules: 1 });
});

routes.use('/bcp', bcpPlanRouter);

routes.use('/bcp/bcm-advanced', bcp_bcm_advancedRouter);
routes.use('/bcp/bcm-crisis', bcp_bcm_crisisRouter);
routes.use('/bcp/bcm-findings', bcp_bcm_findingsRouter);
routes.use('/bcp/bcm-metrics', bcp_bcm_metricsRouter);
routes.use('/bcp/bcp-admin', bcp_bcp_adminRouter);
routes.use('/bcp/bcp-diagnostics', bcp_bcp_diagnosticsRouter);
routes.use('/bcp', bcp_bcpRouter);
routes.use('/bcp/business-services', bcp_business_servicesRouter);
routes.use('/bcp/admin', bcp_admin_bcp_adminRouter);
routes.use('/modules', modulesDiagnosticRouter());
