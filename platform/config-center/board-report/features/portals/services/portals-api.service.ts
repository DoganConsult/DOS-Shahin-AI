import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PortalDto {
  id: string;
  tenantId: string;
  name: string;
  nameAr?: string;
  description?: string;
  portalType: 'vendor' | 'audit' | 'compliance' | 'stakeholder' | 'custom';
  status: 'draft' | 'active' | 'inactive' | 'expired';
  accessUrl?: string;
  expiresAt?: string;
  ownerId?: string;
  ownerName?: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PortalListResponse {
  data: PortalDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PortalDashboard {
  stats: Record<string, number>;
  kpis: Record<string, unknown>;
  typeBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class PortalsApiService {
  private http = inject(HttpClient);
  private base = '/api/portals';

  list(params?: { page?: number; limit?: number; status?: string; portalType?: string }): Observable<PortalListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.portalType) httpParams = httpParams.set('portalType', params.portalType);
    return this.http.get<PortalListResponse>(this.base, { params: httpParams });
  }

  get(id: string): Observable<PortalDto> {
    return this.http.get<PortalDto>(`${this.base}/${id}`);
  }

  create(data: Partial<PortalDto>): Observable<PortalDto> {
    return this.http.post<PortalDto>(this.base, data);
  }

  update(id: string, data: Partial<PortalDto>): Observable<PortalDto> {
    return this.http.put<PortalDto>(`${this.base}/${id}`, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  activate(id: string): Observable<PortalDto> {
    return this.http.post<PortalDto>(`${this.base}/${id}/activate`, {});
  }

  deactivate(id: string): Observable<PortalDto> {
    return this.http.post<PortalDto>(`${this.base}/${id}/deactivate`, {});
  }

  getDashboard(): Observable<PortalDashboard> {
    return this.http.get<PortalDashboard>(`${this.base}/dashboard`);
  }

  getTrends(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/trends`);
  }

  getExport(filters?: Record<string, string>): Observable<{ rows: unknown[]; total: number }> {
    let httpParams = new HttpParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => httpParams = httpParams.set(k, v));
    return this.http.get<{ rows: unknown[]; total: number }>(`${this.base}/export`, { params: httpParams });
  }

  getActiveSessions(): Observable<{ sessions: unknown[]; total: number }> {
    return this.http.get<{ sessions: unknown[]; total: number }>(`${this.base}/active-sessions`);
  }

  bulkActivate(ids: string[]): Observable<{ results: unknown[]; succeeded: number; failed: number }> {
    return this.http.post<{ results: unknown[]; succeeded: number; failed: number }>(`${this.base}/bulk/activate`, { ids });
  }

  bulkDeactivate(ids: string[]): Observable<{ results: unknown[]; succeeded: number; failed: number }> {
    return this.http.post<{ results: unknown[]; succeeded: number; failed: number }>(`${this.base}/bulk/deactivate`, { ids });
  }

  getCrossModule(linkedModule: string): Observable<{ items: unknown[]; total: number }> {
    return this.http.get<{ items: unknown[]; total: number }>(`${this.base}/cross-module/${linkedModule}`);
  }


  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/portals/diagnostics`);
  }
}
