import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReportingRecord } from '../contracts/reporting.contracts';

@Injectable({ providedIn: 'root' })
export class ReportingApiService {
  private http = inject(HttpClient);
  private endpoint = '/api/reporting';

  list(): Observable<{ data: ReportingRecord[], count: number }> {
    return this.http.get<{ data: ReportingRecord[], count: number }>(this.endpoint);
  }

  getById(id: string): Observable<ReportingRecord> {
    return this.http.get<ReportingRecord>(this.endpoint + '/' + id);
  }
}
