import { GrcRecord } from '@app/core/models/shared.types';
export interface QiyasModel {
  model_id: string;
  code: string;
  name_en: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  model_type: 'maturity' | 'compliance' | 'risk' | 'readiness' | 'custom';
  owner?: string;
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  tags?: GrcRecord[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface QiyasDomain {
  domain_id: string;
  model_id: string;
  code: string;
  name_en: string;
  name_ar?: string;
  description_en?: string;
  sort_order: number;
  weight: number;
}

export interface QiyasAssessment {
  qiyas_assessment_id: string;
  model_id: string;
  model_name?: string;
  model_code?: string;
  template_id?: string;
  title_en: string;
  title_ar?: string;
  description_en?: string;
  assessment_type: 'self_assessment' | 'external_audit' | 'peer_review' | 'gap_analysis' | 'certification_readiness' | 'benchmarking';
  status: 'draft' | 'in_progress' | 'under_review' | 'calibration' | 'finalized' | 'archived';
  target_date?: string;
  started_at?: string;
  completed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QiyasDashboardSummary {
  totalModels: number;
  totalAssessments: number;
  inProgress: number;
  finalized: number;
  recentAssessments: QiyasAssessment[];
}

// ── Recommendations ──

export interface QiyasRecommendation {
  recommendation_id: string;
  assessment_id: string;
  domain_id?: string;
  domain_name?: string;
  title_en: string;
  description_en?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed';
  effort_estimate?: string;
  impact_estimate?: string;
  assigned_to?: string;
  accepted_by?: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QiyasImprovementPath {
  domain_id: string;
  domain_name: string;
  current_score: number;
  target_score: number;
  gap: number;
  recommendations: QiyasRecommendation[];
}

// ── Calibration ──

export interface QiyasCalibrationSession {
  session_id: string;
  assessment_id: string;
  status: 'open' | 'in_progress' | 'finalized';
  facilitator?: string;
  notes?: string;
  created_at: string;
  finalized_at?: string;
}

export interface QiyasCalibrationEntry {
  entry_id: string;
  session_id: string;
  domain_id: string;
  original_score: number;
  calibrated_score: number;
  justification?: string;
  calibrated_by?: string;
  created_at: string;
}

// ── Evidence Scoring ──

export interface QiyasEvidenceScoringModel {
  scoring_model_id: string;
  name_en: string;
  description_en?: string;
  criteria: GrcRecord[];
  max_score: number;
  created_at: string;
}

export interface QiyasEvidenceScore {
  score_id: string;
  evidence_id: string;
  scoring_model_id: string;
  total_score: number;
  max_score: number;
  percentage: number;
  criteria_scores: GrcRecord[];
  scored_by?: string;
  scored_at: string;
}

export interface QiyasEvidenceQualityMetric {
  domain_id: string;
  domain_name: string;
  avg_score: number;
  min_score: number;
  max_score: number;
  evidence_count: number;
  quality_rating: 'excellent' | 'good' | 'fair' | 'poor';
}

// ── Maturity Analytics ──

export interface QiyasMaturitySnapshot {
  snapshot_id: string;
  assessment_id: string;
  overall_score: number;
  maturity_level: string;
  domain_scores: Record<string, number>;
  taken_at: string;
}

export interface QiyasProgressionEntry {
  snapshot_id: string;
  assessment_id: string;
  domain_id?: string;
  overall_score: number;
  maturity_level: string;
  taken_at: string;
}

export interface QiyasHeatmapCell {
  domain_id: string;
  domain_name: string;
  indicator_id?: string;
  indicator_name?: string;
  score: number;
  maturity_level: string;
  color: string;
}

export interface QiyasTargetProfile {
  profile_id: string;
  domain_id: string;
  domain_name?: string;
  target_score: number;
  target_level: string;
  deadline?: string;
  created_at: string;
}

// ── Benchmarks ──

export interface QiyasBenchmarkDataset {
  dataset_id: string;
  name_en: string;
  description_en?: string;
  sector?: string;
  region?: string;
  sample_size: number;
  data: unknown;
  created_at: string;
}

export interface QiyasBenchmarkComparison {
  domain_id: string;
  domain_name: string;
  org_score: number;
  benchmark_avg: number;
  benchmark_p25: number;
  benchmark_p50: number;
  benchmark_p75: number;
  percentile_rank: number;
  delta: number;
}

// ── Certification Readiness ──

export interface QiyasCertificationGap {
  gap_id: string;
  assessment_id: string;
  domain_id: string;
  domain_name?: string;
  requirement: string;
  current_state: string;
  required_state: string;
  status: 'open' | 'in_progress' | 'closed' | 'accepted';
  evidence?: string;
  updated_at: string;
}

export interface QiyasCertificationReadiness {
  assessment_id: string;
  overall_readiness: number;
  total_gaps: number;
  closed_gaps: number;
  open_gaps: number;
  domain_readiness: { domain_id: string; domain_name: string; readiness: number; gaps: number }[];
  ready: boolean;
}

// ── Respondents ──

export interface QiyasRespondent {
  respondent_id: string;
  assessment_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  role: string;
  domain_ids?: string[];
  status: 'assigned' | 'in_progress' | 'completed';
  assigned_at: string;
  completed_at?: string;
}

export interface QiyasRespondentProgress {
  total: number;
  completed: number;
  in_progress: number;
  not_started: number;
  completion_rate: number;
  respondents: QiyasRespondent[];
}

// ── Scoping ──

export interface QiyasScope {
  scope_id: string;
  assessment_id: string;
  scope_type: 'department' | 'process' | 'system' | 'location' | 'custom';
  scope_value: string;
  description?: string;
  created_at: string;
}

// ── Question Bank ──

export interface QiyasQuestion {
  question_id: string;
  domain_id: string;
  group_id?: string;
  question_text_en: string;
  question_text_ar?: string;
  question_type: 'scale' | 'yes_no' | 'text' | 'multi_choice';
  options?: GrcRecord[];
  weight: number;
  sort_order: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface QiyasQuestionGroup {
  group_id: string;
  model_id: string;
  name_en: string;
  name_ar?: string;
  sort_order: number;
}

// ── Model Versioning ──

export interface QiyasModelVersion {
  version_id: string;
  model_id: string;
  version_number: string;
  change_summary?: string;
  status: 'draft' | 'published' | 'deprecated';
  published_at?: string;
  created_at: string;
}

// ── Cross-module ──

export interface QiyasGrcTrigger {
  trigger_log_id: string;
  trigger_type: string;
  source_entity_id: string;
  source_entity_type: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
  processed_at?: string;
}

export interface QiyasAutoTask {
  task_id: string;
  task_type: string;
  source_trigger_id?: string;
  entity_id: string;
  entity_type: string;
  priority: string;
  status: string;
  created_at: string;
}
