/**
 * AuthStateService — cookie-session auth truth (no token storage).
 *
 * Replaces the legacy localStorage `grc_token` truth. The browser is no longer
 * the source of authentication: the only authoritative source is the
 * server-side cookie session, probed via GET `/api/auth/oidc/session`.
 *
 * Hard rules:
 * - never reads localStorage tokens
 * - never writes localStorage tokens
 * - never decodes JWTs
 * - exposes only sanitized metadata (userId, userName, tenantId, role, isSuperAdmin)
 * - zero injected app services (only HttpClient) → no DI cycles
 */

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '@env/environment';

export interface SessionMeta {
  userId: string | null;
  userName: string | null;
  tenantId: string | null;
  role: string | null;
  isSuperAdmin: boolean;
  /** Optional extras the server may include — never tokens. */
  [key: string]: unknown;
}

const SESSION_PROBE_TIMEOUT_MS = 5_000;

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private http = inject(HttpClient);

  private _authed = signal(false);
  private _metadata = signal<SessionMeta | null>(null);

  readonly authed = this._authed.asReadonly();
  readonly metadata = this._metadata.asReadonly();

  /**
   * Probe the cookie-session endpoint. 200 → authenticated, 401/403/network → unauthenticated.
   * Never throws.
   */
  async probe(): Promise<boolean> {
    try {
      const meta = await firstValueFrom(
        this.http
          .get<SessionMeta>(`${environment.apiUrl}/auth/oidc/session`, { withCredentials: true })
          .pipe(timeout(SESSION_PROBE_TIMEOUT_MS)),
      );
      this._metadata.set({
        userId: meta?.userId ?? null,
        userName: meta?.userName ?? null,
        tenantId: meta?.tenantId ?? null,
        role: meta?.role ?? null,
        isSuperAdmin: meta?.isSuperAdmin === true,
        ...meta,
      });
      this._authed.set(true);
      return true;
    } catch {
      this._metadata.set(null);
      this._authed.set(false);
      return false;
    }
  }

  /** Mark authenticated from a sanitized metadata source (e.g. post-login response). */
  setAuthenticated(meta: SessionMeta): void {
    this._metadata.set({
      userId: meta?.userId ?? null,
      userName: meta?.userName ?? null,
      tenantId: meta?.tenantId ?? null,
      role: meta?.role ?? null,
      isSuperAdmin: meta?.isSuperAdmin === true,
      ...meta,
    });
    this._authed.set(true);
  }

  /** Clear in-memory auth state (e.g. on logout). Cookies are cleared by the server. */
  clear(): void {
    this._metadata.set(null);
    this._authed.set(false);
  }
}
