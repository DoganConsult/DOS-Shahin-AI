import type { AccessSnapshot, AccessTenant, MeResponse, ModuleCode, Permission } from './access.types';
/**
 * Canonical platform-tier session/access store.
 *
 * Holds the current authenticated user, tenant context, roles, permissions,
 * and entitled modules. Single source of truth for every product workspace.
 *
 * Source endpoints (configurable via {@link ACCESS_STORE_CONFIG}):
 *   - `GET /api/access/my-permissions` → roles, permissions, modules, tenantId
 *   - `GET /api/tenants/me`            → user + tenant + membership
 *   - `GET <trialSummaryPath>`         → optional trial summary; disabled by
 *     default so workspace bootstrap does not call `/api/trials/current`
 *     directly.
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
    private readonly _sessionExpiresAt;
    private readonly _isImpersonating;
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
    readonly sessionExpiresAt: import("@angular/core").Signal<string>;
    readonly isImpersonating: import("@angular/core").Signal<boolean>;
    /** Convenience: current tenant block from /me, or null. */
    readonly tenant: import("@angular/core").Signal<AccessTenant>;
    /** True for tenant-admin, tenant-owner, or platform-admin role variants. */
    readonly isTenantAdmin: import("@angular/core").Signal<boolean>;
    /** Cohesive snapshot of the session for callers that prefer one read. */
    readonly snapshot: import("@angular/core").Signal<AccessSnapshot>;
    hasPermission(perm: Permission): boolean;
    /** Convenience alias matching the legacy `can(perm)` shape. */
    can(perm: Permission): boolean;
    hasAnyPermission(perms: readonly Permission[]): boolean;
    hasAllPermissions(perms: readonly Permission[]): boolean;
    /** Tenant-entitled module check. Foundation (DNA) is always true. */
    canAccessModule(moduleCode: ModuleCode): boolean;
    hasRole(role: string): boolean;
    hasAnyRole(roles: readonly string[]): boolean;
    /** Compat: legacy `roles()` alias used by AuthZ payload builders. */
    readonly functionalRoles: import("@angular/core").Signal<string[]>;
    /** Compat: legacy `modules()` alias. */
    readonly visibleModules: import("@angular/core").Signal<string[]>;
    /** Compat: legacy `isTenantAdmin` boolean as function-style. */
    readonly isAdmin: import("@angular/core").Signal<boolean>;
    /** Compat: legacy `accessProfiles` (treat roles as profiles in absence of separate channel). */
    readonly accessProfiles: import("@angular/core").Signal<string[]>;
    /** Compat: derived account status from tenant block; defaults active. */
    readonly accountStatus: import("@angular/core").Signal<string>;
    /** Compat: scope bindings — empty until source-of-truth lands in M4 BFF. */
    readonly scopeBindings: import("@angular/core").Signal<readonly {
        scopeType: string;
        scopeId: string;
        roleCode: string;
        moduleCode?: string;
    }[]>;
    /** Compat: decision authorities — empty until SoD module lands in M13. */
    readonly decisionAuthorities: import("@angular/core").Signal<readonly string[]>;
    /** Compat: allowed dashboards — empty until dashboard registry lands. */
    readonly allowedDashboards: import("@angular/core").Signal<readonly string[]>;
    /** Compat: legacy `landingPage()` function shape. */
    landingPage(): string;
    /** Compat: legacy `hasAuthority(code)` — proxy to permission check. */
    hasAuthority(code: string): boolean;
    /** Compat: legacy module access alias. */
    hasModuleAccess(moduleCode: ModuleCode): boolean;
    /** Compat: legacy super-admin alias. */
    isSuperAdmin(): boolean;
    /** Compat: legacy dashboard access — returns true unless registry blocks. */
    canAccessDashboard(_dashboardCode: string): boolean;
    /** Compat: legacy scope-by-role lookup; empty until M4. */
    getScopeForRole(_roleCode: string): ReadonlyArray<{
        scopeType: string;
        scopeId: string;
        roleCode: string;
    }>;
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
    }): void;
    /** Compat: legacy `clear()` used by sign-out flows. */
    clear(): void;
    /** Idempotent. Safe to call from multiple components on first navigation. */
    load(): Promise<void>;
    /** Forces a refresh — used by mutations that may have changed permissions. */
    reload(): Promise<void>;
    private fetchPermissions;
    private fetchMe;
    /**
     * Optional trial summary. Disabled by default; products must opt in with
     * `trialSummaryPath` so workspace bootstrap stays on canonical access/BFF
     * sources instead of calling `/api/trials/current` directly.
     */
    private fetchTrialSummary;
    private url;
    private getJson;
    private parsePermissionsBody;
}
