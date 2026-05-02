import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface KpiSnapshotDto {
  kpi_code: string;
  value: number;
  trend: 'up' | 'down' | 'flat';
  period: string;
  timestamp: string;
}

export interface DashboardDto {
  kpis: KpiSnapshotDto[];
  charts: ChartDataDto[];
  summary: Record<string, number>;
}

export interface ChartDataDto {
  chart_id: string;
  title: string;
  type: string;
  data: Array<{ label: string; value: number }>;
}

export interface BenchmarkDto {
  module: string;
  internal_score: number;
  industry_avg: number;
  percentile: number;
}

export interface PredictionDto {
  metric: string;
  current_value: number;
  predicted_value: number;
  confidence: number;
  horizon_days: number;
}

export interface EngagementDto {
  user_id: string;
  score: number;
  logins_30d: number;
  actions_30d: number;
  last_active: string;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getDashboard(params?: Record<string, string>): Observable<DashboardDto> {
    return this.http.get<DashboardDto>(`${this.base}/analytics/dashboard`, { params });
  }

  getKpis(codes: string[], from: string, to: string, granularity = 'month'): Observable<KpiSnapshotDto[]> {
    return this.http.post<KpiSnapshotDto[]>(`${this.base}/analytics/kpis`, {
      kpi_codes: codes, date_range: { from, to }, granularity,
    });
  }

  getBenchmarks(moduleCode?: string): Observable<BenchmarkDto[]> {
    const params: Record<string, string> = {};
    if (moduleCode) params['module_code'] = moduleCode;
    return this.http.get<BenchmarkDto[]>(`${this.base}/analytics/benchmarks`, { params });
  }

  getPredictions(metric: string, horizonDays = 90): Observable<PredictionDto> {
    return this.http.get<PredictionDto>(`${this.base}/analytics/predictions`, {
      params: { metric, horizon_days: horizonDays.toString() },
    });
  }

  getEngagementScores(): Observable<EngagementDto[]> {
    return this.http.get<EngagementDto[]>(`${this.base}/analytics/engagement`);
  }

  exportData(format: string, from: string, to: string, moduleCode?: string): Observable<Blob> {
    const params: Record<string, string> = { format, from, to };
    if (moduleCode) params['module_code'] = moduleCode;
    return this.http.get(`${this.base}/analytics/export`, { params, responseType: 'blob' });
  }

  getAnomalies(): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/analytics/anomalies`);
  }

  getModuleComparison(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/analytics/comparison`);
  }

  getTrendAnalysis(metric: string, period = 'month'): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/analytics/trends`, { params: { metric, period } });
  }


  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/analytics/diagnostics`);
  }
}
