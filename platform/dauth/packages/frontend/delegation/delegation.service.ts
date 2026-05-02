import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { DelegationContract, DelegationRequestContract } from './delegation.contracts';

@Injectable({ providedIn: 'root' })
export class DelegationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth/delegations`;

  listActive(): Observable<DelegationContract[]> {
    return this.http.get<DelegationContract[]>(`${this.base}?status=active`);
  }

  listByDelegator(delegatorId: string): Observable<DelegationContract[]> {
    return this.http.get<DelegationContract[]>(`${this.base}?delegatorId=${delegatorId}`);
  }

  listByDelegate(delegateId: string): Observable<DelegationContract[]> {
    return this.http.get<DelegationContract[]>(`${this.base}?delegateId=${delegateId}`);
  }

  create(req: DelegationRequestContract): Observable<DelegationContract> {
    return this.http.post<DelegationContract>(this.base, req);
  }

  revoke(delegationId: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${delegationId}/revoke`, { reason });
  }

  getById(delegationId: string): Observable<DelegationContract> {
    return this.http.get<DelegationContract>(`${this.base}/${delegationId}`);
  }
}
