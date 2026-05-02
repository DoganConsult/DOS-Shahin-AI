import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { AuthorityContract, AuthorityCheckContract, AuthorityDecisionContract } from './authority.contracts';

@Injectable({ providedIn: 'root' })
export class AuthorityService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth/authority`;

  list(): Observable<AuthorityContract[]> {
    return this.http.get<AuthorityContract[]>(this.base);
  }

  check(req: AuthorityCheckContract): Observable<AuthorityDecisionContract> {
    return this.http.post<AuthorityDecisionContract>(`${this.base}/check`, req);
  }

  getByUser(userId: string): Observable<AuthorityContract[]> {
    return this.http.get<AuthorityContract[]>(`${this.base}/user/${userId}`);
  }

  grant(authorityId: string, userId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${authorityId}/grant`, { userId });
  }

  revoke(authorityId: string, userId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${authorityId}/revoke`, { userId });
  }
}
