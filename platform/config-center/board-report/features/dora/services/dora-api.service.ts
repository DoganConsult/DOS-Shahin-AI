import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { DoraObligationContract, DoraDashboardContract } from '../contracts/dora.contracts';

type DoraItemContract = DoraObligationContract;
type DoraSummaryContract = DoraDashboardContract;

@Injectable({ providedIn: 'root' })
export class DoraApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<{ data: DoraItemContract[] }> {
    return this.http.get<{ data: DoraItemContract[] }>(`${this.base}/dora`, { params });
  }

  getById(id: string): Observable<DoraItemContract> {
    return this.http.get<DoraItemContract>(`${this.base}/dora/${id}`);
  }

  create(payload: Partial<DoraItemContract>): Observable<DoraItemContract> {
    return this.http.post<DoraItemContract>(`${this.base}/dora`, payload);
  }

  update(id: string, payload: Partial<DoraItemContract>): Observable<DoraItemContract> {
    return this.http.patch<DoraItemContract>(`${this.base}/dora/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/dora/${id}`);
  }

  getSummary(): Observable<DoraSummaryContract> {
    return this.http.get<DoraSummaryContract>(`${this.base}/dora/summary`);
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/dora/diagnostics`);
  }
}
