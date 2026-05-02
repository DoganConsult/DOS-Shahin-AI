import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface IssueDto {
  id: string;
  tenantId: string;
  title: string;
  titleAr?: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  sourceModule?: string;
  sourceEntityId?: string;
  assigneeId?: string;
  assigneeName?: string;
  reportedBy?: string;
  dueDate?: string;
  resolvedAt?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IssueListResponse {
  data: IssueDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IssueDashboard {
  stats: Record<string, number>;
  kpis: Record<string, unknown>;
  severityBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class IssuesApiService {
  private http = inject(HttpClient);
  private base = '/api/issues';

  list(params?: { page?: number; limit?: number; status?: string; severity?: string; assigneeId?: string; search?: string }): Observable<IssueListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.severity) httpParams = httpParams.set('severity', params.severity);
    if (params?.assigneeId) httpParams = httpParams.set('assigneeId', params.assigneeId);
    if (params?.search) httpParams = httpParams.set('q', params.search);
    return this.http.get<IssueListResponse>(this.base, { params: httpParams });
  }

  get(id: string): Observable<IssueDto> {
    return this.http.get<IssueDto>(`${this.base}/${id}`);
  }

  create(data: Partial<IssueDto>): Observable<IssueDto> {
    return this.http.post<IssueDto>(this.base, data);
  }

  update(id: string, data: Partial<IssueDto>): Observable<IssueDto> {
    return this.http.put<IssueDto>(`${this.base}/${id}`, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  search(q: string, filters?: Record<string, string>): Observable<IssueListResponse> {
    let httpParams = new HttpParams().set('q', q);
    if (filters) Object.entries(filters).forEach(([k, v]) => httpParams = httpParams.set(k, v));
    return this.http.get<IssueListResponse>(`${this.base}/search`, { params: httpParams });
  }

  getDashboard(): Observable<IssueDashboard> {
    return this.http.get<IssueDashboard>(`${this.base}/dashboard`);
  }

  getTrends(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/trends`);
  }

  getExport(filters?: Record<string, string>): Observable<{ rows: unknown[]; total: number }> {
    let httpParams = new HttpParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => httpParams = httpParams.set(k, v));
    return this.http.get<{ rows: unknown[]; total: number }>(`${this.base}/export`, { params: httpParams });
  }

  transition(id: string, status: string, note?: string): Observable<IssueDto> {
    return this.http.post<IssueDto>(`${this.base}/${id}/transition`, { status, note });
  }

  escalate(id: string, reason: string): Observable<IssueDto> {
    return this.http.post<IssueDto>(`${this.base}/${id}/escalate`, { reason });
  }

  getCrossModule(linkedModule: string): Observable<{ items: unknown[]; total: number }> {
    return this.http.get<{ items: unknown[]; total: number }>(`${this.base}/cross-module/${linkedModule}`);
  }


  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/issues/diagnostics`);
  }
}
