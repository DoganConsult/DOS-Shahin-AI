import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BenchmarkOptInStatus {
  tenantId: string;
  optedIn: boolean;
  optedInAt?: string;
}

export interface BenchmarkMetric {
  metricName: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  sampleSize: number;
}

export interface BenchmarkSectorMetric extends BenchmarkMetric {
  sector: string;
}

export interface BenchmarkKPIs {
  complianceScore: number;
  riskScore: number;
  evidenceCoverage: number;
  remediationClosureRate?: number;
  [key: string]: number | undefined;
}

export interface BenchmarkAggregationResult {
  runId: string;
  runDate: string;
  aggregatedAt?: string;
  tenantCount: number;
  metrics: BenchmarkMetric[];
  sectorMetrics: BenchmarkSectorMetric[];
  kpis: BenchmarkKPIs;
  status: 'completed' | 'failed' | 'partial';
}

export interface BenchmarkHistoryEntry {
  runId: string;
  runDate: string;
  aggregatedAt?: string;
  tenantCount: number;
  participantCount?: number;
  kpis: BenchmarkKPIs;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class BenchmarkAggregatorApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/benchmarks';

  /**
   * Get opt-in status for current tenant
   */
  getOptInStatus(): Observable<BenchmarkOptInStatus> {
    return this.http.get<BenchmarkOptInStatus>(`${this.base}/opt-in`);
  }

  /**
   * Set opt-in status for current tenant
   */
  setOptInStatus(optedIn: boolean): Observable<BenchmarkOptInStatus> {
    return this.http.put<BenchmarkOptInStatus>(`${this.base}/opt-in`, { optedIn });
  }

  /**
   * Get latest benchmark aggregation results
   */
  getLatest(): Observable<BenchmarkAggregationResult> {
    return this.http.get<BenchmarkAggregationResult>(`${this.base}/latest`);
  }

  /**
   * Get benchmark aggregation history
   */
  getHistory(limit: number = 10): Observable<BenchmarkHistoryEntry[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<BenchmarkHistoryEntry[]>(`${this.base}/history`, { params });
  }

  /**
   * Trigger manual benchmark aggregation (admin only)
   */
  triggerAggregation(): Observable<{ runId: string; status: string }> {
    return this.http.post<{ runId: string; status: string }>(`${this.base}/aggregate`, {});
  }
}
