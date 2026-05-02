import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VendorDto {
  id: string;
  tenantId: string;
  name: string;
  nameAr?: string;
  category: string;
  status: 'active' | 'inactive' | 'onboarding' | 'offboarding' | 'suspended';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore?: number;
  contactName?: string;
  contactEmail?: string;
  country?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  lastAssessmentDate?: string;
  nextReviewDate?: string;
  criticality: 'essential' | 'important' | 'standard';
  dataAccessLevel?: string;
  complianceStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorAssessmentDto {
  id: string;
  vendorId: string;
  assessmentType: string;
  status: 'draft' | 'in_progress' | 'completed' | 'expired';
  score?: number;
  maxScore?: number;
  assessorId?: string;
  assessorName?: string;
  completedAt?: string;
  expiresAt?: string;
  findings: VendorFindingDto[];
  createdAt: string;
}

export interface VendorFindingDto {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  description: string;
  remediationPlan?: string;
  dueDate?: string;
}

export interface VendorListResponse {
  data: VendorDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class VendorApiService {
  private http = inject(HttpClient);
  private base = '/api/vendors';

  list(params?: { page?: number; limit?: number; status?: string; riskLevel?: string; search?: string; sort?: string }): Observable<VendorListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.limit) httpParams = httpParams.set('limit', params.limit);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.riskLevel) httpParams = httpParams.set('riskLevel', params.riskLevel);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.sort) httpParams = httpParams.set('sort', params.sort);
    return this.http.get<VendorListResponse>(this.base, { params: httpParams });
  }

  get(id: string): Observable<VendorDto> {
    return this.http.get<VendorDto>(`${this.base}/${id}`);
  }

  create(vendor: Partial<VendorDto>): Observable<VendorDto> {
    return this.http.post<VendorDto>(this.base, vendor);
  }

  update(id: string, vendor: Partial<VendorDto>): Observable<VendorDto> {
    return this.http.put<VendorDto>(`${this.base}/${id}`, vendor);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}?confirm=true`);
  }

  getAssessments(vendorId: string): Observable<VendorAssessmentDto[]> {
    return this.http.get<VendorAssessmentDto[]>(`${this.base}/${vendorId}/assessments`);
  }

  createAssessment(vendorId: string, data: Partial<VendorAssessmentDto>): Observable<VendorAssessmentDto> {
    return this.http.post<VendorAssessmentDto>(`${this.base}/${vendorId}/assessments`, data);
  }

  getRiskScore(vendorId: string): Observable<{ score: number; breakdown: Record<string, number> }> {
    return this.http.get<{ score: number; breakdown: Record<string, number> }>(`${this.base}/${vendorId}/risk-score`);
  }

  getVendors(): Observable<VendorDto[]> {
    return this.http.get<VendorDto[]>(this.base);
  }

  getVendorRiskProfiles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/risk-profiles`);
  }

  getSLABreaches(vendorId?: string): Observable<any[]> {
    const params = vendorId ? `?vendor_id=${vendorId}` : '';
    return this.http.get<any[]>(`${this.base}/sla-breaches${params}`);
  }
}
