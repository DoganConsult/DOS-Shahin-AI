// @ts-nocheck
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class QiyasStrategyApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/qiyas-strategy';

  // ═══ Overview ═══
  getOverview(): Observable<any> { return this.http.get(`${this.base}/overview`); }

  // ═══ Objectives ═══
  getObjectives(filters?: { status?: string; themeId?: string; ownerId?: string }): Observable<{ objectives: any[]; total: number }> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.themeId) params = params.set('themeId', filters.themeId);
    if (filters?.ownerId) params = params.set('ownerId', filters.ownerId);
    return this.http.get<{ objectives: any[]; total: number }>(`${this.base}/objectives`, { params });
  }
  getObjective(id: string): Observable<any> { return this.http.get(`${this.base}/objectives/${id}`); }
  createObjective(data: any): Observable<any> { return this.http.post(`${this.base}/objectives`, data); }
  updateObjective(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/objectives/${id}`, data); }
  deleteObjective(id: string): Observable<any> { return this.http.delete(`${this.base}/objectives/${id}`); }

  // ═══ Themes ═══
  getThemes(): Observable<{ themes: any[] }> { return this.http.get<{ themes: any[] }>(`${this.base}/themes`); }
  createTheme(data: any): Observable<any> { return this.http.post(`${this.base}/themes`, data); }

  // ═══ Priorities ═══
  getPriorities(): Observable<{ priorities: any[] }> { return this.http.get<{ priorities: any[] }>(`${this.base}/priorities`); }
  createPriority(data: any): Observable<any> { return this.http.post(`${this.base}/priorities`, data); }

  // ═══ Risk Appetite ═══
  getRiskAppetite(): Observable<{ statements: any[] }> { return this.http.get<{ statements: any[] }>(`${this.base}/risk-appetite`); }
  createRiskAppetite(data: any): Observable<any> { return this.http.post(`${this.base}/risk-appetite`, data); }
  approveRiskAppetite(id: string): Observable<any> { return this.http.post(`${this.base}/risk-appetite/${id}/approve`, {}); }

  // ═══ Metrics ═══
  getMetricSnapshots(filters?: { metricType?: string; metricKey?: string }): Observable<{ snapshots: any[] }> {
    let params = new HttpParams();
    if (filters?.metricType) params = params.set('metricType', filters.metricType);
    if (filters?.metricKey) params = params.set('metricKey', filters.metricKey);
    return this.http.get<{ snapshots: any[] }>(`${this.base}/metrics/snapshots`, { params });
  }
  createMetricSnapshot(data: any): Observable<any> { return this.http.post(`${this.base}/metrics/snapshots`, data); }
  getMetricTrends(metricKey: string, days?: number): Observable<{ trend: any[] }> {
    let params = new HttpParams().set('metricKey', metricKey);
    if (days) params = params.set('days', days.toString());
    return this.http.get<{ trend: any[] }>(`${this.base}/metrics/trends`, { params });
  }

  // ═══ Roadmap ═══
  getRoadmap(filters?: { status?: string; phase?: string; objectiveId?: string }): Observable<{ items: any[]; total: number }> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.phase) params = params.set('phase', filters.phase);
    if (filters?.objectiveId) params = params.set('objectiveId', filters.objectiveId);
    return this.http.get<{ items: any[]; total: number }>(`${this.base}/roadmap`, { params });
  }
  createRoadmapItem(data: any): Observable<any> { return this.http.post(`${this.base}/roadmap`, data); }
  updateRoadmapItem(id: string, data: any): Observable<any> { return this.http.put(`${this.base}/roadmap/${id}`, data); }

  // ═══ Scorecards ═══
  getScorecards(): Observable<{ assessments: any[]; domainScores: any[] }> {
    return this.http.get<{ assessments: any[]; domainScores: any[] }>(`${this.base}/scorecards`);
  }

  // ═══ Executive Packs ═══
  getExecutivePacks(): Observable<{ packs: any[] }> { return this.http.get<{ packs: any[] }>(`${this.base}/executive-packs`); }
  generatePack(packId: string, format: string): Observable<any> {
    return this.http.post(`${this.base}/executive-packs/generate`, { packId, format });
  }

  // ═══ Admin ═══
  getSettings(): Observable<any> { return this.http.get(`${this.base}/admin/settings`); }
  updateSettings(settings: any): Observable<any> { return this.http.patch(`${this.base}/admin/settings`, settings); }
}
