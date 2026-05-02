import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import portalRouter from './portal.routes';

const portals_portals_adminRouter = loadModuleRoute('portals/portals-admin', '../../../modules/portals/dist/portals/routes/portals-admin.routes');
const portals_portals_diagnosticsRouter = loadModuleRoute('portals/portals-diagnostics', '../../../modules/portals/dist/portals/routes/portals-diagnostics.routes');
const portals_portalsRouter = loadModuleRoute('portals/portals', '../../../modules/portals/dist/portals/routes/portals.routes');
const portals_admin_portals_adminRouter = loadModuleRoute('portals/admin/portals-admin', '../../../modules/portals/dist/portals/admin/portals-admin.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'portals-service', version: '0.1.0', modules: 1 });
});

routes.use('/portal', portalRouter);

routes.use('/portals/portals-admin', portals_portals_adminRouter);
routes.use('/portals/portals-diagnostics', portals_portals_diagnosticsRouter);
routes.use('/portals', portals_portalsRouter);
routes.use('/portals/admin', portals_admin_portals_adminRouter);
routes.use('/modules', modulesDiagnosticRouter());
