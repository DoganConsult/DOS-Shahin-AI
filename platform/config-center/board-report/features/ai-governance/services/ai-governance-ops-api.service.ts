import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import type {
  GovernanceSummaryDto,
  GovernanceEventListResponse,
  BreakGlassDto,
  BreakGlassListResponse,
  MutationResponse,
  DeleteResponse,
  PromotionDto,
  PromotionListResponse,
  AlertRuleDto,
  AlertRuleListResponse,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  AlertHistoryListResponse,
  KillSwitchDto,
  KillSwitchListResponse,
  AgentRuntimeStatsDto,
  ModelMetricListResponse,
  RecordModelMetricRequest,
  DriftThresholdListResponse,
  MaturityScorecardDto,
  BoardSummaryDto,
  FairnessMetricListResponse,
  FairnessScanListResponse,
  FairnessScanDto,
  EuAiActQuestionsResponse,
  EuClassificationListResponse,
  EuClassificationDto,
  RedTeamScheduleListResponse,
  RedTeamScheduleDto,
  UpdateRedTeamScheduleRequest,
  EthicsReviewListResponse,
  EthicsReviewDto,
  ImpactAssessmentListResponse,
  ImpactAssessmentDto,
  UpdateImpactAssessmentRequest,
  RegulatoryChangeListResponse,
  RegulatoryChangeDto,
  CreateRegulatoryChangeRequest,
  ModelRiskScoreDto,
  ModelRiskScoreListResponse,
  ModelLifecycleTransitionRequest,
  ModelRiskAssessmentDto,
  ModelRiskAssessmentListResponse,
  ModelsRequiringAssessmentResponse,
  DPIADto,
  DPIAListResponse,
  DPIARequest,
  DPIARiskFactorRequest,
  DPIARiskFactorListResponse,
  DPIARiskFactorDto,
  AgentPerformanceMetricRequest,
  AgentPerformanceMetricDto,
  AgentPerformanceMetricListResponse,
  BiasDetectionRequest,
  BiasDetectionDto,
  BiasDetectionListResponse,
  TrustScoreRequest,
  TrustScoreDto,
  TrustScoreListResponse,
  ExplainabilityRecordRequest,
  ExplainabilityRecordDto,
  ExplainabilityRecordListResponse,
  CounterfactualAnalysisDto,
  ExplainabilityRequirementListResponse,
  TransparencyMetricsDto,
  ComplianceFrameworkMappingRequest,
  ComplianceFrameworkMappingDto,
  ComplianceFrameworkMappingListResponse,
  AiComplianceDashboardDto,
  SystemsRequiringAssessmentResponse,
} from './ai-governance.types';

// ── Helper: build HttpParams from a flat object, skipping undefined/null values ──
function toParams(obj?: Record<string, unknown>): HttpParams {
  let params = new HttpParams();
  if (!obj) return params;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      params = params.set(key, String(value));
    }
  }
  return params;
}

/**
 * Sub-service covering Governance Operations, Wave 1/2 features,
 * Model Risk, DPIA, Agent Performance, Explainability, and Compliance Framework.
 * Extracted from AiGovernanceApiService Groups 7-12.
 */
