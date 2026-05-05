// W9.D9.1 — Dynamic UI bootstrap service. Pulls the Foundation contract bundle
// from dynamic-ui-service in a single round-trip and exposes signals for the
// SPA to consume during navigation/route resolution.
//
// W9.D9.5 — STUB / BLOCKED routes are filtered out of the visible nav so the
// sidebar never advertises pages that are not production-ready.

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { COMPONENT_MAP } from '../../../../dos/registry/component-map';
import { notifyRenderMiss } from '../telemetry/render-miss.sink';
// COMPONENT_MAP is also referenced in loadAllEnrolled() for route filtering.
import {
  buildFoundationNavChildren,
  type DynamicFoundationNavRow,
} from '../../../../core/platform/navigation/navigation.config';
import {
  buildEffectivePageRegistry,
  type DynamicFoundationRouteRow,
  type PageRegistryEntry,
} from '../../../../registries/page.registry';
import type { NavItem } from '../../../../core/platform/navigation/navigation.models';

export interface DynamicUiNavItem {
  module_code: string;
  label: string;
  route: string;
  sort_order: number;
  parent_id?: string | null;
  readiness?: string | null;
}

export interface DynamicUiRouteItem {
  module_code: string;
  path_pattern: string;
  component_key: string;
  permission_key?: string | null;
  nba_enabled?: boolean | null;
  sort_order: number;
  readiness?: string | null;
}

export interface DynamicUiModuleRecord {
  module_code: string;
  display_name?: string;
  status?: string;
  [k: string]: unknown;
}

export interface DynamicUiActionItem {
  module_code: string;
  route: string;
  action_id: string;
  position: string;
  label_key: string;
  icon?: string | null;
  permission: string;
  profiles?: string[] | null;
  risk_level: string;
  requires_approval: boolean;
  workflow_code?: string | null;
  evidence_required: boolean;
  handler_key: string;
  sort_order: number;
}

export interface DynamicUiWidgetItem {
  module_code: string;
  route: string;
  widget_key: string;
  zone: string;
  permission?: string | null;
  profiles?: string[] | null;
  config?: Record<string, unknown> | null;
  sort_order: number;
  is_signature: boolean;
}

export interface DynamicUiAgentActionItem {
  module_code: string;
  route: string;
  agent_id: string;
  action_id: string;
  label_key: string;
  permission: string;
  level: string;
  risk_level: string;
  requires_approval: boolean;
  workflow_code?: string | null;
  evidence_required: boolean;
  prompt_template_ref?: string | null;
}

export interface DynamicUiContractBundle {
  tenant_id: string | null;
  module: DynamicUiModuleRecord;
  navigation: DynamicUiNavItem[];
  routes: DynamicUiRouteItem[];
  actions?: DynamicUiActionItem[];
  widgets?: DynamicUiWidgetItem[];
  agent_actions?: DynamicUiAgentActionItem[];
  shell: unknown;
  generated_at: string;
}

const HIDDEN_READINESS = new Set(['STUB', 'BLOCKED']);

@Injectable({ providedIn: 'root' })
export class DynamicUiBootstrapService {
  private http = inject(HttpClient);

  private _foundation = signal<DynamicUiContractBundle | null>(null);
  private _loadError = signal<string | null>(null);
  private _loaded = signal(false);

  readonly foundation = this._foundation.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly loadError = this._loadError.asReadonly();

  // W9.D9.5 — readiness now arrives per-row from dynamic-ui-service after the
  // 005_dynamic_ui_readiness migration; STUB/BLOCKED entries are filtered here
  // so the SPA never advertises non-production routes in nav or registry.
  readonly visibleNavigation = computed(() => {
    const b = this._foundation();
    if (!b) return [] as DynamicUiNavItem[];
    return [...b.navigation]
      .filter(n => !HIDDEN_READINESS.has(String(n.readiness ?? '').toUpperCase()))
      .sort((a, b) => a.sort_order - b.sort_order);
  });

  readonly visibleRoutes = computed(() => {
    const b = this._foundation();
    if (!b) return [] as DynamicUiRouteItem[];
    return b.routes
      .filter(r => !HIDDEN_READINESS.has(String(r.readiness ?? '').toUpperCase()))
      .filter(r => {
        if (COMPONENT_MAP[r.component_key]) return true;
        // Fix 7 (Phase 18) — Render-miss is now ENFORCE by default in dev/stage.
        // notifyRenderMiss honours window.DOS_DYNAMIC_UI_STRICT to throw.
        notifyRenderMiss({
          topic: 'ui.route.dropped', reason: 'missing_component_map',
          module: r.module_code, route: r.path_pattern, component_key: r.component_key,
        });
        return false;
      });
  });

  readonly actions = computed<DynamicUiActionItem[]>(() => this._foundation()?.actions ?? []);
  readonly widgets = computed<DynamicUiWidgetItem[]>(() => this._foundation()?.widgets ?? []);
  readonly agentActions = computed<DynamicUiAgentActionItem[]>(() => this._foundation()?.agent_actions ?? []);

  actionsForRoute(route: string): DynamicUiActionItem[] {
    return this.actions().filter(a => a.route === route);
  }

  widgetsForRoute(route: string): DynamicUiWidgetItem[] {
    return this.widgets().filter(w => w.route === route);
  }

  agentActionsForRoute(route: string): DynamicUiAgentActionItem[] {
    return this.agentActions().filter(a => a.route === route);
  }

