import { Router } from 'express';
import { createBootstrapRouter } from './bootstrap.routes.js';
import { createPreferencesRouter } from './preferences.routes.js';
import { createWorkspaceRouter } from './workspace.routes.js';
import { createDashboardsRouter } from './dashboards.routes.js';
import { createWidgetsRouter } from './widgets.routes.js';
import { createWidgetExtRouter } from './widget-ext.routes.js';
import { createGridsRouter } from './grids.routes.js';
import { createGridExtRouter } from './grid-ext.routes.js';
import { createFormRouter } from './form.routes.js';
import { createSearchRouter } from './search.routes.js';
import { createNotificationRouter } from './notification.routes.js';
import { createHelpExtRouter } from './help-ext.routes.js';
import { createBrandingRouter } from './branding.routes.js';
import { createThemeExtRouter } from './theme-ext.routes.js';
import { createI18nExtRouter } from './i18n-ext.routes.js';
import { createAccessibilityRouter } from './accessibility.routes.js';
import { createWebOsRouter } from './webos.routes.js';
import { createPermissionRouter } from './permission.routes.js';
import { createGovernanceRouter } from './governance.routes.js';
import { createFlagsRouter } from './flags.routes.js';
import { createTelemetryRouter } from './telemetry.routes.js';
import { createAiWorkspaceRouter } from './ai-workspace.routes.js';
import { createManagerStudioRouter } from './manager-studio.routes.js';
import { createToursRouter } from './tours.routes.js';
import { createAdminRouter } from './admin.routes.js';
import { createPlatformAdminRouter } from './platform-admin.routes.js';
import { createDynamicUiContractRouter } from './dynamic-ui-contract.routes.js';
import { createTemplateBindingRouter } from './template-binding.routes.js';
import { createWorkspaceShellRouter } from './workspace-shell.routes.js';
import { createWorkspaceSurfaceRouter } from './workspace-surface.routes.js';
import { createBrandRouter } from './brand.routes.js';
import { createAgenticRouter } from './agentic.routes.js';
import { createMarketingDownloadsRouter } from './marketing-downloads.routes.js';
import { createTenantLandingConfigRouter } from './tenant-landing-config.routes.js';
import { createI18nFallbacksRouter } from './i18n-fallbacks.routes.js';
import { createGrcSandboxRouter } from './grc-sandbox.routes.js';
export function createUiOsRouter(pool) {
    const router = Router();
    router.get('/health', (_req, res) => {
        res.json({ service: 'ui-os-service', status: 'ok' });
    });
    router.use('/', createBootstrapRouter(pool));
    router.use('/', createPreferencesRouter(pool));
    router.use('/', createWorkspaceRouter(pool));
    router.use('/', createDashboardsRouter(pool));
    router.use('/', createWidgetsRouter(pool));
    router.use('/', createWidgetExtRouter(pool));
    router.use('/', createGridsRouter(pool));
    router.use('/', createGridExtRouter(pool));
    router.use('/', createFormRouter(pool));
    router.use('/', createSearchRouter(pool));
    router.use('/', createNotificationRouter(pool));
    router.use('/', createHelpExtRouter(pool));
    router.use('/', createBrandingRouter(pool));
    router.use('/', createThemeExtRouter(pool));
    router.use('/', createI18nExtRouter(pool));
    router.use('/', createAccessibilityRouter(pool));
    router.use('/', createWebOsRouter(pool));
    router.use('/', createPermissionRouter(pool));
    router.use('/', createGovernanceRouter(pool));
    router.use('/', createFlagsRouter(pool));
    router.use('/', createTelemetryRouter(pool));
    router.use('/', createAiWorkspaceRouter(pool));
    router.use('/', createManagerStudioRouter(pool));
    router.use('/', createToursRouter(pool));
    router.use('/', createAdminRouter(pool));
    router.use('/', createPlatformAdminRouter(pool));
    // W8 — Spec §10 contract endpoints, also re-mounted under /api/dynamic-ui
    // by server.ts so the canonical spec path resolves at the gateway.
    router.use('/', createDynamicUiContractRouter(pool));
    // Phase F — DB-driven template binding resolver
    router.use('/', createTemplateBindingRouter(pool));
    // Phase WS-5 — workspace-shell binding resolver
    router.use('/', createWorkspaceShellRouter(pool));
    // Phase WS-DB-2 — workspace surface content catalogs (DB-driven rewrite)
    router.use('/', createWorkspaceSurfaceRouter(pool));
    // Phase M0 — Public marketing brand resolver (NOT auth-bound)
    router.use('/', createBrandRouter(pool));
    // Phase M0.5 — Public agentic registry + strip aggregate (NOT auth-bound)
    router.use('/', createAgenticRouter(pool));
    // Phase M1.5 — Public marketing assets + download event sink (NOT auth-bound)
    router.use('/', createMarketingDownloadsRouter(pool));
    // Phase 1 — DB-driven logo/home-link configuration (tenant landing config)
    router.use('/', createTenantLandingConfigRouter(pool));
    // Phase 1 — DB-driven i18n fallback values
    router.use('/', createI18nFallbacksRouter(pool));
    // Phase 1 — DB-driven GRC sandbox (public visitor experience)
    router.use('/grc-sandbox', createGrcSandboxRouter(pool));
    return router;
}
//# sourceMappingURL=index.js.map