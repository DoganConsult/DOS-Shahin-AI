import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LookupOption {
  id?: string;
  code?: string;
  label: string;
  label_ar?: string;
  label_en?: string;
}

export interface RiskLookupsResponse {
  categories: LookupOption[];
  owners: Array<{ id: string; label: string; email?: string; roleCode?: string }>;
  severityBands: Array<{ code: string; label: string; min_score: number; max_score: number; colorToken: string }>;
}

export interface ScoreResult {
  inherentScore: number;
  residualScore: number;
  severity: { code: string; label: string; colorToken: string } | null;
  appetiteStatus: 'within-appetite' | 'near-breach' | 'breach';
}

@Injectable({ providedIn: 'root' })
export class RiskSmartApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/risk-smart';

  getLookups(sector?: string): Observable<RiskLookupsResponse> {
    let params = new HttpParams();
    if (sector) params = params.set('sector', sector);
    return this.http.get<RiskLookupsResponse>(`${this.base}/lookups`, { params });
  }

  suggestOwner(payload: {
    departmentId?: string | null;
    categoryCode?: string | null;
  }): Observable<{ owner: { id: string; label: string; email?: string; source?: string } | null }> {
    return this.http.post<{ owner: { id: string; label: string; email?: string; source?: string } | null }>(
      `${this.base}/suggest-owner`,
      payload,
    );
  }

  calculateScore(payload: {
    likelihood: number;
    impact: number;
    controlEffectiveness: number;
  }): Observable<ScoreResult> {
    return this.http.post<ScoreResult>(`${this.base}/calculate-score`, payload);
  }

  /**
   * Predict risk trajectory with breach probability
   * Feature 21: Predictive Risk Scoring (Trend-Based)
   */
  predictRiskTrajectory(
    riskId: string,
    options?: {
      modelId?: string;
      lookaheadDays?: number;
      threshold?: number;
    },
  ): Observable<{
    currentScore: number;
    predictedScore: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    breachProbability: number;
    confidence: number;
    predictedDate?: string;
  }> {
    let params = new HttpParams();
    if (options?.modelId) params = params.set('modelId', options.modelId);
    if (options?.lookaheadDays) params = params.set('lookaheadDays', options.lookaheadDays.toString());
    if (options?.threshold) params = params.set('threshold', options.threshold.toString());

    return this.http.get<{
      currentScore: number;
      predictedScore: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      breachProbability: number;
      confidence: number;
      predictedDate?: string;
    }>(`/api/risk-scoring/risks/${riskId}/predict-trajectory`, { params });
  }
}
