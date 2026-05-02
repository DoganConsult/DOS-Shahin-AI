import type { ActionStatus } from './action.types';

export interface ActionCreateDTO {
  title: string;
  description?: string;
  source_type?: 'audit_finding' | 'risk_treatment' | 'incident' | 'remediation' | 'workflow' | 'compliance_gap';
  source_id?: string;
  source_module?: string;
  action_type?: 'corrective' | 'preventive' | 'improvement' | 'follow_up';
  owner_id?: string;
  verifier_id?: string;
  deadline?: string;
  effort_hours?: number;
  linked_risk_ids?: string[];
  linked_finding_ids?: string[];
  evidence_ids?: string[];
  root_cause?: string;
  corrective_action_plan?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ActionUpdateDTO {
  title?: string;
  description?: string;
  status?: ActionStatus;
  source_type?: string;
  action_type?: 'corrective' | 'preventive' | 'improvement' | 'follow_up';
  owner_id?: string;
  verifier_id?: string;
  deadline?: string;
  completion_date?: string;
  verification_date?: string;
  effort_hours?: number;
  progress_percentage?: number;
  escalation_level?: number;
  escalated_to?: string;
  linked_risk_ids?: string[];
  linked_finding_ids?: string[];
  evidence_ids?: string[];
  root_cause?: string;
  corrective_action_plan?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ActionResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: ActionStatus;
  source_type?: string;
  source_id?: string;
  source_module?: string;
  action_type?: string;
  owner_id?: string;
  verifier_id?: string;
  deadline?: string;
  completion_date?: string;
  verification_date?: string;
  effort_hours?: number;
  progress_percentage?: number;
  escalation_level?: number;
  escalated_to?: string;
  overdue_days?: number;
  linked_risk_ids?: string[];
  linked_finding_ids?: string[];
  evidence_ids?: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ActionListItemDTO {
  id: string;
  title: string;
  status: ActionStatus;
  source_type?: string;
  action_type?: string;
  owner_id?: string;
  deadline?: string;
  progress_percentage?: number;
  overdue_days?: number;
  escalation_level?: number;
  created_at: string;
  updated_at: string;
}

export interface ActionDetailDTO extends ActionResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  root_cause?: string;
  corrective_action_plan?: string;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface ActionAdminDTO extends ActionDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface ActionImportDTO {
  title: string;
  description?: string;
  status?: string;
  source_type?: string;
  action_type?: string;
  deadline?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface ActionExportDTO extends ActionResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface ActionSearchResultDTO {
  items: ActionListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface ActionAuditDTO {
  entity_id: string;
  entity_type: string;
  action: string;
  actor_id: string;
  actor_type: 'user' | 'system' | 'ai_agent';
  timestamp: string;
  previous_state?: string;
  new_state?: string;
  changed_fields?: string[];
  ip_address?: string;
}

export interface ActionBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change' | 'escalate' | 'verify';
  payload?: Record<string, unknown>;
}
