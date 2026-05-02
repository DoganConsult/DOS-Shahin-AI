import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

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
  getGovernanceSummary(): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/ops/summary`);
  }

  /** List governance audit events with optional type filter. */
  listGovernanceEvents(params?: { event_type?: string; limit?: number; offset?: number }): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/ops/events`, { params: toParams(params) });
  }

  /** Create a break-glass entry. */
  createBreakGlass(data: { asset_id: string; version_id?: string; registry_type: string; reason: string; duration_minutes?: number }): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/ops/break-glass`, data);
  }

  /** Revoke a break-glass entry. */
  revokeBreakGlass(breakGlassId: string): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/ops/break-glass/${breakGlassId}/revoke`, {});
  }

  /** List break-glass entries. */
  listBreakGlass(params?: { status?: string; registry_type?: string; limit?: number; offset?: number }): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/ops/break-glass`, { params: toParams(params) });
  }

  /** Record a promotion. */
  createPromotion(data: { asset_id: string; version_id: string; registry_type: string; from_environment: string; to_environment: string; notes?: string }): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/ops/promotions`, data);
  }

  /** List promotions. */
  listPromotions(params?: { registry_type?: string; asset_id?: string; limit?: number; offset?: number }): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/ops/promotions`, { params: toParams(params) });
  }

  // ─── Wave 1: Observability & Safety ───────────────────────────

  // W1.1 Alert Rules
  listAlertRules(params?: { enabled?: boolean; limit?: number; offset?: number }): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave1/alert-rules`, { params: toParams(params) });
  }
  createAlertRule(data: any): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/wave1/alert-rules`, data);
  }
  updateAlertRule(id: string, data: any): Observable<any> {
    return this.http.put(`${this.base}/ai-governance/wave1/alert-rules/${id}`, data);
  }
  deleteAlertRule(id: string): Observable<any> {
    return this.http.delete(`${this.base}/ai-governance/wave1/alert-rules/${id}`);
  }
  listAlertHistory(params?: { rule_id?: string; limit?: number; offset?: number }): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave1/alert-history`, { params: toParams(params) });
  }
  acknowledgeAlert(id: string): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/wave1/alert-history/${id}/acknowledge`, {});
  }

  // W1.2 Kill Switches
  listKillSwitches(): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave1/kill-switches`);
  }
  createKillSwitch(data: { asset_id?: string; asset_name: string; asset_type: string; kill_switch_type?: string; trigger_method?: string; fallback_procedure?: string }): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/wave1/kill-switches`, data);
  }
  testKillSwitch(id: string): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/wave1/kill-switches/${id}/test`, {});
  }
  activateKillSwitch(id: string): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/wave1/kill-switches/${id}/activate`, {});
  }
  deleteKillSwitch(id: string): Observable<any> {
    return this.http.delete(`${this.base}/ai-governance/wave1/kill-switches/${id}`);
  }

  // W1.3 Agent Runtime Stats
  getAgentRuntimeStats(agentAssetId: string, window?: string): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave1/agent-runtime-stats/${agentAssetId}`, { params: toParams({ window }) });
  }

  // W1.4 Model Metrics & Drift
  listModelMetrics(versionId: string, params?: { metric_type?: string; limit?: number }): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave1/model-metrics/${versionId}`, { params: toParams(params) });
  }
  recordModelMetric(data: { version_id: string; asset_id?: string; metric_type: string; value: number; metadata?: Record<string, unknown> }): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/wave1/model-metrics`, data);
  }
  listDriftThresholds(assetId: string): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave1/drift-thresholds/${assetId}`);
  }
  upsertDriftThreshold(data: { asset_id: string; metric_type: string; warning_delta?: number; critical_delta?: number; baseline_value?: number; enabled?: boolean }): Observable<any> {
    return this.http.put(`${this.base}/ai-governance/wave1/drift-thresholds`, data);
  }

  // W1.5 Maturity Scorecard
  getMaturityScorecard(): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave1/maturity-scorecard`);
  }

  // W1.6 Board Summary
  getBoardSummary(): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave1/board-summary`);
  }

  // ─── Wave 2: Compliance & Ethics ──────────────────────────────

  // W2.1 Bias & Fairness
  listFairnessMetrics(params?: { model_asset_id?: string; limit?: number }): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave2/fairness/metrics`, { params: toParams(params) });
  }
  listFairnessScans(): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave2/fairness/scans`);
  }
  runFairnessScan(data: { model_asset_id: string; model_name?: string }): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/wave2/fairness/scan`, data);
  }

  // W2.2 EU AI Act
  getEuAiActQuestions(): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave2/eu-ai-act/questions`);
  }
  listEuClassifications(params?: { model_id?: string }): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave2/eu-ai-act/classifications`, { params: toParams(params) });
  }
  classifyModel(data: { model_id: string; model_name?: string; answers: Record<string, boolean> }): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/wave2/eu-ai-act/classify`, data);
  }

  // W2.3 Red Team Scheduling
  listRedTeamSchedules(): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave2/red-team/schedules`);
  }
  createRedTeamSchedule(data: { name: string; model_id?: string; prompt_template?: string; frequency?: string; enabled?: boolean }): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/wave2/red-team/schedules`, data);
  }
  updateRedTeamSchedule(id: string, data: any): Observable<any> {
    return this.http.put(`${this.base}/ai-governance/wave2/red-team/schedules/${id}`, data);
  }
  deleteRedTeamSchedule(id: string): Observable<any> {
    return this.http.delete(`${this.base}/ai-governance/wave2/red-team/schedules/${id}`);
  }

  // W2.4 Ethics Review Board
  listEthicsReviews(params?: { status?: string; limit?: number }): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave2/ethics-reviews`, { params: toParams(params) });
  }
  createEthicsReview(data: { system_name: string; system_type?: string; description?: string; risk_category?: string; assessment_data?: Record<string, unknown> }): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/wave2/ethics-reviews`, data);
  }
  voteOnEthicsReview(id: string, data: { vote: 'approve' | 'conditional' | 'reject'; notes?: string }): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/wave2/ethics-reviews/${id}/vote`, data);
  }
  recordEthicsDecision(id: string, data: { decision: 'approved' | 'conditional' | 'rejected'; conditions?: string }): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/wave2/ethics-reviews/${id}/decide`, data);
  }

  // W2.5 AI Impact Assessment
  listImpactAssessments(params?: { status?: string; limit?: number }): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave2/impact-assessments`, { params: toParams(params) });
  }
  createImpactAssessment(data: any): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/wave2/impact-assessments`, data);
  }
  updateImpactAssessment(id: string, data: any): Observable<any> {
    return this.http.put(`${this.base}/ai-governance/wave2/impact-assessments/${id}`, data);
  }
  deleteImpactAssessment(id: string): Observable<any> {
    return this.http.delete(`${this.base}/ai-governance/wave2/impact-assessments/${id}`);
  }

  // W2.6 Regulatory Change Intelligence
  listRegulatoryChanges(params?: { status?: string; severity?: string; limit?: number }): Observable<any> {
    return this.http.get(`${this.base}/ai-governance/wave2/regulatory-changes`, { params: toParams(params) });
  }
  createRegulatoryChange(data: any): Observable<any> {
    return this.http.post(`${this.base}/ai-governance/wave2/regulatory-changes`, data);
  }
  reviewRegulatoryChange(id: string, data: { status: 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed' }): Observable<any> {
    return this.http.put(`${this.base}/ai-governance/wave2/regulatory-changes/${id}/review`, data);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 8: AI Model Risk Management — /api/ai-model-risk
  // ════════════════════════════════════════════════════════════════════════════

  /** Calculate and store risk score for a model */
  calculateModelRiskScore(modelVersionId: string, data: { systemId?: string; [key: string]: unknown }): Observable<any> {
    return this.http.post(`${this.base}/ai-model-risk/models/${modelVersionId}/risk-score`, data);
  }

  /** Get risk scores for a model */
  getModelRiskScores(modelVersionId: string, systemId?: string): Observable<any> {
    let params = new HttpParams();
    if (systemId) params = params.set('systemId', systemId);
    return this.http.get(`${this.base}/ai-model-risk/models/${modelVersionId}/risk-scores`, { params });
  }

  /** Transition model lifecycle */
  transitionModelLifecycle(modelVersionId: string, data: { systemId?: string; newState: string; transitionReason?: string; requiresApproval?: boolean }): Observable<any> {
    return this.http.post(`${this.base}/ai-model-risk/models/${modelVersionId}/lifecycle`, data);
  }

  /** Approve lifecycle transition */
  approveLifecycleTransition(lifecycleId: string, approvalNotes?: string): Observable<any> {
    return this.http.post(`${this.base}/ai-model-risk/lifecycle/${lifecycleId}/approve`, { approvalNotes });
  }

  /** Create risk assessment */
  createModelRiskAssessment(modelVersionId: string, data: { systemId?: string; [key: string]: unknown }): Observable<any> {
    return this.http.post(`${this.base}/ai-model-risk/models/${modelVersionId}/assessments`, data);
  }

  /** Get risk assessments */
  getModelRiskAssessments(modelVersionId: string, systemId?: string): Observable<any> {
    let params = new HttpParams();
    if (systemId) params = params.set('systemId', systemId);
    return this.http.get(`${this.base}/ai-model-risk/models/${modelVersionId}/assessments`, { params });
  }

  /** Get models requiring assessment */
  getModelsRequiringAssessment(): Observable<any> {
    return this.http.get(`${this.base}/ai-model-risk/models/requiring-assessment`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 9: Enhanced AI DPIA — /api/ai-dpia
  // ════════════════════════════════════════════════════════════════════════════

  /** Create or update DPIA assessment */
  createOrUpdateDPIA(systemId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/ai-dpia/systems/${systemId}/dpia`, data);
  }

  /** Get DPIA assessments */
  getDPIAAssessments(systemId?: string, status?: string): Observable<any> {
    let params = new HttpParams();
    if (systemId) params = params.set('systemId', systemId);
    if (status) params = params.set('status', status);
    return this.http.get(`${this.base}/ai-dpia/dpia`, { params });
  }

  /** Get specific DPIA */
  getDPIA(dpiaId: string): Observable<any> {
    return this.http.get(`${this.base}/ai-dpia/dpia/${dpiaId}`);
  }

  /** Add risk factor to DPIA */
  addDPIARiskFactor(dpiaId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/ai-dpia/dpia/${dpiaId}/risk-factors`, data);
  }

  /** Get DPIA risk factors */
  getDPIARiskFactors(dpiaId: string): Observable<any> {
    return this.http.get(`${this.base}/ai-dpia/dpia/${dpiaId}/risk-factors`);
  }

  /** Submit DPIA for review */
  submitDPIAForReview(dpiaId: string): Observable<any> {
    return this.http.post(`${this.base}/ai-dpia/dpia/${dpiaId}/submit`, {});
  }

  /** Review DPIA */
  reviewDPIA(dpiaId: string, decision: string, approvalNotes?: string): Observable<any> {
    return this.http.post(`${this.base}/ai-dpia/dpia/${dpiaId}/review`, { decision, approvalNotes });
  }

  /** Get DPIAs requiring review */
  getDPIAsRequiringReview(): Observable<any> {
    return this.http.get(`${this.base}/ai-dpia/dpia/requiring-review`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 10: AI Agent Performance & Bias — /api/ai-agent-performance
  // ════════════════════════════════════════════════════════════════════════════

  /** Record agent performance metric */
  recordAgentPerformanceMetric(agentId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/ai-agent-performance/agents/${agentId}/performance`, data);
  }

  /** Get agent performance metrics */
  getAgentPerformanceMetrics(agentId: string, startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get(`${this.base}/ai-agent-performance/agents/${agentId}/performance`, { params });
  }

  /** Detect bias for an agent */
  detectAgentBias(agentId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/ai-agent-performance/agents/${agentId}/bias-detection`, data);
  }

  /** Get bias detections */
  getAgentBiasDetections(agentId: string): Observable<any> {
    return this.http.get(`${this.base}/ai-agent-performance/agents/${agentId}/bias-detections`);
  }

  /** Update bias remediation */
  updateBiasRemediation(detectionId: string, remediationStatus: string, remediationNotes?: string): Observable<any> {
    return this.http.patch(`${this.base}/ai-agent-performance/bias-detections/${detectionId}/remediation`, {
      remediationStatus,
      remediationNotes,
    });
  }

  /** Calculate and get agent trust score */
  calculateAgentTrustScore(agentId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/ai-agent-performance/agents/${agentId}/trust-score`, data);
  }

  /** Get agent trust scores */
  getAgentTrustScores(agentId: string): Observable<any> {
    return this.http.get(`${this.base}/ai-agent-performance/agents/${agentId}/trust-scores`);
  }

  /** Record human override */
  recordHumanOverride(agentId: string, decisionId: string, overrideReason: string, overrideAction: string): Observable<any> {
    return this.http.post(`${this.base}/ai-agent-performance/agents/${agentId}/human-overrides`, {
      decisionId,
      overrideReason,
      overrideAction,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 11: AI Explainability & Transparency — /api/ai-explainability
  // ════════════════════════════════════════════════════════════════════════════

  /** Create explainability record */
  createExplainabilityRecord(systemId: string, decisionId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/ai-explainability/explainability`, { systemId, decisionId, ...data });
  }

  /** Get explainability records */
  getExplainabilityRecords(systemId?: string, decisionId?: string, startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (systemId) params = params.set('systemId', systemId);
    if (decisionId) params = params.set('decisionId', decisionId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get(`${this.base}/ai-explainability/explainability`, { params });
  }

  /** Review explainability record */
  reviewExplainabilityRecord(recordId: string, reviewStatus: string, reviewNotes?: string): Observable<any> {
    return this.http.post(`${this.base}/ai-explainability/explainability/${recordId}/review`, {
      reviewStatus,
      reviewNotes,
    });
  }

  /** Create counterfactual analysis */
  createCounterfactualAnalysis(recordId: string, scenarioDescription: string, alternativeInputs: Record<string, unknown>, predictedOutcome: string): Observable<any> {
    return this.http.post(`${this.base}/ai-explainability/explainability/${recordId}/counterfactual`, {
      scenarioDescription,
      alternativeInputs,
      predictedOutcome,
    });
  }

  /** Get explainability requirements */
  getExplainabilityRequirements(systemId?: string): Observable<any> {
    let params = new HttpParams();
    if (systemId) params = params.set('systemId', systemId);
    return this.http.get(`${this.base}/ai-explainability/explainability/requirements`, { params });
  }

  /** Get transparency metrics */
  getTransparencyMetrics(systemId?: string, startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (systemId) params = params.set('systemId', systemId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get(`${this.base}/ai-explainability/explainability/transparency-metrics`, { params });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 12: AI Compliance Framework Mapping — /api/ai-compliance-framework
  // ════════════════════════════════════════════════════════════════════════════

  /** Map system to compliance framework */
  mapSystemToFramework(systemId: string, frameworkCode: string, frameworkVersion: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/ai-compliance-framework/systems/${systemId}/frameworks`, {
      frameworkCode,
      frameworkVersion,
      ...data,
    });
  }

  /** Get compliance mappings */
  getComplianceMappings(systemId: string, frameworkCode?: string): Observable<any> {
    let params = new HttpParams();
    if (frameworkCode) params = params.set('frameworkCode', frameworkCode);
    return this.http.get(`${this.base}/ai-compliance-framework/systems/${systemId}/frameworks`, { params });
  }

  /** Update compliance status */
  updateComplianceStatus(mappingId: string, complianceStatus: string, assessmentDate?: string, nextAssessmentDue?: string, complianceNotes?: string): Observable<any> {
    return this.http.patch(`${this.base}/ai-compliance-framework/frameworks/${mappingId}/status`, {
      complianceStatus,
      assessmentDate,
      nextAssessmentDue,
      complianceNotes,
    });
  }

  /** Classify framework risk */
  classifyFrameworkRisk(mappingId: string, riskLevel: string, riskFactors: Record<string, unknown>, classificationNotes?: string): Observable<any> {
    return this.http.post(`${this.base}/ai-compliance-framework/frameworks/${mappingId}/risk-classification`, {
      riskLevel,
      riskFactors,
      classificationNotes,
    });
  }

  /** Get compliance dashboard */
  getComplianceDashboard(frameworkCode?: string): Observable<any> {
    let params = new HttpParams();
    if (frameworkCode) params = params.set('frameworkCode', frameworkCode);
    return this.http.get(`${this.base}/ai-compliance-framework/compliance/dashboard`, { params });
  }

  /** Get systems requiring assessment */
  getSystemsRequiringAssessment(frameworkCode?: string): Observable<any> {
    let params = new HttpParams();
    if (frameworkCode) params = params.set('frameworkCode', frameworkCode);
    return this.http.get(`${this.base}/ai-compliance-framework/systems/requiring-assessment`, { params });
  }
}
