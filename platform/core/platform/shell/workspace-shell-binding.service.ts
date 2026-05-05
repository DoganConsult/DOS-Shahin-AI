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
import { registerWorkspaceShellCatalog, type WorkspaceShellBindingRow, type WorkspaceShellCatalogEntry } from '@dos/ui-system';
import type { ShellAccountMenuEntry } from '@dos/ui-contracts';
import { AccessStore } from '@dos/access-store';

/**
 * Zone names are fully resolver-driven — every zone string returned by
 * `GET /api/ui-os/workspace-runtime` is honoured. The set is sourced from
 * `dos.dynamic_ui_component_registry.metadata.zone` (migration
 * 20260505_2000) and overridable per-tenant via
 * `dos.workspace_shell_binding.props.zone`. There is no closed enum here.
 */
export type WorkspaceShellZone = string;

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

  private readonly _surfaces = signal<SurfaceMap>(EMPTY_MAP);
  private readonly _version  = signal(0);
  private readonly _loaded   = signal(false);
  private readonly _tenantId = signal<string | null>(null);

  readonly surfaces = this._surfaces.asReadonly();
  readonly version  = this._version.asReadonly();
  readonly loaded   = this._loaded.asReadonly();

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
   * `{ i18nKey, fallback }` shape.
   */
  stringProp(key: string, propName: string): string | null {
    const row = this._surfaces().get(key);
    if (!row) return null;
    const props = row.props as Record<string, unknown> | undefined;
    const v = props?.[propName];
    if (typeof v === 'string' && v.trim()) return v;
    if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      const fb = obj['fallback'];
      if (typeof fb === 'string' && fb.trim()) return fb;
    }
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

  readonly statusBarSignals = computed<unknown[]>(
    () => this.zonePropArray('bottom-status', 'signals'),
  );
  readonly actionQueueItems = computed<unknown[]>(
    () => this.zonePropArray('bottom-status', 'items'),
  );
  readonly agentActivities = computed<unknown[]>(
    () => this.zonePropArray('bottom-status', 'activities'),
  );
  readonly contextViews = computed<unknown[]>(
    () => this.zonePropArray('right-rail', 'views'),
  );
  readonly inboxMessages = computed<unknown[]>(
    () => this.zonePropArray('right-rail', 'messages'),
  );
  readonly quickCreateActions = computed<unknown[]>(
    () => this.zonePropArray('fab', 'actions'),
  );
  readonly commandResults = computed<unknown[]>(
    () => this.zonePropArray('header', 'results'),
  );

  // ── Header chrome props (dynamic) ───────────────────────────────────────
  // Reads from the first header-zone surface that has brand/homeRoute etc.
  readonly headerBrandLabel = computed<string | null>(
    () => this.zoneStringProp('header', 'brand')
       ?? this.zoneStringProp('header', 'productName')
       ?? this.zoneStringProp('header', 'tenantName'),
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

  /** Dynamic account menu entries from any header-zone surface. */
  readonly accountMenuEntries = computed<ShellAccountMenuEntry[] | null>(
    () => {
      for (const row of this.surfacesByZone('header')) {
        const raw = row.props && (row.props as Record<string, unknown>)['accountMenu'];
        if (!Array.isArray(raw)) continue;
        const out: ShellAccountMenuEntry[] = [];
        for (const item of raw) {
          if (!item || typeof item !== 'object') continue;
          const e = item as Record<string, unknown>;
          const id = typeof e['id'] === 'string' ? (e['id'] as string) : null;
          const labelKey = typeof e['labelKey'] === 'string' ? (e['labelKey'] as string) : null;
          if (!id || !labelKey) continue;
          const entry: ShellAccountMenuEntry = { id, labelKey };
          if (typeof e['route'] === 'string') entry.route = e['route'] as string;
          if (e['destructive'] === true) entry.destructive = true;
          if (typeof e['requiresAdmin'] === 'boolean') entry.requiresAdmin = e['requiresAdmin'] as boolean;
          out.push(entry);
        }
        if (out.length > 0) return out;
      }
      return null;
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
    const perms = Array.isArray(row.perms_required) ? row.perms_required : [];
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
      .filter((row) => this.resolveZone(row) === zone && this.isSurfaceAllowed(row.component_key))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  zoneHas(zone: WorkspaceShellZone): boolean {
    return this.surfacesByZone(zone).length > 0 || !this._loaded();
  }

  private resolveZone(row: WorkspaceShellSurface): WorkspaceShellZone | null {
    // Zone is fully resolver-driven. The resolver already merged
    // registry metadata.zone with per-tenant props.zone overrides.
    if (row.zone && typeof row.zone === 'string' && row.zone.trim()) return row.zone;
    const props = row.props as Record<string, unknown> | undefined;
    const propZone = props && typeof props['zone'] === 'string' ? props['zone'] as string : null;
    if (propZone && propZone.trim()) return propZone;
    return null;
  }

  // Auto-refresh when the active tenant flips.
  private readonly tenantEffect = effect(() => {
    const tid = this.access.tenantId();
    if (!tid) {
      this._surfaces.set(EMPTY_MAP);
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
    const version = shell?.version ?? resp?.version;
    const componentRegistry = shell?.componentRegistry ?? resp?.componentRegistry ?? [];
    registerWorkspaceShellCatalog(componentRegistry);
    if (!resp || !Array.isArray(surfaces)) {
      if (!transientAuth) {
        this._surfaces.set(EMPTY_MAP);
        this._version.set(0);
        this._loaded.set(true);
      }
      return;
    }
    const next = new Map<string, WorkspaceShellSurface>();
    for (const row of surfaces) {
      if (!row || typeof row.component_key !== 'string') continue;
      next.set(row.component_key, row);
    }
    this._surfaces.set(next);
    this._version.set(Number(version) || 0);
    this._loaded.set(true);
  }

  // COMPLIANCE: coerceItems DELETED — legacy compatibility shim that
  // converted snake_case label_key/label_fallback into i18nKey/fallback.
  // All data must flow from DB in the contracted shape. Zero consumers.

  // ── Private zone-prop helpers ─────────────────────────────────────────────
  // Read from the FIRST surface in a zone that has the requested prop.

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
      const result = this.stringProp(row.component_key, propName);
      if (result) return result;
    }
    return null;
  }
}
