import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RiskRecord } from '../contracts/risk.contracts';

@Injectable({ providedIn: 'root' })
export class RiskApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/risk';

  list(): Observable<{ data: RiskRecord[], count: number }> {
    return this.http.get<{ data: RiskRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<RiskRecord> {
    return this.http.get<RiskRecord>(this.endpoint + '/' + id);
  }
}
