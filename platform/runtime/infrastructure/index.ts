/**
 * Infrastructure Barrel — canonical exports for cross-cutting platform primitives.
 *
 * Sprint 3 / Law 9: These services were migrated from the monolithic core/services/.
 * Re-export shims at the old paths ensure zero call-site breakage until Sprint 5.
 *
 * @owner Platform
 */

// ── i18n ──
export { I18nService } from './i18n/i18n.service';

// ── Storage ──
export { StorageService } from './storage/storage.service';

// ── Error handling ──
export { GlobalErrorHandler } from './error/global-error-handler.service';

// ── Theme ──
export { ThemeService } from './theme/theme.service';

// ── Toast ──
export { ToastService } from './toast/toast.service';

// ── Idle timeout ──
export { IdleTimeoutService } from './idle/idle-timeout.service';

// ── Sanitizer ──
export { HtmlSanitizerService } from './sanitizer/html-sanitizer.service';

// ── Scope filter ──
export { ScopeFilterService } from './scope/scope-filter.service';

// ── Connectivity ──
export { ConnectivityService } from './connectivity/connectivity.service';

// ── Entity utilities ──
export { EntityUrlBuilderService } from './entity/entity-url-builder.service';
export { SeverityService } from './entity/severity.service';
export { SiteContextService } from './entity/site-context.service';
