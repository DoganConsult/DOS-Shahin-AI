import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

// ── DTOs ──

export interface PolicyDto {
  id: string;
  tenantId?: string;
  workspaceId?: string;
  title: string;
  titleAr?: string;
  status: string;
  requiredEvidenceTypeCodes: string[];
  createdUtc: string;
  updatedUtc: string;
}

export interface GrcControlDto {
  id: string;
  tenantId?: string;
  workspaceId?: string;
  controlRef: string;
  title: string;
  titleAr?: string;
  severity: string;
  requiredEvidenceTypeCodes: string[];
  createdUtc: string;
  updatedUtc: string;
}

export interface GrcRiskDto {
  id: string;
  tenantId?: string;
  workspaceId?: string;
  title: string;
  titleAr?: string;
  severity: string;
  status: string;
  requiredEvidenceTypeCodes: string[];
  createdUtc: string;
  updatedUtc: string;
}

export interface GrcFrameworkDto {
  id: string;
  tenantId?: string;
  workspaceId?: string;
  key: string;
  title: string;
  titleAr?: string;
  defaultRequiredEvidenceTypeCodes: string[];
  createdUtc: string;
  updatedUtc: string;
}

export interface EvidenceAttachmentDto {
  id: string;
  entityType: string;
  entityId: string;
  evidenceTypeCode: string;
  fileName: string;
  fileSizeBytes: number;
  uploadedByUserId?: string;
  uploadedUtc: string;
}

export interface EvidenceBreakdownDto {
  typeCode: string;
  label: string;
  required: number;
  attached: number;
  missing: number;
}

// ── Service ──

