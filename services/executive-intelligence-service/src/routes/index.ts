import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import briefingRouter from './briefing.routes';

const executive_executiveRouter = loadModuleRoute('executive/executive', '../../../modules/executive/dist/executive/routes/executive.routes');
const operating_cockpit_operating_cockpitRouter = loadModuleRoute('operating-cockpit/operating-cockpit', '../../../modules/operating-cockpit/dist/operating-cockpit/routes/operating-cockpit.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'executive-intelligence-service', version: '0.1.0', modules: 2 });
});

routes.use('/executive', briefingRouter);

routes.use('/executive', executive_executiveRouter);
routes.use('/operating-cockpit', operating_cockpit_operating_cockpitRouter);
routes.use('/modules', modulesDiagnosticRouter());
