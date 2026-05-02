import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { ReportDefinitionContract, ReportingDashboardContract } from '../contracts/reporting.contracts';

@Injectable({ providedIn: 'root' })
export class ReportingApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<{ data: ReportDefinitionContract[] }> {
    return this.http.get<{ data: ReportDefinitionContract[] }>(`${this.base}/reporting`, { params });
  }

  getById(id: string): Observable<ReportDefinitionContract> {
    return this.http.get<ReportDefinitionContract>(`${this.base}/reporting/${id}`);
  }

  create(payload: Partial<ReportDefinitionContract>): Observable<ReportDefinitionContract> {
    return this.http.post<ReportDefinitionContract>(`${this.base}/reporting`, payload);
  }

  update(id: string, payload: Partial<ReportDefinitionContract>): Observable<ReportDefinitionContract> {
    return this.http.patch<ReportDefinitionContract>(`${this.base}/reporting/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/reporting/${id}`);
  }

  getSummary(): Observable<ReportingDashboardContract> {
    return this.http.get<ReportingDashboardContract>(`${this.base}/reporting/summary`);
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/reporting/diagnostics`);
  }
}
