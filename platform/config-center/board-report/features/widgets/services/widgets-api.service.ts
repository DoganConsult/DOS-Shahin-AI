import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { WidgetDefinitionContract, WidgetsDashboardContract } from '../contracts/widgets.contracts';

@Injectable({ providedIn: 'root' })
export class WidgetsApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<{ data: WidgetDefinitionContract[] }> {
    return this.http.get<{ data: WidgetDefinitionContract[] }>(`${this.base}/widgets`, { params });
  }

  getById(id: string): Observable<WidgetDefinitionContract> {
    return this.http.get<WidgetDefinitionContract>(`${this.base}/widgets/${id}`);
  }

  create(payload: Partial<WidgetDefinitionContract>): Observable<WidgetDefinitionContract> {
    return this.http.post<WidgetDefinitionContract>(`${this.base}/widgets`, payload);
  }

  update(id: string, payload: Partial<WidgetDefinitionContract>): Observable<WidgetDefinitionContract> {
    return this.http.patch<WidgetDefinitionContract>(`${this.base}/widgets/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/widgets/${id}`);
  }

  getSummary(): Observable<WidgetsDashboardContract> {
    return this.http.get<WidgetsDashboardContract>(`${this.base}/widgets/summary`);
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/widgets/diagnostics`);
  }
}
