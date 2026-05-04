import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  ACCESS_STORE_CONFIG,
  DEFAULT_ACCESS_STORE_CONFIG,
  type AccessStoreConfig,
} from './access.config';
import type {
  AccessSnapshot,
  AccessTenant,
  MeResponse,
  ModuleCode,
  MyPermissionsPayload,
  Permission,
} from './access.types';

const ADMIN_HINTS = new Set([
  'tenant_admin',
  'platform_admin',
  'platform_super_admin',
  'superadmin',
  'tenant_owner',
  'owner',
]);

/**
 * Canonical platform-tier session/access store.
 *
 * Holds the current authenticated user, tenant context, roles, permissions,
 * and entitled modules. Single source of truth for every product workspace.
 *
 * Source endpoints (configurable via {@link ACCESS_STORE_CONFIG}):
 *   - `GET /api/access/my-permissions` → roles, permissions, modules, tenantId
 *   - `GET /api/tenants/me`            → user + tenant + membership
 *
 * Cookie-based session; no token math here. On 401 the store optionally
 * redirects to the configured login URL (override or disable per product).
 */
@Injectable({ providedIn: 'root' })
export class AccessStore {
  private readonly http = inject(HttpClient);
  private readonly cfg: Required<AccessStoreConfig> = {
    ...DEFAULT_ACCESS_STORE_CONFIG,
    ...(inject(ACCESS_STORE_CONFIG, { optional: true }) ?? {}),
  };

  private readonly _permissions = signal<Permission[]>([]);
  private readonly _roles = signal<string[]>([]);
  private readonly _modules = signal<ModuleCode[]>([]);
  private readonly _tenantId = signal<string | null>(null);
  private readonly _me = signal<MeResponse | null>(null);
  private readonly _loaded = signal(false);
  private readonly _error = signal<string | null>(null);
  // Phase G T5 — trial-state signals consumed by workspace-navigation.adapter
  // to emit 'trial-expired' / 'trial-limit-reached' on module nav items.
  // Foundation is platform DNA (tier='dna') and bypasses trial gating.
  private readonly _trialStatus     = signal<string | null>(null);
  private readonly _trialDays       = signal<number | null>(null);
  private readonly _trialExpired    = signal<ModuleCode[]>([]);
  private readonly _trialLimitsHit  = signal<ModuleCode[]>([]);
  // §B.9 #34/#35 — session expiry and impersonation signals for shell banners.
  private readonly _sessionExpiresAt = signal<string | null>(null);
  private readonly _isImpersonating   = signal(false);

  readonly permissions = this._permissions.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly modules = this._modules.asReadonly();
  readonly tenantId = this._tenantId.asReadonly();
  readonly me = this._me.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly trialStatus    = this._trialStatus.asReadonly();
  readonly trialDays      = this._trialDays.asReadonly();
  readonly trialExpiredModules = this._trialExpired.asReadonly();
  readonly trialLimitsHitModules = this._trialLimitsHit.asReadonly();
  readonly error = this._error.asReadonly();
  readonly sessionExpiresAt = this._sessionExpiresAt.asReadonly();
  readonly isImpersonating   = this._isImpersonating.asReadonly();

  /** Convenience: current tenant block from /me, or null. */
  readonly tenant = computed<AccessTenant | null>(() => this._me()?.tenant ?? null);

  /** True for tenant-admin, tenant-owner, or platform-admin role variants. */
  readonly isTenantAdmin = computed(() => {
    if (this._me()?.membership?.isOwner === true) return true;
    return this._roles().some((r) => {
      const n = String(r).toLowerCase().trim();
      if (ADMIN_HINTS.has(n)) return true;
      if (n.endsWith('_admin')) return true;
      if (n.includes('owner') && n.includes('tenant')) return true;
      return false;
    });
  });

  /** Cohesive snapshot of the session for callers that prefer one read. */
  readonly snapshot = computed<AccessSnapshot>(() => ({
    loaded: this._loaded(),
    user: this._me()?.user ?? null,
    tenant: this._me()?.tenant ?? null,
    roles: this._roles(),
    permissions: this._permissions(),
    modules: this._modules(),
    isTenantAdmin: this.isTenantAdmin(),
    error: this._error(),
  }));

  hasPermission(perm: Permission): boolean {
    const needle = String(perm).toLowerCase().trim();
    const perms = this._permissions();
    for (const p of perms) {
      const pn = String(p).toLowerCase().trim();
      if (pn === needle) return true;
      if (pn === '*') return true;
      if (pn.endsWith('.*') && needle.startsWith(pn.slice(0, -1))) return true;
    }
    return false;
  }

  /** Convenience alias matching the legacy `can(perm)` shape. */
  can(perm: Permission): boolean {
    return this.hasPermission(perm);
  }

  hasAnyPermission(perms: readonly Permission[]): boolean {
    for (const p of perms) if (this.hasPermission(p)) return true;
    return false;
  }

  hasAllPermissions(perms: readonly Permission[]): boolean {
    for (const p of perms) if (!this.hasPermission(p)) return false;
    return true;
  }

