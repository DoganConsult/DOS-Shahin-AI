import { Injectable, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TimeoutError, firstValueFrom, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { SESSION_BOOTSTRAP_HTTP_TIMEOUT_MS } from '../../core/services/platform/bootstrap-timeouts';
import { StorageService } from '@app/infrastructure';
import { AccessStore } from '../access/access.store';
import { GrcAuthService } from '../../core/services/grc-auth.service';
import { environment } from '@env/environment';

export interface SessionData {
  token?: string;
  refreshToken?: string;
  tenantId: string;
  role: string;
  userName?: string;
  orgName?: string;
  isSuperAdmin?: boolean;
  memberOnboarded?: boolean;
  enterpriseAuthz?: Record<string, unknown> | null;
}

/**
 * SessionService — thin compatibility wrapper around the cookie-hydrated
 * GrcAuthService. Login truth lives in the httpOnly `dos_access_token`
 * cookie; this service only exposes display metadata stored under non-
 * sensitive keys (grc_userId, grc_userName, grc_tenantId, grc_role,
 * grc_isSuperAdmin) and onboarding bookkeeping.
 *
 * It MUST NOT read or write `grc_token`, `grc_refreshToken`, or any value
 * that could be replayed as a bearer token. Token getters are kept as
 * compatibility no-ops so legacy callers compile but cannot leak a token.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private storage = inject(StorageService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private accessStore = inject(AccessStore);
  // Lazy resolution avoids the DI cycle GrcAuthService → … → SessionService
  // → GrcAuthService that breaks APP_INITIALIZER bootstrap (NG0200).
  private injector = inject(Injector);
  private _grcAuthRef: GrcAuthService | null = null;
  private get grcAuth(): GrcAuthService {
    if (!this._grcAuthRef) {
      this._grcAuthRef = this.injector.get(GrcAuthService);
    }
    return this._grcAuthRef;
  }

  tenantId(): string | null {
    return this.storage.get('grc_tenantId');
  }

  currentRole(): string | null {
    return this.storage.get('grc_role');
  }

  isAdminProfile(): boolean {
    return this.storage.get('grc_isSuperAdmin') === 'true';
  }

  userProfile(): { fullName: string | null; name: string | null; email: string | null; userId: string | null; role: string | null } {
    return {
      fullName: this.storage.get('grc_userName'),
      name: this.storage.get('grc_userName'),
      email: null,
      userId: this.storage.get('grc_userId'),
      role: this.storage.get('grc_role'),
    };
  }

  async init(): Promise<void> {
    /* no-op — cookie-backed session is hydrated by GrcAuthService.init() */
  }

  scheduleTokenRefresh(): void {
    /* no-op — refresh is owned by auth-service /oidc/refresh + cookie */
  }

  /** @deprecated Use AccessStore.hasPermission() directly. */
  hasPermission(permission: string): boolean {
    if (!this.accessStore.loaded()) return false;
    return this.accessStore.hasPermission(permission);
  }

  /** Single source of truth = cookie-hydrated GrcAuthService signal. */
  isLoggedIn(): boolean {
    return this.grcAuth.isLoggedIn();
  }

  login(): void {
    this.router.navigate(['/login']);
  }

  isOnboardingComplete(): boolean {
    const tenantId = this.tenantId() || '';
    const tenantScoped = tenantId ? this.storage.get(`grc_onboarding_complete_${tenantId}`) : null;
    return tenantScoped === 'true' || this.storage.get('grc_onboarding_complete') === 'true';
  }

  setOnboardingComplete(value: boolean): void {
    const serialized = value ? 'true' : 'false';
    const tenantId = this.tenantId() || '';
    this.storage.set('grc_onboarding_complete', serialized);
    if (tenantId) {
      this.storage.set(`grc_onboarding_complete_${tenantId}`, serialized);
    }
  }

  /**
   * Persists ONLY non-sensitive display metadata. Token/refreshToken
   * fields are accepted for API-shape compatibility but ignored — the
   * httpOnly cookie set by auth-service is the only source of auth truth.
   */
  setSession(data: SessionData): void {
    if (data.tenantId) this.storage.set('grc_tenantId', String(data.tenantId));
    if (data.role) this.storage.set('grc_role', String(data.role));
    if (data.userName) this.storage.set('grc_userName', String(data.userName));
    if (data.orgName) this.storage.set('grc_orgName', String(data.orgName));
    if (data.isSuperAdmin != null) this.storage.set('grc_isSuperAdmin', String(data.isSuperAdmin));
    if (data.memberOnboarded != null) {
      const serialized = data.memberOnboarded ? 'true' : 'false';
      this.storage.set('grc_member_onboarded', serialized);
      if (data.tenantId) {
        this.storage.set(`grc_member_onboarded_${data.tenantId}`, serialized);
      }
    }
    if (data.enterpriseAuthz != null) this.storage.set('grc_enterprise_authz', JSON.stringify(data.enterpriseAuthz));
  }

  async bootstrapAccessSnapshot(): Promise<boolean> {
    this.accessStore.clear();
    await this.accessStore.load();
    return this.accessStore.loaded();
  }

  setMinimalSession(data: { token?: string; tenantId: string; role: string }): void {
    if (data.tenantId) this.storage.set('grc_tenantId', data.tenantId);
    if (data.role) this.storage.set('grc_role', data.role);
  }

  setMustChangePassword(value: boolean): void {
    this.storage.set('grc_must_change_password', value ? 'true' : 'false');
  }

  clearMustChangePassword(): void {
    this.storage.remove('grc_must_change_password');
  }

  /**
   * Token getters are compatibility no-ops. The browser must NEVER hold
   * the access token; downstream HTTP must use `withCredentials` + cookie.
   */
  async getToken(): Promise<string> { return ''; }
  getTokenSync(): string | null { return null; }

  getTenantId(): string | null { return this.storage.get('grc_tenantId'); }
  getRole(): string | null { return this.storage.get('grc_role'); }
  getUserName(): string | null { return this.storage.get('grc_userName'); }
  getOrgName(): string | null { return this.storage.get('grc_orgName'); }

  async waitForProfileLoad(): Promise<void> { return Promise.resolve(); }

  refreshIfExpiringSoon(_thresholdMs = 2 * 60 * 1000): void {
    /* no-op — refresh is server-side via /api/auth/oidc/refresh */
  }

  logout(reason?: string): void {
    // Single path: GrcAuthService clears signals, access snapshot, legacy keys,
    // posts OIDC logout, and navigates to /login.
    this.grcAuth.logout(reason);
  }

  async loadSessionBootstrap(): Promise<Record<string, unknown>> {
    return firstValueFrom(
      this.http
        .get<Record<string, unknown>>(`${environment.apiUrl}/session/bootstrap`, { withCredentials: true })
        .pipe(
          timeout(SESSION_BOOTSTRAP_HTTP_TIMEOUT_MS),
          catchError(err => {
            if (err instanceof TimeoutError) {
              console.warn(
                `[SessionService] session/bootstrap exceeded ${SESSION_BOOTSTRAP_HTTP_TIMEOUT_MS}ms — check /api proxy and backend`,
              );
            }
            return throwError(() => err);
          }),
        ),
    );
  }
}
