import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { environment } from '@env/environment';
import { SessionService } from '../../../dauth/session/session.service';

/**
 * User profile and account actions.
 *
 * Profile data is derived from two sources:
 *   1. SessionService (localStorage keys hydrated at login) — name, role, tenantId
 *   2. GET /api/tenants/me (tenant-service) — email, org, membership details
 *
 * Password change goes through auth-service via the gateway proxy.
 */

export interface UserInfo {
  userId: string;
  userName: string;
  email: string;
  orgName: string;
  role: string;
  isAdmin: boolean;
  isTenantOwner: boolean;
  memberSince: string | null;
  mfaEnabled: boolean;
  tenantId: string | null;
  tenantName: string | null;
  tenantStatus: string | null;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private http = inject(HttpClient);
  private session = inject(SessionService);
  private api = environment.apiUrl;

  /**
   * Fetches user profile by calling the existing /api/tenants/me endpoint
   * (already wired: gateway → tenant-service GET /me). Enriches with
   * SessionService display metadata.
   */
  getUserInfo(): Observable<UserInfo> {
    const profile = this.session.userProfile();
    const role = this.session.currentRole() || 'viewer';
    const isAdmin = this.session.isAdminProfile();
    const tenantId = this.session.tenantId();

    return this.http
      .get<Record<string, any>>(`${this.api}/tenants/me`, { withCredentials: true })
      .pipe(
        map((res) => {
          const user = res['user'] || {};
          const tenant = res['tenant'] || {};
          const membership = res['membership'] || {};
          return {
            userId: user.id || profile.userId || '',
            userName: user.name || profile.fullName || profile.name || '',
            email: user.email || profile.email || '',
            orgName: tenant.name || this.session.getOrgName() || '',
            role: membership.roleCode || role,
            isAdmin,
            isTenantOwner: !!membership.isOwner,
            memberSince: tenant.createdAt || null,
            mfaEnabled: false, // MFA backend not yet wired
            tenantId: tenant.id || tenantId,
            tenantName: tenant.name || null,
            tenantStatus: tenant.status || null,
          };
        }),
        catchError(() => {
          // Fallback to session-only data if /me fails
          return of({
            userId: profile.userId || '',
            userName: profile.fullName || profile.name || '',
            email: profile.email || '',
            orgName: this.session.getOrgName() || '',
            role,
            isAdmin,
            isTenantOwner: false,
            memberSince: null,
            mfaEnabled: false,
            tenantId,
            tenantName: null,
            tenantStatus: null,
          });
        })
      );
  }

  /**
   * Change password via auth-service (proxied through gateway /api/auth/*).
   * Falls back gracefully if the endpoint doesn't exist yet.
   */
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(
      `${this.api}/auth/change-password`,
      { currentPassword, newPassword },
      { withCredentials: true }
    );
  }
}
