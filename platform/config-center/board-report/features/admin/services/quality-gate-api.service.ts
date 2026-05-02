/**
 * Quality Gate — Frontend API Service
 * Communicates with /api/quality-gate endpoints.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import type { QgateRun, QgateStageResult, QgateDashboardSummary, QgateDriftEntry } from '../contracts/quality-gate.contracts';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { total: number; page: number; limit: number };
}

@Injectable({ providedIn: 'root' })
export class QualityGateApiService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/quality-gate`;

  // ── Runs ──

  getRuns(page = 1, limit = 20, status?: string): Observable<{ rows: QgateRun[]; total: number }> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (status) params['status'] = status;
    return this.http.get<ApiResponse<QgateRun[]>>(`${this.baseUrl}/runs`, { params }).pipe(
      map(r => ({ rows: r.data, total: r.meta?.total ?? 0 })),
    );
  }

  getLatestRun(): Observable<QgateRun | null> {
    return this.http.get<ApiResponse<QgateRun>>(`${this.baseUrl}/runs/latest`).pipe(
      map(r => r.data ?? null),
    );
  }

  getRunWithStages(runId: string): Observable<{ run: QgateRun; stages: QgateStageResult[] }> {
    return this.http.get<ApiResponse<{ run: QgateRun; stages: QgateStageResult[] }>>(`${this.baseUrl}/runs/${runId}`).pipe(
      map(r => r.data),
    );
  }

  triggerRun(input: { triggerType?: string; stages?: string[]; baseUrl?: string }): Observable<QgateRun> {
    return this.http.post<ApiResponse<QgateRun>>(`${this.baseUrl}/runs`, {
      triggerType: input.triggerType ?? 'manual',
      stages: input.stages,
      baseUrl: input.baseUrl,
    }).pipe(map(r => r.data));
  }

  overrideRun(runId: string, reason: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/runs/${runId}/override`, { reason }).pipe(
      map(() => undefined),
    );
  }

  // ── Thresholds ──

  getThresholds(): Observable<Record<string, Record<string, number>>> {
    return this.http.get<ApiResponse<Record<string, Record<string, number>>>>(`${this.baseUrl}/thresholds`).pipe(
      map(r => r.data),
    );
  }

  updateThreshold(stageCode: string, metricCode: string, minValue: number, reason?: string): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/thresholds/${stageCode}`, {
      metricCode, minValue, overrideReason: reason,
    }).pipe(map(() => undefined));
  }

  // ── Drift ──

  getDriftFindings(severity?: string): Observable<QgateDriftEntry[]> {
    const params: Record<string, string> = {};
    if (severity) params['severity'] = severity;
    return this.http.get<ApiResponse<QgateDriftEntry[]>>(`${this.baseUrl}/drift`, { params }).pipe(
      map(r => r.data),
    );
  }

  resolveDrift(driftId: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/drift/resolve/${driftId}`, {}).pipe(
      map(() => undefined),
    );
  }

  // ── AI Eval ──

  getAiEvalHistory(agentId?: string): Observable<unknown[]> {
    const params: Record<string, string> = {};
    if (agentId) params['agentId'] = agentId;
    return this.http.get<ApiResponse<unknown[]>>(`${this.baseUrl}/ai-eval`, { params }).pipe(
      map(r => r.data),
    );
  }

  // ── Dashboard ──

  getDashboardSummary(): Observable<QgateDashboardSummary> {
    return this.http.get<ApiResponse<QgateDashboardSummary>>(`${this.baseUrl}/dashboard/summary`).pipe(
      map(r => r.data),
    );
  }

  getDashboardTrends(days = 30): Observable<Array<{ date: string; overallScore: number | null }>> {
    return this.http.get<ApiResponse<Array<{ date: string; overallScore: number | null }>>>(`${this.baseUrl}/dashboard/trends`, { params: { days: String(days) } }).pipe(
      map(r => r.data),
    );
  }

  getDashboardHealth(): Observable<{ stages: Array<{ stageCode: string; healthy: boolean; alertLevel: string }> }> {
    return this.http.get<ApiResponse<{ stages: Array<{ stageCode: string; healthy: boolean; alertLevel: string }> }>>(`${this.baseUrl}/dashboard/health`).pipe(
      map(r => r.data),
    );
  }
}