  /** Tenant-entitled module check. Foundation (DNA) is always true. */
  canAccessModule(moduleCode: ModuleCode): boolean {
    const m = String(moduleCode).toLowerCase().trim();
    if (m === 'foundation') return true;
    return this._modules().some((x) => String(x).toLowerCase().trim() === m);
  }

  hasRole(role: string): boolean {
    const r = String(role).toLowerCase().trim();
    return this._roles().some((x) => String(x).toLowerCase().trim() === r);
  }

  hasAnyRole(roles: readonly string[]): boolean {
    for (const r of roles) if (this.hasRole(r)) return true;
    return false;
  }

  // ===================================================================
  // M3 migration compat layer.
  //
  // Aliases preserved verbatim so legacy consumers in `platform/core/*`,
  // `platform/config-center/*`, and `platform/foundation/ui/*` can swap
  // their import path from `…/dauth/access/access.store` to
  // `@dos/access-store` without changing call sites. Deletion ledger
  // path: these aliases are removed in M3 D5 once consumer migration
  // is complete and `pnpm forbid-legacy-accessstore-aliases` passes.
  // ===================================================================

  /** Compat: legacy `roles()` alias used by AuthZ payload builders. */
  readonly functionalRoles = this._roles.asReadonly();
  /** Compat: legacy `modules()` alias. */
  readonly visibleModules  = this._modules.asReadonly();
  /** Compat: legacy `isTenantAdmin` boolean as function-style. */
  readonly isAdmin = computed(() => this.isTenantAdmin());
  /** Compat: legacy `accessProfiles` (treat roles as profiles in absence of separate channel). */
  readonly accessProfiles = this._roles.asReadonly();
  /** Compat: derived account status from tenant block; defaults active. */
  readonly accountStatus = computed<string>(() => this._me()?.tenant?.status ?? 'active');
  /** Compat: scope bindings — empty until source-of-truth lands in M4 BFF. */
  readonly scopeBindings = computed<ReadonlyArray<{scopeType:string;scopeId:string;roleCode:string;moduleCode?:string}>>(() => []);
  /** Compat: decision authorities — empty until SoD module lands in M13. */
  readonly decisionAuthorities = computed<ReadonlyArray<string>>(() => []);
  /** Compat: allowed dashboards — empty until dashboard registry lands. */
  readonly allowedDashboards = computed<ReadonlyArray<string>>(() => []);

  /** Compat: legacy `landingPage()` function shape. */
  landingPage(): string {
    if (this.isTenantAdmin()) {
      const isPlatformAdmin = this._roles().some((r) => {
        const n = String(r).toLowerCase().trim();
        return n === 'platform_admin' || n === 'platform_super_admin' || n === 'platform_owner' || n === 'dos_admin';
      });
      if (isPlatformAdmin) return '/admin-hub';
    }
    return '/workspace-home';
  }

  /** Compat: legacy `hasAuthority(code)` — proxy to permission check. */
  hasAuthority(code: string): boolean {
    return this.hasPermission(code);
  }
  /** Compat: legacy module access alias. */
  hasModuleAccess(moduleCode: ModuleCode): boolean {
    return this.canAccessModule(moduleCode);
  }
  /** Compat: legacy super-admin alias. */
  isSuperAdmin(): boolean {
    return this.isTenantAdmin();
  }
  /** Compat: legacy dashboard access — returns true unless registry blocks. */
  canAccessDashboard(_dashboardCode: string): boolean {
    return this.isTenantAdmin();
  }
  /** Compat: legacy scope-by-role lookup; empty until M4. */
  getScopeForRole(_roleCode: string): ReadonlyArray<{scopeType:string;scopeId:string;roleCode:string}> {
    return [];
  }

  /**
   * Compat: legacy `setSnapshot(...)` test seam used by component specs.
   * Production code paths MUST go through `load()`; this exists ONLY so
   * legacy spec stubs that hand-feed snapshots keep passing across the
   * import swap.
   */
  setSnapshot(data: {
    permissions?: Permission[];
    visibleModules?: ModuleCode[];
    modules?: ModuleCode[];
    functionalRoles?: string[];
    roles?: string[];
    accessProfiles?: string[];
    accountStatus?: string;
    isAdmin?: boolean;
    scopeBindings?: unknown[];
    decisionAuthorities?: string[];
    allowedDashboards?: string[];
    landingPage?: string;
    tenantId?: string;
  }): void {
    if (data.permissions !== undefined) this._permissions.set(data.permissions);
    const mods = data.modules ?? data.visibleModules;
    if (mods !== undefined) this._modules.set(mods);
    const roles = data.roles ?? data.functionalRoles;
    if (roles !== undefined) this._roles.set(roles);
    if (data.tenantId !== undefined) this._tenantId.set(data.tenantId);
    this._loaded.set(true);
    this._error.set(null);
  }

