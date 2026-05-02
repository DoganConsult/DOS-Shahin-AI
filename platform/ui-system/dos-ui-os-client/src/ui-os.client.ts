import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UI_OS_API_BASE } from './ui-os.config';
import type {
  UiOsBootstrapManifest,
  UiOsPreferences,
  UiOsWorkspaceState,
  UiOsDashboard,
  UiOsDashboardWidget,
  UiOsGridState,
  UiOsSavedView,
  UiOsBranding,
  UiOsLocale,
  UiOsTour,
  UiOsCommand,
  UiOsTranslationMap,
  UiOsAdminDraft,
  UiOsPublishedVersion,
  UiOsWidgetExtInstance,
  UiOsWidgetExtPermission,
  UiOsWidgetExtRoleGrant,
  UiOsWidgetExtBinding,
  UiOsWidgetExtRefreshPolicy,
  UiOsWidgetExtErrorState,
  UiOsWidgetExtVisibilityRule,
  UiOsWidgetExtPersonalization,
  UiOsWidgetExtCategory,
} from './ui-os.types';

/**
 * Canonical Angular HTTP client for the /api/ui-os/* contract.
 *
 * Mirrors §22 of `docs/Use it as the master checklist, but impl` exactly:
 * Bootstrap, Preferences, Workspace, Dashboards, Widgets, Grids,
 * Saved-views, Branding, Theme, i18n, Tours/Help, Commands/Search,
 * Admin publishing. One method per HTTP route — no client-side
 * orchestration. Identity headers are injected by the gateway, never
 * by the SPA.
 */
