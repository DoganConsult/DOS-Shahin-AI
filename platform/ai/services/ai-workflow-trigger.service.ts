import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface AIWorkflowRecommendation {
  id: string;
  workflowId: string;
  action: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export function filterRecommendations(
  recommendations: AIWorkflowRecommendation[],
  minConfidence: number,
): AIWorkflowRecommendation[] {
  return recommendations.filter(r => r.confidence >= minConfidence);
}

@Injectable({ providedIn: 'root' })
export class AiWorkflowTriggerService {
  private http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getRecommendations(workflowId?: string): Observable<AIWorkflowRecommendation[]> {
    const qs = workflowId ? `?workflowId=${encodeURIComponent(workflowId)}` : '';
    return this.http.get<AIWorkflowRecommendation[]>(`${this.api}/ai/workflow/recommendations${qs}`);
  }

  acceptRecommendation(rec: AIWorkflowRecommendation): Observable<AIWorkflowRecommendation> {
    return this.http.post<AIWorkflowRecommendation>(`${this.api}/ai/workflow/recommendations/${rec.id}/accept`, {});
  }

  rejectRecommendation(rec: AIWorkflowRecommendation, reason?: string): Observable<AIWorkflowRecommendation> {
    return this.http.post<AIWorkflowRecommendation>(`${this.api}/ai/workflow/recommendations/${rec.id}/reject`, { reason });
  }

  triggerWorkflow(workflowId: string, input?: Record<string, unknown>): Observable<{ executionId: string }> {
    return this.http.post<{ executionId: string }>(`${this.api}/ai/workflow/${workflowId}/trigger`, input ?? {});
  }
}
