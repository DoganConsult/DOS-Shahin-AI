import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { NavItemContract, NavigationDashboardContract } from '../contracts/navigation.contracts';

@Injectable({ providedIn: 'root' })
export class NavigationApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<{ data: NavItemContract[] }> {
    return this.http.get<{ data: NavItemContract[] }>(`${this.base}/navigation`, { params });
  }

  getById(id: string): Observable<NavItemContract> {
    return this.http.get<NavItemContract>(`${this.base}/navigation/${id}`);
  }

  create(payload: Partial<NavItemContract>): Observable<NavItemContract> {
    return this.http.post<NavItemContract>(`${this.base}/navigation`, payload);
  }

  update(id: string, payload: Partial<NavItemContract>): Observable<NavItemContract> {
    return this.http.patch<NavItemContract>(`${this.base}/navigation/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/navigation/${id}`);
  }

  getSummary(): Observable<NavigationDashboardContract> {
    return this.http.get<NavigationDashboardContract>(`${this.base}/navigation/summary`);
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/navigation/diagnostics`);
  }
}
