/**
 * Part C / G4 — DynamicPageExperienceResolver.
 *
 * Reads the per-page Page Experience contract published by Dynamic UI
 * (dynamic_ui_routes columns: page_type, layout, kpi_scope, user_intent,
 *  audience_profiles, data_scope_mode, realtime_channels, evidence_required,
 *  signature_widget, mobile_variant, empty/error/help keys) and gates the
 *  result by the user's profile (UserContextResolver). Backend RLS remains
 *  authoritative; SPA scope is a hint only.
 */
import { Injectable, computed, inject } from '@angular/core';
import { DynamicUiBootstrapService, DynamicUiRouteItem } from './dynamic-ui-bootstrap.service';
import { UserContextResolver, ProfileType } from '../../../../core/services/platform/user-context.resolver';

/** Known page types — matches ck_dynamic_ui_routes_page_type CHECK constraint. Accepts any string for forward compat. */
export type PageType = 'overview' | 'list' | 'object' | 'workflow' | 'analytics' | 'audit' | 'settings' | (string & {});
export type PageLayout = 'dashboard' | 'full-page' | 'split-view' | 'object-page' | 'wizard' | 'report';
export type KpiScope = 'module-overview' | 'page-local' | 'none';
export type DataScopeMode = 'tenant' | 'org_scope' | 'department_scope' | 'self' | 'global';

export interface DynamicPageExperience {
  route: string;
  pageType: PageType;
  layout: PageLayout;
  kpiScope: KpiScope;
  userIntent?: string;
  signatureWidget: string | null;
  audienceProfiles: ProfileType[];
  dataScopeMode: DataScopeMode;
  realtimeChannels: string[];
  evidenceRequired: boolean;
  mobileEnabled: boolean;
  emptyStateKey?: string;
  errorStateKey?: string;
  helpKey?: string;
  visibleForCurrentUser: boolean;
}

interface ExperienceRow extends DynamicUiRouteItem {
  page_type?: string | null;
  layout?: string | null;
  kpi_scope?: string | null;
  user_intent?: string | null;
  signature_widget?: string | null;
  audience_profiles?: string[] | null;
  data_scope_mode?: string | null;
  realtime_channels?: string[] | null;
  evidence_required?: boolean | null;
  mobile_variant?: { enabled?: boolean } | null;
  empty_state_key?: string | null;
  error_state_key?: string | null;
  help_key?: string | null;
}

@Injectable({ providedIn: 'root' })
export class DynamicPageExperienceResolver {
  private dynamic = inject(DynamicUiBootstrapService);
  private user = inject(UserContextResolver);

  readonly experiences = computed<Map<string, DynamicPageExperience>>(() => {
    const ctx = this.user.context();
    const rows = (this.dynamic.visibleRoutes() ?? []) as ExperienceRow[];
    const map = new Map<string, DynamicPageExperience>();
    for (const r of rows) {
      const audience = (r.audience_profiles ?? []) as ProfileType[];
      const visible = !ctx ? true : audience.length === 0 || audience.includes(ctx.profileType);
      map.set(r.path_pattern, {
        route: r.path_pattern,
        pageType: (r.page_type as PageType) ?? 'list',
        layout: (r.layout as PageLayout) ?? 'full-page',
        kpiScope: (r.kpi_scope as KpiScope) ?? 'none',
        userIntent: r.user_intent ?? undefined,
        signatureWidget: r.signature_widget ?? null,
        audienceProfiles: audience,
        dataScopeMode: (r.data_scope_mode as DataScopeMode) ?? 'tenant',
        realtimeChannels: r.realtime_channels ?? [],
        evidenceRequired: !!r.evidence_required,
        mobileEnabled: r.mobile_variant?.enabled ?? true,
        emptyStateKey: r.empty_state_key ?? undefined,
        errorStateKey: r.error_state_key ?? undefined,
        helpKey: r.help_key ?? undefined,
        visibleForCurrentUser: visible,
      });
    }
    return map;
  });

  forRoute(route: string): DynamicPageExperience | null {
    return this.experiences().get(route) ?? null;
  }
}
