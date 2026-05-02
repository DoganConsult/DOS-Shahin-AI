/**
 * Real HTTP client for the DAuth port REST surface.
 * Thin typed wrapper over /api/dauth/port/v1/*.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import type {
  DAuthAccessRequest,
  DAuthAccessResult,
  DAuthPrincipal,
  DAuthSession,
} from '@dos/ports/dauth';

const BASE = '/api/dauth/port/v1';

@Injectable({ providedIn: 'root' })
export class DAuthHttpClient {
  private http = inject(HttpClient);

  validateSession(token: string): Observable<DAuthSession | null> {
    return this.http
      .post<DAuthSession>(`${BASE}/sessions/validate`, { token })
      .pipe(map((r) => r ?? null));
  }

  checkAccess(req: DAuthAccessRequest): Observable<DAuthAccessResult> {
    return this.http.post<DAuthAccessResult>(`${BASE}/access/check`, req);
  }

  checkAuthority(principal: DAuthPrincipal, authorityCode: string): Observable<boolean> {
    return this.http
      .post<{ holds: boolean }>(`${BASE}/authority/check`, { principal, authorityCode })
      .pipe(map((r) => !!r.holds));
  }

  getActiveDelegations(principal: DAuthPrincipal): Observable<readonly unknown[]> {
    return this.http
      .post<readonly unknown[]>(`${BASE}/delegations/active`, { principal });
  }
}