  // W9.D9.2 — Foundation nav children resolved from live dynamic-ui rows when
  // available, falling back to the static SPA list. Consumers (sidebar,
  // navigation derivation service, command palette) can read this signal to
  // get a readiness-filtered, sort_order-aware list.
  readonly foundationNavChildren = computed<NavItem[]>(() =>
    buildFoundationNavChildren(this.visibleNavigation() as DynamicFoundationNavRow[]),
  );

  // W9.D9.3 — full page registry composed by replacing the foundation slice
  // with the dynamic-ui route catalog. Consumers can read this signal and
  // re-derive page lookups (PAGE_BY_ROUTE/PAGE_BY_CODE) per change tick.
  readonly effectivePageRegistry = computed<PageRegistryEntry[]>(() =>
    buildEffectivePageRegistry(this.visibleRoutes() as DynamicFoundationRouteRow[]),
  );

  async loadFoundation(): Promise<void> {
    try {
      const url = '/api/dynamic-ui/contract/foundation';
      const res = await firstValueFrom(this.http.get<DynamicUiContractBundle>(url));
      this._foundation.set(res ?? null);
      this._loaded.set(true);
      this._loadError.set(null);
    } catch (e: any) {
      this._loadError.set(e?.message ?? String(e));
      this._loaded.set(true);
    }
  }

  // ── Wave 1B — multi-module bootstrap ────────────────────────────────
  // Holds the merged contract bundles for every module the tenant is
  // enrolled in. The `foundation` signal above remains the single-module
  // legacy path; new code should read `byModule()` or `allModules()`.
  private _byModule = signal<Record<string, DynamicUiContractBundle>>({});
  readonly byModule = this._byModule.asReadonly();

  /** Sorted list of `module_code`s the SPA has loaded contracts for. */
  readonly enrolledModuleCodes = computed<string[]>(() =>
    Object.keys(this._byModule()).sort(),
  );

  /** Cross-module navigation rows (sort_order respected per module). */
  readonly allNavigation = computed<DynamicUiNavItem[]>(() => {
    const out: DynamicUiNavItem[] = [];
    for (const bundle of Object.values(this._byModule())) {
      for (const n of bundle.navigation) {
        if (HIDDEN_READINESS.has(String(n.readiness ?? '').toUpperCase())) continue;
        out.push(n);
      }
    }
    return out.sort((a, b) => a.sort_order - b.sort_order);
  });

  /** Cross-module route catalog. */
  readonly allRoutes = computed<DynamicUiRouteItem[]>(() => {
    const out: DynamicUiRouteItem[] = [];
    for (const bundle of Object.values(this._byModule())) {
      for (const r of bundle.routes) {
        if (HIDDEN_READINESS.has(String(r.readiness ?? '').toUpperCase())) continue;
        if (!COMPONENT_MAP[r.component_key]) {
          notifyRenderMiss({
            topic: 'ui.route.dropped', reason: 'missing_component_map',
            module: r.module_code, route: r.path_pattern, component_key: r.component_key,
          });
          continue;
        }
        out.push(r);
      }
    }
    return out;
  });

  /**
   * Fetch /api/dynamic-ui/modules, then in parallel fetch every enrolled
   * module's /contract/<code> bundle and merge them into `byModule`.
   * Uses a permissive Promise.allSettled so a single failed contract
   * doesn't break the whole bootstrap.
   */
  async loadAllEnrolled(): Promise<{ loaded: string[]; failed: string[] }> {
    const loaded: string[] = [];
    const failed: string[] = [];
    try {
      const modulesUrl = '/api/dynamic-ui/modules';
      const modulesRes = await firstValueFrom(
        this.http.get<{ modules: DynamicUiModuleRecord[] } | DynamicUiModuleRecord[]>(modulesUrl),
      );
      const list: DynamicUiModuleRecord[] = Array.isArray(modulesRes)
        ? modulesRes
        : (modulesRes?.modules ?? []);
      const codes = list
        .map((m) => (typeof m === 'string' ? m : m.module_code))
        .filter((c): c is string => !!c);

      const results = await Promise.allSettled(
        codes.map(async (code) => {
          const url = `/api/dynamic-ui/contract/${encodeURIComponent(code)}`;
          const bundle = await firstValueFrom(this.http.get<DynamicUiContractBundle>(url));
          return { code, bundle };
        }),
      );

      const merged = { ...this._byModule() };
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.bundle) {
          merged[r.value.code] = r.value.bundle;
          loaded.push(r.value.code);
          // Legacy single-module signal: sync with the first successfully
          // loaded module so code using `this.foundation()` keeps working.
          if (!this._foundation()) {
            this._foundation.set(r.value.bundle);
          }
        } else if (r.status === 'rejected') {
          // pull code out of the rejection if possible
          // (codes[idx] mapping isn't directly exposed; we know `codes` order matches results)
          failed.push('?');
        }
      }
      // Recover failed codes by index alignment
      results.forEach((r, idx) => {
        if (r.status === 'rejected') {
          const code = codes[idx];
          if (code) failed[failed.indexOf('?')] = code;
        }
      });

      this._byModule.set(merged);
      this._loaded.set(true);
      this._loadError.set(failed.length ? `failed: ${failed.join(', ')}` : null);
    } catch (e: any) {
      this._loadError.set(e?.message ?? String(e));
      this._loaded.set(true);
    }
    return { loaded, failed };
  }
}
