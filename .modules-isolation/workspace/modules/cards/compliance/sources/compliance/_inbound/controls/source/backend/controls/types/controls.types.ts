export type ControlStatus =
  | 'draft'
  | 'active'
  | 'under_review'
  | 'ineffective'
  | 'retired'
  | 'archived';

export const CONTROL_STATUSES: readonly ControlStatus[] = [
  'draft', 'active', 'under_review', 'ineffective', 'retired', 'archived',
] as const;

export type ControlType = 'preventive' | 'detective' | 'corrective' | 'compensating';

export const CONTROL_TYPES: readonly ControlType[] = [
  'preventive', 'detective', 'corrective', 'compensating',
] as const;

export type ControlAutomationLevel = 'manual' | 'semi_automated' | 'automated';

export const CONTROL_AUTOMATION_LEVELS: readonly ControlAutomationLevel[] = [
  'manual', 'semi_automated', 'automated',
] as const;

export type ControlTestResult =
  | 'effective'
  | 'partially_effective'
  | 'ineffective'
  | 'not_tested';

export const CONTROL_TEST_RESULTS: readonly ControlTestResult[] = [
  'effective', 'partially_effective', 'ineffective', 'not_tested',
] as const;

export type ControlTestType =
  | 'design'
  | 'operating'
  | 'substantive'
  | 'inspection'
  | 'observation'
  | 'inquiry'
  | 'reperformance'
  | 'analytical'
  | 'automated';

export type ControlDeficiencySeverity = 'critical' | 'high' | 'medium' | 'low';

export type ControlStatusReason =
  | 'initial_creation'
  | 'user_action'
  | 'workflow_transition'
  | 'auto_escalation'
  | 'sla_breach'
  | 'approval_granted'
  | 'approval_denied'
  | 'system_rule';

export interface Control {
  control_id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  objective: string | null;
  statement: string | null;
  status: ControlStatus;
  control_type: ControlType | null;
  automation_level: ControlAutomationLevel | null;
  is_sox: boolean;
  key_control: boolean;
  frequency: string | null;
  owner: string | null;
  owner_team_id: string | null;
  operator_user_id: string | null;
  reviewer_user_id: string | null;
  test_status: ControlTestResult | null;
  last_tested_at: string | null;
  effectiveness_rating: string | null;
  framework_id: string | null;
  family_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface ControlCreateInput {
  title: string;
  description?: string;
  objective?: string;
  statement?: string;
  control_type?: ControlType;
  automation_level?: ControlAutomationLevel;
  is_sox?: boolean;
  key_control?: boolean;
  frequency?: string;
  owner?: string;
  owner_team_id?: string;
  operator_user_id?: string;
  reviewer_user_id?: string;
  framework_id?: string;
  family_id?: string;
  created_by: string;
}

export interface ControlUpdateInput {
  title?: string;
  description?: string;
  objective?: string;
  statement?: string;
  control_type?: ControlType;
  automation_level?: ControlAutomationLevel;
  is_sox?: boolean;
  key_control?: boolean;
  frequency?: string;
  owner?: string;
  owner_team_id?: string;
  operator_user_id?: string;
  reviewer_user_id?: string;
  framework_id?: string;
  family_id?: string;
  updated_by: string;
}

export interface ControlListFilter {
  status?: string;
  control_type?: string;
  automation_level?: string;
  framework_id?: string;
  family_id?: string;
  owner?: string;
  key_control?: boolean;
  is_sox?: boolean;
  test_status?: string;
  unmapped_only?: boolean;
  failing_only?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_dir?: 'ASC' | 'DESC';
}

export interface ControlListResult {
  rows: Control[];
  total: number;
}

export interface ControlDesignMetadata {
  control_id: string;
  design_rationale: string | null;
  implementation_guidance: string | null;
  test_approach: string | null;
  expected_outcome: string | null;
  pass_criteria: string | null;
  fail_criteria: string | null;
  automation_notes: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface ControlOwnerRecord {
  id: string;
  control_id: string;
  user_id: string;
  ownership_type: 'primary' | 'secondary' | 'operator' | 'reviewer' | 'delegate';
  is_primary: boolean;
  assigned_at: string;
  assigned_by: string | null;
}

export interface ControlEffectivenessRecord {
  id: string;
  control_id: string;
  design_score: number;
  operating_score: number;
  overall_score: number;
  rating: 'effective' | 'partially_effective' | 'ineffective';
  scored_by: string;
  scoring_period: string | null;
  notes: string | null;
  created_at: string;
}

export interface ControlAutomationStateRecord {
  id: string;
  control_id: string;
  automation_level: ControlAutomationLevel;
  tool_name: string | null;
  tool_integration_id: string | null;
  last_run_at: string | null;
  last_run_result: string | null;
  next_run_at: string | null;
  health_status: 'healthy' | 'degraded' | 'failing' | 'unknown';
  alert_on_failure: boolean;
  updated_at: string;
}

export interface ControlEventPayload {
  tenantId: string;
  entityType: 'control';
  entityId: string;
  moduleCode: 'controls';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: ControlStatus;
  newState?: ControlStatus;
  data: Record<string, unknown>;
}
