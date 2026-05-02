import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import privacyAssessmentRouter from './privacy-assessment.routes';

const privacy_privacy_adminRouter = loadModuleRoute('privacy/privacy-admin', '../../../modules/privacy/dist/privacy/routes/privacy-admin.routes');
const privacy_privacy_diagnosticsRouter = loadModuleRoute('privacy/privacy-diagnostics', '../../../modules/privacy/dist/privacy/routes/privacy-diagnostics.routes');
const privacy_privacyRouter = loadModuleRoute('privacy/privacy', '../../../modules/privacy/dist/privacy/routes/privacy.routes');
const privacy_admin_privacy_adminRouter = loadModuleRoute('privacy/admin/privacy-admin', '../../../modules/privacy/dist/privacy/admin/privacy-admin.routes');
const privacy_dataExportRouter = loadModuleRoute('privacy/data-export', '../../../modules/privacy/dist/privacy/routes/data-export.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'privacy-service', version: '0.1.0', modules: 1 });
});

routes.use('/privacy', privacyAssessmentRouter);

routes.use('/privacy/privacy-admin', privacy_privacy_adminRouter);
routes.use('/privacy/privacy-diagnostics', privacy_privacy_diagnosticsRouter);
routes.use('/privacy', privacy_privacyRouter);
routes.use('/privacy/admin', privacy_admin_privacy_adminRouter);
routes.use('/privacy/data-export', privacy_dataExportRouter);
routes.use('/modules', modulesDiagnosticRouter());
