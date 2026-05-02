import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ComplianceRecord } from '../contracts/compliance.contracts';

@Injectable({ providedIn: 'root' })
export class ComplianceApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/compliance';

  list(): Observable<{ data: ComplianceRecord[], count: number }> {
    return this.http.get<{ data: ComplianceRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<ComplianceRecord> {
    return this.http.get<ComplianceRecord>(this.endpoint + '/' + id);
  }
}
