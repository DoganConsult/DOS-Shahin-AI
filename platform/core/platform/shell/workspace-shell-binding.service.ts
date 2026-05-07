/**
 * Phase WS-7 — Workspace-shell binding consumer (canonical envelope, v3.1).
 *
 * Consumes `GET /api/ui-os/workspace-runtime?tenantId=…` and exposes the
 * normalized envelope to the shell host. The surfaces map is anonymous —
 * keyed by `${zone}#${position}` because the resolver no longer emits
 * `component_key` / `perms_required` (server enforces RBAC; FE only checks
 * the `enabled` flag and reads zone/position).
 *
 * First-class envelope state:
 *   shell.surfaces   → _surfaces (Map<string, WorkspaceShellSurface>)
 *   shell.nav        → _navGroupsRaw / _navItemsRaw
 *   shell.chrome     → _chrome      (flat Record)
 *   shell.shortcuts  → _shortcutsRaw
 *   shell.banners    → _bannersRaw
 *   shell.policies   → _policies    (flat Record)
 *
 * Catalog (knownKeys + componentRegistry) lives behind a separate endpoint:
 *   GET /api/ui-os/workspace-shell-catalog
 *
 * Fail-soft: any HTTP error resolves to an empty envelope so the shell
 * continues to render empty/placeholder states instead of throwing.
 */
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, firstValueFrom, of } from 'rxjs';
import {
  type ActionQueueItem,
  type AgentActivity,
  type CommandSearchResult,
  type ContextPanelView,
  type InboxMessage,
  type QuickCreateAction,
  type StatusBarSignal,
  type WorkspaceI18nLabel,
  type WorkspaceRuntimeBanner,
  type WorkspaceRuntimeNavGroupRow,
  type WorkspaceRuntimeNavItemRow,
  type WorkspaceRuntimeShortcut,
  type WorkspaceShellActionItem,
  type WorkspaceShellBannerTemplate,
  type WorkspaceShellBindingRow,
  type WorkspaceShellResolverResponse,
  type WorkspaceShellShortcut,
  type WorkspaceShellZone,
} from '@dos/ui-system';
import type {
  DosNavGroup,
  DosNavItem,
  DosShellNavConfig,
  ShellAccountMenuEntry,
  ShellBanner,
} from '@dos/ui-contracts';
import { parseShellAction } from '@dos/ui-contracts';
import { AccessStore } from '@dos/access-store';
import { ShellConnectivityService } from './shell-connectivity.service';

/** Anonymous surface row — no component_key, no perms_required. */
export type WorkspaceShellSurface = WorkspaceShellBindingRow;

/**
 * Surface map key — prefer the resolver-emitted stable id (`surfaceId` /
 * `slotKey`), otherwise fall back to a deterministic composite of
 * `zone#position#index`. The legacy `${zone}#${position}` form is dropped
 * because it collapsed multiple surfaces sharing a slot.
 */
type SurfaceMap = ReadonlyMap<string, WorkspaceShellSurface>;

const EMPTY_MAP: SurfaceMap = new Map();
const EMPTY_RECORD: Readonly<Record<string, unknown>> = Object.freeze({});

const CANONICAL_STRUCTURAL_ZONES = [
  'header',
  'banner',
  'sidebar',
  'main',
  'page-actions',
  'page-content',
] as const;
type CanonicalStructuralZone = (typeof CANONICAL_STRUCTURAL_ZONES)[number];
const STRUCTURAL_ZONE_SET: ReadonlySet<string> = new Set<string>(CANONICAL_STRUCTURAL_ZONES);

function textOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function normalizedStructuralZone(rawZone: unknown): CanonicalStructuralZone | null {
  const zone = textOrNull(rawZone);
  if (!zone) return null;
  // Backward-compat input normalization for existing runtime rows.
  if (zone === 'banners') return 'banner';
  if (STRUCTURAL_ZONE_SET.has(zone)) return zone as CanonicalStructuralZone;
  return null;
}

