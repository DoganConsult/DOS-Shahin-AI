import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { PackContract, PacksDashboardContract } from '../contracts/packs.contracts';

@Injectable({ providedIn: 'root' })
export class PacksApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<{ data: PackContract[] }> {
    return this.http.get<{ data: PackContract[] }>(`${this.base}/packs`, { params });
  }

  getById(id: string): Observable<PackContract> {
    return this.http.get<PackContract>(`${this.base}/packs/${id}`);
  }

  create(payload: Partial<PackContract>): Observable<PackContract> {
    return this.http.post<PackContract>(`${this.base}/packs`, payload);
  }

  update(id: string, payload: Partial<PackContract>): Observable<PackContract> {
    return this.http.patch<PackContract>(`${this.base}/packs/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/packs/${id}`);
  }

  getSummary(): Observable<PacksDashboardContract> {
    return this.http.get<PacksDashboardContract>(`${this.base}/packs/summary`);
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/packs/diagnostics`);
  }
}
