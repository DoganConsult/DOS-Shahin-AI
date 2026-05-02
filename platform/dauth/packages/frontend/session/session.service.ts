import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StorageService } from '@app/infrastructure';
import { AccessStore } from '../access/access.store';
import { AuthStateService } from './auth-state.service';
import { environment } from '@env/environment';
import { DAUTH_ACTOR_IDENTITY_PORT } from '../ports';
import { CsrfTokenService } from '../csrf/csrf-token.service';

export interface SessionData {
  token?: string;
  refreshToken?: string;
  tenantId: string;
  role: string;
  userId?: string;
  userName?: string;
  orgName?: string;
  isSuperAdmin?: boolean;
  memberOnboarded?: boolean;
  enterpriseAuthz?: Record<string, unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private storage = inject(StorageService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private accessStore = inject(AccessStore);
  private actorIdentity = inject(DAUTH_ACTOR_IDENTITY_PORT);
  private csrfToken = inject(CsrfTokenService);
  private authState = inject(AuthStateService);

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
    // Cookie-session probe — no JWT decode, no storage token read.
    await this.authState.probe();
  }

  scheduleTokenRefresh(): void {
    // Cookie-bound refresh: noop — refresh cadence is owned upstream.
  }

  /** @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) Use AccessStore.hasPermission() directly — Law 12 single owner. Removal: Phase 6. */
  hasPermission(permission: string): boolean {
    if (!this.accessStore.loaded()) return false;
    return this.accessStore.hasPermission(permission);
  }

  isLoggedIn(): boolean {
    // Cookie-session truth — never reads grc_token from storage.
    return this.authState.authed();
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

  setSession(data: SessionData): void {
    // Cookie-session: never persist tokens to storage. Only sanitized metadata.
    if (data.tenantId) this.storage.set('grc_tenantId', String(data.tenantId));
    if (data.role) this.storage.set('grc_role', String(data.role));
    if (data.userId) this.storage.set('grc_userId', String(data.userId));
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

    this.authState.setAuthenticated({
      userId: data.userId ?? null,
      userName: data.userName ?? null,
      tenantId: data.tenantId ?? null,
      role: data.role ?? null,
      isSuperAdmin: data.isSuperAdmin === true,
    });
  }

  /**
   * Resolve the canonical access snapshot immediately after login so
   * downstream navigation and startup requests have authoritative auth state.
   */
  async bootstrapAccessSnapshot(): Promise<boolean> {
    this.accessStore.clear();
    await this.accessStore.load();
    return this.accessStore.loaded();
  }

  setMinimalSession(data: { token?: string; tenantId: string; role: string }): void {
    // Token field intentionally ignored — cookie session is the only auth truth.
    this.storage.set('grc_tenantId', data.tenantId);
    this.storage.set('grc_role', data.role);
    this.authState.setAuthenticated({
      userId: null,
      userName: null,
      tenantId: data.tenantId,
      role: data.role,
      isSuperAdmin: false,
    });
  }

  setMustChangePassword(value: boolean): void {
    this.storage.set('grc_must_change_password', value ? 'true' : 'false');
  }

  clearMustChangePassword(): void {
    this.storage.remove('grc_must_change_password');
  }

  async getToken(): Promise<string> {
    // Cookie-session: there is no browser-readable access token.
    if (!this.authState.authed()) throw new Error('Not authenticated');
    return '';
  }

  getTokenSync(): string | null {
    // Cookie-session: there is no browser-readable access token.
    return null;
  }

  getTenantId(): string | null {
    return this.storage.get('grc_tenantId');
  }

  getRole(): string | null {
    return this.storage.get('grc_role');
  }

  getUserName(): string | null {
    return this.storage.get('grc_userName');
  }

  getOrgName(): string | null {
    return this.storage.get('grc_orgName');
  }

  async waitForProfileLoad(): Promise<void> {
    await this.actorIdentity.waitForProfileLoad();
  }

  refreshIfExpiringSoon(_thresholdMs = 2 * 60 * 1000): void {
    // Cookie-bound refresh — no JWT decode, no body refresh token from storage.
    if (!this.authState.authed()) return;
    this.http.post<unknown>(
      `${environment.apiUrl}/auth/refresh`,
      {},
      { withCredentials: true },
    ).subscribe({
      next: () => { this.authState.probe(); },
      error: () => {},
    });
  }

  logout(reason?: string): void {
    // Server-side logout drops the cookie. No Authorization header is sent.
    this.http.post(`${environment.apiUrl}/auth/logout`, {}, {
      withCredentials: true,
    }).subscribe({ error: () => {} });

    // Defensive cleanup of any legacy keys that may exist from older builds.
    const keys = [
      'grc_token', 'grc_refreshToken', 'grc_tenantId', 'grc_role',
      'grc_userName', 'grc_orgName', 'grc_userId', 'grc_isSuperAdmin',
      'grc_onboarding_complete', 'grc_member_onboarded', 'grc_enterprise_authz',
      'grc_must_change_password', 'grc_idle_timeout_min', 'onb_session_id',
    ];
    keys.forEach(k => this.storage.remove(k));
    this.csrfToken.clear();
    this.authState.clear();
    if (reason) this.storage.set('grc_logout_reason', reason);
    this.router.navigate(['/login']);
  }

  async loadSessionBootstrap(): Promise<Record<string, unknown>> {
    return firstValueFrom(
      this.http.get<Record<string, unknown>>(`${environment.apiUrl}/session/bootstrap`, { withCredentials: true }),
    );
  }
}