function hasRequiredSurfacePayload(props: unknown): boolean {
  if (!props || typeof props !== 'object' || Array.isArray(props)) return false;
  const rec = props as Record<string, unknown>;
  // Require at least one concrete contract payload entry so renderer
  // components do not mount against empty/incomplete bags.
  if (Object.keys(rec).length === 0) return false;
  const payload = rec['payload'];
  if (payload != null) return true;
  const template = rec['template'];
  if (typeof template === 'string' && template.trim()) return true;
  return true;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceShellBindingService {
  private readonly http = inject(HttpClient);
  private readonly access = inject(AccessStore);
  private readonly connectivity = inject(ShellConnectivityService);

  private readonly _surfaces = signal<SurfaceMap>(EMPTY_MAP);
  private readonly _navGroupsRaw = signal<readonly WorkspaceRuntimeNavGroupRow[]>([]);
  private readonly _navItemsRaw = signal<readonly WorkspaceRuntimeNavItemRow[]>([]);
  private readonly _chrome = signal<Readonly<Record<string, unknown>>>(EMPTY_RECORD);
  private readonly _shortcutsRaw = signal<readonly WorkspaceRuntimeShortcut[]>([]);
  private readonly _bannersRaw = signal<readonly WorkspaceRuntimeBanner[]>([]);
  private readonly _policies = signal<Readonly<Record<string, unknown>>>(EMPTY_RECORD);
  private readonly _version  = signal(0);
  private readonly _loaded   = signal(false);
  private readonly _tenantId = signal<string | null>(null);
  /** Monotonic refresh token — used to discard stale resolver responses. */
  private _refreshSeq = 0;

  readonly surfaces = this._surfaces.asReadonly();
  readonly navGroupsRaw = this._navGroupsRaw.asReadonly();
  readonly navItemsRaw = this._navItemsRaw.asReadonly();
  readonly chrome = this._chrome.asReadonly();
  readonly policies = this._policies.asReadonly();
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
      // Server is the RBAC authority — do NOT re-filter by permission here.

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
        action: item.action ?? undefined,
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

    // Preserve resolver-emitted sortOrder; the resolver already returns
    // groups + items pre-sorted by `sort_order` per `loadNav` SQL. Items
    // were appended in iteration order, so do not re-sort by label.
    const groups = Array.from(groupsByKey.values())
      .filter((group) => group.items.length > 0)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return { groups };
  });

  // ── Anonymous surface readers ────────────────────────────────────────────
  // Surfaces are keyed by zone+position. Callers fetch by zone (preferred)
  // or by composite key. No component_key literals.

  /** Read the full props bag of a surface (by zone#position key). */
  tileProps<T>(key: string): T | null {
    const row = this._surfaces().get(key);
    if (!row || row.enabled === false) return null;
    const props = row.props as Record<string, unknown> | undefined;
    if (!props || typeof props !== 'object') return null;
    return props as unknown as T;
  }

  // ── Zone-scoped convenience signals ─────────────────────────────────────
  // Read flat prop names from each surface inside the zone. Server-side
  // RBAC has already filtered the enabled set.

  readonly statusBarSignals = computed<StatusBarSignal[]>(
    () => this.zonePropArray('bottom-status', 'signals').map((row) => this.normalizeStatusBarSignal(row)).filter(Boolean) as StatusBarSignal[],
  );
  readonly actionQueueItems = computed<ActionQueueItem[]>(
    () => this.zonePropArray('bottom-status', 'items').map((row) => this.normalizeActionQueueItem(row)).filter(Boolean) as ActionQueueItem[],
  );
  readonly agentActivities = computed<AgentActivity[]>(
    () => this.zonePropArray('bottom-status', 'activities').map((row) => this.normalizeAgentActivity(row)).filter(Boolean) as AgentActivity[],
  );
  readonly contextViews = computed<ContextPanelView[]>(
    () => this.zonePropArray('right-rail', 'views').map((row) => this.normalizeContextView(row)).filter(Boolean) as ContextPanelView[],
  );
  readonly inboxMessages = computed<InboxMessage[]>(
    () => this.zonePropArray('right-rail', 'messages').map((row) => this.normalizeInboxMessage(row)).filter(Boolean) as InboxMessage[],
  );
  readonly quickCreateActions = computed<QuickCreateAction[]>(
    () => this.zonePropArray('fab', 'actions').map((row) => this.normalizeQuickCreateAction(row)).filter(Boolean) as QuickCreateAction[],
  );
  readonly commandResults = computed<CommandSearchResult[]>(
    () => this.zonePropArray('header', 'results').map((row) => this.normalizeCommandResult(row)).filter(Boolean) as CommandSearchResult[],
  );

  // ── Header props — chrome KV is canonical; zone surface is fallback ─────
  readonly headerBrandLabel = computed<string | null>(
    () => this.chromeStringFirst('brand') ?? this.zoneStringProp('header', 'brand'),
  );
  readonly headerHomeRoute = computed<string | null>(
    () => this.chromeStringFirst('homeRoute') ?? this.zoneStringProp('header', 'homeRoute'),
  );
  readonly headerWorkspaceTitle = computed<string | null>(
    () => this.chromeStringFirst('workspaceTitle') ?? this.zoneStringProp('header', 'workspaceTitle'),
  );
  readonly headerLogoHref = computed<string | null>(
    () => this.chromeStringFirst('logoHref') ?? this.zoneStringProp('header', 'logoHref'),
  );

  /** Account menu entries from chrome.accountMenu (first-class). */
  readonly accountMenuEntries = computed<ShellAccountMenuEntry[] | null>(() => {
    const raw = this._chrome()['accountMenu'];
    if (!Array.isArray(raw) || raw.length === 0) return null;
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
  });

  // ── Render gates — server-side RBAC trusted; FE checks `enabled` only ───
  // Default-deny once a tenant has been selected and the envelope has loaded.
  // While bootstrapping (no tenant yet) we allow placeholder rendering.
  isSurfaceAllowed(key: string): boolean {
    const row = this._surfaces().get(key);
    if (row) return row.enabled !== false;
    if (this._tenantId() && this._loaded()) return false;
    return true;
  }

  surfacePosition(key: string): number {
    const row = this._surfaces().get(key);
    return row && typeof row.position === 'number' ? row.position : 0;
  }

  surfacesByZone(zone: WorkspaceShellZone): WorkspaceShellSurface[] {
    return Array.from(this._surfaces().values())
      .filter((row) => row.zone === zone && row.enabled !== false)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  zoneHas(zone: WorkspaceShellZone): boolean {
    return this.surfacesByZone(zone).length > 0 || !this._loaded();
  }

  /** Reset every envelope signal back to its empty form. */
  private clearEnvelope(loaded: boolean): void {
    this._surfaces.set(EMPTY_MAP);
    this._navGroupsRaw.set([]);
    this._navItemsRaw.set([]);
    this._chrome.set(EMPTY_RECORD);
    this._shortcutsRaw.set([]);
    this._bannersRaw.set([]);
    this._policies.set(EMPTY_RECORD);
    this._version.set(0);
    this._loaded.set(loaded);
  }

  // Auto-refresh when the active tenant flips. ALWAYS clear stale envelope
  // state synchronously before the new tenant's resolver call, so the FE
  // never renders a previous tenant's chrome/nav/banners.
  private readonly tenantEffect = effect(() => {
    const tid = this.access.tenantId();
    if (!tid) {
      this.clearEnvelope(false);
      this._tenantId.set(null);
      this._refreshSeq += 1; // invalidate any in-flight refresh
      return;
    }
    if (tid === this._tenantId()) return;
    // Tenant switch: drop prior envelope IMMEDIATELY.
    this.clearEnvelope(false);
    this._tenantId.set(tid);
    this._refreshSeq += 1;
    queueMicrotask(() => { void this.refresh(); });
  }, { allowSignalWrites: true });

  /**
   * Fetch the canonical envelope for the active tenant. Idempotent.
   * The backend resolves tenantId from the session principal — no
   * `?tenantId=` query string is sent. Stale responses (those whose
   * tenant is no longer active by the time the response lands) are
   * discarded via `_refreshSeq` + tenant equality check.
   */
  async refresh(): Promise<void> {
    const tenantAtStart = this._tenantId();
    if (!tenantAtStart) return;
    const seqAtStart = ++this._refreshSeq;
    const url = `/api/ui-os/workspace-runtime`;
    // eslint-disable-next-line no-console
    console.info('[workspace-shell-binding] RUNTIME_REFRESH_CALLED', tenantAtStart);

    let transientAuth = false;
    const resp = await firstValueFrom(
      this.http.get<WorkspaceShellResolverResponse>(url).pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401 || err.status === 403) {
            transientAuth = true;
          } else {
            // eslint-disable-next-line no-console
            console.warn('[workspace-shell-binding] resolve failed', tenantAtStart, err.status);
          }
          return of(null);
        }),
      ),
    );

    // Stale-refresh guard — if the active tenant changed mid-flight, drop.
    if (this._tenantId() !== tenantAtStart || this._refreshSeq !== seqAtStart) return;

    // 401/403 ⇒ clear envelope so no prior tenant data leaks.
    if (transientAuth) {
      this.clearEnvelope(false);
      return;
    }

    const shell = resp?.shell;
    if (!resp || !shell || !Array.isArray(shell.surfaces)) {
      this.clearEnvelope(true);
      return;
    }

    const next = new Map<string, WorkspaceShellSurface>();
    const dropped: Array<{ reason: string; row: unknown }> = [];
    for (const row of shell.surfaces) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const zone = normalizedStructuralZone(r['zone']);
      if (!zone) {
        dropped.push({ reason: 'non-canonical-zone', row });
        continue;
      }
      const position = typeof row.position === 'number' ? row.position : 0;
      const surfaceIdRaw = textOrNull(r['surfaceId']);
      const slotKeyRaw = textOrNull(r['slotKey']);
      const componentKey = textOrNull(r['componentKey']);
      const componentType = typeof r['componentType'] === 'string' ? (r['componentType'] as string) : (r['componentType'] === null ? null : undefined);
      const rendererKey = textOrNull(r['rendererKey']);
      const carbonKey = typeof r['carbonKey'] === 'string' ? (r['carbonKey'] as string) : (r['carbonKey'] === null ? null : undefined);
      if (!surfaceIdRaw || !slotKeyRaw || !componentKey || !rendererKey || !hasRequiredSurfacePayload(row.props)) {
        dropped.push({ reason: 'missing-required-contract-fields', row });
        continue;
      }
      const surface: WorkspaceShellSurface = {
        enabled: row.enabled !== false,
        position,
        props: row.props ?? {},
        version: typeof row.version === 'number' ? row.version : 0,
        zone,
        surfaceId: surfaceIdRaw,
        slotKey: slotKeyRaw,
        componentKey,
        ...(componentType !== undefined ? { componentType } : {}),
        rendererKey,
        ...(carbonKey !== undefined ? { carbonKey } : {}),
      };
      const key = surfaceIdRaw;
      if (next.has(key)) {
        // eslint-disable-next-line no-console
        console.warn('[workspace-shell-binding] duplicate surface key dropped', key);
        continue;
      }
      next.set(key, surface);
    }

    this._surfaces.set(next);
    this._navGroupsRaw.set(Array.isArray(shell.nav?.groups) ? shell.nav.groups : []);
    this._navItemsRaw.set(Array.isArray(shell.nav?.items) ? shell.nav.items : []);
    this._chrome.set(shell.chrome && typeof shell.chrome === 'object' ? shell.chrome : EMPTY_RECORD);
    this._shortcutsRaw.set(Array.isArray(shell.shortcuts) ? shell.shortcuts : []);
    this._bannersRaw.set(Array.isArray(shell.banners) ? shell.banners : []);
    this._policies.set(shell.policies && typeof shell.policies === 'object' ? shell.policies : EMPTY_RECORD);
    this._version.set(Number(shell.version ?? resp.version) || 0);
    this._loaded.set(true);
    // eslint-disable-next-line no-console
    console.info('[workspace-shell-binding] WORKSPACE_RUNTIME_LOADED', { tenant: tenantAtStart, surfaces: next.size, version: this._version() });

    // RUNTIME_APPLIED — per-zone surface count + count of surfaces that
    // did/did not present a stable resolver-emitted surfaceId/slotKey.
    // `unsupported` surfaces fell through to the composite zone#pos#idx
    // key; downstream surface-renderer waves cannot hydrate Carbon
    // components for those rows because there is no stable identity to
    // bind to.
    let header = 0, banner = 0, sidebar = 0, main = 0, pageActions = 0, pageContent = 0;
    let rendered = 0;
    let frame = 0, visual = 0;
    for (const [key, row] of next) {
      if (row.zone === 'header') header++;
      else if (row.zone === 'banner') banner++;
      else if (row.zone === 'sidebar') sidebar++;
      else if (row.zone === 'main') main++;
      else if (row.zone === 'page-actions') pageActions++;
      else if (row.zone === 'page-content') pageContent++;
      rendered++;
      // STRUCTURAL vs VISUAL split is now driven by the resolver-emitted
      // componentType ('shell-frame' = structural; everything else is
      // visual). Pattern matching on surfaceId is no longer used.
      const isFrame = (row.componentType ?? '') === 'shell-frame';
      if (isFrame) frame++; else visual++;
      // Per-surface diagnostic — zone, surfaceId, slotKey, componentKey,
      // componentType, rendererKey, carbonKey, props keys.
      // eslint-disable-next-line no-console
      console.info('[workspace-shell-binding] SURFACE', {
        zone: row.zone,
        surfaceId: row.surfaceId ?? key,
        slotKey: row.slotKey ?? null,
        componentKey: row.componentKey ?? null,
        componentType: row.componentType ?? null,
        rendererKey: row.rendererKey ?? null,
        carbonKey: row.carbonKey ?? null,
        position: row.position,
        propKeys: Object.keys((row.props ?? {}) as Record<string, unknown>),
        isFrame,
      });
    }
    // eslint-disable-next-line no-console
    console.info('[workspace-shell-binding] RUNTIME_APPLIED', {
      total: next.size,
      header,
      banner,
      sidebar,
      main,
      pageActions,
      pageContent,
      rendered,
      uniqueValidatedSurfaceIdCount: next.size,
      droppedCount: dropped.length,
      frame,
      visual,
    });
    if (dropped.length) {
      // eslint-disable-next-line no-console
      console.warn('[workspace-shell-binding] STRUCTURAL_CONTRACT_GATE_DROPPED', dropped);
    }
  }

  /**
   * Visual (non-frame) surfaces in a zone. Structural shell-frame
   * primitives (componentType='shell-frame') are dropped — ShellHost
   * may consume them for layout policy but they are NOT visual content
   * and surface-renderer never hydrates them.
   */
  visualSurfacesByZone(zone: WorkspaceShellZone): WorkspaceShellSurface[] {
    return this.surfacesByZone(zone).filter((row) => (row.componentType ?? '') !== 'shell-frame');
  }

  /** Strict structural-zone reader used by ShellHost canonical layout. */
  structuralSurfacesByZone(zone: CanonicalStructuralZone): WorkspaceShellSurface[] {
    return Array.from(this._surfaces().values())
      .filter((row) => row.zone === zone && row.enabled !== false)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  /** Strict visual reader for canonical structural zones. */
  visualStructuralSurfacesByZone(zone: CanonicalStructuralZone): WorkspaceShellSurface[] {
    return this.structuralSurfacesByZone(zone).filter((row) => (row.componentType ?? '') !== 'shell-frame');
  }

  // ── First-class envelope reads ──────────────────────────────────────────

  /**
   * Resolve a chrome string by key. Chrome is a flat KV bag whose values
   * are JSON; for label keys the value is typically a string.
   * Returns '' when absent — no English fallback.
   */
  runtimeChromeLabel(key: string): string {
    const v = this._chrome()[key];
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const rec = v as Record<string, unknown>;
      const inner = rec['label'] ?? rec['fallback'] ?? rec['value'];
      if (typeof inner === 'string') return inner;
    }
    return '';
  }

  /**
   * Locale-aware resolution of a chrome key whose JSONB value is shaped
   * `{ "en": "...", "ar": "..." }` (Phase 3B contract for bilingual
   * runtime aria-label keys seeded under `dos.ui_workspace_chrome`).
   *
   * Fail-closed contract:
   *   - returns '' when the key is absent;
   *   - returns '' when the value is an object but the requested locale
   *     entry is missing or empty (no English fallback);
   *   - never invents text. Caller is responsible for not rendering the
   *     enabled control when the resolved value is empty.
   */
  runtimeChromeLocalized(key: string, locale: string): string {
    const v = this._chrome()[key];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const rec = v as Record<string, unknown>;
      const direct = rec[locale];
      if (typeof direct === 'string' && direct.trim()) return direct.trim();
      return '';
    }
    if (typeof v === 'string' && v.trim()) return v.trim();
    return '';
  }

  /** Banner templates from the canonical banners[] envelope. */
  readonly bannerTemplates = computed<WorkspaceShellBannerTemplate[]>(
    () => this._bannersRaw().map((row) => this.bannerToTemplate(row)).filter(Boolean) as WorkspaceShellBannerTemplate[],
  );

  /** Mobile bottom-nav max items from policies. */
  readonly mobileBottomNavMaxItems = computed<number>(
    () => this.policyNumber('layout.mobileBottomNav.maxItems'),
  );

  /** Responsive breakpoint from policies. */
  readonly desktopMinPx = computed<number>(
    () => this.policyNumber('layout.breakpoints.desktopMinPx'),
  );

  /** Keyboard shortcuts from canonical shortcuts[] envelope. */
  readonly shellShortcuts = computed<WorkspaceShellShortcut[]>(() => {
    const out: WorkspaceShellShortcut[] = [];
    for (const row of this._shortcutsRaw()) {
      if (!row || typeof row !== 'object') continue;
      const combo = typeof row.combo === 'string' ? row.combo.trim() : '';
      const action = parseShellAction(row.action);
      if (!combo || !action) continue;
      const shortcut: WorkspaceShellShortcut = { combo, action };
      if (typeof row.when === 'string' && row.when.trim()) shortcut.when = row.when;
      out.push(shortcut);
    }
    return out;
  });

  /** Account menu actions from chrome.accountMenuActions. */
  readonly accountMenuActions = computed<WorkspaceShellActionItem[]>(() => {
    const raw = this._chrome()['accountMenuActions'];
    if (!Array.isArray(raw)) return [];
    return raw.map((row) => this.normalizeActionItem(row)).filter(Boolean) as WorkspaceShellActionItem[];
  });

  readonly shellBannerCandidates = computed<ShellBanner[]>(() => {
    const banners: ShellBanner[] = [];
    const templates = this.bannerTemplates();
    const isOffline = this.connectivity.isOffline();

    for (const tpl of templates) {
      if (!tpl.id) continue;
      if (tpl.gate === 'offline' && !isOffline) continue;

      const title = this.bannerLabel(tpl.titleKey, tpl.titleFallback);
      const message = this.bannerLabel(tpl.messageKey, tpl.messageFallback);
      // Drop banners with no resolvable title at all.
      if (!title) continue;

      banners.push({
        id: tpl.id,
        kind: (tpl.kind ?? 'info') as ShellBanner['kind'],
        title,
        message,
        dismissible: !!tpl.dismissible,
        actionLabel: tpl.actionLabelKey ? this.runtimeChromeLabel(tpl.actionLabelKey) : undefined,
        action: tpl.action,
      });
    }

    return banners;
  });

  // ── Private helpers ──────────────────────────────────────────────────────

  /** Read an array prop by flat name from any surface in a zone. */
  private zonePropArray(zone: WorkspaceShellZone, propName: string): unknown[] {
    for (const row of this.surfacesByZone(zone)) {
      const props = row.props as Record<string, unknown> | undefined;
      const v = props?.[propName];
      if (Array.isArray(v)) return v;
    }
    return [];
  }

  private zoneStringProp(zone: WorkspaceShellZone, propName: string): string | null {
    for (const row of this.surfacesByZone(zone)) {
      const props = row.props as Record<string, unknown> | undefined;
      const v = props?.[propName];
      if (typeof v === 'string' && v.trim()) return v;
    }
    return null;
  }

  /** Number reader inside the policies bag (dot-path scoped to _policies). */
  private policyNumber(path: string): number {
    const v = this.walkPolicy(path);
    return typeof v === 'number' ? v : 0;
  }

  private walkPolicy(path: string): unknown {
    if (!path.trim()) return undefined;
    const parts = path.split('.');
    let cur: unknown = this._policies();
    for (const p of parts) {
      if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return undefined;
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
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

  private bannerToTemplate(row: WorkspaceRuntimeBanner): WorkspaceShellBannerTemplate | null {
    if (!row || typeof row !== 'object' || !row.id) return null;
    const tpl: WorkspaceShellBannerTemplate = { id: row.id };
    if (typeof row.gate === 'string') tpl.gate = row.gate;
    if (typeof row.kind === 'string') tpl.kind = row.kind;

    const titleKey = row.title?.i18nKey;
    if (typeof titleKey === 'string' && titleKey.trim()) tpl.titleKey = titleKey.trim();
    const titleFallback = row.title?.label ?? row.title?.fallback;
    if (typeof titleFallback === 'string' && titleFallback.trim()) tpl.titleFallback = titleFallback.trim();

    const messageKey = row.message?.i18nKey;
    if (typeof messageKey === 'string' && messageKey.trim()) tpl.messageKey = messageKey.trim();
    const messageFallback = row.message?.label ?? row.message?.fallback;
    if (typeof messageFallback === 'string' && messageFallback.trim()) tpl.messageFallback = messageFallback.trim();

    const actionLabelKey = row.actionLabel?.i18nKey;
    if (typeof actionLabelKey === 'string' && actionLabelKey.trim()) tpl.actionLabelKey = actionLabelKey.trim();
    const actionLabelFallback = row.actionLabel?.label ?? row.actionLabel?.fallback;
    if (typeof actionLabelFallback === 'string' && actionLabelFallback.trim()) tpl.actionLabelFallback = actionLabelFallback.trim();

    // Drop the row if NO label resolution is possible (no key AND no fallback).
    if (!tpl.titleKey && !tpl.titleFallback) return null;

    if (row.dismissible === true) tpl.dismissible = true;
    // Always run the action through parseShellAction so the host receives
    // a typed ShellAction (or no action at all), never raw JSON.
    const action = parseShellAction(row.action as unknown);
    if (action) tpl.action = action;
    return tpl;
  }

  /** Read a chrome value that should be a plain string. */
  chromeStringFirst(key: string): string | null {
    const v = this._chrome()[key];
    if (typeof v === 'string' && v.trim()) return v;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const rec = v as Record<string, unknown>;
      const inner = rec['label'] ?? rec['fallback'] ?? rec['value'];
      if (typeof inner === 'string' && inner.trim()) return inner;
    }
    return null;
  }

  /** Resolve a banner label — prefer chrome[i18nKey], fall back to fallback. */
  private bannerLabel(key: string | undefined, fallback: string | undefined): string {
    if (key) {
      const resolved = this.runtimeChromeLabel(key);
      if (resolved) return resolved;
    }
    return fallback ?? '';
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
}
