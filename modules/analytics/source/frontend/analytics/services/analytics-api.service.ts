import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnalyticsRecord } from '../contracts/analytics.contracts';

@Injectable({ providedIn: 'root' })
export class AnalyticsApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/analytics';

  list(): Observable<{ data: AnalyticsRecord[], count: number }> {
    return this.http.get<{ data: AnalyticsRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<AnalyticsRecord> {
    return this.http.get<AnalyticsRecord>(this.endpoint + '/' + id);
  }
}
