import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { GovernanceRitualContract, GovernanceOsDashboardContract } from '../contracts/governance-os.contracts';

@Injectable({ providedIn: 'root' })
export class GovernanceOsApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<{ data: GovernanceRitualContract[] }> {
    return this.http.get<{ data: GovernanceRitualContract[] }>(`${this.base}/governance-os`, { params });
  }

  getById(id: string): Observable<GovernanceRitualContract> {
    return this.http.get<GovernanceRitualContract>(`${this.base}/governance-os/${id}`);
  }

  create(payload: Partial<GovernanceRitualContract>): Observable<GovernanceRitualContract> {
    return this.http.post<GovernanceRitualContract>(`${this.base}/governance-os`, payload);
  }

  update(id: string, payload: Partial<GovernanceRitualContract>): Observable<GovernanceRitualContract> {
    return this.http.patch<GovernanceRitualContract>(`${this.base}/governance-os/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/governance-os/${id}`);
  }

  getSummary(): Observable<GovernanceOsDashboardContract> {
    return this.http.get<GovernanceOsDashboardContract>(`${this.base}/governance-os/summary`);
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/governance-os/diagnostics`);
  }
}
