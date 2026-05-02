import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Organization {
  id: string;
  name: string;
  type?: string;
  status?: string;
  regulatoryStatus?: string;
  complianceScore?: number;
  riskLevel?: string;
  frameworkCount?: number;
  lastAuditDate?: string;
  tenantId?: string;
  tenantCode?: string;
}

export interface ComplianceData {
  organizationId?: string;
  frameworkId?: string;
  score?: number;
  status?: string;
  lastReported?: string;
  overallScore?: number;
  controlEffectiveness?: { effective: number; partial: number; ineffective: number };
  riskPosture?: { high: number; medium: number; low: number };
  frameworkCoverage?: Array<{ name: string; coverage: number; status: string }>;
}

export interface Evidence {
  id: string;
  evidenceId?: string;
  title: string;
  type: string;
  status?: string;
  frameworkRef?: string;
  controlRef?: string;
  uploadedAt?: string;
  submittedAt?: string;
}

export interface Inquiry {
  inquiryId: string;
  orgId: string;
  subject: string;
  status: string;
  createdAt: string;
  requestType?: string;
  body?: string;
  response?: string;
  respondedAt?: string;
}
export interface AuditEntry {
  auditId: string;
  orgId: string;
  type?: string;
  status?: string;
  scheduledDate?: string;
  timestamp?: string;
  performedBy?: string;
  action?: string;
  details?: string;
  entityType?: string;
  entityId?: string;
}
export interface Framework { frameworkId: string; code: string; name: string; version: string; issuer: string; }

@Injectable({ providedIn: 'root' })
export class RegulatorPortalService {
  private readonly http = inject(HttpClient);

  getOrganizations(): Observable<Organization[]> {
    return this.http.get<Organization[]>('/api/portals/regulator/organizations');
  }

  getAssignedOrganizations(): Observable<{ organizations: Organization[] }> {
    return this.getOrganizations().pipe(map((orgs) => ({ organizations: orgs })));
  }

  getComplianceData(orgId: string): Observable<ComplianceData[]> {
    return this.http.get<ComplianceData[]>(`/api/portals/regulator/organizations/${orgId}/compliance`);
  }

  getEvidence(orgId: string): Observable<Evidence[]> {
    return this.http.get<Evidence[]>(`/api/portals/regulator/organizations/${orgId}/evidence`);
  }

  getOrganizationEvidence(orgId: string): Observable<{ evidence: Evidence[] }> {
    return this.getEvidence(orgId).pipe(map((evidence) => ({ evidence })));
  }

  getEvidenceById(orgId: string, evidenceId: string): Observable<Evidence> {
    return this.http.get<Evidence>(`/api/portals/regulator/organizations/${orgId}/evidence/${evidenceId}`);
  }

  getOrganizationCompliance(orgId: string): Observable<any> {
    return this.http.get<any>(`/api/portals/regulator/organizations/${orgId}/compliance-summary`);
  }

  getInquiries(orgId?: string): Observable<Inquiry[]> {
    const url = orgId ? `/api/portals/regulator/organizations/${orgId}/inquiries` : '/api/portals/regulator/inquiries';
    return this.http.get<Inquiry[]>(url);
  }

  submitInquiry(orgId: string, data: { subject: string; body: string; requestType: string }): Observable<Inquiry> {
    return this.http.post<Inquiry>('/api/portals/regulator/inquiries', {
      orgId,
      subject: data.subject,
      message: data.body,
      requestType: data.requestType,
    });
  }

  getAuditTrail(orgId?: string): Observable<AuditEntry[]> {
    const url = orgId ? `/api/portals/regulator/organizations/${orgId}/audit` : '/api/portals/regulator/audit';
    return this.http.get<AuditEntry[]>(url);
  }

  getRegulatorId(): Observable<{ regulatorId: string }> {
    return this.http.get<{ regulatorId: string }>('/api/portals/regulator/me');
  }
}
