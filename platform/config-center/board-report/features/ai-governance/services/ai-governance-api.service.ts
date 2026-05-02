import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { AssetsListResponse } from '@app/core/models/ai-api.types';

import { AiGovernanceRegistryApiService } from './ai-governance-registry-api.service';
import { AiGovernanceBindingApiService } from './ai-governance-binding-api.service';
import { AiGovernanceOpsApiService } from './ai-governance-ops-api.service';

/**
 * Facade service wrapping all AI Governance backend endpoints.
 * Delegates to three focused sub-services for maintainability:
 *   - AiGovernanceRegistryApiService  (Groups 1-4: Assets, Model, Prompt, Agent registries)
 *   - AiGovernanceBindingApiService   (Groups 5-6: Bindings + Enforcement Config)
 *   - AiGovernanceOpsApiService       (Groups 7-12: Ops, Waves, Model Risk, DPIA, Performance, Explainability, Compliance)
 *
 * All existing consumers continue to inject this service unchanged (backward compatible).
 */
@Injectable({ providedIn: 'root' })
export class AiGovernanceApiService {
  private readonly registry = inject(AiGovernanceRegistryApiService);
  private readonly binding = inject(AiGovernanceBindingApiService);
  private readonly ops = inject(AiGovernanceOpsApiService);

  // ════════════════════════════════════════════════════════════════════════════
  // Group 1: Asset Inventory — delegates to AiGovernanceRegistryApiService
  // ════════════════════════════════════════════════════════════════════════════