  /** Compat: legacy `clear()` used by sign-out flows. */
  clear(): void {
    this._permissions.set([]);
    this._roles.set([]);
    this._modules.set([]);
    this._tenantId.set(null);
    this._me.set(null);
    this._trialStatus.set(null);
    this._trialDays.set(null);
    this._trialExpired.set([]);
    this._trialLimitsHit.set([]);
    this._sessionExpiresAt.set(null);
    this._isImpersonating.set(false);
    this._error.set(null);
    this._loaded.set(false);
  }

  /** Idempotent. Safe to call from multiple components on first navigation. */
  async load(): Promise<void> {
    if (this._loaded()) return;
    try {
      const [perms, me, trial] = await Promise.all([
        this.fetchPermissions(),
        this.fetchMe(),
        this.fetchTrialSummary(),
      ]);
      if (perms) {
        this._roles.set(perms.roles ?? []);
        this._permissions.set(perms.permissions ?? []);
        this._modules.set(perms.modules ?? []);
        this._tenantId.set(perms.tenantId ?? null);
      }
      if (me) {
        this._me.set(me);
        // §B.9 #34/#35 — populate session expiry and impersonation flags from /me membership.
        this._sessionExpiresAt.set(me.membership?.sessionExpiresAt ?? null);
        this._isImpersonating.set(me.membership?.isImpersonating === true);
      }
      if (trial) {
        this._trialStatus.set(trial.status ?? null);
        this._trialDays.set(typeof trial.daysRemaining === 'number' ? trial.daysRemaining : null);
        this._trialExpired.set(trial.expiredModules ?? []);
        this._trialLimitsHit.set(trial.limitsHit ?? []);
      }
      this._loaded.set(true);
    } catch (err) {
      this._error.set((err as Error)?.message ?? 'Permission load failed');
      // Mark loaded so guards can decide; downstream pages render empty
      // rather than spinning forever.
      this._loaded.set(true);
    }
  }

  /** Forces a refresh — used by mutations that may have changed permissions. */
  async reload(): Promise<void> {
    this._loaded.set(false);
    await this.load();
  }

  private async fetchPermissions(): Promise<MyPermissionsPayload | null> {
    try {
      const body = await this.getJson<unknown>(this.url(this.cfg.myPermissionsPath));
      return this.parsePermissionsBody(body);
    } catch {
      return null;
    }
  }

  private async fetchMe(): Promise<MeResponse | null> {
    try {
      return await this.getJson<MeResponse>(this.url(this.cfg.mePath));
    } catch {
      return null;
    }
  }

  /**
   * Phase G T5 — pull current trial summary so the nav adapter can emit
   * trial-aware reasons (trial-expired / trial-limit-reached). Best-effort:
   * a missing/failing endpoint is normal for non-tenant users (404) and
   * must NOT block load(). The shape mirrors getTrialSummary() in
   * services/tenant-service/src/domain/trial-bundle.ts.
   */
  private async fetchTrialSummary(): Promise<{
    hasTrial?: boolean;
    status?: string;
    daysRemaining?: number;
    expiredModules?: string[];
    limitsHit?: string[];
  } | null> {
    try {
      const body = await this.getJson<unknown>(this.url('/api/trials/current'));
      if (!body || typeof body !== 'object') return null;
      const o = body as Record<string, unknown>;
      const trial = (o['trial'] as Record<string, unknown> | undefined) ?? {};
      return {
        hasTrial:        Boolean(o['hasTrial']),
        status:          typeof trial['status'] === 'string' ? (trial['status'] as string) : undefined,
        daysRemaining:   typeof o['daysRemaining'] === 'number' ? (o['daysRemaining'] as number) : undefined,
        expiredModules:  Array.isArray(o['expiredModules']) ? (o['expiredModules'] as string[]) : [],
        limitsHit:       Array.isArray(o['limitsHit']) ? (o['limitsHit'] as string[]) : [],
      };
    } catch {
      return null;
    }
  }

  private url(path: string): string {
    if (!this.cfg.baseUrl) return path;
    return `${this.cfg.baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private getJson<T>(url: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.http.get<T>(url, { withCredentials: true }).subscribe({
        next: resolve,
        error: (err) => {
          if (err?.status === 401 && this.cfg.loginRedirectUrl && typeof window !== 'undefined') {
            window.location.href = this.cfg.loginRedirectUrl;
          }
          reject(err);
        },
      });
    });
  }

  private parsePermissionsBody(body: unknown): MyPermissionsPayload | null {
    if (!body || typeof body !== 'object') return null;
    const o = body as Record<string, unknown>;
    const inner =
      o['data'] !== undefined && typeof o['data'] === 'object'
        ? (o['data'] as Record<string, unknown>)
        : o;
    return {
      tenantId: typeof inner['tenantId'] === 'string' ? (inner['tenantId'] as string) : undefined,
      roles: Array.isArray(inner['roles']) ? (inner['roles'] as string[]) : [],
      permissions: Array.isArray(inner['permissions']) ? (inner['permissions'] as string[]) : [],
      modules: Array.isArray(inner['modules']) ? (inner['modules'] as string[]) : [],
    };
  }
}
