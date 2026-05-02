import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import integrationRouter from './integration.routes';

const integrations_connector_healthRouter = loadModuleRoute('integrations/connector-health', '../../../modules/integrations/dist/integrations/routes/connector-health.routes');
const integrations_connector_oauthRouter = loadModuleRoute('integrations/connector-oauth', '../../../modules/integrations/dist/integrations/routes/connector-oauth.routes');
const integrations_connectorRouter = loadModuleRoute('integrations/connector', '../../../modules/integrations/dist/integrations/routes/connector.routes');
const integrations_integrations_adminRouter = loadModuleRoute('integrations/integrations-admin', '../../../modules/integrations/dist/integrations/routes/integrations-admin.routes');
const integrations_integrations_diagnosticsRouter = loadModuleRoute('integrations/integrations-diagnostics', '../../../modules/integrations/dist/integrations/routes/integrations-diagnostics.routes');
const integrations_integrationsRouter = loadModuleRoute('integrations/integrations', '../../../modules/integrations/dist/integrations/routes/integrations.routes');
const integrations_powerbiRouter = loadModuleRoute('integrations/powerbi', '../../../modules/integrations/dist/integrations/routes/powerbi.routes');
const integrations_webhook_outboundRouter = loadModuleRoute('integrations/webhook-outbound', '../../../modules/integrations/dist/integrations/routes/webhook-outbound.routes');
const integrations_webhooks_manageRouter = loadModuleRoute('integrations/webhooks-manage', '../../../modules/integrations/dist/integrations/routes/webhooks-manage.routes');
const integrations_admin_integrations_adminRouter = loadModuleRoute('integrations/admin/integrations-admin', '../../../modules/integrations/dist/integrations/admin/integrations-admin.routes');
const fitch_fitchRouter = loadModuleRoute('fitch/fitch', '../../../modules/fitch/dist/fitch/routes/fitch.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'integrations-service', version: '0.1.0', modules: 2 });
});

routes.use('/integration', integrationRouter);

routes.use('/integrations/connector-health', integrations_connector_healthRouter);
routes.use('/integrations/connector-oauth', integrations_connector_oauthRouter);
routes.use('/integrations/connector', integrations_connectorRouter);
routes.use('/integrations/integrations-admin', integrations_integrations_adminRouter);
routes.use('/integrations/integrations-diagnostics', integrations_integrations_diagnosticsRouter);
routes.use('/integrations', integrations_integrationsRouter);
routes.use('/integrations/powerbi', integrations_powerbiRouter);
routes.use('/integrations/webhook-outbound', integrations_webhook_outboundRouter);
routes.use('/integrations/webhooks-manage', integrations_webhooks_manageRouter);
routes.use('/integrations/admin', integrations_admin_integrations_adminRouter);
routes.use('/fitch', fitch_fitchRouter);
routes.use('/modules', modulesDiagnosticRouter());
