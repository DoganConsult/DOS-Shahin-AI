import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { AdminSectionContract, AdminDashboardContract } from '../contracts/admin.contracts';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<{ data: AdminSectionContract[] }> {
    return this.http.get<{ data: AdminSectionContract[] }>(`${this.base}/admin`, { params });
  }

  getById(id: string): Observable<AdminSectionContract> {
    return this.http.get<AdminSectionContract>(`${this.base}/admin/${id}`);
  }

  create(payload: Partial<AdminSectionContract>): Observable<AdminSectionContract> {
    return this.http.post<AdminSectionContract>(`${this.base}/admin`, payload);
  }

  update(id: string, payload: Partial<AdminSectionContract>): Observable<AdminSectionContract> {
    return this.http.patch<AdminSectionContract>(`${this.base}/admin/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/${id}`);
  }

  getSummary(): Observable<AdminDashboardContract> {
    return this.http.get<AdminDashboardContract>(`${this.base}/admin/summary`);
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/admin/diagnostics`);
  }
}
