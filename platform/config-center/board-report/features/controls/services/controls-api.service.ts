/**
 * Controls Module API Service — AGRC-OS
 * Dedicated HttpClient for /api/controls and /api/lifecycle endpoints.
 * Extracted from ComplianceFeatureApiService to follow Module Ownership (Rule 1).
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PaginatedList,
  ControlMutationResult,
  ControlRowDto,
  ControlDetailDto,
  ControlMonitoringResponse,
  ControlTestDto,
  ControlFailureDto,
  ControlActionDto,
  LifecycleSummaryDto,
  TransitionHistoryDto,
  StalenessCheckDto,
  CcmDashboardDto,
  TeamDistributionDto,
  ControlsHomeDto,
  ControlWorkQueueDto,
  ControlCoverageDto,
  CertificationCampaignDto,
  CertificationRequestDto,
  ControlDeficiencyDto,
  RemediationActionDto,
  MonitoringRuleDto,
  MonitoringAlertDto,
  CreateControlRequest,
  UpdateControlRequest,
  CreateControlTestRequest,
  TransitionControlStateRequest,
  ResolveFailureRequest,
  BulkAssignControlTeamRequest,
  CreateCertificationCampaignRequest,
  SubmitCertificationResponseRequest,
  CreateDeficiencyRequest,
  CreateRemediationActionRequest,
  CreateMonitoringRuleRequest,
} from './controls-api.types';

@Injectable({ providedIn: 'root' })
export class ControlsApiService {
  private http = inject(HttpClient);
  private readonly base = '/api/controls';
  private readonly lifecycleBase = '/api/lifecycle';
  /** Compliance-ws base for controls that still go through compliance endpoint */
  private readonly complianceWsBase = '/api/compliance-ws';

  // ═══ Home / Overview ═══════════════════════════════════════════════
  getHome(): Observable<ControlsHomeDto> {
    return this.http.get<ControlsHomeDto>(`${this.base}/home`);
  }

  // ═══ Work Queue ════════════════════════════════════════════════════
  getWorkQueue(): Observable<ControlWorkQueueDto> {
    return this.http.get<ControlWorkQueueDto>(`${this.base}/work-queue`);
  }

  // ═══ Control Library (CRUD) ════════════════════════════════════════
  getControls(
    frameworkId?: string, page?: number, pageSize?: number,
    scope?: 'my', status?: string, owner?: string,
    family?: string, controlType?: string, automationLevel?: string,
    keyControl?: boolean, unmappedOnly?: boolean, failingOnly?: boolean,
    groupBy?: 'family' | 'owner',
  ): Observable<PaginatedList<ControlRowDto>> {
    let params = new HttpParams();
    if (frameworkId) params = params.set('frameworkId', frameworkId);
    if (page != null) params = params.set('page', String(page));
    if (pageSize != null) params = params.set('pageSize', String(pageSize));
    if (scope === 'my') params = params.set('scope', 'my');
    if (status) params = params.set('status', status);
    if (owner) params = params.set('owner', owner);
    if (family) params = params.set('family', family);
    if (controlType) params = params.set('controlType', controlType);
    if (automationLevel) params = params.set('automationLevel', automationLevel);
    if (keyControl != null) params = params.set('keyControl', String(keyControl));
    if (unmappedOnly) params = params.set('unmappedOnly', 'true');
    if (failingOnly) params = params.set('failingOnly', 'true');
    if (groupBy) params = params.set('groupBy', groupBy);
    return this.http.get<PaginatedList<ControlRowDto>>(`${this.complianceWsBase}/controls`, { params });
  }

  getControlDetail(id: string): Observable<ControlDetailDto> {
    return this.http.get<ControlDetailDto>(`${this.base}/${id}`);
  }

  /** Aggregated detail for the control detail page (multi-table join) */
  getControlDetailAggregated(id: string): Observable<ControlDetailDto> {
    return this.http.get<ControlDetailDto>(`${this.base}/${id}/detail`);
  }

  createControl(data: CreateControlRequest): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(this.base, data);
  }

  updateControl(id: string, data: UpdateControlRequest): Observable<ControlMutationResult> {
    return this.http.put<ControlMutationResult>(`${this.base}/${id}`, data);
  }

  deleteControl(id: string): Observable<ControlMutationResult> {
    return this.http.delete<ControlMutationResult>(`${this.base}/${id}`);
  }

  bulkAssignControlTeam(data: BulkAssignControlTeamRequest): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/bulk-assign-team`, data);
  }

  bulkAssignControls(controlIds: string[], ownerId: string): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.complianceWsBase}/controls/bulk-assign`, { controlIds, ownerId });
  }

  // ═══ Tests & Failures ══════════════════════════════════════════════
  getControlTests(controlId?: string): Observable<ControlTestDto[]> {
    let params = new HttpParams();
    if (controlId) params = params.set('control_id', controlId);
    return this.http.get<ControlTestDto[]>(`${this.base}/tests`, { params });
  }

  createControlTest(data: CreateControlTestRequest): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/tests`, data);
  }

  getControlFailures(): Observable<ControlFailureDto[]> {
    return this.http.get<ControlFailureDto[]>(`${this.base}/failures`);
  }

  resolveControlFailure(failureId: string, data: ResolveFailureRequest): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/failures/${failureId}/resolve`, data);
  }

  getControlActions(status?: string): Observable<ControlActionDto[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<ControlActionDto[]>(`${this.base}/actions`, { params });
  }

  // ═══ Monitoring ════════════════════════════════════════════════════
  getControlsMonitoring(): Observable<ControlMonitoringResponse> {
    return this.http.get<ControlMonitoringResponse>(`${this.base}/monitoring`);
  }

  getControlMonitoringWs(frameworkId?: string): Observable<ControlMonitoringResponse> {
    let params = new HttpParams();
    if (frameworkId) params = params.set('frameworkId', frameworkId);
    return this.http.get<ControlMonitoringResponse>(`${this.complianceWsBase}/control-monitoring`, { params: params.keys().length ? params : undefined });
  }

  getControlsCcmDashboard(): Observable<CcmDashboardDto> {
    return this.http.get<CcmDashboardDto>(`${this.base}/ccm-dashboard`);
  }

  getControlTeamDistribution(): Observable<TeamDistributionDto> {
    return this.http.get<TeamDistributionDto>(`${this.base}/team-distribution`);
  }

  // ═══ Lifecycle ═════════════════════════════════════════════════════
  getLifecycleSummary(): Observable<LifecycleSummaryDto> {
    return this.http.get<LifecycleSummaryDto>(`${this.lifecycleBase}/summary`);
  }

  transitionControlState(controlId: string, data: TransitionControlStateRequest): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.lifecycleBase}/controls/${controlId}/transition`, data);
  }

  getControlTransitionHistory(controlId: string): Observable<TransitionHistoryDto[]> {
    return this.http.get<TransitionHistoryDto[]>(`${this.lifecycleBase}/controls/${controlId}/history`);
  }

  checkControlStaleness(controlId: string): Observable<StalenessCheckDto> {
    return this.http.get<StalenessCheckDto>(`${this.lifecycleBase}/controls/${controlId}/staleness`);
  }

  // ═══ Mapping & Coverage ════════════════════════════════════════════
  getControlCoverage(): Observable<ControlCoverageDto> {
    return this.http.get<ControlCoverageDto>(`${this.base}/mapping/coverage`);
  }

  linkRisk(controlId: string, riskId: string): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/${controlId}/link-risk`, { riskId });
  }

  linkObligation(controlId: string, obligationId: string): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/${controlId}/link-obligation`, { obligationId });
  }

  linkPolicy(controlId: string, policyId: string): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/${controlId}/link-policy`, { policyId });
  }

  // ═══ Certifications ════════════════════════════════════════════════
  getCertificationCampaigns(): Observable<CertificationCampaignDto[]> {
    return this.http.get<CertificationCampaignDto[]>(`${this.base}/certifications`);
  }

  createCertificationCampaign(data: CreateCertificationCampaignRequest): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/certifications`, data);
  }

  getCertificationRequests(campaignId: string): Observable<CertificationRequestDto[]> {
    return this.http.get<CertificationRequestDto[]>(`${this.base}/certifications/${campaignId}/requests`);
  }

  submitCertificationResponse(requestId: string, data: SubmitCertificationResponseRequest): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/certifications/${requestId}/respond`, data);
  }

  // ═══ Deficiencies & Remediation ════════════════════════════════════
  getDeficiencies(status?: string): Observable<ControlDeficiencyDto[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<ControlDeficiencyDto[]>(`${this.base}/deficiencies`, { params });
  }

  createDeficiency(data: CreateDeficiencyRequest): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/deficiencies`, data);
  }

  createRemediationAction(data: CreateRemediationActionRequest): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/deficiencies/${data.deficiencyId}/remediation`, data);
  }

  closeDeficiency(deficiencyId: string, data: { evidenceRef?: string; notes?: string }): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/deficiencies/${deficiencyId}/close`, data);
  }

  // ═══ Monitoring Rules ══════════════════════════════════════════════
  getMonitoringRules(): Observable<MonitoringRuleDto[]> {
    return this.http.get<MonitoringRuleDto[]>(`${this.base}/monitoring/rules`);
  }

  createMonitoringRule(data: CreateMonitoringRuleRequest): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/monitoring/rules`, data);
  }

  getMonitoringAlerts(): Observable<MonitoringAlertDto[]> {
    return this.http.get<MonitoringAlertDto[]>(`${this.base}/monitoring/alerts`);
  }

  acknowledgeAlert(alertId: string): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/monitoring/alerts/${alertId}/acknowledge`, {});
  }

  // ═══ AI ════════════════════════════════════════════════════════════
  getAiAnalysis(controlId: string): Observable<any> {
    return this.http.get(`${this.base}/${controlId}/ai-analysis`);
  }

  getAiRecommendations(frameworkId?: string): Observable<any> {
    return this.http.post(`${this.base}/ai-recommendations`, { frameworkId });
  }

  // ═══ Export ════════════════════════════════════════════════════════
  exportControls(format: 'csv' | 'xlsx', frameworkId?: string, scope?: 'my', status?: string, owner?: string): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    if (frameworkId) params = params.set('frameworkId', frameworkId);
    if (scope === 'my') params = params.set('scope', 'my');
    if (status) params = params.set('status', status);
    if (owner) params = params.set('owner', owner);
    return this.http.get(`${this.complianceWsBase}/controls/export`, { params, responseType: 'blob' });
  }

  // ═══ Reports ══════════════════════════════════════════════════════
  getReportCatalog(): Observable<any> {
    return this.http.get(`${this.base}/reports/catalog`);
  }

  runReport(reportType: string, params?: Record<string, string>): Observable<Blob> {
    return this.http.post(`${this.base}/reports/run`, { reportType, ...params }, { responseType: 'blob' });
  }

  // ═══ Admin ═════════════════════════════════════════════════════════
  getAdminSettings(): Observable<any> {
    return this.http.get(`${this.base}/admin/settings`);
  }

  updateAdminSettings(data: Record<string, any>): Observable<ControlMutationResult> {
    return this.http.patch<ControlMutationResult>(`${this.base}/admin/settings`, data);
  }

  // ═══ Workflow ═══════════════════════════════════════════════════════
  scheduleTest(data: { controlId: string; testType: string; scheduledAt: string; testerId: string }): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/workflow/schedule-test`, data);
  }

  assignTeam(controlId: string, teamId: string): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/workflow/assign-team`, { controlId, teamId });
  }

  requestEvidence(controlId: string, evidenceTypeCode: string, assignedTo: string): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/workflow/request-evidence`, { controlId, evidenceTypeCode, assignedTo });
  }

  reviewRemediation(actionId: string, decision: 'approved' | 'rejected' | 'requires_retest', comments?: string): Observable<ControlMutationResult> {
    return this.http.post<ControlMutationResult>(`${this.base}/workflow/remediation/${actionId}/review`, { decision, comments });
  }

  getHealthSnapshots(controlId: string, days: number = 90): Observable<{ snapshots: Array<{ snapshotDate: string; effectivenessScore: number; testPassRate: number; evidenceFreshnessPct: number }> }> {
    return this.http.get<any>(`${this.base}/workflow/health-snapshots/${controlId}`, { params: { days: String(days) } });
  }

  // ═══ Field Config & Search ═════════════════════════════════════════
  getFieldConfig(): Observable<any> {
    return this.http.get(`${this.base}/field-config`);
  }

  searchControls(query: string): Observable<ControlRowDto[]> {
    return this.http.get<ControlRowDto[]>(`${this.base}/search`, { params: { q: query } });
  }

  getDiagnostics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/controls/diagnostics`);
  }
}
