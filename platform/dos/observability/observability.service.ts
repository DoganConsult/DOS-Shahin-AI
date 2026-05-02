import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type { HealthCheckContract, PlatformMetricContract } from './observability.contracts';

@Injectable({ providedIn: 'root' })
export class ObservabilityService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/platform/observability`;

  getHealth(): Observable<HealthCheckContract[]> {
    return this.http.get<HealthCheckContract[]>(`${this.base}/health`);
  }

  getMetrics(names?: string[]): Observable<PlatformMetricContract[]> {
    const params: Record<string, string> = {};
    if (names?.length) params['names'] = names.join(',');
    return this.http.get<PlatformMetricContract[]>(`${this.base}/metrics`, { params });
  }
}
