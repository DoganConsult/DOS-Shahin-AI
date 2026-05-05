/**
 * Platform App — Application Config.
 *
 * This is the single SPA entry point for all DOS products.
 * Product differentiation is DB-driven (product_key, modules, branding).
 */
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { correlationIdInterceptor } from '@platform/shell/correlation-id.interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DOS_LANGUAGE_SWITCHER_I18N } from '@dos/ui-system';
import {
  provideAccessStore,
  WORKSPACE_NAV_LABEL_RESOLVER,
  WORKSPACE_NAV_PRODUCT_SOURCE,
} from '@dos/access-store';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { provideShellIcons } from './shell/icon-registration';
import { ProductCompositionNavSource } from './shell/product-composition-nav.source';
import { WorkspaceResolverService } from './shell/workspace-resolver.service';
import { COCKPIT_CONFIG, type CockpitConfigContract } from '@app/dos/contracts/cockpit-config.contract';
import { FOUNDATION_I18N } from '@foundation-module/ui/ports/i18n.port';
import { routes } from './app.routes';

/** Default cockpit config — empty defaults, populated from DB at runtime. */
const DEFAULT_COCKPIT_CONFIG: CockpitConfigContract = {
  getRoleSections: () => ({}),
  getRoleAliases: () => ({}),
  getKpiModuleMap: () => [],
  getDefaultRoleSection: () => ({
    executiveSnapshot: true,
    actionCenter: true,
    programHealth: true,
    analytics: true,
    activity: true,
    nextSteps: true,
    widgetPriority: [],
  }),
  getIgniteModuleOrder: () => [],
  getIgniteModuleMeta: () => ({}),
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withInterceptors([correlationIdInterceptor])),
    provideAnimationsAsync(),
    // @dos/ui-system DosLanguageSwitcher consumes the product's I18nService
    // through this token. Same instance — no duplicate state.
    { provide: DOS_LANGUAGE_SWITCHER_I18N, useExisting: I18nService },
    // @dos/access-store — single canonical session/access store for this product.
    provideAccessStore(),
    // L4 nav source — product-owned, registered against the platform-side DI
    // token so the platform WorkspaceNavigationAdapter (in @dos/access-store)
    // can pull product-composition items without importing product code.
    { provide: WORKSPACE_NAV_PRODUCT_SOURCE, useExisting: ProductCompositionNavSource },
    // Product-side nav label resolver — the platform shell uses this to turn
    // Dynamic-UI/module title keys into real locale-aware labels.
    { provide: WORKSPACE_NAV_LABEL_RESOLVER, useExisting: WorkspaceResolverService },
    // Register Carbon icons used by the workspace shell + nav with IconService.
    provideShellIcons(),
    // Cockpit config — enables all workspace-home sections (KPIs, actions,
    // frameworks, activity). Without this, NG0201 fires and all sections hide.
    { provide: COCKPIT_CONFIG, useValue: DEFAULT_COCKPIT_CONFIG },
    // Foundation i18n — workspace-home uses this for all labels.
    // Without it, NoopFoundationI18n returns Arabic fallbacks.
    { provide: FOUNDATION_I18N, useExisting: I18nService },
  ],
};
