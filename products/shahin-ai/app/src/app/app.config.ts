import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DOS_LANGUAGE_SWITCHER_I18N } from '@dos/ui-system';
import { provideAccessStore, WORKSPACE_NAV_PRODUCT_SOURCE } from '@dos/access-store';
import { provideUiOsClient, provideUiOsComponentAllowlists } from '@dos/ui-os-client';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { provideShellIcons } from './shell/icon-registration';
import { ProductCompositionNavSource } from './shell/nav-sources/product-composition-nav.source';
import { COCKPIT_CONFIG, type CockpitConfigContract } from '@app/dos/contracts/cockpit-config.contract';
import { FOUNDATION_I18N } from '@foundation-module/ui/ports/i18n.port';
import { routes } from './app.routes';

/** Default cockpit config — enables all workspace sections for every role. */
const DEFAULT_COCKPIT_CONFIG: CockpitConfigContract = {
  getRoleSections: () => ({}),
  getRoleAliases: () => ({}),
  getKpiModuleMap: () => [
    { kpiId: 'complianceScore', requiredModule: 'compliance' },
    { kpiId: 'highRisks', requiredModule: 'risk' },
    { kpiId: 'vendorHealth', requiredModule: 'vendor' },
    { kpiId: 'overdueActions', requiredModule: 'governance' },
    { kpiId: 'openFindings', requiredModule: 'audit' },
    { kpiId: 'controlsCoverage', requiredModule: 'compliance' },
    { kpiId: 'auditReadiness', requiredModule: 'audit' },
  ],
  getDefaultRoleSection: () => ({
    executiveSnapshot: true,
    actionCenter: true,
    programHealth: true,
    analytics: true,
    activity: true,
    nextSteps: true,
    widgetPriority: ['complianceScore', 'highRisks', 'vendorHealth', 'overdueActions', 'openFindings', 'controlsCoverage', 'auditReadiness'],
  }),
  getIgniteModuleOrder: () => ['foundation', 'compliance', 'risk', 'governance', 'audit', 'evidence'],
  getIgniteModuleMeta: () => ({
    foundation:  { labelEn: 'Foundation',  labelAr: 'الأساسيات',  icon: 'enterprise', route: '/foundation' },
    compliance:  { labelEn: 'Compliance',  labelAr: 'الامتثال',    icon: 'security',   route: '/compliance' },
    risk:        { labelEn: 'Risk',        labelAr: 'المخاطر',     icon: 'warning',    route: '/risk' },
    governance:  { labelEn: 'Governance',  labelAr: 'الحوكمة',     icon: 'enterprise', route: '/governance' },
    audit:       { labelEn: 'Audit',       labelAr: 'التدقيق',     icon: 'search',     route: '/audit' },
    evidence:    { labelEn: 'Evidence',    labelAr: 'الأدلة',      icon: 'folder',     route: '/evidence' },
  }),
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(),
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
    // @dos/ui-os-client — canonical /api/ui-os/* HTTP client + 9 component
    // allowlists (Wave 10d). Maps stay empty until Shahin registers its
    // page/widget/form-field/action/chart/grid-cell/empty-state/tour-step/
    // ai-panel components — admin draft validation will refuse unknown
    // tokens at publish time.
    provideUiOsClient(),
    provideUiOsComponentAllowlists({}),
    // Register Carbon icons used by the workspace shell + nav with IconService.
    // Without this `<svg ibmIcon="…">` renders empty + console errors.
    provideShellIcons(),
    // Cockpit config — enables all workspace-home sections (KPIs, actions,
    // frameworks, activity). Without this, NG0201 fires and all sections hide.
    { provide: COCKPIT_CONFIG, useValue: DEFAULT_COCKPIT_CONFIG },
    // Foundation i18n — workspace-home uses this for all labels.
    // Without it, NoopFoundationI18n returns Arabic fallbacks.
    { provide: FOUNDATION_I18N, useExisting: I18nService },
  ],
};
