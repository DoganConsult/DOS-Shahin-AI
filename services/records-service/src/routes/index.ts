import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import recordRouter from './record.routes';

const records_records_adminRouter = loadModuleRoute('records/records-admin', '../../../modules/records/dist/records/routes/records-admin.routes');
const records_records_diagnosticsRouter = loadModuleRoute('records/records-diagnostics', '../../../modules/records/dist/records/routes/records-diagnostics.routes');
const records_recordsRouter = loadModuleRoute('records/records', '../../../modules/records/dist/records/routes/records.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'records-service', version: '0.1.0', modules: 1 });
});

routes.use('/record', recordRouter);

routes.use('/records/records-admin', records_records_adminRouter);
routes.use('/records/records-diagnostics', records_records_diagnosticsRouter);
routes.use('/records', records_recordsRouter);
routes.use('/modules', modulesDiagnosticRouter());
