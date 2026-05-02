import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RemediationRecord } from '../contracts/remediation.contracts';

@Injectable({ providedIn: 'root' })
export class RemediationApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/remediation';

  list(): Observable<{ data: RemediationRecord[], count: number }> {
    return this.http.get<{ data: RemediationRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<RemediationRecord> {
    return this.http.get<RemediationRecord>(this.endpoint + '/' + id);
  }
}
