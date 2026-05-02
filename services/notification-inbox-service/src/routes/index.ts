import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import inboxItemRouter from './inbox-item.routes';

const inbox_inbox_adminRouter = loadModuleRoute('inbox/inbox-admin', '../../../modules/inbox/dist/inbox/routes/inbox-admin.routes');
const inbox_inbox_diagnosticsRouter = loadModuleRoute('inbox/inbox-diagnostics', '../../../modules/inbox/dist/inbox/routes/inbox-diagnostics.routes');
const inbox_inboxRouter = loadModuleRoute('inbox/inbox', '../../../modules/inbox/dist/inbox/routes/inbox.routes');
const inbox_admin_inbox_adminRouter = loadModuleRoute('inbox/admin/inbox-admin', '../../../modules/inbox/dist/inbox/admin/inbox-admin.routes');
const notification_notification_adminRouter = loadModuleRoute('notification/notification-admin', '../../../modules/notification/dist/notification/routes/notification-admin.routes');
const notification_notification_centerRouter = loadModuleRoute('notification/notification-center', '../../../modules/notification/dist/notification/routes/notification-center.routes');
const notification_notification_diagnosticsRouter = loadModuleRoute('notification/notification-diagnostics', '../../../modules/notification/dist/notification/routes/notification-diagnostics.routes');
const notification_notification_preferencesRouter = loadModuleRoute('notification/notification-preferences', '../../../modules/notification/dist/notification/routes/notification-preferences.routes');
const notification_notificationRouter = loadModuleRoute('notification/notification', '../../../modules/notification/dist/notification/routes/notification.routes');
const notification_admin_notification_adminRouter = loadModuleRoute('notification/admin/notification-admin', '../../../modules/notification/dist/notification/admin/notification-admin.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'notification-inbox-service', version: '0.1.0', modules: 2 });
});

routes.use('/inbox', inboxItemRouter);

routes.use('/inbox/inbox-admin', inbox_inbox_adminRouter);
routes.use('/inbox/inbox-diagnostics', inbox_inbox_diagnosticsRouter);
routes.use('/inbox', inbox_inboxRouter);
routes.use('/inbox/admin', inbox_admin_inbox_adminRouter);
routes.use('/notification/notification-admin', notification_notification_adminRouter);
routes.use('/notification/notification-center', notification_notification_centerRouter);
routes.use('/notification/notification-diagnostics', notification_notification_diagnosticsRouter);
routes.use('/notification/notification-preferences', notification_notification_preferencesRouter);
routes.use('/notification', notification_notificationRouter);
routes.use('/notification/admin', notification_admin_notification_adminRouter);
routes.use('/modules', modulesDiagnosticRouter());
