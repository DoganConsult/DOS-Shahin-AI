import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface VendorDto {
  id: string;
  name?: string;
  status?: string;
  riskLevel?: string;
}

export interface VendorSLADto {
  vendorId: string;
  metrics?: Record<string, any>[];
}

export interface VendorRiskProfileDto {
  vendorId: string;
  riskScore?: number;
  assessments?: VendorAssessmentDto[];
}

export interface VendorAssessmentDto {
  id: string;
  vendorId: string;
  score?: number;
  assessedAt?: string;
}

export interface VendorQuestionnaireDto {
  id: string;
  title?: string;
  vendorId?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class VendorApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getVendors(): Observable<VendorDto[]> {
    return this.http.get<VendorDto[]>(`${this.base}/vendors`);
  }

  list(filters?: Record<string, any>): Observable<{data: VendorDto[], total: number, totalPages: number}> {
    let params = new HttpParams();
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params = params.set(k, String(v));
    });
    return this.http.get<{data: VendorDto[], total: number, totalPages: number}>(`${this.base}/vendors`, { params });
  }

  createVendor(data: Record<string, unknown>): Observable<VendorDto> {
    return this.http.post<VendorDto>(`${this.base}/vendors`, data);
  }

  update(id: string, data: Record<string, unknown>): Observable<VendorDto> {
    return this.http.put<VendorDto>(`${this.base}/vendors/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/vendors/${id}`);
  }

  getVendorSLA(id: string): Observable<VendorSLADto> {
    return this.http.get<VendorSLADto>(`${this.base}/vendors/${id}/sla`);
  }

  getVendorRiskProfiles(): Observable<VendorRiskProfileDto[]> {
    return this.http.get<VendorRiskProfileDto[]>(`${this.base}/vendor-risk/profiles`);
  }

  getVendorRiskProfile(vendorId: string): Observable<VendorRiskProfileDto> {
    return this.http.get<VendorRiskProfileDto>(`${this.base}/vendor-risk/profiles/${vendorId}`);
  }

  createVendorRiskAssessment(vendorId: string, data: Record<string, unknown>): Observable<VendorAssessmentDto> {
    return this.http.post<VendorAssessmentDto>(`${this.base}/vendor-risk/profiles/${vendorId}/assess`, data);
  }

  getVendorQuestionnaires(): Observable<VendorQuestionnaireDto[]> {
    return this.http.get<VendorQuestionnaireDto[]>(`${this.base}/vendor-risk/questionnaires`);
  }

  sendVendorQuestionnaire(data: Record<string, unknown>): Observable<VendorQuestionnaireDto> {
    return this.http.post<VendorQuestionnaireDto>(`${this.base}/vendor-risk/questionnaires`, data);
  }

  initiateDueDiligence(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendors-advanced/due-diligence`, data);
  }

  getDueDiligenceStatus(vendorId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/vendors-advanced/due-diligence/${vendorId}`);
  }

  updateDDStep(stepId: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.put<any>(`${this.base}/vendors-advanced/due-diligence/steps/${stepId}`, data);
  }

  addSubVendor(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendors-advanced/fourth-party`, data);
  }

  getSubVendors(vendorId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/vendors-advanced/fourth-party/${vendorId}`);
  }

  getSubVendorExposure(vendorId: string): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/vendors-advanced/fourth-party/${vendorId}/exposure`);
  }

  getSLABreaches(vendorId?: string): Observable<Record<string, unknown>[]> {
    const params = vendorId ? `?vendor_id=${vendorId}` : '';
    return this.http.get<any[]>(`${this.base}/vendors-advanced/sla-breaches${params}`);
  }

  recordSLAMetric(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendors-advanced/sla-metric`, data);
  }

  /**
   * Get concentration risk analysis
   * Feature 26: Advanced Vendor Risk (Fourth-Party & Concentration)
   */
  getConcentrationRisk(dimension?: string): Observable<Record<string, unknown>> {
    const params = dimension ? `?dimension=${dimension}` : '';
    return this.http.get<any>(`${this.base}/vendors-advanced/concentration${params}`);
  }

  /**
   * Assess concentration risk across all vendors
   * Feature 26: Advanced Vendor Risk (Fourth-Party & Concentration)
   */
  assessConcentrationRisk(): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendors-advanced/concentration/assess`, {});
  }

  /**
   * Link vendors by shared sub-vendors
   * Feature 26: Advanced Vendor Risk (Fourth-Party & Concentration)
   */
  linkSharedSubVendors(): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendors-advanced/link-shared-subvendors`, {});
  }

  initiateOffboarding(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendors-advanced/offboarding`, data);
  }

  getOffboardingChecklist(vendorId: string): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/vendors-advanced/offboarding/${vendorId}`);
  }

  updateOffboardingStep(stepId: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.put<any>(`${this.base}/vendors-advanced/offboarding/steps/${stepId}`, data);
  }

  getMonitoringSignals(vendorId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/vendors-advanced/monitoring/${vendorId}`);
  }

  recordMonitoringSignal(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendors-advanced/monitoring`, data);
  }

  autoTierVendors(): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendors-advanced/auto-tier`, {});
  }

  // ═══ Vendor Detail (cross-module aggregation) ═══

  getVendorDetail(vendorId: string): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/vendors/${vendorId}`);
  }

  getVendorAssessments(vendorId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/vendors/${vendorId}/assessments`);
  }

  getVendorDocuments(vendorId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/vendors/${vendorId}/documents`);
  }

  getVendorFindings(vendorId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/vendors/${vendorId}/findings`);
  }

  getVendorTimeline(vendorId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/vendors/${vendorId}/timeline`);
  }

  getVendorSharedResponsibility(vendorId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/vendors/${vendorId}/shared-responsibility`);
  }

  runVendorScorecard(vendorId: string): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendors/${vendorId}/score`, {});
  }

  getVendorScorecard(vendorId: string): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/vendors/${vendorId}/scorecard`);
  }

  // ═══ Vendor Privacy/PDPL ═══

  getVendorPrivacyStatus(vendorId: string): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/vendors/${vendorId}/privacy`);
  }

  // ═══ Vendor Risk Rollup ═══

  getVendorRiskRollup(): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/risk/vendor-rollup`);
  }

  // ═══ Vendor Benchmarking ═══

  getVendorBenchmarks(): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/vendors-advanced/benchmarks`);
  }

  // ═══ Cross-Agent Propagation ═══

  runFullPropagation(vendorId: string): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendors/${vendorId}/propagate`, {});
  }

  // ═══ Engagements ═══

  getEngagements(filters?: Record<string, string>): Observable<Record<string, unknown>> {
    const params = new URLSearchParams(filters).toString();
    return this.http.get<any>(`${this.base}/vendor-engagements${params ? '?' + params : ''}`);
  }

  createEngagement(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendor-engagements`, data);
  }

  getEngagement(id: string): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/vendor-engagements/${id}`);
  }

  updateEngagement(id: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.put<any>(`${this.base}/vendor-engagements/${id}`, data);
  }

  addMilestone(engagementId: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendor-engagements/${engagementId}/milestones`, data);
  }

  updateMilestone(milestoneId: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.put<any>(`${this.base}/vendor-engagements/milestones/${milestoneId}`, data);
  }

  // ═══ Issues & Exceptions ═══

  getIssues(filters?: Record<string, string>): Observable<Record<string, unknown>> {
    const params = new URLSearchParams(filters).toString();
    return this.http.get<any>(`${this.base}/vendor-issues/issues${params ? '?' + params : ''}`);
  }

  createIssue(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendor-issues/issues`, data);
  }

  updateIssue(issueId: string, data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.put<any>(`${this.base}/vendor-issues/issues/${issueId}`, data);
  }

  escalateIssue(issueId: string): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendor-issues/issues/${issueId}/escalate`, {});
  }

  getExceptions(filters?: Record<string, string>): Observable<Record<string, unknown>> {
    const params = new URLSearchParams(filters).toString();
    return this.http.get<any>(`${this.base}/vendor-issues/exceptions${params ? '?' + params : ''}`);
  }

  createException(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendor-issues/exceptions`, data);
  }

  approveException(exceptionId: string): Observable<Record<string, unknown>> {
    return this.http.put<any>(`${this.base}/vendor-issues/exceptions/${exceptionId}/approve`, {});
  }

  rejectException(exceptionId: string): Observable<Record<string, unknown>> {
    return this.http.put<any>(`${this.base}/vendor-issues/exceptions/${exceptionId}/reject`, {});
  }

  // ═══ Dashboard ═══

  getDashboardKPIs(): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/vendor-dashboard/kpis`);
  }

  getVendorWorkQueue(): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/vendor-dashboard/work-queue`);
  }

  getVendorRecentActivity(limit?: number): Observable<Record<string, unknown>[]> {
    const params = limit ? `?limit=${limit}` : '';
    return this.http.get<any[]>(`${this.base}/vendor-dashboard/recent-activity${params}`);
  }

  // ═══ Reports ═══

  getScorecardReport(): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/vendor-reports/scorecard`);
  }

  getConcentrationReport(): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/vendor-reports/concentration`);
  }

  getRiskTierDistribution(): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/vendor-reports/risk-tiers`);
  }

  getDDCompletionRates(): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/vendor-reports/dd-completion`);
  }

  getSLAPerformanceReport(): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/vendor-reports/sla-performance`);
  }

  getFourthPartyExposure(): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/vendor-reports/fourth-party`);
  }

  getTrendAnalysis(months?: number): Observable<Record<string, unknown>> {
    const params = months ? `?months=${months}` : '';
    return this.http.get<any>(`${this.base}/vendor-reports/trends${params}`);
  }

  // ═══ Admin ═══

  getVendorConfig(): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/vendor-admin/config`);
  }

  updateVendorConfig(key: string, value: unknown): Observable<Record<string, unknown>> {
    return this.http.put<any>(`${this.base}/vendor-admin/config/${key}`, { value });
  }

  getAssessmentTemplates(): Observable<Record<string, unknown>[]> {
    return this.http.get<any[]>(`${this.base}/vendor-admin/templates/assessment`);
  }

  createAssessmentTemplate(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendor-admin/templates/assessment`, data);
  }

  // ═══ Risk Assessments ═══

  getRiskAssessments(filters?: Record<string, string>): Observable<Record<string, unknown>[]> {
    const params = new URLSearchParams(filters).toString();
    return this.http.get<any[]>(`${this.base}/vendor-risk/assessments${params ? '?' + params : ''}`);
  }

  createRiskAssessment(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendor-risk/assessments`, data);
  }

  getRiskAssessment(id: string): Observable<Record<string, unknown>> {
    return this.http.get<any>(`${this.base}/vendor-risk/assessments/${id}`);
  }

  completeRiskAssessment(id: string): Observable<Record<string, unknown>> {
    return this.http.post<any>(`${this.base}/vendor-risk/assessments/${id}/complete`, {});
  }
}
