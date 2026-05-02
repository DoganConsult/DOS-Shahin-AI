import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WidgetDataEnvelope { widgetId: string; data: unknown; fetchedAt: string; stale: boolean; }
export interface MonteCarloResult { iterations: number; mean: number; median: number; p95: number; distribution: number[]; }

@Injectable({ providedIn: 'root' })
export class ChartDataService {
  private http = inject(HttpClient);
  getWidgetData(widgetId: string): Observable<WidgetDataEnvelope> { return this.http.get<WidgetDataEnvelope>(`/api/charts/widgets/${widgetId}/data`); }
  runMonteCarlo(params: Record<string, unknown>): Observable<MonteCarloResult> { return this.http.post<MonteCarloResult>('/api/charts/monte-carlo', params); }
}
