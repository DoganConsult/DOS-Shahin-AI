import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { BootstrapSessionContract, BootstrapDashboardContract } from '../contracts/bootstrap.contracts';

@Injectable({ providedIn: 'root' })
export class BootstrapApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<{ data: BootstrapSessionContract[] }> {
    return this.http.get<{ data: BootstrapSessionContract[] }>(`${this.base}/bootstrap`, { params });
  }

  getById(id: string): Observable<BootstrapSessionContract> {
    return this.http.get<BootstrapSessionContract>(`${this.base}/bootstrap/${id}`);
  }

  create(payload: Partial<BootstrapSessionContract>): Observable<BootstrapSessionContract> {
    return this.http.post<BootstrapSessionContract>(`${this.base}/bootstrap`, payload);
  }

  update(id: string, payload: Partial<BootstrapSessionContract>): Observable<BootstrapSessionContract> {
    return this.http.patch<BootstrapSessionContract>(`${this.base}/bootstrap/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/bootstrap/${id}`);
  }

  getSummary(): Observable<BootstrapDashboardContract> {
    return this.http.get<BootstrapDashboardContract>(`${this.base}/bootstrap/summary`);
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/bootstrap/diagnostics`);
  }
}
