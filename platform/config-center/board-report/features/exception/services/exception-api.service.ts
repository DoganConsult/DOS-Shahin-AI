import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface ExceptionRequestDto {
  id: string;
  tenantId: string;
  title: string;
  titleAr?: string;
  description: string;
  justification: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'expired' | 'revoked';
  requesterId: string;
  requesterName: string;
  approverId?: string;
  approverName?: string;
  controlRef?: string;
  policyRef?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  compensatingControls?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExceptionListResponse {
  data: ExceptionRequestDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ExceptionSearchParams {
  q?: string;
  status?: string;
  exceptionType?: string;
  riskLevel?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface CompensatingControlLink {
  linkId: string;
  exceptionId: string;
  controlId: string;
  controlTitle: string;
  effectivenessRating: 'effective' | 'partially_effective' | 'ineffective' | 'not_assessed';
  linkedBy: string;
  linkedAt: string;
}

export interface RiskLink {
  linkId: string;
  exceptionId: string;
  riskId: string | null;
  controlId: string | null;
  linkType: string;
  impactDescription: string;
  residualRiskLevel: string;
  linkedBy: string;
  linkedAt: string;
}

export interface TimelineEntry {
  id: string;
  exceptionId: string;
  action: string;
  actorId: string;
  actorName?: string;
  detail?: string;
  timestamp: string;
}

export interface JustificationData {
  exceptionId: string;
  businessJustification: string;
  riskAcceptanceStatement?: string;
  impactAnalysis?: string;
  alternativesConsidered?: string[];
  justifiedBy: string;
  justifiedAt: string;
}

export interface ApprovalHistoryEntry {
  reviewId: string;
  exceptionId: string;
  reviewType: string;
  requestedBy: string;
  requestedAt: string;
  status: string;
  reviewedBy?: string;
  reviewedAt?: string;
  comments?: string;
}

export interface BulkTransitionResult {
  results: Array<{ id: string; success: boolean; error?: string }>;
  succeeded: number;
  failed: number;
}

export interface PaginatedResponse<T> {
  items?: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ExceptionIntakeData {
  title: string;
  description?: string;
  exceptionType: 'policy' | 'control' | 'compliance' | 'risk_acceptance' | 'process';
  linkedPolicyId?: string;
  linkedControlId?: string;
  linkedRiskId?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  businessJustification: string;
  impactAnalysis?: string;
  alternativesConsidered?: string[];
  compensatingControlIds?: string[];
  effectiveDate?: string;
  expiryDate?: string;
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class ExceptionApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/exception`;

  list(params?: { page?: number; limit?: number; status?: string; search?: string }): Observable<ExceptionListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    return this.http.get<ExceptionListResponse>(this.base, { params: httpParams });
  }

  search(params: ExceptionSearchParams): Observable<any> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.exceptionType) httpParams = httpParams.set('exceptionType', params.exceptionType);
    if (params.riskLevel) httpParams = httpParams.set('riskLevel', params.riskLevel);
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDir) httpParams = httpParams.set('sortDir', params.sortDir);
    return this.http.get(`${this.base}/search`, { params: httpParams });
  }

  get(id: string): Observable<ExceptionRequestDto> {
    return this.http.get<ExceptionRequestDto>(`${this.base}/${id}`);
  }

  create(exception: Partial<ExceptionRequestDto>): Observable<ExceptionRequestDto> {
    return this.http.post<ExceptionRequestDto>(this.base, exception);
  }

  intake(data: ExceptionIntakeData): Observable<any> {
    return this.http.post(`${this.base}/intake`, data);
  }

  update(id: string, exception: Partial<ExceptionRequestDto>): Observable<ExceptionRequestDto> {
    return this.http.put<ExceptionRequestDto>(`${this.base}/${id}`, exception);
  }

  submitForApproval(id: string): Observable<ExceptionRequestDto> {
    return this.http.post<ExceptionRequestDto>(`${this.base}/${id}/submit`, {});
  }

  approve(id: string, comment?: string): Observable<ExceptionRequestDto> {
    return this.http.post<ExceptionRequestDto>(`${this.base}/${id}/approve`, { comment });
  }

  reject(id: string, reason: string): Observable<ExceptionRequestDto> {
    return this.http.post<ExceptionRequestDto>(`${this.base}/${id}/reject`, { reason });
  }

  revoke(id: string, reason?: string): Observable<ExceptionRequestDto> {
    return this.http.post<ExceptionRequestDto>(`${this.base}/${id}/revoke`, { reason });
  }

  renew(id: string, data: { additionalDays: number; justification: string }): Observable<any> {
    return this.http.post(`${this.base}/${id}/renew`, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}?confirm=true`);
  }

  getCompensatingControls(id: string, page = 1, pageSize = 25): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get(`${this.base}/${id}/compensating-controls`, { params });
  }

  linkCompensatingControl(id: string, data: { controlId: string; controlTitle: string }): Observable<any> {
    return this.http.post(`${this.base}/${id}/compensating-controls`, data);
  }

  unlinkCompensatingControl(linkId: string): Observable<any> {
    return this.http.delete(`${this.base}/compensating-controls/${linkId}`);
  }

  updateControlEffectiveness(linkId: string, rating: string): Observable<any> {
    return this.http.post(`${this.base}/compensating-controls/${linkId}/effectiveness`, { rating });
  }

  getRiskLinks(id: string, page = 1, pageSize = 25): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get(`${this.base}/${id}/risk-links`, { params });
  }

  linkRisk(id: string, data: { riskId?: string; controlId?: string; linkType?: string; impactDescription?: string; residualRiskLevel?: string }): Observable<any> {
    return this.http.post(`${this.base}/${id}/risk-links`, data);
  }

  getTimeline(id: string, page = 1, pageSize = 50): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get(`${this.base}/${id}/timeline`, { params });
  }

  getJustification(id: string): Observable<any> {
    return this.http.get(`${this.base}/${id}/justification`);
  }

  updateJustification(id: string, data: { businessJustification: string; riskAcceptanceStatement?: string; impactAnalysis?: string; alternativesConsidered?: string[] }): Observable<any> {
    return this.http.put(`${this.base}/${id}/justification`, data);
  }

  getJustificationHistory(id: string, page = 1, pageSize = 25): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get(`${this.base}/${id}/justification/history`, { params });
  }

  getApprovalHistory(id: string, page = 1, pageSize = 25): Observable<any> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get(`${this.base}/${id}/approval-history`, { params });
  }

  bulkTransition(ids: string[], status: string, reason?: string): Observable<BulkTransitionResult> {
    return this.http.post<BulkTransitionResult>(`${this.base}/bulk/transition`, { ids, status, reason });
  }

  export(filters?: Record<string, string>): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v) params = params.set(k, v); });
    }
    return this.http.get(`${this.base}/export`, { params });
  }
}
