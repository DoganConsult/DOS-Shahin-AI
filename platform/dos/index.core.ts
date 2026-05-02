export { StorageService } from './shell/storage.service';
export { ThemeService } from '../runtime/infrastructure/theme/theme.service';
export { I18nService } from '../core/services/ui-infra/i18n.service';
export { ToastService } from './shell/toast.service';
export { ConnectivityService } from './shell/connectivity.service';
export { NavigationItemsService } from './navigation/navigation-items.service';
export { PlatformApiService } from '../admin/platform-api.service';
export { PlatformBootstrapService } from '../core/services/platform/platform-bootstrap.service';
export { PlatformModeService } from './shell/platform-mode.service';
export { SiteContextService } from './workspace/site-context.service';
export { AppBootstrapService } from '../core/services/platform/app-bootstrap.service';
export { SequencingEngineService } from './lifecycle/sequencing-engine.service';
export { ScopeFilterService } from './workspace/scope-filter.service';

// ── Sub-barrel re-exports ──
export { EventBusService } from './events/event-bus.service';
export type { PlatformEventContract, EventCategory } from './events/event.contracts';
export { PlatformSettingsService } from './settings/settings.service';
export type { PlatformSettingContract } from './settings/settings.contracts';
export { ObservabilityService } from './observability/observability.service';
export type { HealthCheckContract, PlatformMetricContract } from './observability/observability.contracts';
export { DynamicRegistryService, DynamicUiConfig, DynamicModuleEntry, DynamicPageEntry, DynamicActionEntry, DynamicDashboardEntry } from './modules/dynamic-registry.service';
