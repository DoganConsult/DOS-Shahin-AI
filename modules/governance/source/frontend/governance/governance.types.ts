/** Governance module shared interfaces — minimal typing for demo-safety */

export interface GovKpiPayload {
  policies: number;
  committees: number;
  openActions: number;
  overdueReviews: number;
  healthScore: number | string;
}

export interface GovActionItem {
  itemId?: string;
  item_id?: string;
  id?: string;
  title: string;
  title_en?: string;
  description?: string;
  status: string;
  priority?: string;
  deadline?: string;
  due_date?: string;
  assignedTo?: string;
  assigned_to?: string;
  sourceType?: string;
  source_type?: string;
  sourceId?: string;
  source_id?: string;
  escalation_state?: string;
  escalationRule?: string;
  escalation_rule?: string;
  board_attention?: boolean;
  closure_note?: string;
  closure_evidence?: string;
  completed_at?: string;
  updated_at?: string;
}

export interface GovCommitteeRow {
  committee_id: string;
  id?: string;
  name: string;
  name_en: string;
  name_ar?: string;
  type?: string;
  status: string;
  chair_id?: string;
  chair?: string;
  chairperson?: string;
  purpose?: string;
  meeting_schedule?: string;
  meeting_frequency?: string;
  quorum_count?: number;
  quorum_percentage?: number;
  quorum_rule?: string;
  charter_text?: string;
  next_meeting_date?: string;
  member_count?: number;
  members?: unknown[];
  created_at?: string;
}

export interface GovCommitteeMember {
  member_id: string;
  user_id: string;
  role: string;
  role_in_committee?: string;
  is_chair?: boolean;
  status: string;
}

export interface GovDecisionRow {
  decision_id: string;
  title: string;
  title_en?: string;
  title_ar?: string;
  description?: string;
  decision_text?: string;
  status: string;
  decision_type?: string;
  outcome?: string;
  committee_id?: string;
  committee_name?: string;
  meeting_id?: string;
  meeting_title?: string;
  effective_date?: string;
  review_date?: string;
  implementation_status?: string;
  implementation_owner?: string;
  implementation_due_date?: string;
  implementation_pct?: number;
  voted_at?: string;
  created_at?: string;
}

export interface GovDelegationRow {
  delegation_id: string;
  title_en: string;
  title_ar?: string;
  delegator_id?: string;
  delegator_user_id?: string;
  delegate_id?: string;
  delegate_user_id?: string;
  authority_type?: string;
  scope?: string;
  scope_description?: string;
  max_amount?: number;
  status: string;
  effective_date?: string;
  expiry_date?: string;
}

export interface GovStructureEntity {
  entity_id: string;
  entity_type: string;
  name_en: string;
  name_ar?: string;
  parent_id?: string;
  status: string;
  description?: string;
  owner?: string;
  sponsor?: string;
  head?: string;
  charter_id?: string;
  charter_text?: string;
}

export interface GovPolicyReviewRow {
  review_id: string;
  policy_id: string;
  policy_title?: string;
  reviewer_id?: string;
  review_type: string;
  outcome: string;
  comments?: string;
  next_review_date?: string;
  created_at?: string;
}

export interface GovRaciTemplateRow {
  template_id: string;
  name_en: string;
  name_ar?: string;
  process_area?: string;
  status: string;
}

export interface GovRaciMatrixRow {
  activity: string;
  assignments: Record<string, string>;
}

export interface GovAccountabilityGap {
  entity_type: string;
  title: string;
  missing_role: string;
  route: string;
}

export interface GovSodConflict {
  user: string;
  role1: string;
  role2: string;
  scope: string;
  severity: string;
}

export interface GovObligationRow {
  obligation_id: string;
  title_en: string;
  title_ar?: string;
  description?: string;
  obligation_type: string;
  status: string;
  owner_id?: string;
}

export interface GovObjectiveRow {
  objective_id: string;
  title_en: string;
  title_ar?: string;
  description?: string;
  category?: string;
  status: string;
  target_date?: string;
  progress_percent?: number;
}

export interface GovResponsibilityRow {
  responsibility_id: string;
  title_en: string;
  title_ar?: string;
  description?: string;
  category?: string;
  criticality: string;
}

export interface GovReviewRow {
  review_id: string;
  policy_id: string;
  reviewer_id?: string;
  review_type: string;
  outcome: string;
  comments?: string;
  next_review_date?: string;
}

export interface GovAcknowledgementRow {
  acknowledgement_id?: string;
  policy_id: string;
  user_id: string;
  version_acknowledged?: string;
  acknowledged_at?: string;
}

export interface GovCampaignRow {
  campaign_id: string;
  policy_id: string;
  title: string;
  due_date?: string;
  status?: string;
}

export interface GovBoardPackRow {
  pack_id: string;
  title_en: string;
  title_ar?: string;
  meeting_date?: string;
  status: string;
}

export interface GovCharterRow {
  charter_id: string;
  title_en: string;
  title_ar?: string;
  committee_id?: string;
  purpose?: string;
  scope?: string;
  meeting_frequency?: string;
  quorum_requirements?: string;
  version?: number;
  status: string;
}

export interface GovExecutiveSummaryRow {
  summary_id: string;
  title_en: string;
  title_ar?: string;
  summary_type: string;
  period_start?: string;
  period_end?: string;
  highlights?: string;
  key_risks?: string;
  key_decisions?: string;
  recommendations?: string;
  status: string;
}

export interface GovHealthScore {
  overall_score: number;
  overall_grade: string;
  trend: number | null;
  policy_health: number;
  accountability: number;
  committee_effectiveness: number;
  decision_execution: number;
  exception_exposure: number;
  action_timeliness: number;
  mandate_validity: number;
  review_discipline: number;
  [key: string]: number | string | null;
}

export interface GovHealthTrendPoint {
  date: string;
  score: number;
  grade: string;
}

export interface GovMandateRow {
  mandate_id: string;
  title_en: string;
  title_ar?: string;
  issuing_authority?: string;
  jurisdiction?: string;
  priority: string;
  status: string;
  description?: string;
  effective_date?: string;
  expiry_date?: string;
}
