import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import doraAssessmentRouter from './dora-assessment.routes';

const dora_dora_diagnosticsRouter = loadModuleRoute('dora/dora-diagnostics', '../../../modules/dora/dist/dora/routes/dora-diagnostics.routes');
const dora_doraRouter = loadModuleRoute('dora/dora', '../../../modules/dora/dist/dora/routes/dora.routes');
const dora_admin_dora_adminRouter = loadModuleRoute('dora/admin/dora-admin', '../../../modules/dora/dist/dora/admin/dora-admin.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'dora-service', version: '0.1.0', modules: 1 });
});

routes.use('/dora', doraAssessmentRouter);

routes.use('/dora/dora-diagnostics', dora_dora_diagnosticsRouter);
routes.use('/dora', dora_doraRouter);
routes.use('/dora/admin', dora_admin_dora_adminRouter);
routes.use('/modules', modulesDiagnosticRouter());
