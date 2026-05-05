/**
 * Wave F / GAP-RES-1 — Workspace-shell binding consumer.
 *
 * Consumes `GET /api/ui-os/workspace-shell/:tenantId` (served by
 * `services/ui-os-service/src/routes/workspace-shell.routes.ts`) and exposes
 * per-surface signals keyed by the 26 component keys from
 * `dos.workspace_shell_binding` (shell.*, workspace.*, page.*).
 *
 * Fail-soft: any HTTP error (including 401/403 during sign-out) resolves to
 * an empty surface map so the shell continues to render empty/placeholder
 * states instead of throwing. The shell host never blocks on this service.
 *
 * NOTE: This service does NOT write to the DB. It is a pure read-through of
 * the existing Phase WS-1 seed. No migration, no template export.
 */
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import type {
  ActionQueueItem,
  AgentActivity,
  CommandSearchResult,
  ContextPanelView,
  InboxMessage,
  QuickCreateAction,
  StatusBarSignal,
  WorkspaceShellBindingRow,
  WorkspaceShellKey,
} from '@dos/ui-system';
import type { ShellAccountMenuEntry } from '@dos/ui-contracts';
import { AccessStore } from '@dos/access-store';

interface WorkspaceShellResponse {
  tenantId: string;
  version: number;
  surfaces: WorkspaceShellBindingRow[];
  knownKeys?: readonly string[];
}

