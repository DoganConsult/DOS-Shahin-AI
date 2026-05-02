/**
 * Risk Workspace API Service — AGRC-OS
 * Connects to /api/risk-ws endpoints
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  RiskOverviewDto,
  RiskRegisterItemDto,
  RiskDetailDto,
  RiskHeatmapDto,
  TreatmentItemDto,
  TreatmentDetailDto,
  TreatmentBoardDto,
  TreatmentEffectivenessDto,
  KRIItemDto,
  KRITrendChartDto,
  KRIBreachLogDto,
  ReviewCadenceDto,
  RiskAppetiteConfigDto,
  AppetiteBreachDto,
  AcceptanceQueueItemDto,
  AppetiteTrendDto,
  RiskAssessmentResultDto,
  RiskLinkResultDto,
  RiskEscalationResultDto,
  TreatmentValidationResultDto,
  AcceptanceRequestResultDto,
  AcceptanceApprovalResultDto,
  RiskScoreHistoryEntryDto,
  RiskDependencyDto,
  HeatmapMigrationEntryDto,
  KRIDataPointDto,
  KRICorrelationDto,
  AcceptanceHistoryEntryDto,
  AppetiteCategoryGaugeDto,
  PeerReviewDto,
  ValidTransitionsDto,
  StatusHistoryDto,
  FoundationTeamDto,
  FoundationUserDto,
  FoundationUserDetailDto,
  StatusTransitionResultDto,
  BulkDeleteResultDto,
  ImportResultDto,
} from './risk-api.types';

@Injectable({ providedIn: 'root' })
export class RiskApiService {
  private http = inject(HttpClient);
  private base = '/api/risk-ws';

  // ═══ Overview ═══
  getOverview(params?: { entity?: string; category?: string }): Observable<RiskOverviewDto> {
    return this.http.get<RiskOverviewDto>(`${this.base}/overview`, { params: params as Record<string, string> });
  }

  // ═══ Work Queue (spec: My Work) ═══
  getWorkQueue(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/work-queue`);
  }

  // ═══ Issues & Escalations ═══
  getIssues(params?: Record<string, string>): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/issues`, { params });
  }

  // ═══ Reports ═══
  runReport(reportType: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/reports/run`, { reportType });
  }

  getReportCatalog(): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/reports/catalog`);
  }

  // ═══ Admin Settings ═══
  getAdminSettings(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/admin/settings`);
  }

  updateAdminSettings(data: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.patch<Record<string, unknown>>(`${this.base}/admin/settings`, data);
  }

  // ═══ RCSA Campaigns ═══
  getCampaigns(params?: Record<string, string>): Observable<{ campaigns: Record<string, unknown>[]; count: number }> {
    return this.http.get<{ campaigns: Record<string, unknown>[]; count: number }>(`${this.base}/campaigns`, { params });
  }

  createCampaign(data: { title: string; description?: string; campaign_type?: string; start_date?: string; end_date?: string }): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/campaigns`, data);
  }

  getCampaignById(campaignId: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/campaigns/${campaignId}`);
  }

  // ═══ Assessment Lifecycle ═══
  submitAssessmentResponse(itemId: string, data: {
    inherent_likelihood?: number; inherent_impact?: number;
    residual_likelihood?: number; residual_impact?: number;
    control_effectiveness?: string; notes?: string;
  }): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/assessments/${itemId}/respond`, data);
  }

  reviewAssessmentItem(itemId: string, data: { decision: string; comments?: string }): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/assessments/${itemId}/review`, data);
  }

  finalizeAssessmentItem(itemId: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/assessments/${itemId}/finalize`, {});
  }

  // ═══ KRI Data Collection ═══
  recordKRIValue(kriId: string, value: number): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/kri/${kriId}/value`, { value });
  }

  // ═══ Treatment Close ═══
  closeTreatment(treatmentId: string, data?: { closure_notes?: string; evidence_id?: string }): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/treatments/${treatmentId}/close`, data || {});
  }

  // ═══ Issue Stats ═══
  getIssueStats(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/issues/stats`);
  }

  // ═══ Cross-Module Linkages ═══
  getLinkageSummary(riskId: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.base}/links/summary/${riskId}`);
  }

  getIncidentLinks(riskId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/links/incidents/${riskId}`);
  }

  createIncidentLink(data: { risk_id: string; incident_id: string; link_type?: string }): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/links/incidents`, data);
  }

  getPolicyLinks(riskId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/links/policies/${riskId}`);
  }

  createPolicyLink(data: { risk_id: string; policy_id: string; link_type?: string; notes?: string }): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/links/policies`, data);
  }

  getEvidenceLinks(riskId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/links/evidence/${riskId}`);
  }

  createEvidenceLink(data: { risk_id: string; evidence_id: string; link_type?: string; notes?: string }): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/links/evidence`, data);
  }

  getComplianceLinks(riskId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/links/compliance/${riskId}`);
  }

  createComplianceLink(data: { risk_id: string; obligation_id: string; link_type?: string; notes?: string }): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/links/compliance`, data);
  }

  getVendorLinks(riskId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/links/vendors/${riskId}`);
  }

  createVendorLink(data: { risk_id: string; vendor_id: string; link_type?: string; notes?: string }): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/links/vendors`, data);
  }

  getAssetLinks(riskId: string): Observable<Record<string, unknown>[]> {
    return this.http.get<Record<string, unknown>[]>(`${this.base}/links/assets/${riskId}`);
  }

  createAssetLink(data: { risk_id: string; asset_id: string; link_type?: string; notes?: string }): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}/links/assets`, data);
  }

  // ═══ Risk Register ═══
  getRegister(params?: Record<string, string>): Observable<{ risks: RiskRegisterItemDto[]; count: number }> {
    return this.http.get<{ risks: RiskRegisterItemDto[]; count: number }>(`${this.base}/register`, { params });
  }

  getRiskDetail(riskId: string): Observable<RiskDetailDto> {
    return this.http.get<RiskDetailDto>(`${this.base}/register/${riskId}`);
  }

  createRisk(data: Partial<RiskRegisterItemDto>): Observable<RiskRegisterItemDto> {
    return this.http.post<RiskRegisterItemDto>(`${this.base}/register`, data);
  }

  updateRisk(riskId: string, data: Partial<RiskRegisterItemDto>): Observable<RiskRegisterItemDto> {
    return this.http.patch<RiskRegisterItemDto>(`${this.base}/register/${riskId}`, data);
  }

  deleteRisk(riskId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/register/${riskId}`);
  }

  assessRisk(riskId: string, data: { likelihood: number; impact: number; controlEffectiveness?: number }): Observable<RiskAssessmentResultDto> {
    return this.http.post<RiskAssessmentResultDto>(`${this.base}/register/${riskId}/assess`, data);
  }

  linkControl(riskId: string, controlId: string): Observable<RiskLinkResultDto> {
    return this.http.post<RiskLinkResultDto>(`${this.base}/register/${riskId}/link-control`, { controlId });
  }

  linkEvidence(riskId: string, evidenceId: string): Observable<RiskLinkResultDto> {
    return this.http.post<RiskLinkResultDto>(`${this.base}/register/${riskId}/link-evidence`, { evidenceId });
  }

  escalateRisk(riskId: string, data: { reason: string; escalateTo: string }): Observable<RiskEscalationResultDto> {
    return this.http.post<RiskEscalationResultDto>(`${this.base}/register/${riskId}/escalate`, data);
  }

  // ═══ Heatmap ═══
  getHeatmap(mode: 'inherent' | 'residual', params?: Record<string, string>): Observable<RiskHeatmapDto> {
    return this.http.get<RiskHeatmapDto>(`${this.base}/heatmap`, { params: { mode, ...params } as Record<string, string> });
  }

  // ═══ Treatments ═══
  getTreatments(params?: Record<string, string>): Observable<{ treatments: TreatmentItemDto[]; count: number }> {
    return this.http.get<{ treatments: TreatmentItemDto[]; count: number }>(`${this.base}/treatments`, { params });
  }

  getTreatmentDetail(treatmentId: string): Observable<TreatmentDetailDto> {
    return this.http.get<TreatmentDetailDto>(`${this.base}/treatments/${treatmentId}`);
  }

  createTreatment(data: Partial<TreatmentItemDto>): Observable<TreatmentItemDto> {
    return this.http.post<TreatmentItemDto>(`${this.base}/treatments`, data);
  }

  updateTreatment(treatmentId: string, data: Partial<TreatmentItemDto>): Observable<TreatmentItemDto> {
    return this.http.patch<TreatmentItemDto>(`${this.base}/treatments/${treatmentId}`, data);
  }

  validateTreatment(treatmentId: string, data: { validatedBy: string; notes?: string; evidenceId?: string }): Observable<TreatmentValidationResultDto> {
    return this.http.post<TreatmentValidationResultDto>(`${this.base}/treatments/${treatmentId}/validate`, data);
  }

  getTreatmentBoard(): Observable<TreatmentBoardDto> {
    return this.http.get<TreatmentBoardDto>(`${this.base}/treatments/board`);
  }

  getTreatmentEffectiveness(): Observable<TreatmentEffectivenessDto> {
    return this.http.get<TreatmentEffectivenessDto>(`${this.base}/treatments/effectiveness`);
  }

  // ═══ KRIs & Trends ═══
  getKRIs(): Observable<{ kris: KRIItemDto[]; count: number }> {
    return this.http.get<{ kris: KRIItemDto[]; count: number }>(`${this.base}/kri`);
  }

  createKRI(data: Partial<KRIItemDto>): Observable<KRIItemDto> {
    return this.http.post<KRIItemDto>(`${this.base}/kri`, data);
  }

  updateKRI(kriId: string, data: Partial<KRIItemDto>): Observable<KRIItemDto> {
    return this.http.patch<KRIItemDto>(`${this.base}/kri/${kriId}`, data);
  }

  getKRITrends(kriId?: string): Observable<KRITrendChartDto[]> {
    const params: Record<string, string> = {};
    if (kriId) params['kriId'] = kriId;
    return this.http.get<KRITrendChartDto[]>(`${this.base}/trends`, { params });
  }

  getBreachLog(): Observable<KRIBreachLogDto[]> {
    return this.http.get<KRIBreachLogDto[]>(`${this.base}/kri/breaches`);
  }

  getReviewCadence(): Observable<ReviewCadenceDto> {
    return this.http.get<ReviewCadenceDto>(`${this.base}/kri/review-cadence`);
  }

  // ═══ Risk Appetite ═══
  getAppetiteConfig(): Observable<RiskAppetiteConfigDto> {
    return this.http.get<RiskAppetiteConfigDto>(`${this.base}/appetite`);
  }

  updateAppetiteConfig(data: Partial<RiskAppetiteConfigDto>): Observable<RiskAppetiteConfigDto> {
    return this.http.patch<RiskAppetiteConfigDto>(`${this.base}/appetite`, data);
  }

  getAppetiteBreaches(): Observable<AppetiteBreachDto[]> {
    return this.http.get<AppetiteBreachDto[]>(`${this.base}/appetite/breaches`);
  }

  requestAcceptance(riskId: string, data: { reason: string }): Observable<AcceptanceRequestResultDto> {
    return this.http.post<AcceptanceRequestResultDto>(`${this.base}/appetite/${riskId}/request-acceptance`, data);
  }

  approveAcceptance(riskId: string, data: { decision: string; comments?: string }): Observable<AcceptanceApprovalResultDto> {
    return this.http.post<AcceptanceApprovalResultDto>(`${this.base}/appetite/${riskId}/approve-acceptance`, data);
  }

  getAcceptanceQueue(): Observable<AcceptanceQueueItemDto[]> {
    return this.http.get<AcceptanceQueueItemDto[]>(`${this.base}/appetite/acceptance-queue`);
  }

  getAppetiteTrends(): Observable<AppetiteTrendDto[]> {
    return this.http.get<AppetiteTrendDto[]>(`${this.base}/appetite/trends`);
  }

  // ═══ Score History ═══
  getRiskScoreHistory(riskId: string): Observable<{ history: RiskScoreHistoryEntryDto[]; count: number }> {
    return this.http.get<{ history: RiskScoreHistoryEntryDto[]; count: number }>(`${this.base}/register/${riskId}/history`);
  }

  // ═══ Risk Dependencies ═══
  getRiskDependencies(riskId: string): Observable<{ sharedControlRisks: RiskDependencyDto[]; sharedTreatmentRisks: RiskDependencyDto[] }> {
    return this.http.get<{ sharedControlRisks: RiskDependencyDto[]; sharedTreatmentRisks: RiskDependencyDto[] }>(`${this.base}/register/${riskId}/dependencies`);
  }

  // ═══ Bulk Update ═══
  bulkUpdateRisks(data: { riskIds: string[]; status?: string; owner?: string; treatmentStatus?: string }): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(`${this.base}/register/bulk-update`, data);
  }

  // ═══ Heatmap Migration ═══
  getHeatmapMigration(): Observable<{ migrations: HeatmapMigrationEntryDto[]; count: number }> {
    return this.http.get<{ migrations: HeatmapMigrationEntryDto[]; count: number }>(`${this.base}/heatmap/migration`);
  }

  // ═══ KRI History ═══
  getKRIHistory(kriId: string): Observable<{ dataPoints: KRIDataPointDto[]; count: number }> {
    return this.http.get<{ dataPoints: KRIDataPointDto[]; count: number }>(`${this.base}/kri/${kriId}/history`);
  }

  // ═══ KRI Correlation ═══
  getKRICorrelation(): Observable<{ correlations: KRICorrelationDto[]; count: number }> {
    return this.http.get<{ correlations: KRICorrelationDto[]; count: number }>(`${this.base}/kri/correlation`);
  }

  // ═══ Acceptance History ═══
  getAcceptanceHistory(): Observable<{ history: AcceptanceHistoryEntryDto[]; count: number }> {
    return this.http.get<{ history: AcceptanceHistoryEntryDto[]; count: number }>(`${this.base}/acceptance/history`);
  }

  // ═══ Appetite Category Gauges ═══
  getAppetiteCategoryGauges(): Observable<{ gauges: AppetiteCategoryGaugeDto[]; count: number }> {
    return this.http.get<{ gauges: AppetiteCategoryGaugeDto[]; count: number }>(`${this.base}/appetite/category-gauges`);
  }

  // ═══ Peer Review ═══
  getPeerReviews(status?: string): Observable<{ reviews: PeerReviewDto[]; count: number }> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return this.http.get<{ reviews: PeerReviewDto[]; count: number }>(`${this.base}/peer-review`, { params });
  }

  getPeerReview(reviewId: string): Observable<PeerReviewDto> {
    return this.http.get<PeerReviewDto>(`${this.base}/peer-review/${reviewId}`);
  }

  createPeerReview(data: { riskId: string; agentScore: number; agentReasoning?: string; humanAnalystId?: string }): Observable<PeerReviewDto> {
    return this.http.post<PeerReviewDto>(`${this.base}/peer-review`, data);
  }

  submitHumanAssessment(reviewId: string, data: { humanScore: number; humanReasoning?: string }): Observable<PeerReviewDto> {
    return this.http.post<PeerReviewDto>(`${this.base}/peer-review/${reviewId}/human`, data);
  }

  addPeerDialogue(reviewId: string, data: { from: 'agent' | 'human'; message: string }): Observable<PeerReviewDto> {
    return this.http.post<PeerReviewDto>(`${this.base}/peer-review/${reviewId}/dialogue`, data);
  }

  finalizePeerReview(reviewId: string, data: { finalScore: number; finalMethod: string }): Observable<PeerReviewDto> {
    return this.http.post<PeerReviewDto>(`${this.base}/peer-review/${reviewId}/finalize`, data);
  }

  // ═══ Status Lifecycle ═══
  getValidTransitions(riskId: string): Observable<ValidTransitionsDto> {
    return this.http.get<ValidTransitionsDto>(`${this.base}/register/${riskId}/valid-transitions`);
  }

  getStatusHistory(riskId: string): Observable<StatusHistoryDto> {
    return this.http.get<StatusHistoryDto>(`${this.base}/register/${riskId}/status-history`);
  }

  // ═══ Foundation Lookups ═══
  getFoundationTeams(): Observable<FoundationTeamDto[]> {
    return this.http.get<FoundationTeamDto[]>(`${this.base}/foundation/teams`);
  }

  getFoundationUsers(): Observable<FoundationUserDto[]> {
    return this.http.get<FoundationUserDto[]>(`${this.base}/foundation/users`);
  }

  // ═══ Foundation User Detail ═══
  getFoundationUserDetail(userId: string): Observable<FoundationUserDetailDto> {
    return this.http.get<FoundationUserDetailDto>(`${this.base}/foundation/users/${userId}`);
  }

  // ═══ Status Transition ═══
  transitionStatus(riskId: string, data: { status: string; reason?: string }): Observable<StatusTransitionResultDto> {
    return this.http.post<StatusTransitionResultDto>(`${this.base}/register/${riskId}/transition`, data);
  }

  // ═══ Delete Operations ═══
  deleteTreatment(treatmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/treatments/${treatmentId}`);
  }

  deleteKRI(kriId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/kri/${kriId}`);
  }

  bulkDeleteRisks(ids: string[]): Observable<BulkDeleteResultDto> {
    return this.http.request<BulkDeleteResultDto>('DELETE', `${this.base}/register/bulk`, { body: { ids } });
  }

  bulkDeleteTreatments(ids: string[]): Observable<BulkDeleteResultDto> {
    return this.http.request<BulkDeleteResultDto>('DELETE', `${this.base}/treatments/bulk`, { body: { ids } });
  }

  bulkDeleteKRIs(ids: string[]): Observable<BulkDeleteResultDto> {
    return this.http.request<BulkDeleteResultDto>('DELETE', `${this.base}/kri/bulk`, { body: { ids } });
  }

  // ═══ Import ═══
  importRisks(file: File): Observable<ImportResultDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportResultDto>(`${this.base}/import`, formData);
  }

  // ═══ Export ═══
  exportRegister(format: 'csv' | 'pdf' = 'csv'): Observable<Blob> {
    return this.http.get(`${this.base}/export`, { params: { format }, responseType: 'blob' });
  }
}
