/**
 * Compliance Feature API Service — AGRC-OS
 * Typed HttpClient for /api/compliance-ws endpoints
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  AllowedActions,
  ComplianceOverviewDto,
  FrameworkSummaryDto,
  FrameworkDetailDto,
  FrameworkComparisonDto,
  DomainSummaryDto,
  DomainDetailDto,
  ObligationRowDto,
  ObligationDetailDto,
  ComplianceGapDto,
  GapDetailDto,
  GapsRegisterPageDto,
  ComplianceRoadmapDto,
  AuditReadinessDto,
  AuditPackageDto,
  CoverageMatrixDto,
  AssessmentRunDto,
  ComplianceSettingsDto,
  ComplianceHeatMapResult,
} from '../models/compliance.models';

@Injectable({ providedIn: 'root' })
export class ComplianceFeatureApiService {
  private http = inject(HttpClient);
  private base = '/api/compliance-ws';

  // ═══ Allowed actions (role/workflow scoped) ═══
  getAllowedActions(): Observable<AllowedActions> {
    return this.http.get<AllowedActions>(`${this.base}/allowed-actions`);
  }

  // ═══ Overview ═══
  getOverview(light?: boolean, scope?: 'my'): Observable<ComplianceOverviewDto> {
    let params = new HttpParams();
    if (light === true) params = params.set('light', '1');
    if (scope === 'my') params = params.set('scope', 'my');
    return this.http.get<ComplianceOverviewDto>(`${this.base}/overview`, { params });
  }

  // ═══ Frameworks ═══
  getFrameworks(regulator?: string, preset?: string): Observable<FrameworkSummaryDto[]> {
    let params = new HttpParams();
    if (regulator) params = params.set('regulator', regulator);
    if (preset) params = params.set('preset', preset);
    return this.http.get<FrameworkSummaryDto[]>(`${this.base}/frameworks`, { params: params.keys().length ? params : undefined });
  }

  getFrameworkDetail(code: string): Observable<FrameworkDetailDto> {
    return this.http.get<FrameworkDetailDto>(`${this.base}/frameworks/${code}`);
  }

  getFrameworkComparison(): Observable<FrameworkComparisonDto[]> {
    return this.http.get<FrameworkComparisonDto[]>(`${this.base}/frameworks/comparison`);
  }

  updateFramework(code: string, data: { status?: string; owner?: string; scope?: string; targetDate?: string }): Observable<any> {
    return this.http.patch(`${this.base}/frameworks/${code}`, data);
  }

  assessFramework(code: string): Observable<any> {
    return this.http.post(`${this.base}/frameworks/${code}/assess`, {});
  }

  // ═══ Domains ═══
  getDomains(frameworkId?: string): Observable<DomainSummaryDto[]> {
    let params = new HttpParams();
    if (frameworkId) params = params.set('frameworkId', frameworkId);
    return this.http.get<DomainSummaryDto[]>(`${this.base}/domains`, { params });
  }

  getDomainSummary(nodeId: string): Observable<DomainSummaryDto> {
    return this.http.get<DomainSummaryDto>(`${this.base}/domains/${nodeId}/summary`);
  }

  getDomainDetail(nodeId: string): Observable<DomainDetailDto> {
    return this.http.get<DomainDetailDto>(`${this.base}/domains/${nodeId}`);
  }

  // ═══ Obligations ═══
  getObligations(frameworkId?: string): Observable<ObligationRowDto[]> {
    let params = new HttpParams();
    if (frameworkId) params = params.set('frameworkId', frameworkId);
    return this.http.get<ObligationRowDto[]>(`${this.base}/obligations`, { params });
  }

  getObligationDetail(nodeId: string): Observable<ObligationDetailDto> {
    return this.http.get<ObligationDetailDto>(`${this.base}/obligations/${nodeId}`);
  }

  updateObligation(nodeId: string, data: { owner?: string; status?: string }): Observable<any> {
    return this.http.patch(`${this.base}/obligations/${nodeId}`, data);
  }

  mapControlToObligation(nodeId: string, controlId: string): Observable<any> {
    return this.http.post(`${this.base}/obligations/${nodeId}/map-control`, { controlId });
  }

  mapEvidenceToObligation(nodeId: string, evidenceId: string): Observable<any> {
    return this.http.post(`${this.base}/obligations/${nodeId}/map-evidence`, { evidenceId });
  }

  // ═══ Gaps ═══
  getGaps(
    frameworkId?: string,
    severity?: string,
    scope?: 'my',
    page?: number,
    pageSize?: number
  ): Observable<GapsRegisterPageDto> {
    let params = new HttpParams();
    if (frameworkId) params = params.set('frameworkId', frameworkId);
    if (severity) params = params.set('severity', severity);
    if (scope === 'my') params = params.set('scope', 'my');
    if (page != null && page >= 1) params = params.set('page', String(page));
    if (pageSize != null && pageSize >= 1) params = params.set('pageSize', String(pageSize));
    return this.http.get<GapsRegisterPageDto>(`${this.base}/gaps`, { params });
  }

  getGapDetail(id: string): Observable<GapDetailDto> {
    return this.http.get<GapDetailDto>(`${this.base}/gaps/${id}`);
  }

  updateGap(id: string, data: { status?: string; owner?: string; teamId?: string }): Observable<any> {
    return this.http.patch(`${this.base}/gaps/${id}`, data);
  }

  getGapHistory(gapId: string): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/gaps/${gapId}/history`);
  }

  // ═══ Foundation Lookups (compliance-ws backend) ═══
  getFoundationUsers(): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/foundation/users`);
  }

  getFoundationTeams(): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/foundation/teams`);
  }

  getFoundationUserDetail(userId: string): Observable<any> {
    return this.http.get<unknown>(`${this.base}/foundation/users/${userId}`);
  }

  createGapRemediation(gapId: string, data: {
    title: string; description?: string; assignedTo?: string; priority?: string; dueDate?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/gaps/${gapId}/remediation-task`, data);
  }

  validateGap(gapId: string, data: { validationEvidence?: string; notes?: string }): Observable<any> {
    return this.http.post(`${this.base}/gaps/${gapId}/validate`, data);
  }

  // ═══ Roadmap ═══
  getRoadmap(): Observable<ComplianceRoadmapDto> {
    return this.http.get<ComplianceRoadmapDto>(`${this.base}/roadmap`);
  }

  generateRoadmap(): Observable<ComplianceRoadmapDto> {
    return this.http.post<ComplianceRoadmapDto>(`${this.base}/roadmap/generate`, {});
  }

  updateMilestone(milestoneId: string, data: { status?: string; notes?: string }): Observable<any> {
    return this.http.patch(`${this.base}/roadmap/${milestoneId}`, data);
  }

  // ═══ Audit Readiness ═══
  getAuditReadiness(scope?: 'my'): Observable<AuditReadinessDto> {
    let params = new HttpParams();
    if (scope === 'my') params = params.set('scope', 'my');
    return this.http.get<AuditReadinessDto>(`${this.base}/audit-readiness`, { params });
  }

  // ═══ Coverage Matrix ═══
  getCoverageMatrix(frameworkId: string): Observable<CoverageMatrixDto> {
    return this.http.get<CoverageMatrixDto>(`${this.base}/coverage-matrix/${frameworkId}`);
  }

  // ═══ Work Queue ═══
  getWorkQueue(scope?: 'my'): Observable<{ items: unknown[] }> {
    let params = new HttpParams();
    if (scope === 'my') params = params.set('scope', 'my');
    return this.http.get<{ items: unknown[] }>(`${this.base}/work-queue`, { params: params.keys().length ? params : undefined });
  }

  // ═══ Assessment History ═══
  getAssessmentHistory(): Observable<AssessmentRunDto[]> {
    return this.http.get<AssessmentRunDto[]>(`${this.base}/assessment-history`);
  }

  // ═══ Controls ═══
  getControls(frameworkId?: string, page?: number, pageSize?: number, scope?: 'my', status?: string, owner?: string): Observable<{ items: unknown[]; total: number }> {
    let params = new HttpParams();
    if (frameworkId) params = params.set('frameworkId', frameworkId);
    if (page != null) params = params.set('page', String(page));
    if (pageSize != null) params = params.set('pageSize', String(pageSize));
    if (scope === 'my') params = params.set('scope', 'my');
    if (status) params = params.set('status', status);
    if (owner) params = params.set('owner', owner);
    return this.http.get<{ items: unknown[]; total: number }>(`${this.base}/controls`, { params });
  }

  // ═══ Findings ═══
  getFindings(filters?: { frameworkId?: string; severity?: string; scope?: 'my'; status?: string; assignedTo?: string }, page?: number, pageSize?: number): Observable<{ items: unknown[]; total: number }> {
    let params = new HttpParams();
    if (filters?.frameworkId) params = params.set('frameworkId', filters.frameworkId);
    if (filters?.severity) params = params.set('severity', filters.severity);
    if (filters?.scope === 'my') params = params.set('scope', 'my');
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.assignedTo) params = params.set('assignedTo', filters.assignedTo);
    if (page != null) params = params.set('page', String(page));
    if (pageSize != null) params = params.set('pageSize', String(pageSize));
    return this.http.get<{ items: unknown[]; total: number }>(`${this.base}/findings`, { params });
  }

  // ═══ Savings Metrics ═══
  getSavings(): Observable<any> {
    return this.http.get<unknown>(`${this.base}/savings`);
  }

  // ═══ Export ═══
  exportReport(format: string = 'json'): Observable<any> {
    return this.http.get(`${this.base}/export`, { params: { format } });
  }

  /**
   * Download audit pack as PDF, XLSX, or ZIP (blob). Optional framework scope.
   * Triggers browser download using Content-Disposition filename or a default.
   */
  downloadAuditPack(
    format: 'pdf' | 'xlsx' | 'zip',
    options?: { frameworkId?: string; frameworkIds?: string[] },
  ): Observable<void> {
    let params = new HttpParams().set('format', format);
    if (options?.frameworkId) params = params.set('frameworkId', options.frameworkId);
    if (options?.frameworkIds?.length) params = params.set('frameworkIds', options.frameworkIds.join(','));
    return this.http.get(`${this.base}/export`, {
      params,
      responseType: 'blob',
      observe: 'response',
    }).pipe(
      map((event) => {
        const body = event.body;
        if (!body) return;
        const disp = event.headers.get('Content-Disposition');
        const match = disp?.match(/filename="?([^";\n]+)"?/);
        const filename = match?.[1]?.trim() || `compliance-audit-pack-${new Date().toISOString().slice(0, 10)}.${format === 'xlsx' ? 'xlsx' : format}`;
        const url = URL.createObjectURL(body);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }),
    );
  }

  // ═══ Audit Package (control → test → evidence → result + manifest) ═══
  getAuditPackage(options?: { frameworkId?: string; frameworkIds?: string[] }): Observable<AuditPackageDto> {
    if (options?.frameworkId) {
      return this.http.get<AuditPackageDto>(`${this.base}/audit-package`, {
        params: { frameworkId: options.frameworkId },
      });
    }
    if (options?.frameworkIds?.length) {
      return this.http.get<AuditPackageDto>(`${this.base}/audit-package`, {
        params: { frameworkIds: options.frameworkIds.join(',') },
      });
    }
    return this.http.get<AuditPackageDto>(`${this.base}/audit-package`);
  }

  /** Trigger browser download of audit package as JSON file */
  downloadAuditPackageJson(data: AuditPackageDto, filename?: string): void {
    const name = filename || `audit-package-${data.frameworkIds?.length ? data.frameworkIds.join('-') : 'all'}-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ═══ Compliance Status (for hub KPIs) ═══
  getComplianceStatus(): Observable<any> {
    return this.http.get(`${this.base}/overview`);
  }

  // ═══ Controls — Monitoring ═══
  getControlsMonitoring(): Observable<any> {
    return this.http.get('/api/controls/monitoring');
  }

  /** Compliance-ws control monitoring: SLA, evidence expiry, continuous assurance */
  getControlMonitoringWs(frameworkId?: string): Observable<{
    approachingSla: unknown[];
    pastSla: unknown[];
    expiringEvidence: unknown[];
    items: unknown[];
    counts: { approaching: number; past: number; expiring: number };
  }> {
    let params = new HttpParams();
    if (frameworkId) params = params.set('frameworkId', frameworkId);
    return this.http.get<{
      approachingSla: unknown[];
      pastSla: unknown[];
      expiringEvidence: unknown[];
      items: unknown[];
      counts: { approaching: number; past: number; expiring: number };
    }>(`${this.base}/control-monitoring`, { params: params.keys().length ? params : undefined });
  }

  getControlsCcmDashboard(): Observable<any> {
    return this.http.get('/api/controls/ccm-dashboard');
  }

  getControlTeamDistribution(): Observable<any> {
    return this.http.get('/api/controls/team-distribution');
  }

  // ═══ Controls — CRUD ═══
  getControlDetail(id: string): Observable<any> {
    return this.http.get(`/api/controls/${id}`);
  }

  createControl(data: any): Observable<any> {
    return this.http.post('/api/controls', data);
  }

  updateControl(id: string, data: any): Observable<any> {
    return this.http.put(`/api/controls/${id}`, data);
  }

  deleteControl(id: string): Observable<any> {
    return this.http.delete(`/api/controls/${id}`);
  }

  bulkAssignControlTeam(data: { controlIds: string[]; teamId: string }): Observable<any> {
    return this.http.post('/api/controls/bulk-assign-team', data);
  }

  // ═══ Controls — Tests & Failures ═══
  getControlTests(controlId?: string): Observable<any[]> {
    let params = new HttpParams();
    if (controlId) params = params.set('control_id', controlId);
    return this.http.get<unknown[]>('/api/controls/tests', { params });
  }

  createControlTest(data: any): Observable<any> {
    return this.http.post('/api/controls/tests', data);
  }

  getControlFailures(): Observable<any[]> {
    return this.http.get<unknown[]>('/api/controls/failures');
  }

  resolveControlFailure(failureId: string, data: { resolution_note: string }): Observable<any> {
    return this.http.post(`/api/controls/failures/${failureId}/resolve`, data);
  }

  getControlActions(status?: string): Observable<any[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<unknown[]>('/api/controls/actions', { params });
  }

  // ═══ Control Lifecycle ═══
  getLifecycleSummary(): Observable<any> {
    return this.http.get('/api/lifecycle/summary');
  }

  transitionControlState(controlId: string, data: { toState: string; note?: string }): Observable<any> {
    return this.http.post(`/api/lifecycle/controls/${controlId}/transition`, data);
  }

  getControlTransitionHistory(controlId: string): Observable<any[]> {
    return this.http.get<unknown[]>(`/api/lifecycle/controls/${controlId}/history`);
  }

  checkControlStaleness(controlId: string): Observable<any> {
    return this.http.get(`/api/lifecycle/controls/${controlId}/staleness`);
  }

  // ═══ Framework CRUD ═══
  listFrameworksCrud(): Observable<any[]> {
    return this.http.get<unknown[]>('/api/frameworks');
  }

  createFramework(data: any): Observable<any> {
    return this.http.post('/api/frameworks', data);
  }

  updateFrameworkCrud(id: string, data: any): Observable<any> {
    return this.http.put(`/api/frameworks/${id}`, data);
  }

  deleteFramework(id: string): Observable<any> {
    return this.http.delete(`/api/frameworks/${id}`);
  }

  // ═══ Framework Mapping ═══
  getFrameworkMappings(): Observable<any[]> {
    return this.http.get<unknown[]>('/api/framework-mapping');
  }

  createFrameworkMapping(data: any): Observable<any> {
    return this.http.post('/api/framework-mapping', data);
  }

  deleteFrameworkMapping(id: string): Observable<any> {
    return this.http.delete(`/api/framework-mapping/${id}`);
  }

  // ═══ RCSA Campaigns ═══
  getRcsaCampaigns(): Observable<any> {
    return this.http.get('/api/rcsa/campaigns');
  }

  createRcsaCampaign(data: any): Observable<any> {
    return this.http.post('/api/rcsa/campaigns', data);
  }

  launchRcsaCampaign(campaignId: string): Observable<any> {
    return this.http.post(`/api/rcsa/campaigns/${campaignId}/launch`, {});
  }

  getRcsaCampaignResults(campaignId: string): Observable<any> {
    return this.http.get(`/api/rcsa/campaigns/${campaignId}/results`);
  }

  submitRcsaResponse(responseId: string, data: any): Observable<any> {
    return this.http.post(`/api/rcsa/responses/${responseId}`, data);
  }

  // ═══ NCA Assessment ═══
  getNcaStructure(): Observable<any> {
    return this.http.get('/api/nca-assessment/structure');
  }

  listNcaAssessments(): Observable<any[]> {
    return this.http.get<unknown[]>('/api/nca-assessment');
  }

  createNcaAssessment(data: any): Observable<any> {
    return this.http.post('/api/nca-assessment', data);
  }

  getNcaAssessment(id: string): Observable<any> {
    return this.http.get(`/api/nca-assessment/${id}`);
  }

  updateNcaItems(id: string, data: any): Observable<any> {
    return this.http.put(`/api/nca-assessment/${id}/items`, data);
  }

  deleteNcaAssessment(id: string): Observable<any> {
    return this.http.delete(`/api/nca-assessment/${id}`);
  }

  // ═══ Assessment Templates ═══
  getAssessmentTemplates(params?: { category?: string; search?: string }): Observable<any[]> {
    let p = new HttpParams();
    if (params?.category) p = p.set('category', params.category);
    if (params?.search) p = p.set('search', params.search);
    return this.http.get<unknown[]>('/api/assessment-templates', { params: p });
  }

  getTemplateCategories(): Observable<any[]> {
    return this.http.get<unknown[]>('/api/assessment-templates/categories');
  }

  getTemplateDetail(id: string): Observable<any> {
    return this.http.get(`/api/assessment-templates/${id}/detail`);
  }

  startAssessmentFromTemplate(templateId: string): Observable<any> {
    return this.http.post(`/api/assessment-templates/${templateId}/start`, {});
  }

  getAssessmentProgress(assessmentId: string): Observable<any> {
    return this.http.get(`/api/assessment-templates/assessment/${assessmentId}/progress`);
  }

  getAssessmentAiSummary(assessmentId: string): Observable<any> {
    return this.http.get(`/api/assessment-templates/assessment/${assessmentId}/ai-summary`);
  }

  // ═══ Compliance Calendar ═══
  getCalendar(from: string, to: string): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/calendar`, { params: { from, to } });
  }

  // ═══ Regulatory Changes ═══
  getRegulatoryChanges(status?: string): Observable<any[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<unknown[]>(`${this.base}/regulatory-changes`, { params });
  }

  createRegulatoryChange(data: any): Observable<any> {
    return this.http.post(`${this.base}/regulatory-changes`, data);
  }

  assessRegulatoryImpact(changeId: string, data: { impactedControls: number; gapCount: number; notes?: string }): Observable<any> {
    return this.http.post(`${this.base}/regulatory-changes/${changeId}/assess`, data);
  }

  getRegulatoryChangeImpact(changeId: string): Observable<any> {
    return this.http.get(`${this.base}/regulatory-changes/${changeId}/impact`);
  }

  // ═══ Findings — Create ═══
  createFinding(data: { title: string; description?: string; severity?: string; sourceType?: string; sourceId?: string; assignedTo?: string; dueDate?: string }): Observable<any> {
    return this.http.post(`${this.base}/findings`, data);
  }

  updateFinding(id: string, data: { status?: string; assignedTo?: string; remediationPlan?: string }): Observable<any> {
    return this.http.patch(`${this.base}/findings/${id}`, data);
  }

  // ═══ Assessment Review / Approval ═══
  assignReviewer(assessmentId: string, data: { reviewerId: string }): Observable<any> {
    return this.http.post(`${this.base}/assessments/${assessmentId}/assign-reviewer`, data);
  }

  submitForReview(assessmentId: string): Observable<any> {
    return this.http.post(`${this.base}/assessments/${assessmentId}/submit-review`, {});
  }

  approveAssessment(assessmentId: string, data: { notes?: string }): Observable<any> {
    return this.http.post(`${this.base}/assessments/${assessmentId}/approve`, data);
  }

  rejectAssessment(assessmentId: string, data: { notes: string }): Observable<any> {
    return this.http.post(`${this.base}/assessments/${assessmentId}/reject`, data);
  }

  // ═══ Compliance — Gap Analysis & Remediations ═══
  getGapAnalysis(frameworkId: string): Observable<any> {
    return this.http.get(`/api/compliance/gap-analysis/${frameworkId}`);
  }

  /** Knowledge Hub gap analysis dashboard data */
  getKnowledgeHubGapAnalysis(): Observable<any> {
    return this.http.get('/api/knowledge-hub/gap-analysis');
  }

  getRemediations(frameworkId?: string): Observable<any[]> {
    let params = new HttpParams();
    if (frameworkId) params = params.set('frameworkId', frameworkId);
    return this.http.get<unknown[]>('/api/compliance/remediations', { params });
  }

  createRemediation(data: any): Observable<any> {
    return this.http.post('/api/compliance/remediations', data);
  }

  updateRemediationStatus(id: string, data: { status: string }): Observable<any> {
    return this.http.put(`/api/compliance/remediations/${id}/status`, data);
  }

  // ═══ Regulatory Change Status ═══
  updateRegulatoryChangeStatus(changeId: string, status: string): Observable<any> {
    return this.http.patch(`${this.base}/regulatory-changes/${changeId}/status`, { status });
  }

  getFoundationDepartments(): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/foundation/departments`);
  }

  getFoundationBusinessUnits(): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/foundation/business-units`);
  }

  // ═══ Roadmap Task Update ═══
  updateRoadmapTask(taskId: string, data: { status?: string; ownerUserId?: string; ownerTeamId?: string; dueDate?: string; progressPct?: number; notes?: string }): Observable<any> {
    return this.http.patch(`${this.base}/roadmap/tasks/${taskId}`, data);
  }

  // ═══ Compliance Posture by Org ═══
  getPostureByOrg(groupBy: 'department' | 'business_unit' = 'department'): Observable<any[]> {
    return this.http.get<unknown[]>(`${this.base}/posture/by-org`, { params: { groupBy } });
  }

  // ═══ Compliance Heat Map by Business Unit (Priority 18) ═══
  getComplianceHeatMap(groupBy: 'business_unit' | 'department' = 'business_unit', options?: { includeInactive?: boolean; frameworks?: string[] }): Observable<ComplianceHeatMapResult> {
    let params = new HttpParams().set('groupBy', groupBy);
    if (options?.includeInactive) params = params.set('includeInactive', 'true');
    if (options?.frameworks?.length) params = params.set('frameworks', options.frameworks.join(','));
    return this.http.get<ComplianceHeatMapResult>(`${this.base}/posture/heatmap`, { params });
  }

  // ═══ Vendor Health Impact on Compliance ═══
  getVendorPosture(): Observable<any> {
    return this.http.get<unknown>(`${this.base}/posture/vendor-health`);
  }

  // ═══ Cross-Module: Audit Integration ═══
  getAuditRatingsSummary(): Observable<any> {
    return this.http.get<unknown>('/api/audit/ratings/summary');
  }

  getAuditFindingTrendsBySeverity(): Observable<any> {
    return this.http.get<unknown>('/api/audit/finding-trends/severity');
  }

  getAuditOverview(): Observable<any> {
    return this.http.get<unknown>('/api/audit/overview');
  }

  getAuditCrossModuleStatus(): Observable<any> {
    return this.http.get<unknown>('/api/audit/cross-module/status');
  }

  // ═══ Attestation Campaigns ═══

  getAttestationCampaigns(entityType?: string, status?: string): Observable<any> {
    let params = new HttpParams();
    if (entityType) params = params.set('entityType', entityType);
    if (status) params = params.set('status', status);
    return this.http.get<unknown>('/api/compliance-attestation/campaigns', { params });
  }

  getAttestationCampaignStatus(campaignId: string): Observable<any> {
    return this.http.get<unknown>(`/api/compliance-attestation/campaigns/${campaignId}`);
  }

  createAttestationCampaign(data: { entityType: string; entityId: string; name: string; dueDate: string; userIds: string[] }): Observable<any> {
    return this.http.post<unknown>('/api/compliance-attestation/campaigns', data);
  }

  activateAttestationCampaign(campaignId: string): Observable<any> {
    return this.http.post<unknown>(`/api/compliance-attestation/campaigns/${campaignId}/activate`, {});
  }

  submitAttestationResponse(campaignId: string, data: { action: 'attest' | 'decline'; declinedReason?: string }): Observable<any> {
    return this.http.post<unknown>(`/api/compliance-attestation/campaigns/${campaignId}/submit`, data);
  }

  reviewAttestation(campaignId: string, decision: 'approve' | 'reject'): Observable<any> {
    return this.http.post<unknown>(`/api/compliance-attestation/campaigns/${campaignId}/review`, { decision });
  }

  importObligations(obligations: unknown[]): Observable<any> {
    return this.http.post<unknown>(`${this.base}/obligations/import`, { obligations });
  }

  // ═══ Obligation Register (Priority 12) — New /api/compliance/obligations endpoints ═══
  getObligationsV2(filters?: { frameworkId?: string; status?: string; ownerId?: string; search?: string; limit?: number; offset?: number }): Observable<{ obligations: unknown[]; total: number }> {
    let params = new HttpParams();
    if (filters?.frameworkId) params = params.set('frameworkId', filters.frameworkId);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.ownerId) params = params.set('ownerId', filters.ownerId);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit.toString());
    if (filters?.offset) params = params.set('offset', filters.offset.toString());
    return this.http.get<{ obligations: unknown[]; total: number }>('/api/compliance/obligations', { params });
  }
  getObligationByIdV2(obligationId: string): Observable<any> {
    return this.http.get<unknown>(`/api/compliance/obligations/${obligationId}`);
  }
  createObligationV2(data: any): Observable<any> {
    return this.http.post<unknown>('/api/compliance/obligations', data);
  }
  updateObligationV2(obligationId: string, data: any): Observable<any> {
    return this.http.put<unknown>(`/api/compliance/obligations/${obligationId}`, data);
  }
  deleteObligationV2(obligationId: string): Observable<any> {
    return this.http.delete<unknown>(`/api/compliance/obligations/${obligationId}`);
  }
  getObligationControlsV2(obligationId: string): Observable<{ controls: unknown[]; count: number }> {
    return this.http.get<{ controls: unknown[]; count: number }>(`/api/compliance/obligations/${obligationId}/controls`);
  }
  mapControlToObligationV2(obligationId: string, controlId: string, mappingType: string = 'direct', coveragePercent: number = 100): Observable<any> {
    return this.http.post<unknown>(`/api/compliance/obligations/${obligationId}/controls/${controlId}`, { mappingType, coveragePercent });
  }
  unmapControlFromObligationV2(obligationId: string, controlId: string): Observable<any> {
    return this.http.delete<unknown>(`/api/compliance/obligations/${obligationId}/controls/${controlId}`);
  }
  autoMapObligationV2(obligationId: string): Observable<{ mapped: number; errors: string[] }> {
    return this.http.post<{ mapped: number; errors: string[] }>(`/api/compliance/obligations/${obligationId}/auto-map`, {});
  }
  autoMapAllObligationsForFrameworkV2(frameworkId: string): Observable<{ totalObligations: number; totalMapped: number; errors: string[] }> {
    return this.http.post<{ totalObligations: number; totalMapped: number; errors: string[] }>(`/api/compliance/obligations/framework/${frameworkId}/auto-map-all`, {});
  }

  // ═══ Settings ═══
  getSettings(): Observable<ComplianceSettingsDto> {
    return this.http.get<ComplianceSettingsDto>(`${this.base}/settings`);
  }

  // ═══ Bulk Actions ═══
  bulkUpdateFindingStatus(findingIds: string[], status: string): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.base}/findings/bulk-status`, { findingIds, status });
  }

  bulkAssignControls(controlIds: string[], ownerId: string): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.base}/controls/bulk-assign`, { controlIds, ownerId });
  }

  // ═══ Exports ═══
  exportControls(format: 'csv' | 'xlsx', frameworkId?: string, scope?: 'my', status?: string, owner?: string): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    if (frameworkId) params = params.set('frameworkId', frameworkId);
    if (scope === 'my') params = params.set('scope', 'my');
    if (status) params = params.set('status', status);
    if (owner) params = params.set('owner', owner);
    return this.http.get(`${this.base}/controls/export`, { params, responseType: 'blob' });
  }

  exportFindings(format: 'csv' | 'xlsx', frameworkId?: string, severity?: string, scope?: 'my', status?: string, assignedTo?: string): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    if (frameworkId) params = params.set('frameworkId', frameworkId);
    if (severity) params = params.set('severity', severity);
    if (scope === 'my') params = params.set('scope', 'my');
    if (status) params = params.set('status', status);
    if (assignedTo) params = params.set('assignedTo', assignedTo);
    return this.http.get(`${this.base}/findings/export`, { params, responseType: 'blob' });
  }

  getUnmappedObligations(frameworkId?: string): Observable<ObligationRowDto[]> {
    let params = new HttpParams();
    if (frameworkId) params = params.set('frameworkId', frameworkId);
    return this.http.get<ObligationRowDto[]>(`${this.base}/obligations/unmapped`, { params });
  }

  getWeakControls(frameworkId?: string): Observable<any[]> {
    let params = new HttpParams();
    if (frameworkId) params = params.set('frameworkId', frameworkId);
    return this.http.get<any[]>(`${this.base}/controls/weak`, { params });
  }
}
