import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import trainingProgramRouter from './training-program.routes';

const training_training_adminRouter = loadModuleRoute('training/training-admin', '../../../modules/training/dist/backend/training/routes/training-admin.routes');
const training_training_advancedRouter = loadModuleRoute('training/training-advanced', '../../../modules/training/dist/backend/training/routes/training-advanced.routes');
const training_training_dataRouter = loadModuleRoute('training/training-data', '../../../modules/training/dist/backend/training/routes/training-data.routes');
const training_training_diagnosticsRouter = loadModuleRoute('training/training-diagnostics', '../../../modules/training/dist/backend/training/routes/training-diagnostics.routes');
const training_admin_training_adminRouter = loadModuleRoute('training/admin/training-admin', '../../../modules/training/dist/backend/training/admin/training-admin.routes');
const packs_packs_diagnosticsRouter = loadModuleRoute('packs/packs-diagnostics', '../../../modules/packs/dist/packs/routes/packs-diagnostics.routes');
const packs_packsRouter = loadModuleRoute('packs/packs', '../../../modules/packs/dist/packs/routes/packs.routes');
const packs_admin_packs_adminRouter = loadModuleRoute('packs/admin/packs-admin', '../../../modules/packs/dist/packs/admin/packs-admin.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'training-service', version: '0.1.0', modules: 2 });
});

routes.use('/training', trainingProgramRouter);

routes.use('/training/training-admin', training_training_adminRouter);
routes.use('/training/training-advanced', training_training_advancedRouter);
routes.use('/training/training-data', training_training_dataRouter);
routes.use('/training/training-diagnostics', training_training_diagnosticsRouter);
routes.use('/training/admin', training_admin_training_adminRouter);
routes.use('/packs/packs-diagnostics', packs_packs_diagnosticsRouter);
routes.use('/packs', packs_packsRouter);
routes.use('/packs/admin', packs_admin_packs_adminRouter);
routes.use('/modules', modulesDiagnosticRouter());