type SurfaceMap = ReadonlyMap<WorkspaceShellKey, WorkspaceShellBindingRow>;

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

  // Typed per-surface getters. Each reads `row.props` defensively and
  // returns [] when the surface is absent/disabled/malformed.
  // Every nested `WorkspaceI18nLabel` field is coerced from any of:
  //   string                       → { i18nKey, fallback: string }
  //   { i18nKey, fallback }        → identity
  //   { *_key, *_fallback?, ...}   → { i18nKey: *_key, fallback: *_fallback }
  // This guards every shell template's `x.label.fallback ?? x.label.i18nKey`
  // chain against undefined-access throws when DB rows publish snake_case
  // primitives instead of the contract shape.
  readonly statusBarSignals = computed<StatusBarSignal[]>(
    () => this.coerceItems<StatusBarSignal>(
      this.surfaceProp<unknown[]>('workspace.status-bar', 'signals') ?? [],
      ['label'],
    ),
  );
  readonly actionQueueItems = computed<ActionQueueItem[]>(
    () => this.coerceItems<ActionQueueItem>(
      this.surfaceProp<unknown[]>('workspace.action-queue', 'items') ?? [],
      ['title', 'origin'],
    ),
  );
  readonly agentActivities = computed<AgentActivity[]>(
    () => this.coerceItems<AgentActivity>(
      this.surfaceProp<unknown[]>('workspace.agent-strip', 'activities') ?? [],
      ['agentName', 'step'],
    ),
  );
  readonly contextViews = computed<ContextPanelView[]>(
    () => this.coerceItems<ContextPanelView>(
      this.surfaceProp<unknown[]>('workspace.context-panel', 'views') ?? [],
      ['title', 'emptyMessage'],
    ),
  );
  readonly inboxMessages = computed<InboxMessage[]>(
    () => this.coerceItems<InboxMessage>(
      this.surfaceProp<unknown[]>('workspace.inbox-center', 'messages') ?? [],
      ['subject', 'preview'],
    ),
  );
  readonly quickCreateActions = computed<QuickCreateAction[]>(
    () => this.coerceItems<QuickCreateAction>(
      this.surfaceProp<unknown[]>('workspace.quick-create', 'actions') ?? [],
      ['label'],
    ),
  );
  readonly commandResults = computed<CommandSearchResult[]>(
    () => this.coerceItems<CommandSearchResult>(
      this.surfaceProp<unknown[]>('workspace.command-search', 'results') ?? [],
      ['label'],
    ),
  );

  // ── Header chrome props (dynamic source of truth) ───────────────────────
  // The `workspace.header` row's `props` bag carries the per-tenant brand
  // label + home route + workspace title. When absent, consumers fall back
  // to their own catalog/i18n resolver. See WorkspaceHeaderContext contract
  // `brand.productName` / `tenantName` in
  // `@dos/ui-system/shell/workspace-shell.contracts.ts`.
  readonly headerBrandLabel = computed<string | null>(
    () => this.stringProp('workspace.header', 'brand')
       ?? this.stringProp('workspace.header', 'productName')
       ?? this.stringProp('workspace.header', 'tenantName'),
  );
  readonly headerHomeRoute = computed<string | null>(
    () => this.stringProp('workspace.header', 'homeRoute'),
  );
  readonly headerWorkspaceTitle = computed<string | null>(
    () => this.stringProp('workspace.header', 'workspaceTitle'),
  );
  readonly headerLogoHref = computed<string | null>(
    () => this.stringProp('workspace.header', 'logoHref'),
  );

  // ── Dynamic account menu entries ────────────────────────────────────────
  // Reads `workspace.header.props.accountMenu` (array of ShellAccountMenuEntry
  // shapes) when the DB binding publishes it. Returns null when absent so the
  // host can fall back to WorkspaceNavigationAdapter.accountMenuConfig (which
  // itself is the platform-owned dynamic source).
  readonly accountMenuEntries = computed<ShellAccountMenuEntry[] | null>(
    () => {
      const row = this._surfaces().get('workspace.header');
      const raw = row?.props && (row.props as Record<string, unknown>)['accountMenu'];
      if (!Array.isArray(raw)) return null;
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
      return out.length > 0 ? out : null;
    },
  );

  // ── Render gates — DB enabled flag + perms_required ─────────────────────
  /**
   * True iff the surface is present in the binding, `enabled=true`, AND the
   * current session holds every permission listed in `perms_required`.
   * Missing rows evaluate to false (fail-closed) — but known-keys get a safe
   * fallback `true` until the first binding load completes so the shell does
   * not flash-hide chrome during refresh.
   */
  isSurfaceAllowed(key: WorkspaceShellKey): boolean {
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
  surfacePosition(key: WorkspaceShellKey): number {
    const row = this._surfaces().get(key);
    return row && typeof row.position === 'number' ? row.position : 0;
  }

  // Auto-refresh when the active tenant flips. AccessStore may publish
  // `null` during sign-out; we clear the map in that case.
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
    const url = `/api/ui-os/workspace-shell/${encodeURIComponent(tenantId)}`;
    let transientAuth = false;
    const resp = await new Promise<WorkspaceShellResponse | null>((resolve) => {
      this.http.get<WorkspaceShellResponse>(url).pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401 || err.status === 403) {
            // Transient auth failure (token refresh in flight, route guard
            // running). Do NOT flip _loaded=true — that permanently locks
            // the surface map empty for the page lifetime and disables every
            // shell surface. Retain pre-load grace; AccessStore.tenantId()
            // signal will retrigger refresh() once the session settles.
            transientAuth = true;
          } else {
            // eslint-disable-next-line no-console
            console.warn('[workspace-shell-binding] resolve failed', tenantId, err.status);
          }
          return of(null);
        }),
      ).subscribe((r) => resolve(r ?? null));
    });
    if (!resp || !Array.isArray(resp.surfaces)) {
      // On transient 401/403 keep the previous map (or pre-load grace) so the
      // shell does not flash to empty chrome. On any other failure, fail-closed.
      if (!transientAuth) {
        this._surfaces.set(EMPTY_MAP);
        this._version.set(0);
        this._loaded.set(true);
      }
      return;
    }
    const next = new Map<WorkspaceShellKey, WorkspaceShellBindingRow>();
    for (const row of resp.surfaces) {
      if (!row || typeof row.component_key !== 'string') continue;
      // NOTE: disabled rows are retained so `isSurfaceAllowed()` can read
      // the DB enabled flag. Per dynamic-UI policy the render host gates on
      // enabled + perms_required, not the binding service.
      next.set(row.component_key as WorkspaceShellKey, row);
    }
    this._surfaces.set(next);
    this._version.set(Number(resp.version) || 0);
    this._loaded.set(true);
  }

  /**
   * Coerce an array of raw item rows into the contracted shape:
   *  - Drops non-object entries.
   *  - For every `labelField` listed (e.g. `label`, `title`, `subject`),
   *    normalizes the value to a `WorkspaceI18nLabel` `{ i18nKey, fallback }`.
   *    Accepts a bare string, the contract object, or snake-case alternates
   *    (`*_key`, `label_key`, `title_key`, with optional `*_fallback`).
   *  - Mirrors snake-case primitives the DB binding emits today
   *    (`label_key`, `title_key`, `subject_key`, …) to the camelCase contract
   *    so shell templates can safely chain `.fallback ?? .i18nKey`.
   * Never throws — fail-soft is the contract: malformed entries become best-
   * effort objects with empty labels.
   */
  private coerceItems<T>(rows: unknown[], labelFields: string[]): T[] {
    if (!Array.isArray(rows)) return [];
    const out: T[] = [];
    for (const raw of rows) {
      if (!raw || typeof raw !== 'object') continue;
      const src = raw as Record<string, unknown>;
      const dst: Record<string, unknown> = { ...src };
      for (const field of labelFields) {
        const existing = src[field];
        if (existing && typeof existing === 'object') {
          const obj = existing as Record<string, unknown>;
          const i18nKey = typeof obj['i18nKey'] === 'string' ? obj['i18nKey'] as string : '';
          const fallback = typeof obj['fallback'] === 'string' ? obj['fallback'] as string : undefined;
          dst[field] = { i18nKey, fallback };
          continue;
        }
        if (typeof existing === 'string' && existing.trim()) {
          dst[field] = { i18nKey: existing, fallback: existing };
          continue;
        }
        // snake_case mirror: <field>_key + <field>_fallback
        const snakeKey = src[`${field}_key`];
        const snakeFallback = src[`${field}_fallback`];
        if (typeof snakeKey === 'string' && snakeKey.trim()) {
          dst[field] = {
            i18nKey: snakeKey,
            fallback: typeof snakeFallback === 'string' ? snakeFallback : undefined,
          };
          continue;
        }
        // Last-ditch: ensure the field exists as an empty contract object so
        // template `.fallback ?? .i18nKey` chains never throw on undefined.
        if (existing === undefined || existing === null) {
          dst[field] = { i18nKey: '', fallback: undefined };
        }
      }
      out.push(dst as unknown as T);
    }
    return out;
  }

  private surfaceProp<T>(key: WorkspaceShellKey, propName: string): T | null {
    const row = this._surfaces().get(key);
    if (!row) return null;
    const props = row.props as Record<string, unknown> | undefined;
    const v = props?.[propName];
    return Array.isArray(v) ? (v as unknown as T) : null;
  }

  /**
   * Resolve a string-valued prop from a surface binding. Accepts either a
   * bare string, or a `WorkspaceI18nLabel` shape `{ i18nKey, fallback }`
   * (in which case `fallback` is returned; `i18nKey` is host-resolved).
   */
  private stringProp(key: WorkspaceShellKey, propName: string): string | null {
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
}
