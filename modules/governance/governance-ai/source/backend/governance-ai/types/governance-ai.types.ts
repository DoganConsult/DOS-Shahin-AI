export type SignalStatus = 'new' | 'interpreted' | 'recommended' | 'actioned' | 'resolved' | 'archived';
export type RecommendationStatus = 'drafted' | 'pending_review' | 'accepted' | 'action_created' | 'rejected';
export type BoardAttentionStatus = 'open' | 'under_review' | 'included_in_board_pack' | 'closed';
export type ExecAttentionStatus = 'open' | 'under_review' | 'addressed' | 'closed';
export type AiRunStatus = 'started' | 'completed' | 'failed';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Urgency = 'immediate' | 'high' | 'medium' | 'low';

export type SignalType =
  | 'failed_control' | 'repeated_control_failure' | 'overdue_control_test' | 'control_no_owner' | 'control_no_evidence'
  | 'incident_over_sla' | 'incident_no_root_cause' | 'incident_repeated' | 'incident_no_owner_update'
  | 'overdue_policy_review' | 'policy_no_owner' | 'policy_no_obligation' | 'low_policy_ack'
  | 'critical_vulnerability_ungoverned' | 'security_exception_no_compensating'
  | 'kri_breach' | 'kpi_deterioration' | 'governance_score_decline'
  | 'repeated_audit_finding' | 'finding_no_capa' | 'finding_late_closure'
  | 'unresolved_ethics_case' | 'ethics_no_investigator' | 'repeated_misconduct'
  | 'stale_evidence' | 'missing_closure_evidence' | 'closure_no_doc_trace'
  | 'overlapping_ownership' | 'orphan_governance_object'
  | 'owner_overload' | 'committee_overload' | 'action_backlog_concentration'
  | 'expired_exception' | 'missed_quorum' | 'delayed_decision';

export type GovernanceDomain =
  | 'control_oversight' | 'incident_management' | 'policy_governance'
  | 'security_governance' | 'measurement' | 'audit_governance'
  | 'ethics_culture' | 'evidence_documentation' | 'harmonization'
  | 'resource_capacity' | 'exception_management' | 'committee_effectiveness'
  | 'decision_execution';

export interface GovernanceSignal {
  id: string;
  tenant_id: string;
  signal_type: SignalType;
  source_module: string;
  source_entity_type: string;
  source_entity_id: string;
  severity: Severity;
  confidence_score: number;
  detected_at: string;
  status: SignalStatus;
  board_attention_flag: boolean;
  recommended_action_type: string;
  recommended_escalation_level: number;
  payload_json: Record<string, unknown>;
  created_by_ai_run_id?: string;
}

export interface InterpretedIssue {
  id: string;
  tenant_id: string;
  signal_id: string;
  governance_domain: GovernanceDomain;
  issue_type: string;
  issue_summary: string;
  urgency: Urgency;
  risk_level: Severity;
  qiyas_impact_level?: string;
  affected_committee_id?: string;
  affected_policy_id?: string;
  affected_control_id?: string;
  requires_authority_review: boolean;
  requires_human_approval: boolean;
  interpretation_json: Record<string, unknown>;
}

export interface Recommendation {
  id: string;
  interpreted_issue_id: string;
  recommendation_type: string;
  recommendation_text: string;
  suggested_owner_user_id?: string;
  suggested_due_date?: string;
  suggested_committee_id?: string;
  suggested_action_type?: string;
  accepted_status: RecommendationStatus;
}

export interface ScoreExplanation {
  id: string;
  score_run_id: string;
  overall_score: number;
  previous_score: number;
  delta_score: number;
  top_negative_drivers_json: unknown[];
  top_positive_drivers_json: unknown[];
  recommendation_summary: string;
  explanation_text: string;
}

export interface SignalDetectorResult {
  signal_type: SignalType;
  source_module: string;
  source_entity_type: string;
  source_entity_id: string;
  severity: Severity;
  confidence_score: number;
  board_attention_flag: boolean;
  recommended_action_type: string;
  recommended_escalation_level: number;
  payload_json: Record<string, unknown>;
}

export const SIGNAL_DOMAIN_MAP: Record<string, GovernanceDomain> = {
  failed_control: 'control_oversight',
  repeated_control_failure: 'control_oversight',
  overdue_control_test: 'control_oversight',
  control_no_owner: 'control_oversight',
  control_no_evidence: 'evidence_documentation',
  incident_over_sla: 'incident_management',
  incident_no_root_cause: 'incident_management',
  incident_repeated: 'incident_management',
  incident_no_owner_update: 'incident_management',
  overdue_policy_review: 'policy_governance',
  policy_no_owner: 'policy_governance',
  policy_no_obligation: 'harmonization',
  low_policy_ack: 'policy_governance',
  critical_vulnerability_ungoverned: 'security_governance',
  security_exception_no_compensating: 'security_governance',
  kri_breach: 'measurement',
  kpi_deterioration: 'measurement',
  governance_score_decline: 'measurement',
  repeated_audit_finding: 'audit_governance',
  finding_no_capa: 'audit_governance',
  finding_late_closure: 'audit_governance',
  unresolved_ethics_case: 'ethics_culture',
  ethics_no_investigator: 'ethics_culture',
  repeated_misconduct: 'ethics_culture',
  stale_evidence: 'evidence_documentation',
  missing_closure_evidence: 'evidence_documentation',
  closure_no_doc_trace: 'evidence_documentation',
  overlapping_ownership: 'harmonization',
  orphan_governance_object: 'harmonization',
  owner_overload: 'resource_capacity',
  committee_overload: 'resource_capacity',
  action_backlog_concentration: 'resource_capacity',
  expired_exception: 'exception_management',
  missed_quorum: 'committee_effectiveness',
  delayed_decision: 'decision_execution',
};

export const RESPONSE_PATTERNS: Record<GovernanceDomain, { action_type: string; requires_authority: boolean; requires_human: boolean }> = {
  control_oversight: { action_type: 'governance_action', requires_authority: false, requires_human: false },
  incident_management: { action_type: 'governance_action', requires_authority: false, requires_human: true },
  policy_governance: { action_type: 'policy_review', requires_authority: false, requires_human: true },
  security_governance: { action_type: 'governance_action', requires_authority: true, requires_human: true },
  measurement: { action_type: 'governance_action', requires_authority: false, requires_human: false },
  audit_governance: { action_type: 'capa_followup', requires_authority: false, requires_human: true },
  ethics_culture: { action_type: 'governance_action', requires_authority: true, requires_human: true },
  evidence_documentation: { action_type: 'evidence_refresh', requires_authority: false, requires_human: false },
  harmonization: { action_type: 'governance_action', requires_authority: false, requires_human: false },
  resource_capacity: { action_type: 'reassignment', requires_authority: false, requires_human: true },
  exception_management: { action_type: 'exception_review', requires_authority: true, requires_human: true },
  committee_effectiveness: { action_type: 'committee_escalation', requires_authority: false, requires_human: true },
  decision_execution: { action_type: 'governance_action', requires_authority: false, requires_human: true },
};
