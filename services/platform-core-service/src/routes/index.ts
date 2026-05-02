import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import mobileSessionRouter from './mobile-session.routes';

const mobile_mobileRouter = loadModuleRoute('mobile/mobile', '../../../modules/mobile/dist/mobile/routes/mobile.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'platform-core-service', version: '0.1.0', modules: 1 });
});

routes.use('/mobile', mobileSessionRouter);

routes.use('/mobile', mobile_mobileRouter);
routes.use('/modules', modulesDiagnosticRouter());
