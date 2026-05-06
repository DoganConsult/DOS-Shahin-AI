/**
 * Phase WS-7 — Workspace-shell binding consumer (fully dynamic, 60-key v3.0).
 *
 * Consumes `GET /api/ui-os/workspace-shell/:tenantId` and exposes surfaces
 * keyed by whatever component_key strings the resolver returns.
 *
 * RULE: This file has ZERO hardcoded component_key literals. Every surface
 * name flows from the resolver response. The FE never decides which keys
 * exist — the DB does.
 *
 * Fail-soft: any HTTP error resolves to an empty surface map so the shell
 * continues to render empty/placeholder states instead of throwing.
 */
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import {
  registerWorkspaceShellCatalog,
  type ActionQueueItem,
  type AgentActivity,
  type CommandSearchResult,
  type ContextPanelView,
  type InboxMessage,
  type QuickCreateAction,
  type StatusBarSignal,
  type WorkspaceI18nLabel,
  type WorkspaceRuntimeNavigation,
  type WorkspaceRuntimeNavGroupRow,
  type WorkspaceRuntimeNavItemRow,
  type WorkspaceShellActionItem,
  type WorkspaceShellBannerTemplate,
  type WorkspaceShellBindingRow,
  type WorkspaceShellCatalogEntry,
  type WorkspaceShellShortcut,
  type WorkspaceShellZone,
} from '@dos/ui-system';
import type {
  DosNavGroup,
  DosNavItem,
  DosShellNavConfig,
  ShellAccountMenuEntry,
  ShellAction,
  ShellBanner,
} from '@dos/ui-contracts';
import { parseShellAction } from '@dos/ui-contracts';
import { AccessStore } from '@dos/access-store';
import { ShellConnectivityService } from './shell-connectivity.service';
import { ShellErrorStateService } from './shell-error-state.service';
import { ShellPreferencesService } from './shell-preferences.service';

export type WorkspaceShellSurface = Omit<WorkspaceShellBindingRow, 'zone'> & {
  zone?: WorkspaceShellZone;
};

interface WorkspaceShellResponse {
  tenantId: string;
  version: number;
  surfaces?: WorkspaceShellSurface[];
  zones?: Partial<Record<WorkspaceShellZone, WorkspaceShellSurface[]>>;
  knownKeys?: readonly string[];
  componentRegistry?: readonly WorkspaceShellCatalogEntry[];
  navigation?: WorkspaceRuntimeNavigation;
  shell?: {
    version: number;
    surfaces: WorkspaceShellSurface[];
    zones?: Partial<Record<WorkspaceShellZone, WorkspaceShellSurface[]>>;
    knownKeys?: readonly string[];
    componentRegistry?: readonly WorkspaceShellCatalogEntry[];
  };
}

/** Fully dynamic surface map — key type is string, not a union literal. */
type SurfaceMap = ReadonlyMap<string, WorkspaceShellSurface>;

const EMPTY_MAP: SurfaceMap = new Map();

@Injectable({ providedIn: 'root' })
export class WorkspaceShellBindingService {
  private readonly http = inject(HttpClient);
  private readonly access = inject(AccessStore);
  private readonly connectivity = inject(ShellConnectivityService);
  private readonly shellError = inject(ShellErrorStateService);
  private readonly prefs = inject(ShellPreferencesService);

  private readonly _surfaces = signal<SurfaceMap>(EMPTY_MAP);
  private readonly _navGroupsRaw = signal<readonly WorkspaceRuntimeNavGroupRow[]>([]);
  private readonly _navItemsRaw = signal<readonly WorkspaceRuntimeNavItemRow[]>([]);
  private readonly _version  = signal(0);
  private readonly _loaded   = signal(false);
  private readonly _tenantId = signal<string | null>(null);

  readonly surfaces = this._surfaces.asReadonly();
  readonly navGroupsRaw = this._navGroupsRaw.asReadonly();
  readonly navItemsRaw = this._navItemsRaw.asReadonly();
  readonly version  = this._version.asReadonly();
  readonly loaded   = this._loaded.asReadonly();