@Injectable({ providedIn: 'root' })
export class UiOsClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(UI_OS_API_BASE);
  private url(p: string): string { return `${this.base}${p}`; }

  // ── Bootstrap ────────────────────────────────────────────────────
  bootstrap(params?: { productCode?: string; workspaceKey?: string }): Observable<UiOsBootstrapManifest> {
    return this.http.get<UiOsBootstrapManifest>(this.url('/bootstrap'), { params: params ?? {} });
  }
  bootstrapMinimal(params?: { productCode?: string; workspaceKey?: string }): Observable<Partial<UiOsBootstrapManifest>> {
    return this.http.get<Partial<UiOsBootstrapManifest>>(this.url('/bootstrap/minimal'), { params: params ?? {} });
  }
  bootstrapModule(moduleCode: string): Observable<unknown> {
    return this.http.get(this.url(`/bootstrap/module/${encodeURIComponent(moduleCode)}`));
  }
  bootstrapRoute(routeKey: string): Observable<unknown> {
    return this.http.get(this.url(`/bootstrap/route/${encodeURIComponent(routeKey)}`));
  }

  // ── Preferences ──────────────────────────────────────────────────
  getPreferences(): Observable<UiOsPreferences> {
    return this.http.get<UiOsPreferences>(this.url('/preferences'));
  }
  putPreferences(body: Partial<UiOsPreferences>): Observable<UiOsPreferences> {
    return this.http.put<UiOsPreferences>(this.url('/preferences'), body);
  }
  putPreferencesLocale(locale: string): Observable<UiOsPreferences> {
    return this.http.put<UiOsPreferences>(this.url('/preferences/locale'), { locale });
  }
  putPreferencesTheme(appearance: 'system' | 'light' | 'dark'): Observable<UiOsPreferences> {
    return this.http.put<UiOsPreferences>(this.url('/preferences/theme'), { appearance });
  }
  putPreferencesDensity(density: 'compact' | 'comfortable' | 'spacious'): Observable<UiOsPreferences> {
    return this.http.put<UiOsPreferences>(this.url('/preferences/density'), { density });
  }

  // ── Workspace ────────────────────────────────────────────────────
  getWorkspaceState(workspaceKey = 'default'): Observable<UiOsWorkspaceState | null> {
    return this.http.get<UiOsWorkspaceState | null>(this.url('/workspace-state'), { params: { workspaceKey } });
  }
  putWorkspaceState(body: Partial<UiOsWorkspaceState>): Observable<UiOsWorkspaceState> {
    return this.http.put<UiOsWorkspaceState>(this.url('/workspace-state'), body);
  }
  resetWorkspaceState(workspaceKey = 'default'): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(this.url('/workspace-state/reset'), { workspaceKey });
  }
  snapshotWorkspaceState(label?: string): Observable<{ snapshotId: string }> {
    return this.http.post<{ snapshotId: string }>(this.url('/workspace-state/snapshot'), { label });
  }
  restoreWorkspaceState(snapshotId: string): Observable<UiOsWorkspaceState> {
    return this.http.post<UiOsWorkspaceState>(this.url(`/workspace-state/restore/${encodeURIComponent(snapshotId)}`), {});
  }

  // ── Dashboards ───────────────────────────────────────────────────
  listDashboards(): Observable<UiOsDashboard[]> {
    return this.http.get<UiOsDashboard[]>(this.url('/dashboards'));
  }
  getDashboard(dashboardKey: string): Observable<UiOsDashboard & { widgets: UiOsDashboardWidget[] }> {
    return this.http.get<UiOsDashboard & { widgets: UiOsDashboardWidget[] }>(this.url(`/dashboards/${encodeURIComponent(dashboardKey)}`));
  }
  createDashboard(body: Partial<UiOsDashboard>): Observable<UiOsDashboard> {
    return this.http.post<UiOsDashboard>(this.url('/dashboards'), body);
  }
  updateDashboard(dashboardKey: string, body: Partial<UiOsDashboard>): Observable<UiOsDashboard> {
    return this.http.put<UiOsDashboard>(this.url(`/dashboards/${encodeURIComponent(dashboardKey)}`), body);
  }
  updateDashboardLayout(dashboardKey: string, layout: Record<string, unknown>): Observable<UiOsDashboard> {
    return this.http.put<UiOsDashboard>(this.url(`/dashboards/${encodeURIComponent(dashboardKey)}/layout`), { layout });
  }
  deleteDashboard(dashboardKey: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(this.url(`/dashboards/${encodeURIComponent(dashboardKey)}`));
  }

  // ── Widgets ──────────────────────────────────────────────────────
  widgetsCatalog(): Observable<unknown[]> {
    return this.http.get<unknown[]>(this.url('/widgets/catalog'));
  }
  widgetInstances(): Observable<UiOsDashboardWidget[]> {
    return this.http.get<UiOsDashboardWidget[]>(this.url('/widgets/instances'));
  }
  createWidgetInstance(body: Partial<UiOsDashboardWidget>): Observable<UiOsDashboardWidget> {
    return this.http.post<UiOsDashboardWidget>(this.url('/widgets/instances'), body);
  }
  updateWidgetInstance(instanceKey: string, body: Partial<UiOsDashboardWidget>): Observable<UiOsDashboardWidget> {
    return this.http.put<UiOsDashboardWidget>(this.url(`/widgets/instances/${encodeURIComponent(instanceKey)}`), body);
  }
  deleteWidgetInstance(instanceKey: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(this.url(`/widgets/instances/${encodeURIComponent(instanceKey)}`));
  }
  refreshWidgetInstance(instanceKey: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(this.url(`/widgets/instances/${encodeURIComponent(instanceKey)}/refresh`), {});
  }

  // ── Grids ────────────────────────────────────────────────────────
  getGridState(gridKey: string): Observable<UiOsGridState | null> {
    return this.http.get<UiOsGridState | null>(this.url(`/grid-state/${encodeURIComponent(gridKey)}`));
  }
  putGridState(gridKey: string, body: Partial<UiOsGridState>): Observable<UiOsGridState> {
    return this.http.put<UiOsGridState>(this.url(`/grid-state/${encodeURIComponent(gridKey)}`), body);
  }
  resetGridState(gridKey: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(this.url(`/grid-state/${encodeURIComponent(gridKey)}/reset`), {});
  }
  listGridViews(gridKey: string): Observable<UiOsSavedView[]> {
    return this.http.get<UiOsSavedView[]>(this.url(`/grid-views/${encodeURIComponent(gridKey)}`));
  }
  createGridView(gridKey: string, body: Partial<UiOsSavedView>): Observable<UiOsSavedView> {
    return this.http.post<UiOsSavedView>(this.url(`/grid-views/${encodeURIComponent(gridKey)}`), body);
  }

  // ── Saved views / filters ────────────────────────────────────────
  listSavedViews(): Observable<UiOsSavedView[]> {
    return this.http.get<UiOsSavedView[]>(this.url('/saved-views'));
  }
  createSavedView(body: Partial<UiOsSavedView>): Observable<UiOsSavedView> {
    return this.http.post<UiOsSavedView>(this.url('/saved-views'), body);
  }
  updateSavedView(viewId: string, body: Partial<UiOsSavedView>): Observable<UiOsSavedView> {
    return this.http.put<UiOsSavedView>(this.url(`/saved-views/${encodeURIComponent(viewId)}`), body);
  }
  deleteSavedView(viewId: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(this.url(`/saved-views/${encodeURIComponent(viewId)}`));
  }

  // ── Branding / theme ─────────────────────────────────────────────
  getBranding(): Observable<UiOsBranding | null> {
    return this.http.get<UiOsBranding | null>(this.url('/branding'));
  }
  putBranding(body: Partial<UiOsBranding>): Observable<UiOsBranding> {
    return this.http.put<UiOsBranding>(this.url('/branding'), body);
  }
  getTheme(): Observable<{ tokens: Record<string, string> }> {
    return this.http.get<{ tokens: Record<string, string> }>(this.url('/theme'));
  }
  putTheme(body: { tokens: Record<string, string> }): Observable<{ tokens: Record<string, string> }> {
    return this.http.put<{ tokens: Record<string, string> }>(this.url('/theme'), body);
  }
  previewTheme(body: { tokens: Record<string, string> }): Observable<{ previewId: string }> {
    return this.http.post<{ previewId: string }>(this.url('/theme/preview'), body);
  }
  publishTheme(body: { previewId?: string; tokens?: Record<string, string> }): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(this.url('/theme/publish'), body);
  }

  // ── i18n ─────────────────────────────────────────────────────────
  listLocales(): Observable<UiOsLocale[]> {
    return this.http.get<UiOsLocale[]>(this.url('/locales'));
  }
  getTranslations(locale: string): Observable<UiOsTranslationMap> {
    return this.http.get<UiOsTranslationMap>(this.url(`/translations/${encodeURIComponent(locale)}`));
  }
  putTranslations(locale: string, body: UiOsTranslationMap): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(this.url(`/translations/${encodeURIComponent(locale)}`), body);
  }
  importTranslations(body: { locale: string; entries: UiOsTranslationMap }): Observable<{ ok: boolean; count: number }> {
    return this.http.post<{ ok: boolean; count: number }>(this.url('/translations/import'), body);
  }
  exportTranslations(locale: string): Observable<UiOsTranslationMap> {
    return this.http.get<UiOsTranslationMap>(this.url(`/translations/export/${encodeURIComponent(locale)}`));
  }

  // ── Tours / help ─────────────────────────────────────────────────
  listTours(): Observable<UiOsTour[]> {
    return this.http.get<UiOsTour[]>(this.url('/tours'));
  }
  getTour(tourKey: string): Observable<UiOsTour> {
    return this.http.get<UiOsTour>(this.url(`/tours/${encodeURIComponent(tourKey)}`));
  }
  completeTour(tourKey: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(this.url(`/tours/${encodeURIComponent(tourKey)}/complete`), {});
  }
  skipTour(tourKey: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(this.url(`/tours/${encodeURIComponent(tourKey)}/skip`), {});
  }
  contextualHelp(params?: { route?: string; module?: string }): Observable<unknown[]> {
    return this.http.get<unknown[]>(this.url('/help/contextual'), { params: params ?? {} });
  }

  // ── Command / search ─────────────────────────────────────────────
  listCommands(): Observable<UiOsCommand[]> {
    return this.http.get<UiOsCommand[]>(this.url('/commands'));
  }
  executeCommand(commandKey: string, payload?: Record<string, unknown>): Observable<unknown> {
    return this.http.post(this.url(`/commands/${encodeURIComponent(commandKey)}/execute`), payload ?? {});
  }
  search(q: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(this.url('/search'), { params: { q } });
  }
  searchSuggestions(q: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(this.url('/search/suggestions'), { params: { q } });
  }
  saveSearch(body: { name: string; query: string }): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.url('/search/saved'), body);
  }

  // ── Admin publishing ─────────────────────────────────────────────
  listAdminDrafts(targetType?: string): Observable<{ drafts: UiOsAdminDraft[] }> {
    return this.http.get<{ drafts: UiOsAdminDraft[] }>(this.url('/admin/drafts'), { params: targetType ? { targetType } : {} });
  }
  createAdminDraft(body: Partial<UiOsAdminDraft>): Observable<UiOsAdminDraft> {
    return this.http.post<UiOsAdminDraft>(this.url('/admin/drafts'), body);
  }
  updateAdminDraft(draftId: string, body: Partial<UiOsAdminDraft>): Observable<UiOsAdminDraft> {
    return this.http.put<UiOsAdminDraft>(this.url(`/admin/drafts/${encodeURIComponent(draftId)}`), body);
  }
  validateAdminDraft(draftId: string): Observable<{ ok: boolean; errors: string[] }> {
    return this.http.post<{ ok: boolean; errors: string[] }>(this.url(`/admin/drafts/${encodeURIComponent(draftId)}/validate`), {});
  }
  submitAdminDraft(draftId: string): Observable<UiOsAdminDraft> {
    return this.http.post<UiOsAdminDraft>(this.url(`/admin/drafts/${encodeURIComponent(draftId)}/submit`), {});
  }
  publishAdminDraft(draftId: string): Observable<UiOsPublishedVersion> {
    return this.http.post<UiOsPublishedVersion>(this.url(`/admin/publish/${encodeURIComponent(draftId)}`), {});
  }
  rollbackPublishedVersion(versionId: string, reason?: string): Observable<UiOsPublishedVersion> {
    return this.http.post<UiOsPublishedVersion>(this.url(`/admin/rollback/${encodeURIComponent(versionId)}`), { reason });
  }

  // ── Wave 11a-§5 Widgets — extended (per-tenant catalog instances) ──
  listWidgetExtInstances(params?: { dashboardId?: string; pageLayoutId?: string }): Observable<{ instances: UiOsWidgetExtInstance[] }> {
    return this.http.get<{ instances: UiOsWidgetExtInstance[] }>(this.url('/widgets/instances-ext'), { params: params ?? {} });
  }
  getWidgetExtInstance(instanceKey: string): Observable<UiOsWidgetExtInstance> {
    return this.http.get<UiOsWidgetExtInstance>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceKey)}`));
  }
  createWidgetExtInstance(body: Partial<UiOsWidgetExtInstance> & { instance_key: string; widget_catalog_id: string }): Observable<UiOsWidgetExtInstance> {
    return this.http.post<UiOsWidgetExtInstance>(this.url('/widgets/instances-ext'), body);
  }
  updateWidgetExtInstance(instanceKey: string, body: Partial<UiOsWidgetExtInstance>): Observable<UiOsWidgetExtInstance> {
    return this.http.put<UiOsWidgetExtInstance>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceKey)}`), body);
  }
  deleteWidgetExtInstance(instanceKey: string): Observable<void> {
    return this.http.delete<void>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceKey)}`));
  }

  listWidgetExtPermissions(instanceId: string): Observable<{ permissions: UiOsWidgetExtPermission[] }> {
    return this.http.get<{ permissions: UiOsWidgetExtPermission[] }>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/permissions`));
  }
  upsertWidgetExtPermission(instanceId: string, body: Partial<UiOsWidgetExtPermission> & { permission_code: string; effect: 'allow' | 'deny' }): Observable<UiOsWidgetExtPermission> {
    return this.http.post<UiOsWidgetExtPermission>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/permissions`), body);
  }
  deleteWidgetExtPermission(instanceId: string, permissionId: string): Observable<void> {
    return this.http.delete<void>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/permissions/${encodeURIComponent(permissionId)}`));
  }

  listWidgetExtRoles(instanceId: string): Observable<{ roles: UiOsWidgetExtRoleGrant[] }> {
    return this.http.get<{ roles: UiOsWidgetExtRoleGrant[] }>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/roles`));
  }
  grantWidgetExtRole(instanceId: string, roleCode: string): Observable<UiOsWidgetExtRoleGrant> {
    return this.http.post<UiOsWidgetExtRoleGrant>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/roles`), { role_code: roleCode });
  }
  revokeWidgetExtRole(instanceId: string, roleCode: string): Observable<void> {
    return this.http.delete<void>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/roles/${encodeURIComponent(roleCode)}`));
  }

  getWidgetExtBinding(instanceId: string): Observable<UiOsWidgetExtBinding | null> {
    return this.http.get<UiOsWidgetExtBinding | null>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/binding`));
  }
  putWidgetExtBinding(instanceId: string, body: Partial<UiOsWidgetExtBinding> & { binding_kind: UiOsWidgetExtBinding['binding_kind'] }): Observable<UiOsWidgetExtBinding> {
    return this.http.put<UiOsWidgetExtBinding>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/binding`), body);
  }

  getWidgetExtRefreshPolicy(instanceId: string): Observable<UiOsWidgetExtRefreshPolicy | null> {
    return this.http.get<UiOsWidgetExtRefreshPolicy | null>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/refresh`));
  }
  putWidgetExtRefreshPolicy(instanceId: string, body: Partial<UiOsWidgetExtRefreshPolicy>): Observable<UiOsWidgetExtRefreshPolicy> {
    return this.http.put<UiOsWidgetExtRefreshPolicy>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/refresh`), body);
  }

  listWidgetExtErrorStates(instanceId: string): Observable<{ errors: UiOsWidgetExtErrorState[] }> {
    return this.http.get<{ errors: UiOsWidgetExtErrorState[] }>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/errors`));
  }
  upsertWidgetExtErrorState(instanceId: string, body: Partial<UiOsWidgetExtErrorState> & { error_code: string }): Observable<UiOsWidgetExtErrorState> {
    return this.http.put<UiOsWidgetExtErrorState>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/errors`), body);
  }

  listWidgetExtVisibilityRules(instanceId: string): Observable<{ rules: UiOsWidgetExtVisibilityRule[] }> {
    return this.http.get<{ rules: UiOsWidgetExtVisibilityRule[] }>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/visibility`));
  }
  createWidgetExtVisibilityRule(instanceId: string, body: Partial<UiOsWidgetExtVisibilityRule> & { rule_kind: UiOsWidgetExtVisibilityRule['rule_kind'] }): Observable<UiOsWidgetExtVisibilityRule> {
    return this.http.post<UiOsWidgetExtVisibilityRule>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/visibility`), body);
  }
  deleteWidgetExtVisibilityRule(instanceId: string, ruleId: string): Observable<void> {
    return this.http.delete<void>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/visibility/${encodeURIComponent(ruleId)}`));
  }

  getWidgetExtPersonalization(instanceId: string): Observable<UiOsWidgetExtPersonalization | null> {
    return this.http.get<UiOsWidgetExtPersonalization | null>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/personalization`));
  }
  putWidgetExtPersonalization(instanceId: string, body: Partial<UiOsWidgetExtPersonalization>): Observable<UiOsWidgetExtPersonalization> {
    return this.http.put<UiOsWidgetExtPersonalization>(this.url(`/widgets/instances-ext/${encodeURIComponent(instanceId)}/personalization`), body);
  }

  listWidgetExtCategories(): Observable<{ categories: UiOsWidgetExtCategory[] }> {
    return this.http.get<{ categories: UiOsWidgetExtCategory[] }>(this.url('/widgets/categories'));
  }
  upsertWidgetExtCategory(body: Partial<UiOsWidgetExtCategory> & { category_code: string }): Observable<UiOsWidgetExtCategory> {
    return this.http.put<UiOsWidgetExtCategory>(this.url('/widgets/categories'), body);
  }
  deleteWidgetExtCategory(categoryCode: string): Observable<void> {
    return this.http.delete<void>(this.url(`/widgets/categories/${encodeURIComponent(categoryCode)}`));
  }
}
