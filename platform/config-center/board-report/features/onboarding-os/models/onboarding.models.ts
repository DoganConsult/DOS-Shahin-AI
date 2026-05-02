export interface GrcRecord {
  [key: string]: unknown;
}

export type OnboardingSessionStatus =
  | 'not_started'
  | 'draft'
  | 'in_progress'
  | 'awaiting_review'
  | 'review_blocked'
  | 'review_ready'
  | 'approved_for_provisioning'
  | 'provisioning_started'
  | 'provisioning'
  | 'provisioning_partial'
  | 'provisioned'
  | 'handover_pending'
  | 'active'
  | 'failed'
  | 'cancelled'
  | 'archived';

export interface OnboardingSession {
  id: string;
  session_key: string;
  status: OnboardingSessionStatus;
  tenant_id?: string;
  workspace_id?: string;
  organization_name?: string;
  display_name?: string;
  language_code: 'en' | 'ar';
  progress_percent: number;
  readiness_score: number;
  blockers_count: number;
  current_stage_code?: string;
  stages: OnboardingStage[];
  metadata_json?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStage {
  id: string;
  session_id: string;
  stage_code: string;
  display_order: number;
  status: string;
  percent_complete: number;
}

export interface OnboardingQuestion {
  id: string;
  question_code: string;
  stage_code: string;
  section_code: string;
  question_type: 'text' | 'textarea' | 'select' | 'multi_select' | 'boolean' | 'number' | 'date' | 'email' | 'chips' | 'table' | 'json' | 'entity_picker';
  label_en: string;
  label_ar: string;
  help_text_en?: string;
  help_text_ar?: string;
  placeholder_en?: string;
  placeholder_ar?: string;
  tooltip_en?: string;
  tooltip_ar?: string;
  options_json: Array<{ value: string; label_en: string; label_ar: string }>;
  validation_json: Record<string, unknown>;
  visibility_rule_json: Record<string, unknown>;
  is_required: boolean;
  is_active?: boolean;
  sort_order: number;
  lookup_table?: string;
  lookup_depends_on?: string;
  ui_variant?: string;
}

export interface SaveAnswerDto {
  questionCode: string;
  answerText?: string | null;
  answerNumber?: number | null;
  answerBool?: boolean | null;
  answerDate?: string | null;
  answerJson?: unknown;
}

export interface SaveBulkAnswersPayload {
  stageCode: string;
  sectionCode?: string;
  answers: SaveAnswerDto[];
}

export interface OnboardingScore {
  scoreType: string;
  scoreDomain: string;
  scoreValue: number;
  maxScore: number;
  ratingLabel: string;
}

export interface OnboardingBlocker {
  id: string;
  blocker_code: string;
  severity: string;
  title_en: string;
  title_ar: string;
  resolution_action?: string;
  is_resolved: boolean;
  stage_code?: string;
  question_code?: string;
}

export interface OnboardingRecommendation {
  id: string;
  recommendation_type: string;
  recommendation_code: string;
  title_en: string;
  title_ar: string;
  priority: string;
  payload_json: Record<string, unknown>;
}

export interface ReviewModel {
  session: OnboardingSession;
  readiness: number;
  blockers: OnboardingBlocker[];
  recommendations: OnboardingRecommendation[];
  profile: NormalizedProfile;
  impactSummary: {
    frameworks: string[];
    frameworkCount?: number;
    authorities?: number;
    controlCount?: number;
    evidenceTaskCount?: number;
    riskCount?: number;
    policyCount?: number;
    workflowCount?: number;
    departments: number;
    entities: number;
    invites: number;
    modules: string[];
    moduleCount?: number;
  };
  regulatoryResolution?: {
    sectorCode: string;
    sectorNameEn: string;
    sectorNameAr: string;
    authorities: Array<{ code: string; name_en: string; name_ar: string; enforcement: string; priority: number; regulation_type: string; reason_en: string; reason_ar: string }>;
    frameworks: Array<{ code: string; name: string; version: string; mandatory_for_sectors: string[] }>;
    controlCount: number;
    evidenceTaskCount: number;
    modules: string[];
    risks: Array<{ risk_title_en: string; risk_title_ar: string; risk_category: string; sector_impact: string; sector_likelihood: string }>;
  } | null;
}

export interface NormalizedProfile {
  organization: {
    legalName: string;
    displayName: string;
    arabicName?: string;
    country: string;
    industry: string;
    tenantSlug: string;
    languageCode: string;
    timezone: string;
  };
  regulatory: {
    jurisdictions: string[];
    frameworksRecommended: string[];
    frameworksConfirmed: string[];
    regulatedSector: boolean;
  };
  structure: {
    departments: Array<{ code: string; name: string }>;
    entities: Array<{ name: string; type: string }>;
  };
  technology: {
    connectors: string[];
    hasSSO: boolean;
    hasSIEM: boolean;
    hasIAM: boolean;
  };
  maturity: {
    overallLevel: string;
    readinessScore: number;
  };
  people: {
    tenantAdminEmail: string;
    riskLeadEmail?: string;
    complianceLeadEmail?: string;
    auditorEmail?: string;
    executiveSponsor?: string;
    invites: string[];
  };
  workspace: {
    enabledModules: string[];
    dashboardProfile: string;
    startupMode: string;
  };
}

export interface ProvisioningJob {
  id: string;
  session_id: string;
  job_status: string;
  started_at?: string;
  completed_at?: string;
  summary_json: Record<string, unknown>;
}

export interface ProvisioningStep {
  id: string;
  job_id: string;
  step_code: string;
  step_name: string;
  sequence_no: number;
  status: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
}

export interface JourneyProfile {
  profile_code: string;
  label_en: string;
  label_ar: string;
  description_en: string;
  description_ar: string;
  icon_class: string;
  question_tiers_visible: string[];
  ai_assist_intensity: string;
  explanation_depth: string;
  preview_richness: string;
  max_visible_questions: number | null;
  inference_aggressiveness: string;
}

export interface SceneTemplate {
  scene_code: string;
  scene_order: number;
  stage_codes: string[];
  emotional_purpose_en: string;
  emotional_purpose_ar: string;
  pain_addressed_en: string | null;
  pain_addressed_ar: string | null;
  visible_input_description_en: string | null;
  visible_input_description_ar: string | null;
  inference_shown_en: string | null;
  inference_shown_ar: string | null;
  value_preview_en: string | null;
  value_preview_ar: string | null;
  agent_involvement: string[];
  events_emitted: string[];
  icon_class: string | null;
  affects_en?: string | null;
  affects_ar?: string | null;
}

export interface GovernanceContextSummary {
  tenantId: string;
  contextVersion: number;
  complexity: string;
  businessProfile: Record<string, unknown>;
  regulatoryProfile: Record<string, unknown>;
  frameworkProfile: Record<string, unknown>;
  moduleProfile: Record<string, unknown>;
  ownershipProfile: Record<string, unknown>;
  personaProfile: Record<string, unknown>;
  painProfile: Record<string, unknown>;
  automationProfile: Record<string, unknown>;
  agentProfile: Record<string, unknown>;
  computedAt: string;
}

export interface ModuleOperatingState {
  module_code: string;
  state: 'on' | 'off' | 'trial';
  activation_source: string;
  trial_expiry_at: string | null;
  is_mandatory: boolean;
  priority?: number;
  related_frameworks?: string[];
  activation_reason?: string;
}

export interface InferredFact {
  fact_code: string;
  fact_value: unknown;
  source_question_codes: string[];
  inference_method: string;
  confidence: number;
  is_confirmed: boolean;
}

export interface ConfidenceDimension {
  dimension: string;
  dimension_key: string;
  confidence_value: number;
  answered_weight: number;
  total_weight: number;
}

export interface WorkspacePreviewSection {
  section: string;
  label_en: string;
  label_ar: string;
  description_en: string;
  description_ar: string;
  display_type: string;
  data: unknown;
}

export interface RegulatorExplanation {
  regulator_code: string;
  framework_code: string | null;
  explanation_en: string;
  explanation_ar: string;
  applies_to_sectors: string[];
}

export interface DashboardPersonaProfile {
  persona_code: string;
  label_en: string;
  label_ar: string;
  description_en: string;
  description_ar: string;
  role_codes: string[];
  default_widgets: unknown;
  priority_modules: string[];
  kpi_codes: string[];
  next_best_action_categories: string[];
}

export interface RegionalTerm {
  term_code: string;
  category: string;
  term_en: string;
  term_ar: string;
  definition_en: string;
  definition_ar: string;
  usage_context: string;
}

export interface StaffingSuggestion {
  role_code: string;
  role_label_en: string;
  role_label_ar: string;
  headcount_min: number;
  headcount_max: number;
  rationale_en: string;
  rationale_ar: string;
  priority: 'high' | 'medium' | 'low';
}

export interface BusinessFunction {
  function_code: string;
  function_label_en: string;
  function_label_ar: string;
  is_enabled: boolean;
  suggested_by: string[];
}

export type TemporalWorkflowStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out'
  | 'terminated'
  | 'continued_as_new';

export interface TemporalStatus {
  workflow_id: string;
  run_id: string;
  status: TemporalWorkflowStatus;
  started_at: string;
  closed_at: string | null;
  task_queue: string;
  history_length: number;
}

export type AgentReadinessState = 'ready' | 'initializing' | 'pending_config' | 'degraded' | 'offline';

export interface AgentReadiness {
  agent_code: string;
  state: AgentReadinessState;
  readiness_score: number;
  missing_configs: string[];
  last_checked_at: string;
}

export interface ProvisioningEvent {
  event_id: string;
  job_id: string;
  event_type: string;
  step_code: string | null;
  status: 'info' | 'success' | 'warning' | 'error';
  message_en: string;
  message_ar: string;
  occurred_at: string;
  metadata: Record<string, unknown>;
}

export interface AnswerHistoryEntry {
  answer_id: string;
  session_id: string;
  question_code: string;
  answer_value: unknown;
  answered_by: string;
  answered_at: string;
  is_current: boolean;
  change_reason: string | null;
}

export interface SectorResolutionResult {
  modules?: string[];
  controlCount?: number;
  evidenceTaskCount?: number;
  workflowCount?: number;
  agentCount?: number;
  [key: string]: unknown;
}
