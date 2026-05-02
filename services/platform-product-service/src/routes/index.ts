import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import productLicenseRouter from './product-license.routes';

const team_team_diagnosticsRouter = loadModuleRoute('team/team-diagnostics', '../../../modules/team/dist/team/routes/team-diagnostics.routes');
const team_teamRouter = loadModuleRoute('team/team', '../../../modules/team/dist/team/routes/team.routes');
const team_admin_team_adminRouter = loadModuleRoute('team/admin/team-admin', '../../../modules/team/dist/team/admin/team-admin.routes');
const mobile_mobileRouter = loadModuleRoute('mobile/mobile', '../../../modules/mobile/dist/mobile/routes/mobile.routes');
const knowledge_knowledgeRouter = loadModuleRoute('knowledge/knowledge', '../../../modules/knowledge/dist/knowledge/routes/knowledge.routes');
const knowledge_knowledge_diagnosticsRouter = loadModuleRoute('knowledge/knowledge-diagnostics', '../../../modules/knowledge/dist/knowledge/routes/knowledge-diagnostics.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'platform-product-service', version: '0.1.0', modules: 2 });
});

routes.use('/product', productLicenseRouter);

routes.use('/team/team-diagnostics', team_team_diagnosticsRouter);
routes.use('/team', team_teamRouter);
routes.use('/team/admin', team_admin_team_adminRouter);
routes.use('/mobile', mobile_mobileRouter);
routes.use('/knowledge/knowledge-diagnostics', knowledge_knowledge_diagnosticsRouter);
routes.use('/knowledge', knowledge_knowledgeRouter);
routes.use('/modules', modulesDiagnosticRouter());

// Dedicated knowledge router mounted separately in server.ts at /api/knowledge
// so the module is accessible at its natural prefix (no /product/ nesting).
export const knowledgeRoutes: Router = Router();
knowledgeRoutes.use('/knowledge-diagnostics', knowledge_knowledge_diagnosticsRouter);
knowledgeRoutes.use('/', knowledge_knowledgeRouter);