@Injectable({ providedIn: 'root' })
export class AiGovernanceOpsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ════════════════════════════════════════════════════════════════════════════
  // Group 7: Governance Operations — /api/ai-governance/ops
  // ════════════════════════════════════════════════════════════════════════════

  /** Get governance event summary (KPIs). */
  getGovernanceSummary(): Observable<GovernanceSummaryDto> {
    return this.http.get<GovernanceSummaryDto>(`${this.base}/ai-governance/ops/summary`);
  }

  /** List governance audit events with optional type filter. */
  listGovernanceEvents(params?: { event_type?: string; limit?: number; offset?: number }): Observable<GovernanceEventListResponse> {
    return this.http.get<GovernanceEventListResponse>(`${this.base}/ai-governance/ops/events`, { params: toParams(params) });
  }

  /** Create a break-glass entry. */
  createBreakGlass(data: { asset_id: string; version_id?: string; registry_type: string; reason: string; duration_minutes?: number }): Observable<BreakGlassDto> {
    return this.http.post<BreakGlassDto>(`${this.base}/ai-governance/ops/break-glass`, data);
  }

  /** Revoke a break-glass entry. */
  revokeBreakGlass(breakGlassId: string): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(`${this.base}/ai-governance/ops/break-glass/${breakGlassId}/revoke`, {});
  }

  /** List break-glass entries. */
  listBreakGlass(params?: { status?: string; registry_type?: string; limit?: number; offset?: number }): Observable<BreakGlassListResponse> {
    return this.http.get<BreakGlassListResponse>(`${this.base}/ai-governance/ops/break-glass`, { params: toParams(params) });
  }

  /** Record a promotion. */
  createPromotion(data: { asset_id: string; version_id: string; registry_type: string; from_environment: string; to_environment: string; notes?: string }): Observable<PromotionDto> {
    return this.http.post<PromotionDto>(`${this.base}/ai-governance/ops/promotions`, data);
  }

  /** List promotions. */
  listPromotions(params?: { registry_type?: string; asset_id?: string; limit?: number; offset?: number }): Observable<PromotionListResponse> {
    return this.http.get<PromotionListResponse>(`${this.base}/ai-governance/ops/promotions`, { params: toParams(params) });
  }

  // ─── Wave 1: Observability & Safety ───────────────────────────

  // W1.1 Alert Rules
  listAlertRules(params?: { enabled?: boolean; limit?: number; offset?: number }): Observable<AlertRuleListResponse> {
    return this.http.get<AlertRuleListResponse>(`${this.base}/ai-governance/wave1/alert-rules`, { params: toParams(params) });
  }
  createAlertRule(data: CreateAlertRuleRequest): Observable<AlertRuleDto> {
    return this.http.post<AlertRuleDto>(`${this.base}/ai-governance/wave1/alert-rules`, data);
  }
  updateAlertRule(id: string, data: UpdateAlertRuleRequest): Observable<AlertRuleDto> {
    return this.http.put<AlertRuleDto>(`${this.base}/ai-governance/wave1/alert-rules/${id}`, data);
  }
  deleteAlertRule(id: string): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.base}/ai-governance/wave1/alert-rules/${id}`);
  }
  listAlertHistory(params?: { rule_id?: string; limit?: number; offset?: number }): Observable<AlertHistoryListResponse> {
    return this.http.get<AlertHistoryListResponse>(`${this.base}/ai-governance/wave1/alert-history`, { params: toParams(params) });
  }
  acknowledgeAlert(id: string): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(`${this.base}/ai-governance/wave1/alert-history/${id}/acknowledge`, {});
  }

  // W1.2 Kill Switches
  listKillSwitches(): Observable<KillSwitchListResponse> {
    return this.http.get<KillSwitchListResponse>(`${this.base}/ai-governance/wave1/kill-switches`);
  }
  createKillSwitch(data: { asset_id?: string; asset_name: string; asset_type: string; kill_switch_type?: string; trigger_method?: string; fallback_procedure?: string }): Observable<KillSwitchDto> {
    return this.http.post<KillSwitchDto>(`${this.base}/ai-governance/wave1/kill-switches`, data);
  }
  testKillSwitch(id: string): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(`${this.base}/ai-governance/wave1/kill-switches/${id}/test`, {});
  }
  activateKillSwitch(id: string): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(`${this.base}/ai-governance/wave1/kill-switches/${id}/activate`, {});
  }
  deleteKillSwitch(id: string): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.base}/ai-governance/wave1/kill-switches/${id}`);
  }

  // W1.3 Agent Runtime Stats
  getAgentRuntimeStats(agentAssetId: string, window?: string): Observable<AgentRuntimeStatsDto> {
    return this.http.get<AgentRuntimeStatsDto>(`${this.base}/ai-governance/wave1/agent-runtime-stats/${agentAssetId}`, { params: toParams({ window }) });
  }

  // W1.4 Model Metrics & Drift
  listModelMetrics(versionId: string, params?: { metric_type?: string; limit?: number }): Observable<ModelMetricListResponse> {
    return this.http.get<ModelMetricListResponse>(`${this.base}/ai-governance/wave1/model-metrics/${versionId}`, { params: toParams(params) });
  }
  recordModelMetric(data: RecordModelMetricRequest): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(`${this.base}/ai-governance/wave1/model-metrics`, data);
  }
  listDriftThresholds(assetId: string): Observable<DriftThresholdListResponse> {
    return this.http.get<DriftThresholdListResponse>(`${this.base}/ai-governance/wave1/drift-thresholds/${assetId}`);
  }
  upsertDriftThreshold(data: { asset_id: string; metric_type: string; warning_delta?: number; critical_delta?: number; baseline_value?: number; enabled?: boolean }): Observable<MutationResponse> {
    return this.http.put<MutationResponse>(`${this.base}/ai-governance/wave1/drift-thresholds`, data);
  }

  // W1.5 Maturity Scorecard
  getMaturityScorecard(): Observable<MaturityScorecardDto> {
    return this.http.get<MaturityScorecardDto>(`${this.base}/ai-governance/wave1/maturity-scorecard`);
  }

  // W1.6 Board Summary
  getBoardSummary(): Observable<BoardSummaryDto> {
    return this.http.get<BoardSummaryDto>(`${this.base}/ai-governance/wave1/board-summary`);
  }

  // ─── Wave 2: Compliance & Ethics ──────────────────────────────

  // W2.1 Bias & Fairness
  listFairnessMetrics(params?: { model_asset_id?: string; limit?: number }): Observable<FairnessMetricListResponse> {
    return this.http.get<FairnessMetricListResponse>(`${this.base}/ai-governance/wave2/fairness/metrics`, { params: toParams(params) });
  }
  listFairnessScans(): Observable<FairnessScanListResponse> {
    return this.http.get<FairnessScanListResponse>(`${this.base}/ai-governance/wave2/fairness/scans`);
  }
  runFairnessScan(data: { model_asset_id: string; model_name?: string }): Observable<FairnessScanDto> {
    return this.http.post<FairnessScanDto>(`${this.base}/ai-governance/wave2/fairness/scan`, data);
  }

  // W2.2 EU AI Act
  getEuAiActQuestions(): Observable<EuAiActQuestionsResponse> {
    return this.http.get<EuAiActQuestionsResponse>(`${this.base}/ai-governance/wave2/eu-ai-act/questions`);
  }
  listEuClassifications(params?: { model_id?: string }): Observable<EuClassificationListResponse> {
    return this.http.get<EuClassificationListResponse>(`${this.base}/ai-governance/wave2/eu-ai-act/classifications`, { params: toParams(params) });
  }
  classifyModel(data: { model_id: string; model_name?: string; answers: Record<string, boolean> }): Observable<EuClassificationDto> {
    return this.http.post<EuClassificationDto>(`${this.base}/ai-governance/wave2/eu-ai-act/classify`, data);
  }

  // W2.3 Red Team Scheduling
  listRedTeamSchedules(): Observable<RedTeamScheduleListResponse> {
    return this.http.get<RedTeamScheduleListResponse>(`${this.base}/ai-governance/wave2/red-team/schedules`);
  }
  createRedTeamSchedule(data: { name: string; model_id?: string; prompt_template?: string; frequency?: string; enabled?: boolean }): Observable<RedTeamScheduleDto> {
    return this.http.post<RedTeamScheduleDto>(`${this.base}/ai-governance/wave2/red-team/schedules`, data);
  }
  updateRedTeamSchedule(id: string, data: UpdateRedTeamScheduleRequest): Observable<RedTeamScheduleDto> {
    return this.http.put<RedTeamScheduleDto>(`${this.base}/ai-governance/wave2/red-team/schedules/${id}`, data);
  }
  deleteRedTeamSchedule(id: string): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.base}/ai-governance/wave2/red-team/schedules/${id}`);
  }

  // W2.4 Ethics Review Board
  listEthicsReviews(params?: { status?: string; limit?: number }): Observable<EthicsReviewListResponse> {
    return this.http.get<EthicsReviewListResponse>(`${this.base}/ai-governance/wave2/ethics-reviews`, { params: toParams(params) });
  }
  createEthicsReview(data: { system_name: string; system_type?: string; description?: string; risk_category?: string; assessment_data?: Record<string, unknown> }): Observable<EthicsReviewDto> {
    return this.http.post<EthicsReviewDto>(`${this.base}/ai-governance/wave2/ethics-reviews`, data);
  }
  voteOnEthicsReview(id: string, data: { vote: 'approve' | 'conditional' | 'reject'; notes?: string }): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(`${this.base}/ai-governance/wave2/ethics-reviews/${id}/vote`, data);
  }
  recordEthicsDecision(id: string, data: { decision: 'approved' | 'conditional' | 'rejected'; conditions?: string }): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(`${this.base}/ai-governance/wave2/ethics-reviews/${id}/decide`, data);
  }

  // W2.5 AI Impact Assessment
  listImpactAssessments(params?: { status?: string; limit?: number }): Observable<ImpactAssessmentListResponse> {
    return this.http.get<ImpactAssessmentListResponse>(`${this.base}/ai-governance/wave2/impact-assessments`, { params: toParams(params) });
  }
  createImpactAssessment(data: Partial<ImpactAssessmentDto>): Observable<ImpactAssessmentDto> {
    return this.http.post<ImpactAssessmentDto>(`${this.base}/ai-governance/wave2/impact-assessments`, data);
  }
  updateImpactAssessment(id: string, data: UpdateImpactAssessmentRequest): Observable<ImpactAssessmentDto> {
    return this.http.put<ImpactAssessmentDto>(`${this.base}/ai-governance/wave2/impact-assessments/${id}`, data);
  }
  deleteImpactAssessment(id: string): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.base}/ai-governance/wave2/impact-assessments/${id}`);
  }

  // W2.6 Regulatory Change Intelligence
  listRegulatoryChanges(params?: { status?: string; severity?: string; limit?: number }): Observable<RegulatoryChangeListResponse> {
    return this.http.get<RegulatoryChangeListResponse>(`${this.base}/ai-governance/wave2/regulatory-changes`, { params: toParams(params) });
  }
  createRegulatoryChange(data: CreateRegulatoryChangeRequest): Observable<RegulatoryChangeDto> {
    return this.http.post<RegulatoryChangeDto>(`${this.base}/ai-governance/wave2/regulatory-changes`, data);
  }
  reviewRegulatoryChange(id: string, data: { status: 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed' }): Observable<MutationResponse> {
    return this.http.put<MutationResponse>(`${this.base}/ai-governance/wave2/regulatory-changes/${id}/review`, data);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 8: AI Model Risk Management — /api/ai-model-risk
  // ════════════════════════════════════════════════════════════════════════════

  /** Calculate and store risk score for a model */
  calculateModelRiskScore(modelVersionId: string, data: { systemId?: string; [key: string]: unknown }): Observable<ModelRiskScoreDto> {
    return this.http.post<ModelRiskScoreDto>(`${this.base}/ai-model-risk/models/${modelVersionId}/risk-score`, data);
  }

  /** Get risk scores for a model */
  getModelRiskScores(modelVersionId: string, systemId?: string): Observable<ModelRiskScoreListResponse> {
    let params = new HttpParams();
    if (systemId) params = params.set('systemId', systemId);
    return this.http.get<ModelRiskScoreListResponse>(`${this.base}/ai-model-risk/models/${modelVersionId}/risk-scores`, { params });
  }

  /** Transition model lifecycle */
  transitionModelLifecycle(modelVersionId: string, data: ModelLifecycleTransitionRequest): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(`${this.base}/ai-model-risk/models/${modelVersionId}/lifecycle`, data);
  }

  /** Approve lifecycle transition */
  approveLifecycleTransition(lifecycleId: string, approvalNotes?: string): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(`${this.base}/ai-model-risk/lifecycle/${lifecycleId}/approve`, { approvalNotes });
  }

  /** Create risk assessment */
  createModelRiskAssessment(modelVersionId: string, data: { systemId?: string; [key: string]: unknown }): Observable<ModelRiskAssessmentDto> {
    return this.http.post<ModelRiskAssessmentDto>(`${this.base}/ai-model-risk/models/${modelVersionId}/assessments`, data);
  }

  /** Get risk assessments */
  getModelRiskAssessments(modelVersionId: string, systemId?: string): Observable<ModelRiskAssessmentListResponse> {
    let params = new HttpParams();
    if (systemId) params = params.set('systemId', systemId);
    return this.http.get<ModelRiskAssessmentListResponse>(`${this.base}/ai-model-risk/models/${modelVersionId}/assessments`, { params });
  }

  /** Get models requiring assessment */
  getModelsRequiringAssessment(): Observable<ModelsRequiringAssessmentResponse> {
    return this.http.get<ModelsRequiringAssessmentResponse>(`${this.base}/ai-model-risk/models/requiring-assessment`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 9: Enhanced AI DPIA — /api/ai-dpia
  // ════════════════════════════════════════════════════════════════════════════

  /** Create or update DPIA assessment */
  createOrUpdateDPIA(systemId: string, data: DPIARequest): Observable<DPIADto> {
    return this.http.post<DPIADto>(`${this.base}/ai-dpia/systems/${systemId}/dpia`, data);
  }

  /** Get DPIA assessments */
  getDPIAAssessments(systemId?: string, status?: string): Observable<DPIAListResponse> {
    let params = new HttpParams();
    if (systemId) params = params.set('systemId', systemId);
    if (status) params = params.set('status', status);
    return this.http.get<DPIAListResponse>(`${this.base}/ai-dpia/dpia`, { params });
  }

  /** Get specific DPIA */
  getDPIA(dpiaId: string): Observable<DPIADto> {
    return this.http.get<DPIADto>(`${this.base}/ai-dpia/dpia/${dpiaId}`);
  }

  /** Add risk factor to DPIA */
  addDPIARiskFactor(dpiaId: string, data: DPIARiskFactorRequest): Observable<DPIARiskFactorDto> {
    return this.http.post<DPIARiskFactorDto>(`${this.base}/ai-dpia/dpia/${dpiaId}/risk-factors`, data);
  }

  /** Get DPIA risk factors */
  getDPIARiskFactors(dpiaId: string): Observable<DPIARiskFactorListResponse> {
    return this.http.get<DPIARiskFactorListResponse>(`${this.base}/ai-dpia/dpia/${dpiaId}/risk-factors`);
  }

  /** Submit DPIA for review */
  submitDPIAForReview(dpiaId: string): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(`${this.base}/ai-dpia/dpia/${dpiaId}/submit`, {});
  }

  /** Review DPIA */
  reviewDPIA(dpiaId: string, decision: string, approvalNotes?: string): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(`${this.base}/ai-dpia/dpia/${dpiaId}/review`, { decision, approvalNotes });
  }

  /** Get DPIAs requiring review */
  getDPIAsRequiringReview(): Observable<DPIAListResponse> {
    return this.http.get<DPIAListResponse>(`${this.base}/ai-dpia/dpia/requiring-review`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 10: AI Agent Performance & Bias — /api/ai-agent-performance
  // ════════════════════════════════════════════════════════════════════════════

  /** Record agent performance metric */
  recordAgentPerformanceMetric(agentId: string, data: AgentPerformanceMetricRequest): Observable<AgentPerformanceMetricDto> {
    return this.http.post<AgentPerformanceMetricDto>(`${this.base}/ai-agent-performance/agents/${agentId}/performance`, data);
  }

  /** Get agent performance metrics */
  getAgentPerformanceMetrics(agentId: string, startDate?: string, endDate?: string): Observable<AgentPerformanceMetricListResponse> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<AgentPerformanceMetricListResponse>(`${this.base}/ai-agent-performance/agents/${agentId}/performance`, { params });
  }

  /** Detect bias for an agent */
  detectAgentBias(agentId: string, data: BiasDetectionRequest): Observable<BiasDetectionDto> {
    return this.http.post<BiasDetectionDto>(`${this.base}/ai-agent-performance/agents/${agentId}/bias-detection`, data);
  }

  /** Get bias detections */
  getAgentBiasDetections(agentId: string): Observable<BiasDetectionListResponse> {
    return this.http.get<BiasDetectionListResponse>(`${this.base}/ai-agent-performance/agents/${agentId}/bias-detections`);
  }

  /** Update bias remediation */
  updateBiasRemediation(detectionId: string, remediationStatus: string, remediationNotes?: string): Observable<MutationResponse> {
    return this.http.patch<MutationResponse>(`${this.base}/ai-agent-performance/bias-detections/${detectionId}/remediation`, {
      remediationStatus,
      remediationNotes,
    });
  }

  /** Calculate and get agent trust score */
  calculateAgentTrustScore(agentId: string, data: TrustScoreRequest): Observable<TrustScoreDto> {
    return this.http.post<TrustScoreDto>(`${this.base}/ai-agent-performance/agents/${agentId}/trust-score`, data);
  }

  /** Get agent trust scores */
  getAgentTrustScores(agentId: string): Observable<TrustScoreListResponse> {
    return this.http.get<TrustScoreListResponse>(`${this.base}/ai-agent-performance/agents/${agentId}/trust-scores`);
  }

  /** Record human override */
  recordHumanOverride(agentId: string, decisionId: string, overrideReason: string, overrideAction: string): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(`${this.base}/ai-agent-performance/agents/${agentId}/human-overrides`, {
      decisionId,
      overrideReason,
      overrideAction,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 11: AI Explainability & Transparency — /api/ai-explainability
  // ════════════════════════════════════════════════════════════════════════════

  /** Create explainability record */
  createExplainabilityRecord(systemId: string, decisionId: string, data: ExplainabilityRecordRequest): Observable<ExplainabilityRecordDto> {
    return this.http.post<ExplainabilityRecordDto>(`${this.base}/ai-explainability/explainability`, { systemId, decisionId, ...data });
  }

  /** Get explainability records */
  getExplainabilityRecords(systemId?: string, decisionId?: string, startDate?: string, endDate?: string): Observable<ExplainabilityRecordListResponse> {
    let params = new HttpParams();
    if (systemId) params = params.set('systemId', systemId);
    if (decisionId) params = params.set('decisionId', decisionId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<ExplainabilityRecordListResponse>(`${this.base}/ai-explainability/explainability`, { params });
  }

  /** Review explainability record */
  reviewExplainabilityRecord(recordId: string, reviewStatus: string, reviewNotes?: string): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(`${this.base}/ai-explainability/explainability/${recordId}/review`, {
      reviewStatus,
      reviewNotes,
    });
  }

  /** Create counterfactual analysis */
  createCounterfactualAnalysis(recordId: string, scenarioDescription: string, alternativeInputs: Record<string, unknown>, predictedOutcome: string): Observable<CounterfactualAnalysisDto> {
    return this.http.post<CounterfactualAnalysisDto>(`${this.base}/ai-explainability/explainability/${recordId}/counterfactual`, {
      scenarioDescription,
      alternativeInputs,
      predictedOutcome,
    });
  }

  /** Get explainability requirements */
  getExplainabilityRequirements(systemId?: string): Observable<ExplainabilityRequirementListResponse> {
    let params = new HttpParams();
    if (systemId) params = params.set('systemId', systemId);
    return this.http.get<ExplainabilityRequirementListResponse>(`${this.base}/ai-explainability/explainability/requirements`, { params });
  }

  /** Get transparency metrics */
  getTransparencyMetrics(systemId?: string, startDate?: string, endDate?: string): Observable<TransparencyMetricsDto> {
    let params = new HttpParams();
    if (systemId) params = params.set('systemId', systemId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<TransparencyMetricsDto>(`${this.base}/ai-explainability/explainability/transparency-metrics`, { params });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 12: AI Compliance Framework Mapping — /api/ai-compliance-framework
  // ════════════════════════════════════════════════════════════════════════════

  /** Map system to compliance framework */
  mapSystemToFramework(systemId: string, frameworkCode: string, frameworkVersion: string, data: ComplianceFrameworkMappingRequest): Observable<ComplianceFrameworkMappingDto> {
    return this.http.post<ComplianceFrameworkMappingDto>(`${this.base}/ai-compliance-framework/systems/${systemId}/frameworks`, {
      frameworkCode,
      frameworkVersion,
      ...data,
    });
  }

  /** Get compliance mappings */
  getComplianceMappings(systemId: string, frameworkCode?: string): Observable<ComplianceFrameworkMappingListResponse> {
    let params = new HttpParams();
    if (frameworkCode) params = params.set('frameworkCode', frameworkCode);
    return this.http.get<ComplianceFrameworkMappingListResponse>(`${this.base}/ai-compliance-framework/systems/${systemId}/frameworks`, { params });
  }

  /** Update compliance status */
  updateComplianceStatus(mappingId: string, complianceStatus: string, assessmentDate?: string, nextAssessmentDue?: string, complianceNotes?: string): Observable<MutationResponse> {
    return this.http.patch<MutationResponse>(`${this.base}/ai-compliance-framework/frameworks/${mappingId}/status`, {
      complianceStatus,
      assessmentDate,
      nextAssessmentDue,
      complianceNotes,
    });
  }

  /** Classify framework risk */
  classifyFrameworkRisk(mappingId: string, riskLevel: string, riskFactors: Record<string, unknown>, classificationNotes?: string): Observable<MutationResponse> {
    return this.http.post<MutationResponse>(`${this.base}/ai-compliance-framework/frameworks/${mappingId}/risk-classification`, {
      riskLevel,
      riskFactors,
      classificationNotes,
    });
  }

  /** Get compliance dashboard */
  getComplianceDashboard(frameworkCode?: string): Observable<AiComplianceDashboardDto> {
    let params = new HttpParams();
    if (frameworkCode) params = params.set('frameworkCode', frameworkCode);
    return this.http.get<AiComplianceDashboardDto>(`${this.base}/ai-compliance-framework/compliance/dashboard`, { params });
  }

  /** Get systems requiring assessment */
  getSystemsRequiringAssessment(frameworkCode?: string): Observable<SystemsRequiringAssessmentResponse> {
    let params = new HttpParams();
    if (frameworkCode) params = params.set('frameworkCode', frameworkCode);
    return this.http.get<SystemsRequiringAssessmentResponse>(`${this.base}/ai-compliance-framework/systems/requiring-assessment`, { params });
  }
}
