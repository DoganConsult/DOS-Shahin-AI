import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PolicyRecord } from '../contracts/policy.contracts';

@Injectable({ providedIn: 'root' })
export class PolicyApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/policy';

  list(): Observable<{ data: PolicyRecord[], count: number }> {
    return this.http.get<{ data: PolicyRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<PolicyRecord> {
    return this.http.get<PolicyRecord>(this.endpoint + '/' + id);
  }
}
