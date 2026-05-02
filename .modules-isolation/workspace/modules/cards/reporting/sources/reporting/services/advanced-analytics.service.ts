import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AnalyticsContext { tenantId: string; moduleCode: string; dateRange: { from: string; to: string }; filters: Record<string, unknown>; }
export interface DrillThroughPath { label: string; route: string; params: Record<string, string>; }
export interface PredictiveInsight { insightId: string; title: string; confidence: number; description: string; suggestedAction?: string; }

@Injectable({ providedIn: 'root' })
export class AdvancedAnalyticsService {
  private http = inject(HttpClient);
  getInsights(ctx: AnalyticsContext): Observable<PredictiveInsight[]> { return this.http.post<PredictiveInsight[]>('/api/analytics/insights', ctx); }
  getDrillPaths(moduleCode: string): Observable<DrillThroughPath[]> { return this.http.get<DrillThroughPath[]>(`/api/analytics/${moduleCode}/drill-paths`); }
}
