import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GovernanceAiSignalDto {
  id: string;
  tenantId: string;
  signalType: string;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description?: string;
  status: 'detected' | 'interpreted' | 'escalated' | 'resolved' | 'dismissed';
  detectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GovernanceAiPipelineRunDto {
  id: string;
  tenantId: string;
  status: 'running' | 'completed' | 'failed';
  stages: { name: string; status: string; duration?: number }[];
  startedAt: string;
  completedAt?: string;
}

export interface GovernanceAiHealthDashboard {
  overallScore: number;
  dimensions: { name: string; score: number; trend: string }[];
  alerts: { level: string; message: string }[];
  generatedAt: string;
}

export interface GovernanceAiListResponse {
  data: GovernanceAiSignalDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class GovernanceAiApiService {
  private http = inject(HttpClient);
  private base = '/api/governance-ai';

  listSignals(params?: { page?: number; limit?: number; severity?: string; status?: string }): Observable<GovernanceAiListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.severity) httpParams = httpParams.set('severity', params.severity);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    return this.http.get<GovernanceAiListResponse>(`${this.base}/signals`, { params: httpParams });
  }

  getSignal(id: string): Observable<GovernanceAiSignalDto> {
    return this.http.get<GovernanceAiSignalDto>(`${this.base}/signals/${id}`);
  }

  runPipeline(): Observable<GovernanceAiPipelineRunDto> {
    return this.http.post<GovernanceAiPipelineRunDto>(`${this.base}/pipeline/run`, {});
  }

  getPipelineHistory(params?: { page?: number; limit?: number }): Observable<{ data: GovernanceAiPipelineRunDto[]; total: number }> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    return this.http.get<{ data: GovernanceAiPipelineRunDto[]; total: number }>(`${this.base}/pipeline/history`, { params: httpParams });
  }

  getHealthDashboard(): Observable<GovernanceAiHealthDashboard> {
    return this.http.get<GovernanceAiHealthDashboard>(`${this.base}/health`);
  }

  getScoreExplanation(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/score/explanation`);
  }

  submitFeedback(signalId: string, feedback: { rating: number; comment?: string }): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.base}/signals/${signalId}/feedback`, feedback);
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/admin/diagnostics`);
  }
}
