/**
 * Platform App — Application Config.
 *
 * This is the single SPA entry point for all DOS products.
 * Product differentiation is DB-driven (product_key, modules, branding).
 *
 * COMPLIANCE NOTE: Zero hardcoded fallback configs. Every config value
 * must flow from the Dynamic UI OS pipeline (DB → API → FE). If DB data
 * is missing, components must show honest empty states — never fake content.
 */
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { correlationIdInterceptor } from '@platform/shell/correlation-id.interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DOS_LANGUAGE_SWITCHER_I18N } from '@dos/ui-system';
import { provideAccessStore } from '@dos/access-store';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { provideShellIcons } from './shell/icon-registration';
import { FOUNDATION_I18N } from '@foundation-module/ui/ports/i18n.port';
import { routes } from './app.routes';

// DELETED: WorkspaceResolverService — was a passthrough stub (resolve(key) { return key }).
//          ShellHostComponent.labelResolver is inject(..., { optional: true }) — handles null.
// DELETED: ProductCompositionNavSource — had getNavItems() not resolve(), causing runtime crash.
// DELETED: COCKPIT_CONFIG / DEFAULT_COCKPIT_CONFIG — hardcoded section flags (executiveSnapshot,
//          actionCenter, etc.) that mislead auditors. Must be DB-driven per-tenant.
// DELETED: WORKSPACE_NAV_LABEL_RESOLVER — stub did nothing. Labels are DB-driven via i18n catalog.

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
    // Register Carbon icons used by the workspace shell + nav with IconService.
    provideShellIcons(),
    // Foundation i18n — workspace-home uses this for all labels.
    { provide: FOUNDATION_I18N, useExisting: I18nService },
  ],
};
