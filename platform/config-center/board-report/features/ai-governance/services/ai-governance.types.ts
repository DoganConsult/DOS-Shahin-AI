/**
 * AI Governance DTOs — AGRC-OS
 * Typed interfaces for all AI Governance API service responses and requests.
 * Covers: Registry (Assets, Models, Prompts, Agents), Bindings, Ops, Waves, DPIA,
 *         Model Risk, Agent Performance, Explainability, and Compliance Framework.
 */

// ─── Shared / Common ─────────────────────────────────────────────────────────

/** Generic list response wrapper used across registries. */
export interface RegistryListResponse<T = Record<string, unknown>> {
  items: T[];
  total?: number;
}

/** Generic single-item mutation response (create/update/transition/delete). */
export interface MutationResponse {
  id?: string;
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

/** Generic delete response. */
export interface DeleteResponse {
  success?: boolean;
  message?: string;
  deleted?: boolean;
  [key: string]: unknown;
}

/** Generic status-change response for version lifecycle actions. */
export interface VersionActionResponse {
  id?: string;
  version_id?: string;
  status?: string;
  approval_status?: string;
  deployment_status?: string;
  message?: string;
  [key: string]: unknown;
}

// ─── Asset Inventory (Group 1) ───────────────────────────────────────────────

export interface AssetDetailDto {
  id: string;
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
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface CreateAssetRequest {
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
}

export interface UpdateAssetRequest {
  display_name?: string;
  description?: string;
  status?: string;
  business_owner?: string;
  technical_owner?: string;
  governance_owner?: string;
  source_ref?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface AssetDiscoveryResponse {
  discovered?: number;
  created?: number;
  updated?: number;
  message?: string;
  [key: string]: unknown;
}

// ─── Model Registry (Group 2) ────────────────────────────────────────────────

export interface ModelVersionDto {
  id?: string;
  version_id?: string;
  asset_id?: string;
  version_number?: number;
  provider?: string;
  provider_model_id?: string;
  config?: Record<string, unknown>;
  change_summary?: string;
  notes?: string;
  approval_status?: string;
  deployment_status?: string;
  is_active?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface ModelVersionListResponse {
  items: ModelVersionDto[];
  total?: number;
}

export interface CreateModelDraftRequest {
  asset_id: string;
  provider: string;
  provider_model_id: string;
  config?: Record<string, unknown>;
  change_summary?: string;
  notes?: string;
}

export interface UpdateModelDraftRequest {
  provider?: string;
  provider_model_id?: string;
  config?: Record<string, unknown>;
  change_summary?: string;
  notes?: string;
}

export interface ResolvedModelDto {
  asset_id?: string;
  version_id?: string;
  provider?: string;
  provider_model_id?: string;
  config?: Record<string, unknown>;
  resolution_source?: string;
  [key: string]: unknown;
}

export interface GovernanceMismatchDto {
  mismatches: Array<{
    asset_id?: string;
    asset_name?: string;
    expected_version?: string;
    actual_version?: string;
    mismatch_type?: string;
    details?: string;
    [key: string]: unknown;
  }>;
  total?: number;
  [key: string]: unknown;
}

// ─── Prompt Registry (Group 3) ───────────────────────────────────────────────

export interface PromptVersionDto {
  id?: string;
  version_id?: string;
  asset_id?: string;
  version_number?: number;
  template_text?: string;
  variables?: Record<string, unknown>;
  linked_model_asset_id?: string;
  change_summary?: string;
  notes?: string;
  approval_status?: string;
  deployment_status?: string;
  is_active?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface PromptVersionListResponse {
  items: PromptVersionDto[];
  total?: number;
}

export interface CreatePromptDraftRequest {
  asset_id: string;
  template_text: string;
  variables?: Record<string, unknown>;
  linked_model_asset_id?: string;
  change_summary?: string;
  notes?: string;
}

export interface UpdatePromptDraftRequest {
  template_text?: string;
  variables?: Record<string, unknown>;
  linked_model_asset_id?: string;
  change_summary?: string;
  notes?: string;
}

// ─── Agent Registry (Group 4) ────────────────────────────────────────────────

export interface AgentVersionDto {
  id?: string;
  version_id?: string;
  asset_id?: string;
  version_number?: number;
  agent_config?: Record<string, unknown>;
  capabilities?: string[];
  linked_prompt_asset_id?: string;
  linked_model_asset_id?: string;
  change_summary?: string;
  notes?: string;
  approval_status?: string;
  deployment_status?: string;
  is_active?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface AgentVersionListResponse {
  items: AgentVersionDto[];
  total?: number;
}

export interface CreateAgentDraftRequest {
  asset_id: string;
  agent_config: Record<string, unknown>;
  capabilities?: string[];
  linked_prompt_asset_id?: string;
  linked_model_asset_id?: string;
  change_summary?: string;
  notes?: string;
}

export interface UpdateAgentDraftRequest {
  agent_config?: Record<string, unknown>;
  capabilities?: string[];
  linked_prompt_asset_id?: string;
  linked_model_asset_id?: string;
  change_summary?: string;
  notes?: string;
}

// ─── Binding Governance (Group 5) ────────────────────────────────────────────

export interface AgentToolBindingDto {
  id: string;
  agent_asset_id: string;
  tool_asset_id: string;
  is_enabled: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface AgentToolBindingListResponse {
  items: AgentToolBindingDto[];
  total?: number;
}

export interface AllowlistEntryDto {
  id: string;
  asset_id: string;
  asset_type: string;
  is_enabled: boolean;
  notes?: string;
  max_tokens_limit?: number;
  temperature_limit?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface AllowlistListResponse {
  items: AllowlistEntryDto[];
  total?: number;
}

export interface AllowlistCheckResponse {
  allowed: boolean;
  entry?: AllowlistEntryDto;
  [key: string]: unknown;
}

export interface UpdateAllowlistRequest {
  is_enabled?: boolean;
  notes?: string;
  max_tokens_limit?: number;
  temperature_limit?: number;
}

export interface EnabledToolsResponse {
  tools: string[];
  agent_asset_id?: string;
  [key: string]: unknown;
}

export interface BackfillResponse {
  created?: number;
  skipped?: number;
  message?: string;
  [key: string]: unknown;
}

// ─── Enforcement Mode Config (Group 6) ───────────────────────────────────────

export interface EnforcementModeResponse {
  mode: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface SoDPolicyResponse {
  policy: string;
  updated_at?: string;
  [key: string]: unknown;
}

// ─── Governance Operations (Group 7) ─────────────────────────────────────────

export interface GovernanceSummaryDto {
  totalEvents?: number;
  breakGlassCount?: number;
  promotionCount?: number;
  alertCount?: number;
  [key: string]: unknown;
}

export interface GovernanceEventDto {
  id: string;
  event_type: string;
  description?: string;
  asset_id?: string;
  registry_type?: string;
  created_at?: string;
  created_by?: string;
  [key: string]: unknown;
}

export interface GovernanceEventListResponse {
  items: GovernanceEventDto[];
  total?: number;
}

export interface BreakGlassDto {
  id: string;
  asset_id: string;
  version_id?: string;
  registry_type: string;
  reason: string;
  status?: string;
  duration_minutes?: number;
  created_at?: string;
  expires_at?: string;
  [key: string]: unknown;
}

export interface BreakGlassListResponse {
  items: BreakGlassDto[];
  total?: number;
}

export interface PromotionDto {
  id: string;
  asset_id: string;
  version_id: string;
  registry_type: string;
  from_environment: string;
  to_environment: string;
  notes?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface PromotionListResponse {
  items: PromotionDto[];
  total?: number;
}

// ─── Wave 1: Observability & Safety ──────────────────────────────────────────

export interface AlertRuleDto {
  id: string;
  rule_name: string;
  description?: string;
  trigger_condition?: Record<string, unknown>;
  channels?: Record<string, unknown>;
  escalation_chain?: Record<string, unknown>;
  enabled: boolean;
  created_at?: string;
  [key: string]: unknown;
}

export interface AlertRuleListResponse {
  items: AlertRuleDto[];
  total?: number;
}

export interface CreateAlertRuleRequest {
  rule_name: string;
  description?: string;
  trigger_condition?: Record<string, unknown>;
  channels?: Record<string, unknown>;
  escalation_chain?: Record<string, unknown>;
  enabled?: boolean;
}

export interface UpdateAlertRuleRequest {
  rule_name?: string;
  description?: string;
  trigger_condition?: Record<string, unknown>;
  channels?: Record<string, unknown>;
  escalation_chain?: Record<string, unknown>;
  enabled?: boolean;
}

export interface AlertHistoryDto {
  id: string;
  rule_id: string;
  triggered_at?: string;
  acknowledged?: boolean;
  acknowledged_at?: string;
  [key: string]: unknown;
}

export interface AlertHistoryListResponse {
  items: AlertHistoryDto[];
  total?: number;
}

export interface KillSwitchDto {
  id: string;
  asset_id?: string;
  asset_name: string;
  asset_type: string;
  kill_switch_type?: string;
  trigger_method?: string;
  fallback_procedure?: string;
  status?: string;
  last_tested_at?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface KillSwitchListResponse {
  items: KillSwitchDto[];
  total?: number;
}

export interface AgentRuntimeStatsDto {
  agent_asset_id: string;
  total_runs?: number;
  avg_latency_ms?: number;
  error_rate?: number;
  tokens_used?: number;
  window?: string;
  [key: string]: unknown;
}

export interface ModelMetricDto {
  id?: string;
  version_id: string;
  asset_id?: string;
  metric_type: string;
  value: number;
  metadata?: Record<string, unknown>;
  recorded_at?: string;
  [key: string]: unknown;
}

export interface ModelMetricListResponse {
  items: ModelMetricDto[];
  total?: number;
}

export interface RecordModelMetricRequest {
  version_id: string;
  asset_id?: string;
  metric_type: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface DriftThresholdDto {
  id?: string;
  asset_id: string;
  metric_type: string;
  warning_delta?: number;
  critical_delta?: number;
  baseline_value?: number;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface DriftThresholdListResponse {
  items: DriftThresholdDto[];
  total?: number;
}

export interface MaturityScorecardDto {
  overall_score?: number;
  dimensions?: Array<{ name: string; score: number; level?: string }>;
  recommendations?: string[];
  [key: string]: unknown;
}

export interface BoardSummaryDto {
  summary?: string;
  key_metrics?: Record<string, unknown>;
  attention_items?: Array<{ title: string; severity: string; description?: string }>;
  [key: string]: unknown;
}

// ─── Wave 2: Compliance & Ethics ─────────────────────────────────────────────

export interface FairnessMetricDto {
  id?: string;
  model_asset_id?: string;
  metric_name?: string;
  value?: number;
  threshold?: number;
  status?: string;
  [key: string]: unknown;
}

export interface FairnessMetricListResponse {
  items: FairnessMetricDto[];
  total?: number;
}

export interface FairnessScanDto {
  id: string;
  model_asset_id: string;
  model_name?: string;
  status?: string;
  results?: Record<string, unknown>;
  created_at?: string;
  [key: string]: unknown;
}

export interface FairnessScanListResponse {
  items: FairnessScanDto[];
  total?: number;
}

export interface EuAiActQuestionDto {
  id: string;
  question: string;
  category?: string;
  description?: string;
  [key: string]: unknown;
}

export interface EuAiActQuestionsResponse {
  questions: EuAiActQuestionDto[];
}

export interface EuClassificationDto {
  id: string;
  model_id: string;
  model_name?: string;
  risk_category?: string;
  classification_date?: string;
  answers?: Record<string, boolean>;
  [key: string]: unknown;
}

export interface EuClassificationListResponse {
  items: EuClassificationDto[];
  total?: number;
}

export interface RedTeamScheduleDto {
  id: string;
  name: string;
  model_id?: string;
  prompt_template?: string;
  frequency?: string;
  enabled?: boolean;
  last_run_at?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface RedTeamScheduleListResponse {
  items: RedTeamScheduleDto[];
  total?: number;
}

export interface UpdateRedTeamScheduleRequest {
  name?: string;
  model_id?: string;
  prompt_template?: string;
  frequency?: string;
  enabled?: boolean;
}

export interface EthicsReviewDto {
  id: string;
  system_name: string;
  system_type?: string;
  description?: string;
  risk_category?: string;
  status?: string;
  assessment_data?: Record<string, unknown>;
  decision?: string;
  conditions?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface EthicsReviewListResponse {
  items: EthicsReviewDto[];
  total?: number;
}

export interface ImpactAssessmentDto {
  id: string;
  system_name: string;
  model_asset_id?: string;
  status?: string;
  steps_data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface ImpactAssessmentListResponse {
  items: ImpactAssessmentDto[];
  total?: number;
}

export interface UpdateImpactAssessmentRequest {
  system_name?: string;
  model_asset_id?: string;
  steps_data?: Record<string, unknown>;
  status?: string;
}

export interface RegulatoryChangeDto {
  id: string;
  source: string;
  title: string;
  description?: string;
  framework_code?: string;
  severity?: string;
  status?: string;
  affected_controls?: string[];
  recommended_action?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface RegulatoryChangeListResponse {
  items: RegulatoryChangeDto[];
  total?: number;
}

export interface CreateRegulatoryChangeRequest {
  source: string;
  title: string;
  description?: string;
  framework_code?: string;
  severity?: string;
  affected_controls?: string[];
  recommended_action?: string;
}

// ─── Group 8: Model Risk Management ─────────────────────────────────────────

export interface ModelRiskScoreRequest {
  systemId?: string;
  [key: string]: unknown;
}

export interface ModelRiskScoreDto {
  id?: string;
  model_version_id?: string;
  system_id?: string;
  risk_score?: number;
  risk_level?: string;
  factors?: Record<string, unknown>;
  created_at?: string;
  [key: string]: unknown;
}

export interface ModelRiskScoreListResponse {
  items: ModelRiskScoreDto[];
  total?: number;
}

export interface ModelLifecycleTransitionRequest {
  systemId?: string;
  newState: string;
  transitionReason?: string;
  requiresApproval?: boolean;
}

export interface ModelRiskAssessmentRequest {
  systemId?: string;
  [key: string]: unknown;
}

export interface ModelRiskAssessmentDto {
  id?: string;
  model_version_id?: string;
  system_id?: string;
  assessment_type?: string;
  risk_level?: string;
  findings?: Record<string, unknown>;
  created_at?: string;
  [key: string]: unknown;
}

export interface ModelRiskAssessmentListResponse {
  items: ModelRiskAssessmentDto[];
  total?: number;
}

export interface ModelsRequiringAssessmentResponse {
  models: Array<{
    version_id: string;
    asset_id?: string;
    display_name?: string;
    reason?: string;
    [key: string]: unknown;
  }>;
  total?: number;
}

// ─── Group 9: Enhanced AI DPIA ──────────────────────────────────────────────

export interface DPIARequest {
  system_name?: string;
  description?: string;
  data_categories?: string[];
  processing_purposes?: string[];
  risk_assessment?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DPIADto {
  id: string;
  system_id?: string;
  system_name?: string;
  status?: string;
  risk_level?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface DPIAListResponse {
  items: DPIADto[];
  total?: number;
}

export interface DPIARiskFactorDto {
  id: string;
  dpia_id: string;
  factor_name?: string;
  likelihood?: number;
  impact?: number;
  risk_score?: number;
  mitigation?: string;
  [key: string]: unknown;
}

export interface DPIARiskFactorRequest {
  factor_name: string;
  likelihood?: number;
  impact?: number;
  mitigation?: string;
  [key: string]: unknown;
}

export interface DPIARiskFactorListResponse {
  items: DPIARiskFactorDto[];
  total?: number;
}

// ─── Group 10: Agent Performance & Bias ─────────────────────────────────────

export interface AgentPerformanceMetricRequest {
  metric_name: string;
  value: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AgentPerformanceMetricDto {
  id?: string;
  agent_id?: string;
  metric_name?: string;
  value?: number;
  recorded_at?: string;
  [key: string]: unknown;
}

export interface AgentPerformanceMetricListResponse {
  items: AgentPerformanceMetricDto[];
  total?: number;
}

export interface BiasDetectionRequest {
  detection_type?: string;
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BiasDetectionDto {
  id: string;
  agent_id?: string;
  detection_type?: string;
  bias_score?: number;
  details?: Record<string, unknown>;
  remediation_status?: string;
  remediation_notes?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface BiasDetectionListResponse {
  items: BiasDetectionDto[];
  total?: number;
}

export interface TrustScoreRequest {
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TrustScoreDto {
  id?: string;
  agent_id?: string;
  trust_score?: number;
  dimensions?: Record<string, number>;
  created_at?: string;
  [key: string]: unknown;
}

export interface TrustScoreListResponse {
  items: TrustScoreDto[];
  total?: number;
}

// ─── Group 11: Explainability & Transparency ────────────────────────────────

export interface ExplainabilityRecordRequest {
  explanation_type?: string;
  explanation_text?: string;
  feature_importances?: Record<string, number>;
  [key: string]: unknown;
}

export interface ExplainabilityRecordDto {
  id: string;
  system_id?: string;
  decision_id?: string;
  explanation_type?: string;
  explanation_text?: string;
  review_status?: string;
  review_notes?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface ExplainabilityRecordListResponse {
  items: ExplainabilityRecordDto[];
  total?: number;
}

export interface CounterfactualAnalysisDto {
  id?: string;
  record_id?: string;
  scenario_description?: string;
  alternative_inputs?: Record<string, unknown>;
  predicted_outcome?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface ExplainabilityRequirementDto {
  system_id?: string;
  requirement_level?: string;
  required_methods?: string[];
  [key: string]: unknown;
}

export interface ExplainabilityRequirementListResponse {
  items: ExplainabilityRequirementDto[];
  total?: number;
}

export interface TransparencyMetricsDto {
  total_explanations?: number;
  reviewed_count?: number;
  review_rate?: number;
  avg_quality_score?: number;
  by_system?: Record<string, unknown>;
  [key: string]: unknown;
}

// ─── Group 12: Compliance Framework Mapping ─────────────────────────────────

export interface ComplianceFrameworkMappingRequest {
  controls?: string[];
  requirements?: Record<string, unknown>;
  notes?: string;
  [key: string]: unknown;
}

export interface ComplianceFrameworkMappingDto {
  id: string;
  system_id?: string;
  framework_code?: string;
  framework_version?: string;
  compliance_status?: string;
  risk_level?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface ComplianceFrameworkMappingListResponse {
  items: ComplianceFrameworkMappingDto[];
  total?: number;
}

export interface RiskClassificationRequest {
  riskLevel: string;
  riskFactors: Record<string, unknown>;
  classificationNotes?: string;
}

export interface AiComplianceDashboardDto {
  total_systems?: number;
  compliant_count?: number;
  non_compliant_count?: number;
  pending_count?: number;
  by_framework?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SystemsRequiringAssessmentResponse {
  systems: Array<{
    system_id: string;
    system_name?: string;
    framework_code?: string;
    reason?: string;
    [key: string]: unknown;
  }>;
  total?: number;
}
