import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import remediationRouter from './remediation.routes';
import actionItemRouter from './action-item.routes';

const remediation_autonomous_remediationRouter = loadModuleRoute('remediation/autonomous-remediation', '../../../modules/remediation/dist/remediation/routes/autonomous-remediation.routes');
const remediation_findingsRouter = loadModuleRoute('remediation/findings', '../../../modules/remediation/dist/remediation/routes/findings.routes');
const remediation_remediation_adminRouter = loadModuleRoute('remediation/remediation-admin', '../../../modules/remediation/dist/remediation/routes/remediation-admin.routes');
const remediation_remediation_diagnosticsRouter = loadModuleRoute('remediation/remediation-diagnostics', '../../../modules/remediation/dist/remediation/routes/remediation-diagnostics.routes');
const remediation_remediationRouter = loadModuleRoute('remediation/remediation', '../../../modules/remediation/dist/remediation/routes/remediation.routes');
const remediation_admin_remediation_adminRouter = loadModuleRoute('remediation/admin/remediation-admin', '../../../modules/remediation/dist/remediation/admin/remediation-admin.routes');
const action_action_adminRouter = loadModuleRoute('action/action-admin', '../../../modules/action/dist/action/routes/action-admin.routes');
const action_action_diagnosticsRouter = loadModuleRoute('action/action-diagnostics', '../../../modules/action/dist/action/routes/action-diagnostics.routes');
const action_action_itemRouter = loadModuleRoute('action/action-item', '../../../modules/action/dist/action/routes/action-item.routes');
const action_admin_action_adminRouter = loadModuleRoute('action/admin/action-admin', '../../../modules/action/dist/action/admin/action-admin.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'remediation-action-service', version: '0.1.0', modules: 2 });
});

routes.use('/remediation', remediationRouter);
routes.use('/action', actionItemRouter);

routes.use('/remediation/autonomous-remediation', remediation_autonomous_remediationRouter);
routes.use('/remediation/findings', remediation_findingsRouter);
routes.use('/remediation/remediation-admin', remediation_remediation_adminRouter);
routes.use('/remediation/remediation-diagnostics', remediation_remediation_diagnosticsRouter);
routes.use('/remediation', remediation_remediationRouter);
routes.use('/remediation/admin', remediation_admin_remediation_adminRouter);
routes.use('/action/action-admin', action_action_adminRouter);
routes.use('/action/action-diagnostics', action_action_diagnosticsRouter);
routes.use('/action/action-item', action_action_itemRouter);
routes.use('/action/admin', action_admin_action_adminRouter);
routes.use('/modules', modulesDiagnosticRouter());
