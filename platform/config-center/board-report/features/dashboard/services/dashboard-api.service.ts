import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { DashboardDefinitionContract, DashboardRegistryContract } from '../contracts/dashboard.contracts';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<{ data: DashboardDefinitionContract[] }> {
    return this.http.get<{ data: DashboardDefinitionContract[] }>(`${this.base}/dashboard`, { params });
  }

  getById(id: string): Observable<DashboardDefinitionContract> {
    return this.http.get<DashboardDefinitionContract>(`${this.base}/dashboard/${id}`);
  }

  create(payload: Partial<DashboardDefinitionContract>): Observable<DashboardDefinitionContract> {
    return this.http.post<DashboardDefinitionContract>(`${this.base}/dashboard`, payload);
  }

  update(id: string, payload: Partial<DashboardDefinitionContract>): Observable<DashboardDefinitionContract> {
    return this.http.patch<DashboardDefinitionContract>(`${this.base}/dashboard/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/dashboard/${id}`);
  }

  getSummary(): Observable<DashboardRegistryContract> {
    return this.http.get<DashboardRegistryContract>(`${this.base}/dashboard/summary`);
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/dashboard/diagnostics`);
  }
}
