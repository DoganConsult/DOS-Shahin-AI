import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { EngineRuleContract, AgrcEngineDashboardContract } from '../contracts/agrc-engine.contracts';

@Injectable({ providedIn: 'root' })
export class AgrcEngineApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<{ data: EngineRuleContract[] }> {
    return this.http.get<{ data: EngineRuleContract[] }>(`${this.base}/agrc-engine`, { params });
  }

  getById(id: string): Observable<EngineRuleContract> {
    return this.http.get<EngineRuleContract>(`${this.base}/agrc-engine/${id}`);
  }

  create(payload: Partial<EngineRuleContract>): Observable<EngineRuleContract> {
    return this.http.post<EngineRuleContract>(`${this.base}/agrc-engine`, payload);
  }

  update(id: string, payload: Partial<EngineRuleContract>): Observable<EngineRuleContract> {
    return this.http.patch<EngineRuleContract>(`${this.base}/agrc-engine/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/agrc-engine/${id}`);
  }

  getSummary(): Observable<AgrcEngineDashboardContract> {
    return this.http.get<AgrcEngineDashboardContract>(`${this.base}/agrc-engine/summary`);
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/agrc-engine/diagnostics`);
  }
}
