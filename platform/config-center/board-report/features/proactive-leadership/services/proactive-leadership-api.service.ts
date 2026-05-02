import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { LeadershipInsightContract, ProactiveLeadershipDashboardContract } from '../contracts/proactive-leadership.contracts';

@Injectable({ providedIn: 'root' })
export class ProactiveLeadershipApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<{ data: LeadershipInsightContract[] }> {
    return this.http.get<{ data: LeadershipInsightContract[] }>(`${this.base}/proactive-leadership`, { params });
  }

  getById(id: string): Observable<LeadershipInsightContract> {
    return this.http.get<LeadershipInsightContract>(`${this.base}/proactive-leadership/${id}`);
  }

  create(payload: Partial<LeadershipInsightContract>): Observable<LeadershipInsightContract> {
    return this.http.post<LeadershipInsightContract>(`${this.base}/proactive-leadership`, payload);
  }

  update(id: string, payload: Partial<LeadershipInsightContract>): Observable<LeadershipInsightContract> {
    return this.http.patch<LeadershipInsightContract>(`${this.base}/proactive-leadership/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/proactive-leadership/${id}`);
  }

  getDashboard(): Observable<ProactiveLeadershipDashboardContract> {
    return this.http.get<ProactiveLeadershipDashboardContract>(`${this.base}/proactive-leadership/dashboard`);
  }

  getSummary(): Observable<ProactiveLeadershipDashboardContract> {
    return this.getDashboard();
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/proactive-leadership/diagnostics`);
  }
}
