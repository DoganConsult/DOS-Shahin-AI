import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { QiyasAssessmentContract, QiyasDashboardContract } from '../contracts/qiyas.contracts';

@Injectable({ providedIn: 'root' })
export class QiyasApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<{ data: QiyasAssessmentContract[] }> {
    return this.http.get<{ data: QiyasAssessmentContract[] }>(`${this.base}/qiyas`, { params });
  }

  getById(id: string): Observable<QiyasAssessmentContract> {
    return this.http.get<QiyasAssessmentContract>(`${this.base}/qiyas/${id}`);
  }

  create(payload: Partial<QiyasAssessmentContract>): Observable<QiyasAssessmentContract> {
    return this.http.post<QiyasAssessmentContract>(`${this.base}/qiyas`, payload);
  }

  update(id: string, payload: Partial<QiyasAssessmentContract>): Observable<QiyasAssessmentContract> {
    return this.http.patch<QiyasAssessmentContract>(`${this.base}/qiyas/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/qiyas/${id}`);
  }

  getSummary(): Observable<QiyasDashboardContract> {
    return this.http.get<QiyasDashboardContract>(`${this.base}/qiyas/summary`);
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/qiyas/diagnostics`);
  }
}
