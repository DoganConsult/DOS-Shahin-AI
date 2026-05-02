import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { JourneyContract, JourneyDashboardContract } from '../contracts/journey.contracts';

@Injectable({ providedIn: 'root' })
export class JourneyApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<{ data: JourneyContract[] }> {
    return this.http.get<{ data: JourneyContract[] }>(`${this.base}/journey`, { params });
  }

  getById(id: string): Observable<JourneyContract> {
    return this.http.get<JourneyContract>(`${this.base}/journey/${id}`);
  }

  create(payload: Partial<JourneyContract>): Observable<JourneyContract> {
    return this.http.post<JourneyContract>(`${this.base}/journey`, payload);
  }

  update(id: string, payload: Partial<JourneyContract>): Observable<JourneyContract> {
    return this.http.patch<JourneyContract>(`${this.base}/journey/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/journey/${id}`);
  }

  getSummary(): Observable<JourneyDashboardContract> {
    return this.http.get<JourneyDashboardContract>(`${this.base}/journey/summary`);
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/journey/diagnostics`);
  }
}
