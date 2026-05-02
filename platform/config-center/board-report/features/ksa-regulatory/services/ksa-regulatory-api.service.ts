import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { KsaObligationContract, KsaRegulatoryDashboardContract } from '../contracts/ksa-regulatory.contracts';

@Injectable({ providedIn: 'root' })
export class KsaRegulatoryApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<{ data: KsaObligationContract[] }> {
    return this.http.get<{ data: KsaObligationContract[] }>(`${this.base}/ksa-regulatory`, { params });
  }

  getById(id: string): Observable<KsaObligationContract> {
    return this.http.get<KsaObligationContract>(`${this.base}/ksa-regulatory/${id}`);
  }

  create(payload: Partial<KsaObligationContract>): Observable<KsaObligationContract> {
    return this.http.post<KsaObligationContract>(`${this.base}/ksa-regulatory`, payload);
  }

  update(id: string, payload: Partial<KsaObligationContract>): Observable<KsaObligationContract> {
    return this.http.patch<KsaObligationContract>(`${this.base}/ksa-regulatory/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/ksa-regulatory/${id}`);
  }

  getSummary(): Observable<KsaRegulatoryDashboardContract> {
    return this.http.get<KsaRegulatoryDashboardContract>(`${this.base}/ksa-regulatory/summary`);
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/ksa-regulatory/diagnostics`);
  }
}
