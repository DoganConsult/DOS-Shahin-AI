var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ACCESS_STORE_CONFIG, DEFAULT_ACCESS_STORE_CONFIG, } from './access.config';
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
let AccessStore = class AccessStore {
    http = inject(HttpClient);
    cfg = {
        ...DEFAULT_ACCESS_STORE_CONFIG,
        ...(inject(ACCESS_STORE_CONFIG, { optional: true }) ?? {}),
    };
    _permissions = signal([]);
    _roles = signal([]);
    _modules = signal([]);
    _tenantId = signal(null);
    _me = signal(null);
    _loaded = signal(false);
    _error = signal(null);
    // Phase G T5 — trial-state signals consumed by workspace-navigation.adapter
    // to emit 'trial-expired' / 'trial-limit-reached' on module nav items.
    // Foundation is platform DNA (tier='dna') and bypasses trial gating.
    _trialStatus = signal(null);
    _trialDays = signal(null);
    _trialExpired = signal([]);
    _trialLimitsHit = signal([]);
    permissions = this._permissions.asReadonly();
    roles = this._roles.asReadonly();
    modules = this._modules.asReadonly();
    tenantId = this._tenantId.asReadonly();
    me = this._me.asReadonly();
    loaded = this._loaded.asReadonly();
    trialStatus = this._trialStatus.asReadonly();
    trialDays = this._trialDays.asReadonly();
    trialExpiredModules = this._trialExpired.asReadonly();
    trialLimitsHitModules = this._trialLimitsHit.asReadonly();
    error = this._error.asReadonly();
    /** Convenience: current tenant block from /me, or null. */
    tenant = computed(() => this._me()?.tenant ?? null);
    /** True for tenant-admin, tenant-owner, or platform-admin role variants. */
    isTenantAdmin = computed(() => {
        if (this._me()?.membership?.isOwner === true)
            return true;
        return this._roles().some((r) => {
            const n = String(r).toLowerCase().trim();
            if (ADMIN_HINTS.has(n))
                return true;
            if (n.endsWith('_admin'))
                return true;
            if (n.includes('owner') && n.includes('tenant'))
                return true;
            return false;
        });
    });
    /** Cohesive snapshot of the session for callers that prefer one read. */
    snapshot = computed(() => ({
        loaded: this._loaded(),
        user: this._me()?.user ?? null,
        tenant: this._me()?.tenant ?? null,
        roles: this._roles(),
        permissions: this._permissions(),
        modules: this._modules(),
        isTenantAdmin: this.isTenantAdmin(),
        error: this._error(),
    }));
    hasPermission(perm) {
        return this._permissions().includes(perm);
    }
    /** Idempotent. Safe to call from multiple components on first navigation. */
    async load() {
        if (this._loaded())
            return;
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
            if (me)
                this._me.set(me);
            if (trial) {
                this._trialStatus.set(trial.status ?? null);
                this._trialDays.set(typeof trial.daysRemaining === 'number' ? trial.daysRemaining : null);
                this._trialExpired.set(trial.expiredModules ?? []);
                this._trialLimitsHit.set(trial.limitsHit ?? []);
            }
            this._loaded.set(true);
        }
        catch (err) {
            this._error.set(err?.message ?? 'Permission load failed');
            // Mark loaded so guards can decide; downstream pages render empty
            // rather than spinning forever.
            this._loaded.set(true);
        }
    }
    /** Forces a refresh — used by mutations that may have changed permissions. */
    async reload() {
        this._loaded.set(false);
        await this.load();
    }
    async fetchPermissions() {
        try {
            const body = await this.getJson(this.url(this.cfg.myPermissionsPath));
            return this.parsePermissionsBody(body);
        }
        catch {
            return null;
        }
    }
    async fetchMe() {
        try {
            return await this.getJson(this.url(this.cfg.mePath));
        }
        catch {
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
    async fetchTrialSummary() {
        try {
            const body = await this.getJson(this.url('/api/trials/current'));
            if (!body || typeof body !== 'object')
                return null;
            const o = body;
            const trial = o['trial'] ?? {};
            return {
                hasTrial: Boolean(o['hasTrial']),
                status: typeof trial['status'] === 'string' ? trial['status'] : undefined,
                daysRemaining: typeof o['daysRemaining'] === 'number' ? o['daysRemaining'] : undefined,
                expiredModules: Array.isArray(o['expiredModules']) ? o['expiredModules'] : [],
                limitsHit: Array.isArray(o['limitsHit']) ? o['limitsHit'] : [],
            };
        }
        catch {
            return null;
        }
    }
    url(path) {
        if (!this.cfg.baseUrl)
            return path;
        return `${this.cfg.baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
    }
    getJson(url) {
        return new Promise((resolve, reject) => {
            this.http.get(url, { withCredentials: true }).subscribe({
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
    parsePermissionsBody(body) {
        if (!body || typeof body !== 'object')
            return null;
        const o = body;
        const inner = o['data'] !== undefined && typeof o['data'] === 'object'
            ? o['data']
            : o;
        return {
            tenantId: typeof inner['tenantId'] === 'string' ? inner['tenantId'] : undefined,
            roles: Array.isArray(inner['roles']) ? inner['roles'] : [],
            permissions: Array.isArray(inner['permissions']) ? inner['permissions'] : [],
            modules: Array.isArray(inner['modules']) ? inner['modules'] : [],
        };
    }
};
AccessStore = __decorate([
    Injectable({ providedIn: 'root' })
], AccessStore);
export { AccessStore };
//# sourceMappingURL=access.store.js.map