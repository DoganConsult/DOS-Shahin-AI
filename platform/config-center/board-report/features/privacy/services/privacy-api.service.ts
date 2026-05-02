import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DsrDto {
  id: string;
  tenantId: string;
  subjectName: string;
  subjectEmail?: string;
  requestType: 'access' | 'deletion' | 'rectification' | 'portability' | 'restriction' | 'objection';
  status: 'submitted' | 'in_progress' | 'completed' | 'rejected' | 'escalated';
  regulation: string;
  priority?: string;
  dueDate?: string;
  completedAt?: string;
  assigneeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BreachDto {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  reportedBy: string;
  reportedAt: string;
  affectedSubjects: number;
  description?: string;
}

export interface ConsentDto {
  id: string;
  subjectId: string;
  purpose: string;
  status: 'granted' | 'withdrawn' | 'expired';
  grantedAt: string;
  expiresAt?: string;
}

export interface PrivacyDashboard {
  stats: Record<string, number>;
  kpis: Record<string, unknown>;
  dsrTypes: Record<string, number>;
  regulations: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class PrivacyApiService {
  private http = inject(HttpClient);
  private base = '/api/privacy';

  listDsrs(params?: { page?: number; limit?: number; status?: string; requestType?: string; regulation?: string }): Observable<{ data: DsrDto[]; total: number }> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.requestType) httpParams = httpParams.set('requestType', params.requestType);
    if (params?.regulation) httpParams = httpParams.set('regulation', params.regulation);
    return this.http.get<{ data: DsrDto[]; total: number }>(this.base, { params: httpParams });
  }

  getDsr(id: string): Observable<DsrDto> {
    return this.http.get<DsrDto>(`${this.base}/${id}`);
  }

  createDsr(data: Partial<DsrDto>): Observable<DsrDto> {
    return this.http.post<DsrDto>(this.base, data);
  }

  updateDsr(id: string, data: Partial<DsrDto>): Observable<DsrDto> {
    return this.http.put<DsrDto>(`${this.base}/${id}`, data);
  }

  deleteDsr(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  search(q: string, filters?: Record<string, string>): Observable<{ data: DsrDto[]; total: number }> {
    let httpParams = new HttpParams().set('q', q);
    if (filters) Object.entries(filters).forEach(([k, v]) => httpParams = httpParams.set(k, v));
    return this.http.get<{ data: DsrDto[]; total: number }>(`${this.base}/search`, { params: httpParams });
  }

  getDashboard(): Observable<PrivacyDashboard> {
    return this.http.get<PrivacyDashboard>(`${this.base}/dashboard`);
  }

  getTrends(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/trends`);
  }

  getExport(filters?: Record<string, string>): Observable<{ rows: unknown[]; total: number }> {
    let httpParams = new HttpParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => httpParams = httpParams.set(k, v));
    return this.http.get<{ rows: unknown[]; total: number }>(`${this.base}/export`, { params: httpParams });
  }

  getDsrDashboard(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/dsr/dashboard`);
  }

  listBreaches(params?: { status?: string; severity?: string }): Observable<{ breaches: BreachDto[]; total: number }> {
    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.severity) httpParams = httpParams.set('severity', params.severity);
    return this.http.get<{ breaches: BreachDto[]; total: number }>(`${this.base}/breaches`, { params: httpParams });
  }

  reportBreach(data: Partial<BreachDto>): Observable<BreachDto> {
    return this.http.post<BreachDto>(`${this.base}/breaches`, data);
  }

  getBreach(id: string): Observable<BreachDto> {
    return this.http.get<BreachDto>(`${this.base}/breaches/${id}`);
  }

  getBreachDashboard(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/breaches/dashboard`);
  }

  transitionBreach(id: string, status: string, notes?: string): Observable<BreachDto> {
    return this.http.post<BreachDto>(`${this.base}/breaches/${id}/transition`, { status, notes });
  }

  getConsentDashboard(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/consents`);
  }

  getConsentsBySubject(subjectId: string): Observable<{ consents: ConsentDto[]; total: number }> {
    return this.http.get<{ consents: ConsentDto[]; total: number }>(`${this.base}/consents/subject/${subjectId}`);
  }

  grantConsent(data: Partial<ConsentDto>): Observable<ConsentDto> {
    return this.http.post<ConsentDto>(`${this.base}/consents`, data);
  }

  withdrawConsent(consentId: string, reason?: string): Observable<ConsentDto> {
    return this.http.post<ConsentDto>(`${this.base}/consents/${consentId}/withdraw`, { reason });
  }

  listTransferAssessments(): Observable<{ assessments: unknown[]; total: number }> {
    return this.http.get<{ assessments: unknown[]; total: number }>(`${this.base}/transfers`);
  }

  createTransferAssessment(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/transfers`, data);
  }

  approveTransfer(id: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/transfers/${id}/approve`, {});
  }

  getDataMapping(): Observable<{ activities: unknown[]; total: number }> {
    return this.http.get<{ activities: unknown[]; total: number }>(`${this.base}/data-mapping`);
  }

  createProcessingActivity(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/data-mapping`, data);
  }

  generateRopa(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/ropa`);
  }

  getCrossModule(linkedModule: string): Observable<{ items: unknown[]; total: number }> {
    return this.http.get<{ items: unknown[]; total: number }>(`${this.base}/cross-module/${linkedModule}`);
  }


  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/privacy/diagnostics`);
  }
}