  listAssets(params?: {
    asset_type?: string;
    scope_type?: string;
    lifecycle_status?: string;
    status?: string;
    source_type?: string;
    tag?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<AssetsListResponse> {
    return this.registry.listAssets(params);
  }

  lookupAsset(asset_type: string, asset_key: string, scope_type?: string): Observable<any> {
    return this.registry.lookupAsset(asset_type, asset_key, scope_type);
  }

  getAsset(id: string): Observable<any> {
    return this.registry.getAsset(id);
  }

  createAsset(data: {
    asset_type: string;
    asset_key: string;
    display_name: string;
    description?: string;
    scope_type?: string;
    lifecycle_status?: string;
    status?: string;
    business_owner?: string;
    technical_owner?: string;
    governance_owner?: string;
    source_type?: string;
    source_ref?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }): Observable<any> {
    return this.registry.createAsset(data);
  }

  updateAsset(id: string, data: {
    display_name?: string;
    description?: string;
    status?: string;
    business_owner?: string;
    technical_owner?: string;
    governance_owner?: string;
    source_ref?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }): Observable<any> {
    return this.registry.updateAsset(id, data);
  }

  transitionAsset(id: string, target_status: string): Observable<any> {
    return this.registry.transitionAsset(id, target_status);
  }

  deleteAsset(id: string): Observable<any> {
    return this.registry.deleteAsset(id);
  }

  discoverAssets(): Observable<any> {
    return this.registry.discoverAssets();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 2: Model Registry — delegates to AiGovernanceRegistryApiService
  // ════════════════════════════════════════════════════════════════════════════

  listModelAssets(params?: Record<string, string>): Observable<any> {
    return this.registry.listModelAssets(params);
  }

  listModelVersions(params?: {
    asset_id?: string;
    approval_status?: string;
    deployment_status?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    return this.registry.listModelVersions(params);
  }

  getActiveModelVersion(assetId: string): Observable<any> {
    return this.registry.getActiveModelVersion(assetId);
  }

  getModelVersion(versionId: string): Observable<any> {
    return this.registry.getModelVersion(versionId);
  }

  createModelDraft(data: {
    asset_id: string;
    provider: string;
    provider_model_id: string;
    config?: Record<string, unknown>;
    change_summary?: string;
    notes?: string;
  }): Observable<any> {
    return this.registry.createModelDraft(data);
  }

  updateModelDraft(versionId: string, data: {
    provider?: string;
    provider_model_id?: string;
    config?: Record<string, unknown>;
    change_summary?: string;
    notes?: string;
  }): Observable<any> {
    return this.registry.updateModelDraft(versionId, data);
  }

  submitModelVersion(versionId: string): Observable<any> {
    return this.registry.submitModelVersion(versionId);
  }

  approveModelVersion(versionId: string): Observable<any> {
    return this.registry.approveModelVersion(versionId);
  }

  rejectModelVersion(versionId: string, notes?: string): Observable<any> {
    return this.registry.rejectModelVersion(versionId, notes);
  }

  activateModelVersion(versionId: string): Observable<any> {
    return this.registry.activateModelVersion(versionId);
  }

  suspendModelVersion(versionId: string, notes?: string): Observable<any> {
    return this.registry.suspendModelVersion(versionId, notes);
  }

  retireModelVersion(versionId: string, notes?: string): Observable<any> {
    return this.registry.retireModelVersion(versionId, notes);
  }

  rollbackModelVersion(assetId: string, target_version_id: string, notes?: string): Observable<any> {
    return this.registry.rollbackModelVersion(assetId, target_version_id, notes);
  }

  deleteModelVersion(versionId: string): Observable<any> {
    return this.registry.deleteModelVersion(versionId);
  }

  resolveGovernedModel(agentId: string, task_type?: string, input_token_estimate?: number): Observable<any> {
    return this.registry.resolveGovernedModel(agentId, task_type, input_token_estimate);
  }

  getModelMismatches(): Observable<any> {
    return this.registry.getModelMismatches();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 3: Prompt Registry — delegates to AiGovernanceRegistryApiService
  // ════════════════════════════════════════════════════════════════════════════

  listPromptAssets(params?: Record<string, string>): Observable<any> {
    return this.registry.listPromptAssets(params);
  }

  listPromptVersions(params?: {
    asset_id?: string;
    approval_status?: string;
    deployment_status?: string;
    is_active?: boolean;
    linked_model_asset_id?: string;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    return this.registry.listPromptVersions(params);
  }

  getActivePromptVersion(assetId: string): Observable<any> {
    return this.registry.getActivePromptVersion(assetId);
  }

  getPromptVersion(versionId: string): Observable<any> {
    return this.registry.getPromptVersion(versionId);
  }

  createPromptDraft(data: {
    asset_id: string;
    template_text: string;
    variables?: Record<string, unknown>;
    linked_model_asset_id?: string;
    change_summary?: string;
    notes?: string;
  }): Observable<any> {
    return this.registry.createPromptDraft(data);
  }

  updatePromptDraft(versionId: string, data: {
    template_text?: string;
    variables?: Record<string, unknown>;
    linked_model_asset_id?: string;
    change_summary?: string;
    notes?: string;
  }): Observable<any> {
    return this.registry.updatePromptDraft(versionId, data);
  }

  submitPromptVersion(versionId: string): Observable<any> {
    return this.registry.submitPromptVersion(versionId);
  }

  approvePromptVersion(versionId: string): Observable<any> {
    return this.registry.approvePromptVersion(versionId);
  }

  rejectPromptVersion(versionId: string, notes?: string): Observable<any> {
    return this.registry.rejectPromptVersion(versionId, notes);
  }

  activatePromptVersion(versionId: string): Observable<any> {
    return this.registry.activatePromptVersion(versionId);
  }

  suspendPromptVersion(versionId: string, notes?: string): Observable<any> {
    return this.registry.suspendPromptVersion(versionId, notes);
  }

  retirePromptVersion(versionId: string, notes?: string): Observable<any> {
    return this.registry.retirePromptVersion(versionId, notes);
  }

  rollbackPromptVersion(assetId: string, target_version_id: string, notes?: string): Observable<any> {
    return this.registry.rollbackPromptVersion(assetId, target_version_id, notes);
  }

  deletePromptVersion(versionId: string): Observable<any> {
    return this.registry.deletePromptVersion(versionId);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 4: Agent Registry — delegates to AiGovernanceRegistryApiService
  // ════════════════════════════════════════════════════════════════════════════

  listAgentAssets(params?: Record<string, string>): Observable<any> {
    return this.registry.listAgentAssets(params);
  }

  listAgentVersions(params?: {
    asset_id?: string;
    approval_status?: string;
    deployment_status?: string;
    is_active?: boolean;
    linked_prompt_asset_id?: string;
    linked_model_asset_id?: string;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    return this.registry.listAgentVersions(params);
  }

  getActiveAgentVersion(assetId: string): Observable<any> {
    return this.registry.getActiveAgentVersion(assetId);
  }

  getAgentVersion(versionId: string): Observable<any> {
    return this.registry.getAgentVersion(versionId);
  }

  createAgentDraft(data: {
    asset_id: string;
    agent_config: Record<string, unknown>;
    capabilities?: string[];
    linked_prompt_asset_id?: string;
    linked_model_asset_id?: string;
    change_summary?: string;
    notes?: string;
  }): Observable<any> {
    return this.registry.createAgentDraft(data);
  }

  updateAgentDraft(versionId: string, data: {
    agent_config?: Record<string, unknown>;
    capabilities?: string[];
    linked_prompt_asset_id?: string;
    linked_model_asset_id?: string;
    change_summary?: string;
    notes?: string;
  }): Observable<any> {
    return this.registry.updateAgentDraft(versionId, data);
  }

  submitAgentVersion(versionId: string): Observable<any> {
    return this.registry.submitAgentVersion(versionId);
  }

  approveAgentVersion(versionId: string): Observable<any> {
    return this.registry.approveAgentVersion(versionId);
  }

  rejectAgentVersion(versionId: string, notes?: string): Observable<any> {
    return this.registry.rejectAgentVersion(versionId, notes);
  }

  activateAgentVersion(versionId: string): Observable<any> {
    return this.registry.activateAgentVersion(versionId);
  }

  suspendAgentVersion(versionId: string, notes?: string): Observable<any> {
    return this.registry.suspendAgentVersion(versionId, notes);
  }

  retireAgentVersion(versionId: string, notes?: string): Observable<any> {
    return this.registry.retireAgentVersion(versionId, notes);
  }

  rollbackAgentVersion(assetId: string, target_version_id: string, notes?: string): Observable<any> {
    return this.registry.rollbackAgentVersion(assetId, target_version_id, notes);
  }

  deleteAgentVersion(versionId: string): Observable<any> {
    return this.registry.deleteAgentVersion(versionId);
  }

  resolveGovernedAgent(agentId: string): Observable<any> {
    return this.registry.resolveGovernedAgent(agentId);
  }

  getAgentMismatches(): Observable<any> {
    return this.registry.getAgentMismatches();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 5: Binding Governance — delegates to AiGovernanceBindingApiService
  // ════════════════════════════════════════════════════════════════════════════

  listAgentToolBindings(params?: {
    agent_asset_id?: string;
    tool_asset_id?: string;
    is_enabled?: boolean;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    return this.binding.listAgentToolBindings(params);
  }

  getAgentToolBinding(bindingId: string): Observable<any> {
    return this.binding.getAgentToolBinding(bindingId);
  }

  createAgentToolBinding(data: {
    agent_asset_id: string;
    tool_asset_id: string;
    is_enabled?: boolean;
    notes?: string;
  }): Observable<any> {
    return this.binding.createAgentToolBinding(data);
  }

  updateAgentToolBinding(bindingId: string, data: {
    is_enabled?: boolean;
    notes?: string;
  }): Observable<any> {
    return this.binding.updateAgentToolBinding(bindingId, data);
  }

  enableAgentToolBinding(bindingId: string): Observable<any> {
    return this.binding.enableAgentToolBinding(bindingId);
  }

  disableAgentToolBinding(bindingId: string): Observable<any> {
    return this.binding.disableAgentToolBinding(bindingId);
  }

  deleteAgentToolBinding(bindingId: string): Observable<any> {
    return this.binding.deleteAgentToolBinding(bindingId);
  }

  listAllowlist(params?: {
    asset_type?: string;
    asset_id?: string;
    is_enabled?: boolean;
    limit?: number;
    offset?: number;
  }): Observable<any> {
    return this.binding.listAllowlist(params);
  }

  checkAllowlisted(assetId: string): Observable<any> {
    return this.binding.checkAllowlisted(assetId);
  }

  getAllowlistEntry(allowlistId: string): Observable<any> {
    return this.binding.getAllowlistEntry(allowlistId);
  }

  createAllowlistEntry(data: {
    asset_id: string;
    asset_type: string;
    is_enabled?: boolean;
    notes?: string;
    max_tokens_limit?: number;
    temperature_limit?: number;
  }): Observable<any> {
    return this.binding.createAllowlistEntry(data);
  }

  updateAllowlistEntry(allowlistId: string, data: any): Observable<any> {
    return this.binding.updateAllowlistEntry(allowlistId, data);
  }

  enableAllowlistEntry(allowlistId: string): Observable<any> {
    return this.binding.enableAllowlistEntry(allowlistId);
  }

  disableAllowlistEntry(allowlistId: string): Observable<any> {
    return this.binding.disableAllowlistEntry(allowlistId);
  }

  deleteAllowlistEntry(allowlistId: string): Observable<any> {
    return this.binding.deleteAllowlistEntry(allowlistId);
  }

  backfillAllowlist(): Observable<any> {
    return this.binding.backfillAllowlist();
  }

  getEnabledToolsForAgent(agentAssetId: string): Observable<any> {
    return this.binding.getEnabledToolsForAgent(agentAssetId);
  }

  getEnabledAllowlist(assetType?: string): Observable<any> {
    return this.binding.getEnabledAllowlist(assetType);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 6: Enforcement Mode Config — delegates to AiGovernanceBindingApiService
  // ════════════════════════════════════════════════════════════════════════════

  getEnforcementMode(): Observable<any> {
    return this.binding.getEnforcementMode();
  }

  setEnforcementMode(mode: string): Observable<any> {
    return this.binding.setEnforcementMode(mode);
  }

  getSoDPolicy(): Observable<any> {
    return this.binding.getSoDPolicy();
  }

  setSoDPolicy(policy: string): Observable<any> {
    return this.binding.setSoDPolicy(policy);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 7: Governance Operations — delegates to AiGovernanceOpsApiService
  // ════════════════════════════════════════════════════════════════════════════

  getGovernanceSummary(): Observable<any> {
    return this.ops.getGovernanceSummary();
  }

  listGovernanceEvents(params?: { event_type?: string; limit?: number; offset?: number }): Observable<any> {
    return this.ops.listGovernanceEvents(params);
  }

  createBreakGlass(data: { asset_id: string; version_id?: string; registry_type: string; reason: string; duration_minutes?: number }): Observable<any> {
    return this.ops.createBreakGlass(data);
  }

  revokeBreakGlass(breakGlassId: string): Observable<any> {
    return this.ops.revokeBreakGlass(breakGlassId);
  }

  listBreakGlass(params?: { status?: string; registry_type?: string; limit?: number; offset?: number }): Observable<any> {
    return this.ops.listBreakGlass(params);
  }

  createPromotion(data: { asset_id: string; version_id: string; registry_type: string; from_environment: string; to_environment: string; notes?: string }): Observable<any> {
    return this.ops.createPromotion(data);
  }

  listPromotions(params?: { registry_type?: string; asset_id?: string; limit?: number; offset?: number }): Observable<any> {
    return this.ops.listPromotions(params);
  }

  // ─── Wave 1: Observability & Safety ───────────────────────────

  listAlertRules(params?: { enabled?: boolean; limit?: number; offset?: number }): Observable<any> {
    return this.ops.listAlertRules(params);
  }
  createAlertRule(data: any): Observable<any> {
    return this.ops.createAlertRule(data);
  }
  updateAlertRule(id: string, data: any): Observable<any> {
    return this.ops.updateAlertRule(id, data);
  }
  deleteAlertRule(id: string): Observable<any> {
    return this.ops.deleteAlertRule(id);
  }
  listAlertHistory(params?: { rule_id?: string; limit?: number; offset?: number }): Observable<any> {
    return this.ops.listAlertHistory(params);
  }
  acknowledgeAlert(id: string): Observable<any> {
    return this.ops.acknowledgeAlert(id);
  }

  listKillSwitches(): Observable<any> {
    return this.ops.listKillSwitches();
  }
  createKillSwitch(data: { asset_id?: string; asset_name: string; asset_type: string; kill_switch_type?: string; trigger_method?: string; fallback_procedure?: string }): Observable<any> {
    return this.ops.createKillSwitch(data);
  }
  testKillSwitch(id: string): Observable<any> {
    return this.ops.testKillSwitch(id);
  }
  activateKillSwitch(id: string): Observable<any> {
    return this.ops.activateKillSwitch(id);
  }
  deleteKillSwitch(id: string): Observable<any> {
    return this.ops.deleteKillSwitch(id);
  }

  getAgentRuntimeStats(agentAssetId: string, window?: string): Observable<any> {
    return this.ops.getAgentRuntimeStats(agentAssetId, window);
  }

  listModelMetrics(versionId: string, params?: { metric_type?: string; limit?: number }): Observable<any> {
    return this.ops.listModelMetrics(versionId, params);
  }
  recordModelMetric(data: { version_id: string; asset_id?: string; metric_type: string; value: number; metadata?: Record<string, unknown> }): Observable<any> {
    return this.ops.recordModelMetric(data);
  }
  listDriftThresholds(assetId: string): Observable<any> {
    return this.ops.listDriftThresholds(assetId);
  }
  upsertDriftThreshold(data: { asset_id: string; metric_type: string; warning_delta?: number; critical_delta?: number; baseline_value?: number; enabled?: boolean }): Observable<any> {
    return this.ops.upsertDriftThreshold(data);
  }

  getMaturityScorecard(): Observable<any> {
    return this.ops.getMaturityScorecard();
  }

  getBoardSummary(): Observable<any> {
    return this.ops.getBoardSummary();
  }

  // ─── Wave 2: Compliance & Ethics ──────────────────────────────

  listFairnessMetrics(params?: { model_asset_id?: string; limit?: number }): Observable<any> {
    return this.ops.listFairnessMetrics(params);
  }
  listFairnessScans(): Observable<any> {
    return this.ops.listFairnessScans();
  }
  runFairnessScan(data: { model_asset_id: string; model_name?: string }): Observable<any> {
    return this.ops.runFairnessScan(data);
  }

  getEuAiActQuestions(): Observable<any> {
    return this.ops.getEuAiActQuestions();
  }
  listEuClassifications(params?: { model_id?: string }): Observable<any> {
    return this.ops.listEuClassifications(params);
  }
  classifyModel(data: { model_id: string; model_name?: string; answers: Record<string, boolean> }): Observable<any> {
    return this.ops.classifyModel(data);
  }

  listRedTeamSchedules(): Observable<any> {
    return this.ops.listRedTeamSchedules();
  }
  createRedTeamSchedule(data: { name: string; model_id?: string; prompt_template?: string; frequency?: string; enabled?: boolean }): Observable<any> {
    return this.ops.createRedTeamSchedule(data);
  }
  updateRedTeamSchedule(id: string, data: any): Observable<any> {
    return this.ops.updateRedTeamSchedule(id, data);
  }
  deleteRedTeamSchedule(id: string): Observable<any> {
    return this.ops.deleteRedTeamSchedule(id);
  }

  listEthicsReviews(params?: { status?: string; limit?: number }): Observable<any> {
    return this.ops.listEthicsReviews(params);
  }
  createEthicsReview(data: { system_name: string; system_type?: string; description?: string; risk_category?: string; assessment_data?: Record<string, unknown> }): Observable<any> {
    return this.ops.createEthicsReview(data);
  }
  voteOnEthicsReview(id: string, data: { vote: 'approve' | 'conditional' | 'reject'; notes?: string }): Observable<any> {
    return this.ops.voteOnEthicsReview(id, data);
  }
  recordEthicsDecision(id: string, data: { decision: 'approved' | 'conditional' | 'rejected'; conditions?: string }): Observable<any> {
    return this.ops.recordEthicsDecision(id, data);
  }

  listImpactAssessments(params?: { status?: string; limit?: number }): Observable<any> {
    return this.ops.listImpactAssessments(params);
  }
  createImpactAssessment(data: any): Observable<any> {
    return this.ops.createImpactAssessment(data);
  }
  updateImpactAssessment(id: string, data: any): Observable<any> {
    return this.ops.updateImpactAssessment(id, data);
  }
  deleteImpactAssessment(id: string): Observable<any> {
    return this.ops.deleteImpactAssessment(id);
  }

  listRegulatoryChanges(params?: { status?: string; severity?: string; limit?: number }): Observable<any> {
    return this.ops.listRegulatoryChanges(params);
  }
  createRegulatoryChange(data: any): Observable<any> {
    return this.ops.createRegulatoryChange(data);
  }
  reviewRegulatoryChange(id: string, data: { status: 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed' }): Observable<any> {
    return this.ops.reviewRegulatoryChange(id, data);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 8: AI Model Risk Management — delegates to AiGovernanceOpsApiService
  // ════════════════════════════════════════════════════════════════════════════

  calculateModelRiskScore(modelVersionId: string, data: { systemId?: string; [key: string]: unknown }): Observable<any> {
    return this.ops.calculateModelRiskScore(modelVersionId, data);
  }

  getModelRiskScores(modelVersionId: string, systemId?: string): Observable<any> {
    return this.ops.getModelRiskScores(modelVersionId, systemId);
  }

  transitionModelLifecycle(modelVersionId: string, data: { systemId?: string; newState: string; transitionReason?: string; requiresApproval?: boolean }): Observable<any> {
    return this.ops.transitionModelLifecycle(modelVersionId, data);
  }

  approveLifecycleTransition(lifecycleId: string, approvalNotes?: string): Observable<any> {
    return this.ops.approveLifecycleTransition(lifecycleId, approvalNotes);
  }

  createModelRiskAssessment(modelVersionId: string, data: { systemId?: string; [key: string]: unknown }): Observable<any> {
    return this.ops.createModelRiskAssessment(modelVersionId, data);
  }

  getModelRiskAssessments(modelVersionId: string, systemId?: string): Observable<any> {
    return this.ops.getModelRiskAssessments(modelVersionId, systemId);
  }

  getModelsRequiringAssessment(): Observable<any> {
    return this.ops.getModelsRequiringAssessment();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 9: Enhanced AI DPIA — delegates to AiGovernanceOpsApiService
  // ════════════════════════════════════════════════════════════════════════════

  createOrUpdateDPIA(systemId: string, data: any): Observable<any> {
    return this.ops.createOrUpdateDPIA(systemId, data);
  }

  getDPIAAssessments(systemId?: string, status?: string): Observable<any> {
    return this.ops.getDPIAAssessments(systemId, status);
  }

  getDPIA(dpiaId: string): Observable<any> {
    return this.ops.getDPIA(dpiaId);
  }

  addDPIARiskFactor(dpiaId: string, data: any): Observable<any> {
    return this.ops.addDPIARiskFactor(dpiaId, data);
  }

  getDPIARiskFactors(dpiaId: string): Observable<any> {
    return this.ops.getDPIARiskFactors(dpiaId);
  }

  submitDPIAForReview(dpiaId: string): Observable<any> {
    return this.ops.submitDPIAForReview(dpiaId);
  }

  reviewDPIA(dpiaId: string, decision: string, approvalNotes?: string): Observable<any> {
    return this.ops.reviewDPIA(dpiaId, decision, approvalNotes);
  }

  getDPIAsRequiringReview(): Observable<any> {
    return this.ops.getDPIAsRequiringReview();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 10: AI Agent Performance & Bias — delegates to AiGovernanceOpsApiService
  // ════════════════════════════════════════════════════════════════════════════

  recordAgentPerformanceMetric(agentId: string, data: any): Observable<any> {
    return this.ops.recordAgentPerformanceMetric(agentId, data);
  }

  getAgentPerformanceMetrics(agentId: string, startDate?: string, endDate?: string): Observable<any> {
    return this.ops.getAgentPerformanceMetrics(agentId, startDate, endDate);
  }

  detectAgentBias(agentId: string, data: any): Observable<any> {
    return this.ops.detectAgentBias(agentId, data);
  }

  getAgentBiasDetections(agentId: string): Observable<any> {
    return this.ops.getAgentBiasDetections(agentId);
  }

  updateBiasRemediation(detectionId: string, remediationStatus: string, remediationNotes?: string): Observable<any> {
    return this.ops.updateBiasRemediation(detectionId, remediationStatus, remediationNotes);
  }

  calculateAgentTrustScore(agentId: string, data: any): Observable<any> {
    return this.ops.calculateAgentTrustScore(agentId, data);
  }

  getAgentTrustScores(agentId: string): Observable<any> {
    return this.ops.getAgentTrustScores(agentId);
  }

  recordHumanOverride(agentId: string, decisionId: string, overrideReason: string, overrideAction: string): Observable<any> {
    return this.ops.recordHumanOverride(agentId, decisionId, overrideReason, overrideAction);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 11: AI Explainability & Transparency — delegates to AiGovernanceOpsApiService
  // ════════════════════════════════════════════════════════════════════════════

  createExplainabilityRecord(systemId: string, decisionId: string, data: any): Observable<any> {
    return this.ops.createExplainabilityRecord(systemId, decisionId, data);
  }

  getExplainabilityRecords(systemId?: string, decisionId?: string, startDate?: string, endDate?: string): Observable<any> {
    return this.ops.getExplainabilityRecords(systemId, decisionId, startDate, endDate);
  }

  reviewExplainabilityRecord(recordId: string, reviewStatus: string, reviewNotes?: string): Observable<any> {
    return this.ops.reviewExplainabilityRecord(recordId, reviewStatus, reviewNotes);
  }

  createCounterfactualAnalysis(recordId: string, scenarioDescription: string, alternativeInputs: Record<string, unknown>, predictedOutcome: string): Observable<any> {
    return this.ops.createCounterfactualAnalysis(recordId, scenarioDescription, alternativeInputs, predictedOutcome);
  }

  getExplainabilityRequirements(systemId?: string): Observable<any> {
    return this.ops.getExplainabilityRequirements(systemId);
  }

  getTransparencyMetrics(systemId?: string, startDate?: string, endDate?: string): Observable<any> {
    return this.ops.getTransparencyMetrics(systemId, startDate, endDate);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Group 12: AI Compliance Framework Mapping — delegates to AiGovernanceOpsApiService
  // ════════════════════════════════════════════════════════════════════════════

  mapSystemToFramework(systemId: string, frameworkCode: string, frameworkVersion: string, data: any): Observable<any> {
    return this.ops.mapSystemToFramework(systemId, frameworkCode, frameworkVersion, data);
  }

  getComplianceMappings(systemId: string, frameworkCode?: string): Observable<any> {
    return this.ops.getComplianceMappings(systemId, frameworkCode);
  }

  updateComplianceStatus(mappingId: string, complianceStatus: string, assessmentDate?: string, nextAssessmentDue?: string, complianceNotes?: string): Observable<any> {
    return this.ops.updateComplianceStatus(mappingId, complianceStatus, assessmentDate, nextAssessmentDue, complianceNotes);
  }

  classifyFrameworkRisk(mappingId: string, riskLevel: string, riskFactors: Record<string, unknown>, classificationNotes?: string): Observable<any> {
    return this.ops.classifyFrameworkRisk(mappingId, riskLevel, riskFactors, classificationNotes);
  }

  getComplianceDashboard(frameworkCode?: string): Observable<any> {
    return this.ops.getComplianceDashboard(frameworkCode);
  }

  getSystemsRequiringAssessment(frameworkCode?: string): Observable<any> {
    return this.ops.getSystemsRequiringAssessment(frameworkCode);
  }
}
