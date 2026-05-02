import { Router } from 'express';
import * as path from 'path';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import widgetRouter from './widget.routes';

// loadModuleRoute's `require(modulePath)` runs from inside the bootstrap
// package, so relative paths resolve against that package's dist — not this
// file. Convert to absolute paths via __dirname so resolution is correct.
const MODULES_ROOT = path.resolve(__dirname, '../../../../modules');

// Each target module compiles with rootDir=source/backend, so the emitted
// paths live at dist/<module>/... (the 'backend/' segment is stripped). Node
// can't require .ts sources directly — always point at the compiled dist.
const dashboard_dashboard_adminRouter = loadModuleRoute('dashboard/dashboard-admin', path.join(MODULES_ROOT, 'dashboard/dist/dashboard/routes/dashboard-admin.routes'));
const dashboard_dashboard_diagnosticsRouter = loadModuleRoute('dashboard/dashboard-diagnostics', path.join(MODULES_ROOT, 'dashboard/dist/dashboard/routes/dashboard-diagnostics.routes'));
const dashboard_dashboard_editorRouter = loadModuleRoute('dashboard/dashboard-editor', path.join(MODULES_ROOT, 'dashboard/dist/dashboard/routes/dashboard-editor.routes'));
const dashboard_dashboard_widgetsRouter = loadModuleRoute('dashboard/dashboard-widgets', path.join(MODULES_ROOT, 'dashboard/dist/dashboard/routes/dashboard-widgets.routes'));
const dashboard_dashboardRouter = loadModuleRoute('dashboard/dashboard', path.join(MODULES_ROOT, 'dashboard/dist/dashboard/routes/dashboard.routes'));
const dashboard_shell_configRouter = loadModuleRoute('dashboard/shell-config', path.join(MODULES_ROOT, 'dashboard/dist/dashboard/routes/shell-config.routes'));
const dashboard_ui_configRouter = loadModuleRoute('dashboard/ui-config', path.join(MODULES_ROOT, 'dashboard/dist/dashboard/routes/ui-config.routes'));
const dashboard_admin_dashboard_adminRouter = loadModuleRoute('dashboard/admin/dashboard-admin', path.join(MODULES_ROOT, 'dashboard/dist/dashboard/admin/dashboard-admin.routes'));
const widgets_widget_bundleRouter = loadModuleRoute('widgets/widget-bundle', path.join(MODULES_ROOT, 'widgets/dist/widgets/routes/widget-bundle.routes'));
const widgets_widget_diagnosticsRouter = loadModuleRoute('widgets/widget-diagnostics', path.join(MODULES_ROOT, 'widgets/dist/widgets/routes/widget-diagnostics.routes'));
const widgets_widget_executiveRouter = loadModuleRoute('widgets/widget-executive', path.join(MODULES_ROOT, 'widgets/dist/widgets/routes/widget-executive.routes'));
const widgets_widget_registryRouter = loadModuleRoute('widgets/widget-registry', path.join(MODULES_ROOT, 'widgets/dist/widgets/routes/widget-registry.routes'));
const widgets_widget_runtimeRouter = loadModuleRoute('widgets/widget-runtime', path.join(MODULES_ROOT, 'widgets/dist/widgets/routes/widget-runtime.routes'));
const widgets_admin_widgets_adminRouter = loadModuleRoute('widgets/admin/widgets-admin', path.join(MODULES_ROOT, 'widgets/dist/widgets/admin/widgets-admin.routes'));
const dashboard_editor_dashboard_editorRouter = loadModuleRoute('dashboard-editor/dashboard-editor', path.join(MODULES_ROOT, 'dashboard-editor/dist/dashboard-editor/routes/dashboard-editor.routes'));

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'dashboard-widgets-service', version: '0.1.0', modules: 3 });
});

routes.use('/widget', widgetRouter);

routes.use('/dashboard/dashboard-admin', dashboard_dashboard_adminRouter);
routes.use('/dashboard/dashboard-diagnostics', dashboard_dashboard_diagnosticsRouter);
routes.use('/dashboard/dashboard-editor', dashboard_dashboard_editorRouter);
routes.use('/dashboard/dashboard-widgets', dashboard_dashboard_widgetsRouter);
routes.use('/dashboard', dashboard_dashboardRouter);
routes.use('/dashboard/shell-config', dashboard_shell_configRouter);
routes.use('/dashboard/ui-config', dashboard_ui_configRouter);
routes.use('/dashboard/admin', dashboard_admin_dashboard_adminRouter);
routes.use('/widgets/widget-bundle', widgets_widget_bundleRouter);
routes.use('/widgets/widget-diagnostics', widgets_widget_diagnosticsRouter);
routes.use('/widgets/widget-executive', widgets_widget_executiveRouter);
routes.use('/widgets/widget-registry', widgets_widget_registryRouter);
routes.use('/widgets/widget-runtime', widgets_widget_runtimeRouter);
routes.use('/widgets/admin', widgets_admin_widgets_adminRouter);
routes.use('/dashboard-editor', dashboard_editor_dashboard_editorRouter);

// V2b — Shahin shell calls /api/shell/config/* and /api/shell/preferences/*
// directly. Expose the same shell-config router at the top-level /shell
// alias so FE resolves without traversing /dashboard/. Same router instance
// — no duplicate behaviour.
export const shellRouter = dashboard_shell_configRouter;
routes.use('/shell', dashboard_shell_configRouter);

routes.use('/modules', modulesDiagnosticRouter());
