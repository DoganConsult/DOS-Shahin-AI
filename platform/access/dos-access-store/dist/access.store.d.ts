import type { AccessSnapshot, AccessTenant, MeResponse, Permission } from './access.types';
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
export declare class AccessStore {
    private readonly http;
    private readonly cfg;
    private readonly _permissions;
    private readonly _roles;
    private readonly _modules;
    private readonly _tenantId;
    private readonly _me;
    private readonly _loaded;
    private readonly _error;
    private readonly _trialStatus;
    private readonly _trialDays;
    private readonly _trialExpired;
    private readonly _trialLimitsHit;
    readonly permissions: import("@angular/core").Signal<string[]>;
    readonly roles: import("@angular/core").Signal<string[]>;
    readonly modules: import("@angular/core").Signal<string[]>;
    readonly tenantId: import("@angular/core").Signal<string>;
    readonly me: import("@angular/core").Signal<MeResponse>;
    readonly loaded: import("@angular/core").Signal<boolean>;
    readonly trialStatus: import("@angular/core").Signal<string>;
    readonly trialDays: import("@angular/core").Signal<number>;
    readonly trialExpiredModules: import("@angular/core").Signal<string[]>;
    readonly trialLimitsHitModules: import("@angular/core").Signal<string[]>;
    readonly error: import("@angular/core").Signal<string>;
    /** Convenience: current tenant block from /me, or null. */
    readonly tenant: import("@angular/core").Signal<AccessTenant>;
    /** True for tenant-admin, tenant-owner, or platform-admin role variants. */
    readonly isTenantAdmin: import("@angular/core").Signal<boolean>;
    /** Cohesive snapshot of the session for callers that prefer one read. */
    readonly snapshot: import("@angular/core").Signal<AccessSnapshot>;
    hasPermission(perm: Permission): boolean;
    /** Idempotent. Safe to call from multiple components on first navigation. */
    load(): Promise<void>;
    /** Forces a refresh — used by mutations that may have changed permissions. */
    reload(): Promise<void>;
    private fetchPermissions;
    private fetchMe;
    /**
     * Phase G T5 — pull current trial summary so the nav adapter can emit
     * trial-aware reasons (trial-expired / trial-limit-reached). Best-effort:
     * a missing/failing endpoint is normal for non-tenant users (404) and
     * must NOT block load(). The shape mirrors getTrialSummary() in
     * services/tenant-service/src/domain/trial-bundle.ts.
     */
    private fetchTrialSummary;
    private url;
    private getJson;
    private parsePermissionsBody;
}
