/**
 * WorkspaceSurfaceDataService — Wave 2 (FE composition layer).
 *
 * Reads the seven workspace content catalogs from ui-os-service via
 *   GET /api/ui-os/workspace-surface/*
 * and exposes them as Angular signals so `WorkspaceResolverService`
 * (and any future composer) can consume DB-driven content without
 * embedding the rows or the HTTP plumbing.
 *
 * Fallback policy (idempotent + safe-degrade):
 *   - On HTTP failure OR an empty response, the bundled JSON fallback
 *     under ./fallbacks/* wins. The signals are NEVER empty after a
 *     `loadAll()` call.
 *   - The fallback files mirror the seed migration shipped under
 *     platform/dos/migrations/public/20260505_0810_workspace_surface_seed.sql
 *     so disabling the DB rows reproduces the pre-DB experience exactly.
 *
 * Tenant context: forwarded via `x-dos-tenant-id` (read from AccessStore
 * by the resolver, then pushed down through `loadAll(tenantId)`).
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import setupStepsFb     from './fallbacks/workspace-setup-steps.json';
import quickActionsFb   from './fallbacks/workspace-quick-actions.json';
import aiTipsFb         from './fallbacks/workspace-ai-tips.json';
import healthProbesFb   from './fallbacks/workspace-health-probes.json';
import pageHeadersFb    from './fallbacks/workspace-page-headers.json';
import gridColumnsFb    from './fallbacks/workspace-grid-columns.json';
import emptyStatesFb    from './fallbacks/workspace-empty-states.json';

export interface WsSetupStep {
  step_key: string;
  label_key: string;
  description_key: string | null;
  icon: string | null;
  route: string;
  required_permission: string | null;
  sort_order: number;
  condition_kind: string;
  condition_payload?: unknown;
}

export interface WsQuickAction {
  action_key: string;
  surface_key: string;
  eyebrow_key: string | null;
  label_key: string;
  description_key: string | null;
  icon: string | null;
  route: string;
  required_permission: string | null;
  sort_order: number;
  variant: 'solid' | 'gradient' | 'minimal';
  tone: string;
}

export interface WsAiTip {
  tip_key: string;
  title_key: string;
  body_key: string;
  cta_label_key: string | null;
  cta_route: string | null;
  icon: string | null;
  condition_kind: string;
  condition_payload?: unknown;
  priority: number;
  required_permission: string | null;
}

export interface WsHealthProbe {
  probe_key: string;
  label_key: string;
  description_key: string | null;
  source_endpoint: string | null;
  source_kind: 'http_status' | 'count' | 'signal' | 'derived';
  ok_threshold?: unknown;
  required_permission: string;
  sort_order: number;
}

export interface WsPageHeader {
  route_key: string;
  variant: string;
  density: string;
  eyebrow_key: string | null;
  title_key: string;
  subtitle_key: string | null;
  gradient_token: string;
  mesh_layers: string[];
  hairline_visible: boolean;
  hairline_token: string;
}

export interface WsGridColumn {
  col_key: string;
  scope: string;
  label_key: string;
  data_field: string;
  data_kind: 'text' | 'number' | 'date' | 'status_pill' | 'badge' | 'link' | 'icon' | 'code' | 'custom';
  format_payload?: Record<string, unknown>;
  is_sortable: boolean;
  is_filterable: boolean;
  default_sort: 'asc' | 'desc' | null;
  sort_priority: number | null;
  align: 'start' | 'center' | 'end';
  is_visible: boolean;
  sort_order: number;
}

export interface WsEmptyState {
  state_key: string;
  title_key: string;
  description_key: string | null;
  tone: string;
  illustration: string | null;
  primary_label_key: string | null;
  primary_route: string | null;
  secondary_label_key: string | null;
  secondary_route: string | null;
}

interface SetupStepsBundle    { steps: WsSetupStep[] }
interface QuickActionsBundle  { actions: WsQuickAction[] }
interface AiTipsBundle        { tips: WsAiTip[] }
interface HealthProbesBundle  { probes: WsHealthProbe[] }
interface PageHeadersBundle   { headers: Record<string, WsPageHeader> }
interface GridColumnsBundle   { scopes: Record<string, WsGridColumn[]> }
interface EmptyStatesBundle   { states: WsEmptyState[] }

const FB_SETUP_STEPS:    SetupStepsBundle    = setupStepsFb     as SetupStepsBundle;
const FB_QUICK_ACTIONS:  QuickActionsBundle  = quickActionsFb   as QuickActionsBundle;
const FB_AI_TIPS:        AiTipsBundle        = aiTipsFb         as AiTipsBundle;
const FB_HEALTH_PROBES:  HealthProbesBundle  = healthProbesFb   as HealthProbesBundle;
const FB_PAGE_HEADERS:   PageHeadersBundle   = pageHeadersFb    as PageHeadersBundle;
const FB_GRID_COLUMNS:   GridColumnsBundle   = gridColumnsFb    as GridColumnsBundle;
const FB_EMPTY_STATES:   EmptyStatesBundle   = emptyStatesFb    as EmptyStatesBundle;

const API_BASE = '/api/ui-os/workspace-surface';

@Injectable({ providedIn: 'root' })
export class WorkspaceSurfaceDataService {
  private readonly http = inject(HttpClient);

  // ── Signals (one per catalog) ────────────────────────────────────
  private readonly _setupSteps   = signal<WsSetupStep[]>(FB_SETUP_STEPS.steps);
  private readonly _quickActions = signal<WsQuickAction[]>(FB_QUICK_ACTIONS.actions);
  private readonly _aiTips       = signal<WsAiTip[]>(FB_AI_TIPS.tips);
  private readonly _healthProbes = signal<WsHealthProbe[]>(FB_HEALTH_PROBES.probes);
  private readonly _pageHeaders  = signal<Record<string, WsPageHeader>>(FB_PAGE_HEADERS.headers);
  private readonly _gridColumns  = signal<Record<string, WsGridColumn[]>>(FB_GRID_COLUMNS.scopes);
  private readonly _emptyStates  = signal<WsEmptyState[]>(FB_EMPTY_STATES.states);

  // Track which catalogs were served from DB vs fallback (telemetry).
  private readonly _fallbackActive = signal<Record<string, boolean>>({
    setupSteps: true, quickActions: true, aiTips: true, healthProbes: true,
    pageHeaders: true, gridColumns: true, emptyStates: true,
  });

  // ── Public read-only accessors ───────────────────────────────────
  readonly setupSteps     = computed(() => this._setupSteps());
  readonly quickActions   = computed(() => this._quickActions());
  readonly aiTips         = computed(() => this._aiTips());
  readonly healthProbes   = computed(() => this._healthProbes());
  readonly pageHeaders    = computed(() => this._pageHeaders());
  readonly gridColumns    = computed(() => this._gridColumns());
  readonly emptyStates    = computed(() => this._emptyStates());
  readonly fallbackActive = computed(() => this._fallbackActive());

  pageHeader(routeKey: string): WsPageHeader | null {
    return this._pageHeaders()[routeKey] ?? null;
  }

  gridColumnsFor(scope: string): WsGridColumn[] {
    return this._gridColumns()[scope] ?? [];
  }

  /**
   * Fetch all 7 catalogs in parallel with per-catalog fallback. The
   * signals are mutated whenever the network response is non-empty.
   */
  async loadAll(tenantId?: string | null, surfaceKey = 'workspace.home'): Promise<void> {
    const headers = this.tenantHeaders(tenantId);

    const tasks: Array<Promise<void>> = [
      this.loadSetupSteps(headers),
      this.loadQuickActions(headers, surfaceKey),
      this.loadAiTips(headers),
      this.loadHealthProbes(headers),
      this.loadPageHeader(headers, '/workspace-home'),
      this.loadGridColumns(headers, 'workspace.modules'),
      this.loadEmptyStates(headers),
    ];
    await Promise.allSettled(tasks);
  }

  // ── Private fetchers ─────────────────────────────────────────────
  private tenantHeaders(tenantId?: string | null): HttpHeaders {
    let h = new HttpHeaders();
    if (tenantId && tenantId.trim().length > 0) {
      h = h.set('x-dos-tenant-id', tenantId.trim());
    }
    return h;
  }

  private async loadSetupSteps(headers: HttpHeaders): Promise<void> {
    const got = await this.tryGet<{ steps: WsSetupStep[] }>(`${API_BASE}/setup-steps`, headers);
    if (got && Array.isArray(got.steps) && got.steps.length > 0) {
      this._setupSteps.set(got.steps);
      this.markLive('setupSteps');
    }
  }

  private async loadQuickActions(headers: HttpHeaders, surfaceKey: string): Promise<void> {
    const got = await this.tryGet<{ actions: WsQuickAction[] }>(
      `${API_BASE}/quick-actions?surface_key=${encodeURIComponent(surfaceKey)}`, headers,
    );
    if (got && Array.isArray(got.actions) && got.actions.length > 0) {
      this._quickActions.set(got.actions);
      this.markLive('quickActions');
    }
  }

  private async loadAiTips(headers: HttpHeaders): Promise<void> {
    const got = await this.tryGet<{ tips: WsAiTip[] }>(`${API_BASE}/ai-tips`, headers);
    if (got && Array.isArray(got.tips) && got.tips.length > 0) {
      this._aiTips.set(got.tips);
      this.markLive('aiTips');
    }
  }

  private async loadHealthProbes(headers: HttpHeaders): Promise<void> {
    const got = await this.tryGet<{ probes: WsHealthProbe[] }>(`${API_BASE}/health-probes`, headers);
    if (got && Array.isArray(got.probes) && got.probes.length > 0) {
      this._healthProbes.set(got.probes);
      this.markLive('healthProbes');
    }
  }

  private async loadPageHeader(headers: HttpHeaders, route: string): Promise<void> {
    const got = await this.tryGet<{ header: WsPageHeader | null }>(
      `${API_BASE}/page-header?route=${encodeURIComponent(route)}`, headers,
    );
    if (got && got.header) {
      const next = { ...this._pageHeaders() };
      // Normalize mesh_layers if backend returns null/undefined.
      if (!Array.isArray(got.header.mesh_layers)) {
        got.header.mesh_layers = ['--dos-gradient-mesh-1', '--dos-gradient-mesh-2', '--dos-gradient-mesh-3'];
      }
      next[got.header.route_key] = got.header;
      this._pageHeaders.set(next);
      this.markLive('pageHeaders');
    }
  }

  private async loadGridColumns(headers: HttpHeaders, scope: string): Promise<void> {
    const got = await this.tryGet<{ columns: WsGridColumn[] }>(
      `${API_BASE}/grid-columns?scope=${encodeURIComponent(scope)}`, headers,
    );
    if (got && Array.isArray(got.columns) && got.columns.length > 0) {
      const next = { ...this._gridColumns() };
      next[scope] = got.columns;
      this._gridColumns.set(next);
      this.markLive('gridColumns');
    }
  }

  private async loadEmptyStates(headers: HttpHeaders): Promise<void> {
    const got = await this.tryGet<{ states: WsEmptyState[] }>(`${API_BASE}/empty-states`, headers);
    if (got && Array.isArray(got.states) && got.states.length > 0) {
      this._emptyStates.set(got.states);
      this.markLive('emptyStates');
    }
  }

  private async tryGet<T>(url: string, headers: HttpHeaders): Promise<T | null> {
    try {
      const v = await firstValueFrom(
        this.http.get<T>(url, { headers, withCredentials: true }),
      );
      return v ?? null;
    } catch {
      // Fallback path; signals retain bundled JSON values.
      return null;
    }
  }

  private markLive(key: string): void {
    const cur = this._fallbackActive();
    if (cur[key] === false) return;
    this._fallbackActive.set({ ...cur, [key]: false });
  }
}
