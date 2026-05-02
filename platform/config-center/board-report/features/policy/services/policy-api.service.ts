import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PolicyDto {
  id: string;
  tenantId: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'retired' | 'archived';
  version: string;
  category: string;
  owner?: string;
  ownerName?: string;
  approver?: string;
  approverName?: string;
  effectiveDate?: string;
  reviewDate?: string;
  expiryDate?: string;
  frameworkRef?: string;
  controlRef?: string;
  tags: string[];
  attestationRequired: boolean;
  attestationCount?: number;
  attestationTotal?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyVersionDto {
  id: string;
  policyId: string;
  version: string;
  changeNote: string;
  changedBy: string;
  changedByName: string;
  createdAt: string;
}

export interface PolicyAttestationDto {
  id: string;
  policyId: string;
  userId: string;
  userName: string;
  status: 'pending' | 'accepted' | 'rejected';
  attestedAt?: string;
  comment?: string;
}

export interface PolicyListResponse {
  data: PolicyDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PolicyExceptionDto {
  id: string;
  policyId: string;
  title: string;
  reason: string;
  status: string;
  requestedBy: string;
  approvedBy?: string;
  expiresAt?: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface PolicyPublicationDto {
  id: string;
  policyId: string;
  status: string;
  audienceCount?: number;
  acknowledgedCount?: number;
  createdAt: string;
  [key: string]: unknown;
}

export interface PolicyLinkDto {
  policyId: string;
  entityType: string;
  entityId: string;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class PolicyApiService {
  private http = inject(HttpClient);
  private base = '/api/policies';

  list(params?: { page?: number; limit?: number; status?: string; category?: string; search?: string }): Observable<PolicyListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.category) httpParams = httpParams.set('category', params.category);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    return this.http.get<PolicyListResponse>(this.base, { params: httpParams });
  }

  get(id: string): Observable<PolicyDto> {
    return this.http.get<PolicyDto>(`${this.base}/${id}`);
  }

  create(policy: Partial<PolicyDto>): Observable<PolicyDto> {
    return this.http.post<PolicyDto>(this.base, policy);
  }

  update(id: string, policy: Partial<PolicyDto>): Observable<PolicyDto> {
    return this.http.put<PolicyDto>(`${this.base}/${id}`, policy);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}?confirm=true`);
  }

  submitForReview(id: string): Observable<PolicyDto> {
    return this.http.post<PolicyDto>(`${this.base}/${id}/submit-review`, {});
  }

  approve(id: string, comment?: string): Observable<PolicyDto> {
    return this.http.post<PolicyDto>(`${this.base}/${id}/approve`, { comment });
  }

  publish(id: string): Observable<PolicyDto> {
    return this.http.post<PolicyDto>(`${this.base}/${id}/publish`, {});
  }

  retire(id: string): Observable<PolicyDto> {
    return this.http.post<PolicyDto>(`${this.base}/${id}/retire`, {});
  }

  getVersions(id: string): Observable<PolicyVersionDto[]> {
    return this.http.get<PolicyVersionDto[]>(`${this.base}/${id}/versions`);
  }

  getAttestations(id: string): Observable<PolicyAttestationDto[]> {
    return this.http.get<PolicyAttestationDto[]>(`${this.base}/${id}/attestations`);
  }

  requestAttestation(id: string, userIds: string[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/attestations/request`, { userIds });
  }

  // ---------------------------------------------------------------------------
  // Overview & Work Queue — backend: /api/policy-overview
  // ---------------------------------------------------------------------------

  getOverviewKPIs(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>('/api/policy-overview');
  }

  getWorkQueue(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>('/api/policy-overview/work-queue');
  }

  getRecentActivity(limit?: number): Observable<ApiResponse> {
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit);
    return this.http.get<ApiResponse>('/api/policy-overview/recent-activity', { params });
  }

  // ---------------------------------------------------------------------------
  // Exceptions — backend: /api/policy-exceptions
  // ---------------------------------------------------------------------------

  listExceptions(filters?: Record<string, string | number | boolean>): Observable<ApiResponse<PolicyExceptionDto[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value != null && value !== '') params = params.set(key, String(value));
      });
    }
    return this.http.get<ApiResponse<PolicyExceptionDto[]>>('/api/policy-exceptions', { params });
  }

  getException(id: string): Observable<PolicyExceptionDto> {
    return this.http.get<PolicyExceptionDto>(`/api/policy-exceptions/${id}`);
  }

  createException(data: Partial<PolicyExceptionDto>): Observable<PolicyExceptionDto> {
    return this.http.post<PolicyExceptionDto>('/api/policy-exceptions', data);
  }

  approveException(id: string, data: Record<string, unknown>): Observable<PolicyExceptionDto> {
    return this.http.post<PolicyExceptionDto>(`/api/policy-exceptions/${id}/approve`, data);
  }

  rejectException(id: string, data: Record<string, unknown>): Observable<PolicyExceptionDto> {
    return this.http.post<PolicyExceptionDto>(`/api/policy-exceptions/${id}/reject`, data);
  }

  renewException(id: string, data: Record<string, unknown>): Observable<PolicyExceptionDto> {
    return this.http.post<PolicyExceptionDto>(`/api/policy-exceptions/${id}/renew`, data);
  }

  closeException(id: string, data?: Record<string, unknown>): Observable<PolicyExceptionDto> {
    return this.http.post<PolicyExceptionDto>(`/api/policy-exceptions/${id}/close`, data ?? {});
  }

  // ---------------------------------------------------------------------------
  // Publications — backend: /api/policy-publications
  // ---------------------------------------------------------------------------

  listPublications(filters?: Record<string, string | number | boolean>): Observable<ApiResponse<PolicyPublicationDto[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value != null && value !== '') params = params.set(key, String(value));
      });
    }
    return this.http.get<ApiResponse<PolicyPublicationDto[]>>('/api/policy-publications', { params });
  }

  createPublication(data: Partial<PolicyPublicationDto>): Observable<PolicyPublicationDto> {
    return this.http.post<PolicyPublicationDto>('/api/policy-publications', data);
  }

  getPublicationStatus(id: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`/api/policy-publications/${id}/status`);
  }

  sendPublicationReminders(id: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`/api/policy-publications/${id}/remind`, {});
  }

  recallPublication(id: string, data: Record<string, unknown>): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`/api/policy-publications/${id}/recall`, data);
  }

  // ---------------------------------------------------------------------------
  // Coverage & Linkage — backend: /api/policy-coverage
  // ---------------------------------------------------------------------------

  getObligationCoverage(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>('/api/policy-coverage/obligations');
  }

  getControlCoverage(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>('/api/policy-coverage/controls');
  }

  getRiskCoverage(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>('/api/policy-coverage/risks');
  }

  getCoverageGaps(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>('/api/policy-coverage/gaps');
  }

  getPolicyLinks(policyId: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`/api/policy-coverage/${policyId}/links`);
  }

  createLink(data: PolicyLinkDto): Observable<ApiResponse> {
    return this.http.post<ApiResponse>('/api/policy-coverage/link', data);
  }

  removeLink(data: PolicyLinkDto): Observable<ApiResponse> {
    return this.http.request<ApiResponse>('delete', '/api/policy-coverage/link', { body: data });
  }

  // ---------------------------------------------------------------------------
  // Reports & Admin — backend: /api/policy-reports
  // ---------------------------------------------------------------------------

  getReportCatalog(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>('/api/policy-reports/catalog');
  }

  runReport(data: Record<string, unknown>): Observable<ApiResponse> {
    return this.http.post<ApiResponse>('/api/policy-reports/run', data);
  }

  getAdminSettings(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>('/api/policy-reports/admin/settings');
  }

  updateAdminSettings(data: Record<string, unknown>): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>('/api/policy-reports/admin/settings', data);
  }

  // ---------------------------------------------------------------------------
  // Categories — uses policy-reports admin endpoint
  // ---------------------------------------------------------------------------

  getCategories(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>('/api/policy-reports/admin/settings').pipe(
    );
  }

  getPolicyScores(policyId: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`/api/policy-overview/scores/${policyId}`);
  }
}