@Injectable({ providedIn: 'root' })
export class EvidenceApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/evidence';

  // Policies
  getPolicies(tenantId?: string, workspaceId?: string): Observable<PolicyDto[]> {
    const params = this.buildParams(tenantId, workspaceId);
    return this.http.get<PolicyDto[]>(`${this.base}/policies`, { params });
  }

  getPolicy(id: string): Observable<PolicyDto> {
    return this.http.get<PolicyDto>(`${this.base}/policies/${id}`);
  }

  updatePolicyRequiredTypes(id: string, codes: string[]): Observable<PolicyDto> {
    return this.http.patch<PolicyDto>(`${this.base}/policies/${id}/required-types`, { requiredEvidenceTypeCodes: codes });
  }

  // Controls
  getControls(tenantId?: string, workspaceId?: string): Observable<GrcControlDto[]> {
    const params = this.buildParams(tenantId, workspaceId);
    return this.http.get<GrcControlDto[]>(`${this.base}/controls`, { params });
  }

  getControl(id: string): Observable<GrcControlDto> {
    return this.http.get<GrcControlDto>(`${this.base}/controls/${id}`);
  }

  updateControlRequiredTypes(id: string, codes: string[]): Observable<GrcControlDto> {
    return this.http.patch<GrcControlDto>(`${this.base}/controls/${id}/required-types`, { requiredEvidenceTypeCodes: codes });
  }

  // Risks
  getRisks(tenantId?: string, workspaceId?: string): Observable<GrcRiskDto[]> {
    const params = this.buildParams(tenantId, workspaceId);
    return this.http.get<GrcRiskDto[]>(`${this.base}/risks`, { params });
  }

  getRisk(id: string): Observable<GrcRiskDto> {
    return this.http.get<GrcRiskDto>(`${this.base}/risks/${id}`);
  }

  updateRiskRequiredTypes(id: string, codes: string[]): Observable<GrcRiskDto> {
    return this.http.patch<GrcRiskDto>(`${this.base}/risks/${id}/required-types`, { requiredEvidenceTypeCodes: codes });
  }

  // Frameworks
  getFrameworks(tenantId?: string, workspaceId?: string): Observable<GrcFrameworkDto[]> {
    const params = this.buildParams(tenantId, workspaceId);
    return this.http.get<GrcFrameworkDto[]>(`${this.base}/frameworks`, { params });
  }

  getFramework(id: string): Observable<GrcFrameworkDto> {
    return this.http.get<GrcFrameworkDto>(`${this.base}/frameworks/${id}`);
  }

  updateFrameworkRequiredTypes(id: string, codes: string[]): Observable<GrcFrameworkDto> {
    return this.http.patch<GrcFrameworkDto>(`${this.base}/frameworks/${id}/required-types`, { requiredEvidenceTypeCodes: codes });
  }

  // Attachments
  getAttachments(entityType: string, entityId: string): Observable<EvidenceAttachmentDto[]> {
    return this.http.get<EvidenceAttachmentDto[]>(`${this.base}/attachments`, {
      params: { entityType, entityId },
    });
  }

  addAttachment(entityType: string, entityId: string, evidenceTypeCode: string, fileName: string): Observable<EvidenceAttachmentDto> {
    return this.http.post<EvidenceAttachmentDto>(`${this.base}/attachments`, {
      entityType, entityId, evidenceTypeCode, fileName,
    });
  }

  deleteAttachment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/attachments/${id}`);
  }

  // Dashboard breakdown
  getBreakdown(tenantId?: string, workspaceId?: string): Observable<EvidenceBreakdownDto[]> {
    const params = this.buildParams(tenantId, workspaceId);
    return this.http.get<EvidenceBreakdownDto[]>(`${this.base}/breakdown`, { params }).pipe(
      map((body) => (Array.isArray(body) ? body : []))
    );
  }

  // === Foundation-Aware Endpoints ===

  /** List evidence with foundation/risk/framework/status filters */
  getEvidence(filters?: Record<string, string>): Observable<any[]> {
    const params = this.cleanParams(filters || {});
    return this.http.get<unknown[]>(this.base, { params });
  }

  /** Get overview stats with foundation filters */
  getOverviewStats(filters?: Record<string, string>): Observable<any> {
    const params = this.cleanParams(filters || {});
    return this.http.get<any>(`${this.base}/overview/stats`, { params });
  }

  /** Transition evidence status (strict state machine) */
  transitionStatus(evidenceId: string, status: string, reason?: string): Observable<any> {
    return this.http.patch<any>(`${this.base}/${evidenceId}/status`, { status, reason });
  }

  /** Get evidence status transition history */
  getStatusHistory(evidenceId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${evidenceId}/status-history`);
  }

  /** List evidence requests with foundation filters */
  getRequests(filters?: Record<string, string>): Observable<any> {
    const params = this.cleanParams(filters || {});
    return this.http.get<any>(`${this.base}/requests`, { params });
  }

  /** List evidence tasks with foundation filters */
  getTasks(filters?: Record<string, string>): Observable<any> {
    const params = this.cleanParams(filters || {});
    return this.http.get<any>('/api/evidence-tasks', { params });
  }

  /** Get evidence mappings */
  getMappings(filters?: Record<string, string>): Observable<any> {
    const params = this.cleanParams(filters || {});
    return this.http.get<any>(`${this.base}/mappings`, { params });
  }

  private buildParams(tenantId?: string, workspaceId?: string): Record<string, string> {
    const p: Record<string, string> = {};
    if (tenantId) p['tenantId'] = tenantId;
    if (workspaceId) p['workspaceId'] = workspaceId;
    return p;
  }

  // ═══ Foundation Lookups ═══

  /** List all foundation users (for owner dropdowns) */
  getFoundationUsers(): Observable<any[]> {
    return this.http.get<unknown[]>('/api/foundation/users');
  }

  /** List all foundation teams (for team dropdowns) */
  getFoundationTeams(): Observable<any[]> {
    return this.http.get<unknown[]>('/api/foundation/teams');
  }

  /** Get a single user's full profile */
  getFoundationUserDetail(userId: string): Observable<any> {
    return this.http.get<any>(`/api/foundation/users/${userId}`);
  }

  /** Get evidence status-change history */
  getEvidenceHistory(evidenceId: string): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/${evidenceId}/history`);
  }

  /** Update evidence fields (owner, team, status, etc.) */
  updateEvidence(evidenceId: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.base}/${evidenceId}`, data);
  }

  getEvidenceDetail(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  getEvidenceByStatus(status?: string): Observable<any[]> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return this.http.get<any[]>(this.base, { params });
  }

  getEvidenceLinksForItem(itemId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${itemId}/links`);
  }

  getHomeWidgets(): Observable<any> {
    return this.http.get<any>(`${this.base}/home/widgets`);
  }

  getRecentActivity(limit?: number): Observable<any[]> {
    const params: Record<string, string> = {};
    if (limit) params['limit'] = String(limit);
    return this.http.get<any[]>(`${this.base}/activity/recent`, { params });
  }

  getWorkQueue(params?: Record<string, string>): Observable<any> {
    return this.http.get<any>(`${this.base}/work-queue`, { params: this.cleanParams(params || {}) });
  }

  getOrphans(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/orphans`);
  }

  getDuplicates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/duplicates`);
  }

  getReuseCandidates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/reuse/candidates`);
  }

  markReusable(id: string, reusable: boolean = true): Observable<any> {
    return this.http.patch<any>(`${this.base}/${id}/reusable`, { reusable });
  }

  resolveDuplicate(candidateId: string, action: string): Observable<any> {
    return this.http.post<any>(`${this.base}/duplicates/${candidateId}/resolve`, { action });
  }

  getFreshnessHistory(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${id}/freshness-history`);
  }

  searchCatalog(query: string | Record<string, string>): Observable<any> {
    const params = typeof query === 'string' ? { q: query } : this.cleanParams(query);
    return this.http.get<any>(`${this.base}/catalog/search`, { params });
  }

  getTaxonomy(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/taxonomy`);
  }

  addTaxonomyEntry(type: string, entry: any): Observable<any> {
    return this.http.post<any>(`${this.base}/taxonomy/${type}`, entry);
  }

  updateTaxonomyEntry(type: string, id: string, entry: any): Observable<any> {
    return this.http.put<any>(`${this.base}/taxonomy/${type}/${id}`, entry);
  }

  listPackages(filters?: Record<string, string>): Observable<any> {
    const params = this.cleanParams(filters || {});
    return this.http.get<any>(`${this.base}/packages`, { params });
  }

  getPackage(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/packages/${id}`);
  }

  createPackage(data: any): Observable<any> {
    return this.http.post<any>(`${this.base}/packages`, data);
  }

  exportPackage(id: string, format: string): Observable<Blob> {
    return this.http.get(`${this.base}/packages/${id}/export`, { params: { format }, responseType: 'blob' });
  }

  removeItemFromPackage(packageId: string, itemId: string): Observable<any> {
    return this.http.delete<any>(`${this.base}/packages/${packageId}/items/${itemId}`);
  }

  validatePackageFreshness(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/packages/${id}/freshness`);
  }

  getAgingReport(): Observable<any> {
    return this.http.get<any>(`${this.base}/reports/aging`);
  }

  getOverdueRequestsReport(): Observable<any> {
    return this.http.get<any>(`${this.base}/reports/overdue-requests`);
  }

  getSourceCoverageReport(): Observable<any> {
    return this.http.get<any>(`${this.base}/reports/source-coverage`);
  }

  getReusableEvidenceReport(): Observable<any> {
    return this.http.get<any>(`${this.base}/reports/reuse`);
  }

  getStaleEvidenceReport(): Observable<any> {
    return this.http.get<any>(`${this.base}/reports/stale`);
  }

  getAuditReadinessReport(): Observable<any> {
    return this.http.get<any>(`${this.base}/reports/audit-readiness`);
  }

  private cleanParams(params: Record<string, string | undefined>): Record<string, string> {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v) clean[k] = v;
    }
    return clean;
  }
}
