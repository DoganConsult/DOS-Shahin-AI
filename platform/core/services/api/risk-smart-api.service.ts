/**
 * Risk Smart API Service
 * Canonical location: core/services/api/risk-smart-api.service.ts
 * Provides typed access to AI-assisted risk intelligence endpoints.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface RiskSmartInsightDto {
  id: string;
  riskId?: string;
  type: 'prediction' | 'anomaly' | 'recommendation' | 'correlation';
  title: string;
  summary: string;
  confidence: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  suggestedActions?: string[];
  relatedRiskIds?: string[];
  generatedAt: string;
  expiresAt?: string;
  [key: string]: unknown;
}

export interface RiskSmartListResponse {
  items: RiskSmartInsightDto[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface RiskPredictionRequest {
  riskId: string;
  horizon?: 'short' | 'medium' | 'long';
  factors?: string[];
}

export interface RiskPredictionResult {
  riskId: string;
  predictedScoreChange: number;
  likelihood: number;
  confidence: number;
  drivingFactors: Array<{ factor: string; weight: number }>;
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class RiskSmartApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params?: Record<string, string>): Observable<RiskSmartListResponse> {
    const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;
    return this.http.get<RiskSmartListResponse>(`${this.base}/risk-smart`, { params: httpParams }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getById(id: string): Observable<RiskSmartInsightDto> {
    return this.http.get<RiskSmartInsightDto>(`${this.base}/risk-smart/${id}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  predict(request: RiskPredictionRequest): Observable<RiskPredictionResult> {
    return this.http.post<RiskPredictionResult>(`${this.base}/risk-smart/predict`, request).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  getInsightsForRisk(riskId: string): Observable<RiskSmartListResponse> {
    return this.http.get<RiskSmartListResponse>(`${this.base}/risk-smart/by-risk/${riskId}`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }

  dismissInsight(id: string, reason?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/risk-smart/${id}/dismiss`, { reason }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => err)),
    );
  }
}
