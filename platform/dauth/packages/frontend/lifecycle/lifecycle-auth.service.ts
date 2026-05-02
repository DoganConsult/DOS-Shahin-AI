import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { LifecycleAuthRequestContract, LifecycleAuthDecisionContract } from './lifecycle-auth.contracts';

@Injectable({ providedIn: 'root' })
export class LifecycleAuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth/lifecycle`;

  authorize(req: LifecycleAuthRequestContract): Observable<LifecycleAuthDecisionContract> {
    return this.http.post<LifecycleAuthDecisionContract>(`${this.base}/authorize`, req);
  }

  canTransition(entityType: string, entityId: string, toState: string): Observable<{ allowed: boolean; reason: string }> {
    return this.http.post<{ allowed: boolean; reason: string }>(`${this.base}/can-transition`, { entityType, entityId, toState });
  }
}