  readonly navConfig = computed<DosShellNavConfig>(() => {
    const groupsByKey = new Map<string, DosNavGroup>();

    for (const group of this._navGroupsRaw()) {
      if (group.enabled === false) continue;
      const key = `${group.moduleCode}:${group.groupId}`;
      groupsByKey.set(key, {
        id: key,
        label:
          group.label?.label ??
          group.label?.fallback ??
          group.label?.i18nKey ??
          '',
        order: Number(group.sortOrder) || 0,
        items: [],
      });
    }

    for (const item of this._navItemsRaw()) {
      if (item.enabled === false) continue;
      if (!item.action) continue;
      if (item.permission && !this.access.hasPermission(item.permission)) continue;

      const groupKey = `${item.moduleCode}:${item.groupId ?? 'ungrouped'}`;
      const targetGroup = groupsByKey.get(groupKey) ?? {
        id: groupKey,
        label: '',
        order: Number(item.sortOrder) || 0,
        items: [],
      };
      if (!groupsByKey.has(groupKey)) groupsByKey.set(groupKey, targetGroup);

      const rawBadge = item.badge;
      const badge = typeof rawBadge === 'number' && Number.isFinite(rawBadge) ? String(rawBadge) : typeof rawBadge === 'string' && rawBadge.trim() ? rawBadge.trim() : undefined;
      const navItem: DosNavItem = {
        id: item.itemId,
        label:
          item.label?.label ??
          item.label?.fallback ??
          item.label?.i18nKey ??
          '',
        route: item.action.kind === 'navigate' ? item.action.path : undefined,
        icon: item.icon?.trim() || undefined,
        badge,
        requiredPermission: item.permission ?? undefined,
        moduleCode: item.moduleCode,
        enabled: true,
        group: groupKey,
      };
      targetGroup.items.push(navItem);
    }

    const groups = Array.from(groupsByKey.values())
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) => a.label.localeCompare(b.label)),
      }))
      .filter((group) => group.items.length > 0)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label));

    return { groups };
  });

  // ── Fully dynamic per-surface getters ─────────────────────────────────────
  // Every getter resolves by reading props from whatever key the resolver
  // placed into the surface map. Callers pass a key string at call-time;
  // no hardcoded literals live in this file.

  /** Read a typed array prop from a surface's props bag. */
  surfaceProp<T>(key: string, propName: string): T | null {
    const row = this._surfaces().get(key);
    if (!row) return null;
    const props = row.props as Record<string, unknown> | undefined;
    const v = props?.[propName];
    return Array.isArray(v) ? (v as unknown as T) : null;
  }

  /**
   * Resolve a string-valued prop. Accepts either a bare string or a
   * contracted runtime string value.
   */
  stringProp(key: string, propName: string): string | null {
    const row = this._surfaces().get(key);
    if (!row) return null;
    const props = row.props as Record<string, unknown> | undefined;
    const v = props?.[propName];
    if (typeof v === 'string' && v.trim()) return v;
    return null;
  }

  /** Read the full props bag of a surface, typed as T. Returns null when absent. */
  tileProps<T>(key: string): T | null {
    const row = this._surfaces().get(key);
    if (!row || row.enabled === false) return null;
    const props = row.props as Record<string, unknown> | undefined;
    if (!props || typeof props !== 'object') return null;
    return props as unknown as T;
  }

  // ── Dynamic convenience signals (computed from zone-based surface lookups) ─
  // These read props dynamically via zone membership. The shell-host consumes
  // these without knowing which specific component_key provides the data.

  readonly statusBarSignals = computed<StatusBarSignal[]>(
    () => this.zonePropArray('bottom-status', 'shell.surfaces.statusBar.signals').map((row) => this.normalizeStatusBarSignal(row)).filter(Boolean) as StatusBarSignal[],
  );
  readonly actionQueueItems = computed<ActionQueueItem[]>(
    () => this.zonePropArray('bottom-status', 'shell.surfaces.actionQueue.items').map((row) => this.normalizeActionQueueItem(row)).filter(Boolean) as ActionQueueItem[],
  );
  readonly agentActivities = computed<AgentActivity[]>(
    () => this.zonePropArray('bottom-status', 'shell.surfaces.agentStrip.activities').map((row) => this.normalizeAgentActivity(row)).filter(Boolean) as AgentActivity[],
  );
  readonly contextViews = computed<ContextPanelView[]>(
    () => this.zonePropArray('right-rail', 'shell.surfaces.contextPanel.views').map((row) => this.normalizeContextView(row)).filter(Boolean) as ContextPanelView[],
  );
  readonly inboxMessages = computed<InboxMessage[]>(
    () => this.zonePropArray('right-rail', 'shell.surfaces.inbox.messages').map((row) => this.normalizeInboxMessage(row)).filter(Boolean) as InboxMessage[],
  );
  readonly quickCreateActions = computed<QuickCreateAction[]>(
    () => this.zonePropArray('fab', 'shell.surfaces.quickCreate.actions').map((row) => this.normalizeQuickCreateAction(row)).filter(Boolean) as QuickCreateAction[],
  );
  readonly commandResults = computed<CommandSearchResult[]>(
    () => this.zonePropArray('header', 'shell.surfaces.commandSearch.results').map((row) => this.normalizeCommandResult(row)).filter(Boolean) as CommandSearchResult[],
  );

  // ── Header chrome props (dynamic) ───────────────────────────────────────
  // Reads from the first header-zone surface that has brand/homeRoute etc.
  readonly headerBrandLabel = computed<string | null>(
    () => this.zoneStringProp('header', 'brand'),
  );
  readonly headerHomeRoute = computed<string | null>(
    () => this.zoneStringProp('header', 'homeRoute'),
  );
  readonly headerWorkspaceTitle = computed<string | null>(
    () => this.zoneStringProp('header', 'workspaceTitle'),
  );
  readonly headerLogoHref = computed<string | null>(
    () => this.zoneStringProp('header', 'logoHref'),
  );

  /** Dynamic account menu entries from shell.chrome.accountMenu in any surface. */
  readonly accountMenuEntries = computed<ShellAccountMenuEntry[] | null>(
    () => {
      const raw = this.globalPropArray('shell.chrome.accountMenu');
      if (raw.length === 0) return null;
      const out: ShellAccountMenuEntry[] = [];
      for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const e = item as Record<string, unknown>;
        const id = typeof e['id'] === 'string' ? (e['id'] as string) : null;
        const i18nKey = typeof e['i18nKey'] === 'string' ? (e['i18nKey'] as string) : null;
        if (!id || !i18nKey) continue;
        const entry: ShellAccountMenuEntry = { id, i18nKey };
        const action = parseShellAction(e['action']);
        if (action) entry.action = action;
        if (e['destructive'] === true) entry.destructive = true;
        if (typeof e['requiresAdmin'] === 'boolean') entry.requiresAdmin = e['requiresAdmin'] as boolean;
        out.push(entry);
      }
      return out.length > 0 ? out : null;
    },
  );

  // ── Render gates — DB enabled flag + perms_required ─────────────────────
  /**
   * True iff the surface is present in the binding, `enabled=true`, AND the
   * current session holds every permission listed in `perms_required`.
   * Missing rows evaluate to false (fail-closed) — but pre-load grace
   * returns true until the first binding load completes.
   */
  isSurfaceAllowed(key: string): boolean {
    const row = this._surfaces().get(key);
    if (!row) {
      // Pre-load grace: treat unknown as allowed until loaded flips true.
      return !this._loaded();
    }
    if (row.enabled === false) return false;
    const perms = Array.isArray(row.permsRequired) ? row.permsRequired : [];
    for (const p of perms) {
      if (!this.access.hasPermission(p)) return false;
    }
    return true;
  }

  /** DB-driven render position (for ordering multiple strips). */
  surfacePosition(key: string): number {
    const row = this._surfaces().get(key);
    return row && typeof row.position === 'number' ? row.position : 0;
  }

  surfacesByZone(zone: WorkspaceShellZone): WorkspaceShellSurface[] {
    return Array.from(this._surfaces().values())
      .filter((row) => row.zone === zone && this.isSurfaceAllowed(row.componentKey))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  zoneHas(zone: WorkspaceShellZone): boolean {
    return this.surfacesByZone(zone).length > 0 || !this._loaded();
  }

  // Zone is fully resolver-driven — no browser-side fallback resolution.

  // Auto-refresh when the active tenant flips.
  private readonly tenantEffect = effect(() => {
    const tid = this.access.tenantId();
    if (!tid) {
      this._surfaces.set(EMPTY_MAP);
      this._navGroupsRaw.set([]);
      this._navItemsRaw.set([]);
      this._version.set(0);
      this._loaded.set(false);
      this._tenantId.set(null);
      return;
    }
    if (tid === this._tenantId()) return;
    this._tenantId.set(tid);
    queueMicrotask(() => { void this.refresh(); });
  }, { allowSignalWrites: true });

  /** Fetch the binding once for the active tenant. Idempotent. */
  async refresh(): Promise<void> {
    const tenantId = this._tenantId() ?? this.access.tenantId();
    if (!tenantId) return;
    const url = `/api/ui-os/workspace-runtime?tenantId=${encodeURIComponent(tenantId)}`;
    let transientAuth = false;
    const resp = await new Promise<WorkspaceShellResponse | null>((resolve) => {
      this.http.get<WorkspaceShellResponse>(url).pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401 || err.status === 403) {
            transientAuth = true;
          } else {
            // eslint-disable-next-line no-console
            console.warn('[workspace-shell-binding] resolve failed', tenantId, err.status);
          }
          return of(null);
        }),
      ).subscribe((r) => resolve(r ?? null));
    });
    const shell = resp?.shell;
    const surfaces = shell?.surfaces ?? resp?.surfaces;
    const navigation = resp?.navigation;
    const version = shell?.version ?? resp?.version;
    const componentRegistry = shell?.componentRegistry ?? resp?.componentRegistry ?? [];
    registerWorkspaceShellCatalog(componentRegistry);
    if (!resp || !Array.isArray(surfaces)) {
      if (!transientAuth) {
        this._surfaces.set(EMPTY_MAP);
        this._navGroupsRaw.set([]);
        this._navItemsRaw.set([]);
        this._version.set(0);
        this._loaded.set(true);
      }
      return;
    }
    const next = new Map<string, WorkspaceShellSurface>();
    for (const row of surfaces) {
      if (!row || typeof row !== 'object') continue;
      const legacy = row as WorkspaceShellSurface & { component_key?: string };
      const key =
        typeof legacy.componentKey === 'string' && legacy.componentKey.trim()
          ? legacy.componentKey.trim()
          : typeof legacy.component_key === 'string' && legacy.component_key.trim()
            ? legacy.component_key.trim()
            : '';
      if (!key) continue;
      next.set(key, { ...legacy, componentKey: key });
    }
    this._surfaces.set(next);
    this._navGroupsRaw.set(Array.isArray(navigation?.groups) ? navigation.groups : []);
    this._navItemsRaw.set(Array.isArray(navigation?.items) ? navigation.items : []);
    this._version.set(Number(version) || 0);
    this._loaded.set(true);
  }

  // COMPLIANCE: All data must flow from DB in the contracted shape.

  // ── UI-OS runtime config — shell-host reads these instead of hardcoding ──

  /**
   * Resolve a chrome string from header-zone surfaces.
   * DB key path: workspace_shell_binding → props.shell.chrome.labels.{key}
   * Returns '' when absent — never returns a hardcoded English fallback.
   */
  runtimeChromeLabel(key: string): string {
    for (const row of Array.from(this._surfaces().values())) {
      const props = row.props as Record<string, unknown> | undefined;
      const labels = this.nestedRecordProp(props, 'shell.chrome.labels');
      if (labels && typeof labels[key] === 'string') return labels[key] as string;
    }
    return '';
  }

  /**
   * Banner templates from UI-OS runtime.
   * DB key path: workspace_shell_binding → props.shell.banners[]
   */
  readonly bannerTemplates = computed<WorkspaceShellBannerTemplate[]>(
    () => this.globalPropArray('shell.banners')
      .map((row) => this.normalizeBannerTemplate(row))
      .filter(Boolean) as WorkspaceShellBannerTemplate[],
  );

  /** Mobile bottom nav max items from runtime config. */
  readonly mobileBottomNavMaxItems = computed<number>(() => {
    return this.runtimeNumber('shell.layout.mobileBottomNav.maxItems');
  });

  /** Session expiry policy from runtime. */
  readonly sessionExpiryPolicy = computed<{ warningMinutes: number; dangerMinutes: number }>(() => {
    const policy = this.runtimePolicy('shell.policies.sessionExpiry');
    if (policy) {
      return {
        warningMinutes: typeof policy['warningMinutes'] === 'number' ? policy['warningMinutes'] as number : 0,
        dangerMinutes: typeof policy['dangerMinutes'] === 'number' ? policy['dangerMinutes'] as number : 0,
      };
    }
    return { warningMinutes: 0, dangerMinutes: 0 };
  });

  /**
   * Resolved banner rows from UI-OS templates merged with live session, connectivity,
   * impersonation, and programmatic shell error state.
   * Shell-host applies only local dismissed-id filtering.
   */
  readonly shellBannerCandidates = computed<ShellBanner[]>(() => {
    const banners: ShellBanner[] = [];
    const templates = this.bannerTemplates();
    const expired = this.access.trialExpiredModules() as string[];
    const expiresAt = this.access.sessionExpiresAt();
    const policy = this.sessionExpiryPolicy();
    const isOffline = this.connectivity.isOffline();

    for (const tpl of templates) {
      if (!tpl.id) continue;

      const gate = tpl.gate ?? 'always';
      if (gate === 'trial-expired' && expired.length === 0) continue;
      if (gate === 'offline' && !isOffline) continue;
      if (gate === 'impersonation' && !this.access.isImpersonating()) continue;
      if (gate === 'session-expiry') {
        if (!expiresAt) continue;
        const minsLeft = Math.max(
          0,
          Math.floor((new Date(expiresAt).getTime() - Date.now()) / 60000),
        );
        const warn = policy.warningMinutes;
        const danger = policy.dangerMinutes;
        if (warn > 0) {
          if (minsLeft > warn) continue;
        } else if (danger > 0) {
          if (minsLeft > danger) continue;
        } else {
          continue;
        }
      }
      if (gate === 'error' && this.shellError.error()) continue;

      banners.push({
        id: tpl.id,
        kind: (tpl.kind ?? 'info') as ShellBanner['kind'],
        title: this.runtimeChromeLabel(tpl.titleKey ?? ''),
        message: this.runtimeChromeLabel(tpl.messageKey ?? ''),
        dismissible: !!tpl.dismissible,
        actionLabel: tpl.actionLabelKey ? this.runtimeChromeLabel(tpl.actionLabelKey) : undefined,
        action: tpl.action,
      });
    }

    const err = this.shellError.error();
    if (err) {
      banners.push({
        id: 'shell-error',
        kind: 'danger',
        title: err.kind,
        message: err.message + (err.correlationId ? ` (ID: ${err.correlationId})` : ''),
        dismissible: true,
      });
    }

    return banners;
  });



  /** Responsive breakpoint from runtime. */
  readonly desktopMinPx = computed<number>(() => this.runtimeNumber('shell.layout.breakpoints.desktopMinPx'));

  /** Keyboard shortcuts from runtime. */
  readonly shellShortcuts = computed<WorkspaceShellShortcut[]>(() => {
    const rows = this.globalPropArray('shell.chrome.shortcuts');
    const out: WorkspaceShellShortcut[] = [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const rec = row as Record<string, unknown>;
      const combo = typeof rec['combo'] === 'string' ? rec['combo'].trim() : '';
      const action = parseShellAction(rec['action']);
      if (!combo || !action) continue;
      const shortcut: WorkspaceShellShortcut = { combo, action };
      if (typeof rec['when'] === 'string' && rec['when'].trim()) shortcut.when = rec['when'] as string;
      out.push(shortcut);
    }
    return out;
  });

  /** Account menu actions (language/theme toggles) from runtime. */
  readonly accountMenuActions = computed<WorkspaceShellActionItem[]>(
    () => this.globalPropArray('shell.chrome.accountMenuActions')
      .map((row) => this.normalizeActionItem(row))
      .filter(Boolean) as WorkspaceShellActionItem[],
  );

  /**
   * Generic numeric limit from any zone's props.
   * Searches all surfaces in all zones for a dot-path key (e.g. 'shell.layout.mobileBottomNav.maxItems').
   * Returns 0 when absent — never a hardcoded default.
   */
  runtimeNumber(key: string): number {
    for (const row of Array.from(this._surfaces().values())) {
      const props = row.props as Record<string, unknown> | undefined;
      const v = this.nestedNumberProp(props, key);
      if (v != null) return v;
    }
    return 0;
  }

  /**
   * Generic structured policy from any zone's props.
   * Searches all surfaces for a dot-path key returning a Record.
   * Returns null when absent.
   */
  runtimePolicy(key: string): Record<string, unknown> | null {
    for (const row of Array.from(this._surfaces().values())) {
      const props = row.props as Record<string, unknown> | undefined;
      const v = this.nestedRecordProp(props, key);
      if (v) return v;
    }
    return null;
  }

  // ── Private prop helpers ─────────────────────────────────────────────────
  // All reads use dot-path resolution only. No flat key fallbacks.

  private zonePropArray(zone: WorkspaceShellZone, dotPath: string): unknown[] {
    for (const row of this.surfacesByZone(zone)) {
      const props = row.props as Record<string, unknown> | undefined;
      const v = this.walkNested(props, dotPath);
      if (Array.isArray(v)) return v;
    }
    return [];
  }

  /** Read an array from any surface's props via dot-path. */
  private globalPropArray(dotPath: string): unknown[] {
    for (const row of Array.from(this._surfaces().values())) {
      const props = row.props as Record<string, unknown> | undefined;
      const v = this.walkNested(props, dotPath);
      if (Array.isArray(v)) return v;
    }
    return [];
  }

  /** Dot-path read under props (e.g. shell.layout.mobileBottomNav.maxItems). */
  private nestedNumberProp(
    props: Record<string, unknown> | undefined,
    path: string,
  ): number | null {
    const v = this.walkNested(props, path);
    return typeof v === 'number' ? v : null;
  }

  private nestedRecordProp(
    props: Record<string, unknown> | undefined,
    path: string,
  ): Record<string, unknown> | undefined {
    const v = this.walkNested(props, path);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
  }

  private walkNested(props: Record<string, unknown> | undefined, path: string): unknown {
    if (!props || !path.trim()) return undefined;
    const parts = path.split('.');
    let cur: unknown = props;
    for (const p of parts) {
      if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return undefined;
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
  }

  private zoneStringProp(zone: WorkspaceShellZone, propName: string): string | null {
    for (const row of this.surfacesByZone(zone)) {
      const result = this.stringProp(row.componentKey, propName);
      if (result) return result;
    }
    return null;
  }

  private toLabel(raw: unknown): WorkspaceI18nLabel {
    if (typeof raw === 'string') return { fallback: raw.trim() || undefined };
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const r = raw as Record<string, unknown>;
      return {
        label: typeof r['label'] === 'string' ? r['label'] as string : undefined,
        i18nKey: typeof r['i18nKey'] === 'string' ? r['i18nKey'] as string : undefined,
        fallback: typeof r['fallback'] === 'string' ? r['fallback'] as string : undefined,
      };
    }
    return {};
  }

  private normalizeStatusBarSignal(raw: unknown): StatusBarSignal | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'] as string : '';
    if (!id) return null;
    const signal: StatusBarSignal = {
      id,
      label: this.toLabel(record['label']),
    };
    if (typeof record['kind'] === 'string') signal.kind = record['kind'] as string;
    if (typeof record['level'] === 'string') signal.level = record['level'] as string;
    if (typeof record['value'] === 'string' || typeof record['value'] === 'number') signal.value = record['value'] as string | number;
    const action = parseShellAction(record['action']);
    if (action) signal.action = action;
    return signal;
  }

  private normalizeActionQueueItem(raw: unknown): ActionQueueItem | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'] as string : '';
    if (!id) return null;
    const item: ActionQueueItem = {
      id,
      title: this.toLabel(record['title']),
      origin: this.toLabel(record['origin']),
    };
    if (typeof record['status'] === 'string') item.status = record['status'] as string;
    if (typeof record['severity'] === 'string') item.severity = record['severity'] as string;
    if (typeof record['timestamp'] === 'string') item.timestamp = record['timestamp'] as string;
    if (typeof record['dueAt'] === 'string') item.dueAt = record['dueAt'] as string;
    const action = parseShellAction(record['action']);
    if (action) item.action = action;
    return item;
  }

  private normalizeAgentActivity(raw: unknown): AgentActivity | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const name = this.toLabel(record['agentName']);
    if (!name.i18nKey && !name.fallback && !name.label) return null;
    const activity: AgentActivity = {
      agentName: name,
      step: this.toLabel(record['step']),
    };
    if (typeof record['agentId'] === 'string') activity.agentId = record['agentId'] as string;
    if (typeof record['avatarUri'] === 'string') activity.avatarUri = record['avatarUri'] as string;
    if (typeof record['state'] === 'string') activity.state = record['state'] as string;
    if (typeof record['status'] === 'string') activity.status = record['status'] as string;
    const action = parseShellAction(record['action']);
    if (action) activity.action = action;
    return activity;
  }

  private normalizeContextView(raw: unknown): ContextPanelView | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'] as string : '';
    if (!id) return null;
    const view: ContextPanelView = {
      id,
      title: this.toLabel(record['title']),
    };
    if (record['emptyMessage'] != null) view.emptyMessage = this.toLabel(record['emptyMessage']);
    if (typeof record['tab'] === 'string') view.tab = record['tab'] as string;
    return view;
  }

  private normalizeInboxMessage(raw: unknown): InboxMessage | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'] as string : '';
    if (!id) return null;
    const message: InboxMessage = {
      id,
      subject: this.toLabel(record['subject']),
      preview: this.toLabel(record['preview']),
    };
    if (typeof record['source'] === 'string') message.source = record['source'] as string;
    if (typeof record['priority'] === 'string') message.priority = record['priority'] as string;
    if (typeof record['read'] === 'boolean') message.read = record['read'] as boolean;
    if (typeof record['unread'] === 'boolean') message.unread = record['unread'] as boolean;
    if (typeof record['timestamp'] === 'string') message.timestamp = record['timestamp'] as string;
    if (typeof record['receivedAt'] === 'string') message.receivedAt = record['receivedAt'] as string;
    const action = parseShellAction(record['action']);
    if (action) message.action = action;
    return message;
  }

  private normalizeQuickCreateAction(raw: unknown): QuickCreateAction | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'] as string : '';
    if (!id) return null;
    const actionItem: QuickCreateAction = {
      id,
      label: this.toLabel(record['label']),
    };
    actionItem.icon = typeof record['icon'] === 'string' && (record['icon'] as string).trim() ? (record['icon'] as string).trim() : undefined;
    if (typeof record['hotkey'] === 'string') actionItem.hotkey = record['hotkey'] as string;
    const action = parseShellAction(record['action']);
    if (action) actionItem.action = action;
    return actionItem;
  }

  private normalizeCommandResult(raw: unknown): CommandSearchResult | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'] as string : '';
    if (!id) return null;
    const result: CommandSearchResult = {
      id,
      label: this.toLabel(record['label']),
    };
    const rawIcon = typeof record['icon'] === 'string' ? (record['icon'] as string).trim() : undefined;
    result.icon = rawIcon || undefined;
    if (typeof record['category'] === 'string') result.category = record['category'] as string;
    const action = parseShellAction(record['action']);
    if (action) result.action = action;
    return result;
  }

  private normalizeActionItem(raw: unknown): WorkspaceShellActionItem | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'] as string : '';
    if (!id) return null;
    const item: WorkspaceShellActionItem = { id };
    if (record['destructive'] === true) item.destructive = true;
    const action = parseShellAction(record['action']);
    if (action) item.action = action;
    return item;
  }

  private normalizeIcon(icon?: string): string | undefined {
    const t = icon?.trim();
    return t ? t : undefined;
  }

  private normalizeBannerTemplate(raw: unknown): WorkspaceShellBannerTemplate | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const id = typeof record['id'] === 'string' ? record['id'] as string : '';
    if (!id) return null;
    const banner: WorkspaceShellBannerTemplate = { id };
    if (typeof record['gate'] === 'string') banner.gate = record['gate'] as string;
    if (typeof record['kind'] === 'string') banner.kind = record['kind'] as string;
    if (typeof record['titleKey'] === 'string') banner.titleKey = record['titleKey'] as string;
    if (typeof record['messageKey'] === 'string') banner.messageKey = record['messageKey'] as string;
    if (record['dismissible'] === true) banner.dismissible = true;
    if (typeof record['actionLabelKey'] === 'string') banner.actionLabelKey = record['actionLabelKey'] as string;
    const action = parseShellAction(record['action']);
    if (action) banner.action = action;
    return banner;
  }
}
