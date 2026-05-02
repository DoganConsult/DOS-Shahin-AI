import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuditRecord } from '../contracts/audit.contracts';

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/audit';

  list(): Observable<{ data: AuditRecord[], count: number }> {
    return this.http.get<{ data: AuditRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<AuditRecord> {
    return this.http.get<AuditRecord>(this.endpoint + '/' + id);
  }
}
