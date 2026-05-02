import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface AIRiskAssessmentDto {
  riskId: string;
  assessment: string;
  recommendations?: string[];
  confidence?: number;
  factors?: Array<{ name: string; weight: number; value: number }>;
}

export interface AIGapAnalysisDto {
  frameworkId: string;
  gaps: Array<{ controlId: string; gap: string; severity: string; recommendation?: string }>;
  confidence?: number;
}

export interface AIPolicyDto {
  policy_id: string;
  workflow_id: string;
  ai_enabled: boolean;
  autonomy_level: number;
  allowed_ai_actions: string[];
  forbidden_actions: string[];
  max_confidence_auto: number;
  require_human_review: boolean;
  override_tenant_config: boolean;
}

export interface AgentPerformanceDto {
  agentId: string;
  agentName?: string;
  accuracy?: number;
  avgResponseTime?: number;
  tasksCompleted?: number;
  taskCount?: number;
  successRate?: number;
  period?: string;
}

export interface GovAIRecommendationDto {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  issueId?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AiAgentApiService {
  private http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getAgentPerformance(agentId?: string): Observable<AgentPerformanceDto[]> {
    const qs = agentId ? `?agentId=${encodeURIComponent(agentId)}` : '';
    return this.http.get<AgentPerformanceDto[]>(`${this.api}/copilot/agent-performance${qs}`);
  }

  govAiRecommendations(params?: { status?: string }): Observable<GovAIRecommendationDto[]> {
    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set('status', params.status);
    return this.http.get<GovAIRecommendationDto[]>(`${this.api}/governance/ai/recommendations`, { params: httpParams });
  }

  govAiAcceptRec(id: string): Observable<GovAIRecommendationDto> {
    return this.http.post<GovAIRecommendationDto>(`${this.api}/governance/ai/recommendations/${id}/accept`, {});
  }

  govAiRejectRec(id: string, reason: string): Observable<GovAIRecommendationDto> {
    return this.http.post<GovAIRecommendationDto>(`${this.api}/governance/ai/recommendations/${id}/reject`, { reason });
  }

  getAIRiskAssessment(riskId: string): Observable<AIRiskAssessmentDto> {
    return this.http.get<AIRiskAssessmentDto>(`${this.api}/ai/risk-assessment/${riskId}`);
  }

  getAIGapAnalysis(frameworkId: string): Observable<AIGapAnalysisDto> {
    return this.http.get<AIGapAnalysisDto>(`${this.api}/ai/gap-analysis/${frameworkId}`);
  }

  getAIPolicy(workflowId: string): Observable<AIPolicyDto> {
    return this.http.get<AIPolicyDto>(`${this.api}/ai/policy/${workflowId}`);
  }
}
