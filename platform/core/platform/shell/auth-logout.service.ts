/**
 * AuthLogoutService — canonical sign-out dispatcher.
 *
 * Doctrine: the FE never full-page-navigates to a server logout URL.
 * Instead the user-menu emits a typed `dispatch_event` action with
 * eventName `auth.logout`; ShellHost catches that event and calls
 * `logout()` here.
 *
 * Flow:
 *   1. POST /api/auth/oidc/logout  (cookies travel via withCredentials)
 *      → auth-service revokes the KC refresh token + clears the
 *        HttpOnly access/refresh/state cookies on the response.
 *   2. Clear AccessStore + WorkspaceShellBindingService session state.
 *   3. SPA-navigate to /login (canonical route binding exists).
 *
 * The final URL is therefore /login, NOT /api/auth/logout, NOT /logout.
 * No "Cannot GET /logout" surface, no static fallback route.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AccessStore } from '@dos/access-store';

@Injectable({ providedIn: 'root' })
export class AuthLogoutService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly access = inject(AccessStore);

  /** Run the canonical sign-out sequence. Always navigates to /login. */
  async logout(): Promise<void> {
    // 1) Tell auth-service to drop session cookies + revoke refresh token.
    //    Cookies travel via withCredentials; the response Set-Cookie
    //    headers clear dos_access_token / dauth_rt for this origin.
    try {
      await firstValueFrom(
        this.http
          .post<{ ok?: boolean }>(
            '/api/auth/oidc/logout',
            {},
            { withCredentials: true },
          )
          .pipe(
            catchError(() => of(null)),
          ),
      );
    } catch {
      /* best-effort — proceed to local clear regardless */
    }

    // 2) Drop in-memory session state so the next render is empty-but-clean.
    try {
      this.access.clear();
    } catch {
      /* AccessStore is provided in root; should never throw */
    }

    // 3) Local SPA navigation to the canonical /login binding.
    //    No `window.location.href = ...` — that would full-reload and
    //    skip Angular's router (and would re-fetch /api/auth/logout if
    //    a stray fallback existed).
    try {
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch {
      /* router not yet ready — fall back to a hard nav */
      if (typeof window !== 'undefined') window.location.assign('/login');
    }
  }
}
