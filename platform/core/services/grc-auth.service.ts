/**
 * GRC Auth Service — AGRC-OS (Facade)
 * Session management, login/logout, token refresh, and computed signals.
 *
 * Role logic split to → GrcRoleService
 * Permission logic split to → GrcPermissionService
 *
 * This facade re-exports all types/constants and delegates role/permission
 * checks so that existing ~50 consumers require no import changes.
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TimeoutError, firstValueFrom, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { WebSocketService } from '@app/websocket';
import { environment } from '@env/environment';
import { StorageService } from '@app/infrastructure';
import { AuthzClientService } from './authz-client.service';
import { GrcRoleService } from './grc-role.service';
import { GrcPermissionService } from './grc-permission.service';
import { ActorIdentityService } from './actor-identity.service';
import { SESSION_BOOTSTRAP_HTTP_TIMEOUT_MS } from './platform/bootstrap-timeouts';

// ── Re-exports for backward compatibility ──
export { GrcRoleService, GrcRole, GrcUserProfile, GrcAccessTokenClaims, ROLE_PRIORITY, FULL_ACCESS_ROLES, mapHighestRole, extractUserProfile } from './grc-role.service';
export { GrcPermissionService, PERMISSION_MAP, LEGACY_TO_ENTERPRISE_FE, checkPermission } from './grc-permission.service';

import type { GrcRole, GrcUserProfile } from './grc-role.service';
import { ROLE_PRIORITY } from './grc-role.service';

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class GrcAuthService {
  private router = inject(Router);
  private wsService = inject(WebSocketService);
  private http = inject(HttpClient);
  private _storage = inject(StorageService);
  private _authzClient = inject(AuthzClientService);
  private _roleService = inject(GrcRoleService);
  private _permissionService = inject(GrcPermissionService);
  private _actorIdentity = inject(ActorIdentityService);

  private _isLoggedIn = signal(false);
  private _userProfile = signal<GrcUserProfile | null>(null);
  private _refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private _profileLoadPromise: Promise<unknown> | null = null;

  isLoggedIn = this._isLoggedIn.asReadonly();
  userProfile = this._userProfile.asReadonly();
  currentRole = computed<string>(() => this._userProfile()?.highestRole ?? 'viewer');
  tenantId = computed<string | null>(() => this._userProfile()?.tenantId ?? null);

  constructor() {
    /* No localStorage bootstrap — auth state is hydrated from the
       httpOnly cookie via hydrateFromCookieSession() in init(). */
  }

  /**
   * Persist non-sensitive display metadata for legacy callers. The token
   * is intentionally ignored — auth truth is the httpOnly `dos_access_token`
   * cookie set by auth-service. Calling this method MUST NOT make the SPA
   * appear logged-in by itself; that flips only after
   * hydrateFromCookieSession() validates the cookie server-side.
   */
  setSession(data: {
    token?: string;
    refreshToken?: string;
    tenantId: string;
    role: string;
    userName?: string;
    orgName?: string;
    isSuperAdmin?: boolean;
    productKey?: string;
    enterpriseAuthz?: { accessProfiles: string[]; permissions: string[]; scopes: { moduleCode: string; scopeType: string; scopeId: number | null }[]; functionalRoles: string[] } | null;
  }): void {
    this._storage.set('grc_tenantId', data.tenantId);
    this._storage.set('grc_role', data.role);
    if (data.userName) this._storage.set('grc_userName', data.userName);
    if (data.orgName) this._storage.set('grc_orgName', data.orgName);
    if (data.isSuperAdmin != null) this._storage.set('grc_isSuperAdmin', String(data.isSuperAdmin));
    if (data.productKey) this._storage.set('grc_productKey', data.productKey);
    if (data.enterpriseAuthz && data.enterpriseAuthz.permissions?.length > 0) {
      this._authzClient.setAuthorization({
        accessProfiles: data.enterpriseAuthz.accessProfiles,
        permissions: data.enterpriseAuthz.permissions,
        scopes: data.enterpriseAuthz.scopes.map(s => typeof s === 'string' ? s : s.moduleCode),
        functionalRoles: data.enterpriseAuthz.functionalRoles,
      });
    } else {
      this._authzClient.loadPermissions().catch((e: unknown) => { console.warn('[GrcAuth] loadPermissions failed:', e); });
    }
    const profile = this._userProfile();
    if (profile?.userId) {
      this._profileLoadPromise = this._actorIdentity.loadProfile(profile.userId).catch((e: unknown) => {
        console.warn('[GrcAuth] canonical profile load failed:', e);
      });
    }
  }

  async waitForProfileLoad(): Promise<void> {
    if (this._profileLoadPromise) {
      await this._profileLoadPromise;
    }
  }

  getProductKey(): string { return this._storage.get('grc_productKey') || 'agrc'; }

  async init(): Promise<void> {
    if (!this._isLoggedIn()) {
      // Cookie-backed session probe. The OIDC callback sets `dos_access_token`
      // as httpOnly+Secure, so the SPA cannot read it directly; this call asks
      // auth-service to validate the cookie server-side and return sanitized
      // session metadata. No token leaves the server.
      await this.hydrateFromCookieSession().catch((e: unknown) => {
        console.warn('[GrcAuth] cookie session hydration failed:', e);
      });
    }
    if (!this._isLoggedIn()) {
      this._authzClient.clear();
      return;
    }
    await this._authzClient.loadPermissions().catch((e: unknown) => { console.warn('[GrcAuth] init loadPermissions failed:', e); });
    const profile = this._userProfile();
    if (profile?.userId) {
      await this._actorIdentity.loadProfile(profile.userId).catch((e: unknown) => {
        console.warn('[GrcAuth] init canonical profile load failed:', e);
      });
    }
  }

  login(): void { this.router.navigate(['/login']); }

  logout(reason?: string): void {
    const tid = this.tenantId() || '';
    if (reason) {
      this._storage.set('grc_logout_reason', reason);
    }
    this.wsService.disconnect();
    this._isLoggedIn.set(false);
    this._userProfile.set(null);
    if (this._refreshTimer) { clearTimeout(this._refreshTimer); this._refreshTimer = null; }
    // Clear non-sensitive display metadata. The httpOnly access/refresh
    // cookies are owned by auth-service and cleared by /api/auth/oidc/logout.
    this._storage.remove('grc_userId');
    this._storage.remove('grc_tenantId');
    this._storage.remove('grc_role');
    this._storage.remove('grc_userName');
    this._storage.remove('grc_orgName');
    this._storage.remove('grc_isSuperAdmin');
    this._storage.remove('grc_onboarding_complete');
    if (tid) {
      this._storage.remove(`grc_onboarding_complete_${tid}`);
    }
    this._storage.remove('grc_must_change_password');
    this._storage.remove('grc_productKey');
    this._storage.remove('grc_token');
    this._storage.remove('grc_refreshToken');
    this._permissionService.clearCache();
    this._actorIdentity.clearCache();
    this._authzClient.clear();
    this.http.post(`${environment.apiUrl}/auth/oidc/logout`, {}, { withCredentials: true })
      .subscribe({ error: () => {} });
    this.router.navigate(['/login']);
  }

  /** @deprecated SPA must not read tokens; returns null. */
  getAccessToken(): string | null { return null; }
  /** @deprecated SPA must not read tokens; returns ''. */
  async getToken(): Promise<string> { return ''; }

  // ── Delegated to GrcRoleService ──
  hasRole(role: string): boolean {
    const profile = this._userProfile();
    if (!profile) return false;
    return (ROLE_PRIORITY[profile.highestRole] ?? 0) >= (ROLE_PRIORITY[role] ?? 0);
  }

  getRoleLandingPage(): string { return this._roleService.getRoleLandingPage(); }
  /** @deprecated Use BootstrapStore.modules() (canonical navigation.visibleModules) instead. */
  getRoleModules(): string[] { return this._roleService.getRoleModules(); }

  // ── Delegated to GrcPermissionService ──
  hasPermission(permission: string): boolean { return this._permissionService.hasPermission(permission); }
  hasEnterprisePermission(code: string): boolean { return this._permissionService.hasEnterprisePermission(code); }
  canAccessModule(moduleCode: string): boolean { return this._permissionService.canAccessModule(moduleCode); }
  async hasFunction(functionCode: string): Promise<boolean> { return this._permissionService.hasFunction(functionCode); }

  isOnboardingComplete(): boolean {
    const profile = this._actorIdentity.profile();
    if (profile?.completeness) {
      return profile.completeness.percentage >= 80 && profile.completeness.blockingFields.length === 0;
    }
    const tid = this.tenantId() || '';
    const key = tid ? `grc_onboarding_complete_${tid}` : 'grc_onboarding_complete';
    return this._storage.get(key) === 'true';
  }

  setOnboardingComplete(complete: boolean): void {
    const value = String(complete);
    const tid = this.tenantId() || '';
    this._storage.set('grc_onboarding_complete', value);
    if (tid) {
      this._storage.set(`grc_onboarding_complete_${tid}`, value);
    }
  }

  // ── Cookie-backed session hydration for the OIDC browser flow ──
  // The access + refresh tokens stay in httpOnly+Secure cookies on the
  // browser. This method asks auth-service to validate the cookie
  // server-side (signature, exp, iss, aud via JWKS) and return sanitized
  // display + routing metadata. NO token is ever returned or stored.
  private async hydrateFromCookieSession(): Promise<void> {
    interface SessionPayload {
      authenticated: boolean;
      user?: { id: string; email: string | null; name: string | null };
      tenant?: { id: string | null; name: string | null; slug: string | null };
      workspace?: { route?: string };
      role?: string | null;
      isSuperAdmin?: boolean;
      permissions?: string[];
    }
    let res: SessionPayload | null = null;
    try {
      res = await firstValueFrom(
        this.http
          .get<SessionPayload>(`${environment.apiUrl}/auth/oidc/session`, { withCredentials: true })
          .pipe(
            timeout(SESSION_BOOTSTRAP_HTTP_TIMEOUT_MS),
            catchError((err: unknown) => {
              if (err instanceof TimeoutError) {
                console.warn(
                  `[GrcAuth] /auth/oidc/session exceeded ${SESSION_BOOTSTRAP_HTTP_TIMEOUT_MS}ms — check /api proxy and auth-service (Keycloak return flow)`,
                );
              } else {
                console.warn('[GrcAuth] /auth/oidc/session failed:', err);
              }
              return of(null);
            }),
          ),
      );
    } catch {
      return;
    }
    if (!res?.authenticated || !res.user?.id) return;

    // Persist only non-sensitive display metadata. NEVER persist a token.
    this._storage.set('grc_userId', res.user.id);
    if (res.user.name)  this._storage.set('grc_userName', String(res.user.name));
    if (res.tenant?.id) this._storage.set('grc_tenantId', String(res.tenant.id));
    if (res.role)       this._storage.set('grc_role', String(res.role));
    if (res.isSuperAdmin === true) this._storage.set('grc_isSuperAdmin', 'true');

    const role = res.role || 'viewer';
    this._userProfile.set({
      userId: res.user.id,
      roles: [{ code: role, label: role.replace(/_/g, ' '), priority: ROLE_PRIORITY[role] ?? 0 }],
      highestRole: role,
      email: res.user.email || '',
      name: res.user.name || res.user.email || '',
      tenantId: res.tenant?.id || '',
      isSuperAdmin: res.isSuperAdmin === true,
    });
    this._isLoggedIn.set(true);

    // Cookie-authenticated WebSocket. The browser sends `dos_access_token`
    // automatically on the upgrade request; the gateway validates it via
    // Keycloak JWKS before completing the handshake. No token is taken
    // from JS storage.
    queueMicrotask(() => {
      try { this.wsService.connect('/ws'); } catch { /* ignore */ }
    });
  }

  // ── Token refresh ──
  // The browser has no access to the access token; refresh is performed
  // server-side via the httpOnly refresh-token cookie. /oidc/refresh
  // rotates the cookies and returns no token to the SPA.
  async refreshToken(_minValidity = 60): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http
          .post(`${environment.apiUrl}/auth/oidc/refresh`, {}, { withCredentials: true })
          .pipe(
            timeout(SESSION_BOOTSTRAP_HTTP_TIMEOUT_MS),
            catchError((err: unknown) => {
              if (err instanceof TimeoutError) {
                console.warn(
                  `[GrcAuth] /auth/oidc/refresh exceeded ${SESSION_BOOTSTRAP_HTTP_TIMEOUT_MS}ms`,
                );
              }
              throw err;
            }),
          ),
      );
      return true;
    } catch { /* Refresh failed */ }
    this.logout();
    return false;
  }

  refreshIfExpiringSoon(_thresholdMs = 5 * 60 * 1000): void {
    /* no-op — refresh cadence is owned by auth-service */
  }

  scheduleTokenRefresh(): void {
    if (this._refreshTimer) { clearTimeout(this._refreshTimer); this._refreshTimer = null; }
    /* no-op — auth-service drives refresh cadence via httpOnly cookies */
  }

  mustChangePassword(): boolean {
    return this._storage.get('grc_must_change_password') === 'true';
  }
  setMustChangePassword(val: boolean): void {
    this._storage.set('grc_must_change_password', String(val));
  }
  clearMustChangePassword(): void {
    this._storage.remove('grc_must_change_password');
  }
}
