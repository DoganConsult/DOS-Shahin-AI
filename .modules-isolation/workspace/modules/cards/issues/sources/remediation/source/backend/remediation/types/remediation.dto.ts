import type { RemediationStatus } from './remediation.types';

export interface RemediationCreateDTO {
  title: string;
  description?: string;
  plan_code?: string;
  plan_type?: 'quick_fix' | 'short_term' | 'long_term' | 'compensating_control';
  source_finding_id?: string;
  source_finding_type?: 'audit' | 'risk' | 'compliance' | 'incident' | 'vulnerability';
  affected_systems?: string[];
  affected_controls?: string[];
  implementation_steps?: Array<{ step_number: number; description: string; responsible?: string; deadline?: string; status?: string }>;
  verification_method?: string;
  cost_estimate?: number;
  risk_reduction_score?: number;
  rollback_plan?: string;
  dependencies?: string[];
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface RemediationUpdateDTO {
  title?: string;
  description?: string;
  status?: RemediationStatus;
  plan_type?: 'quick_fix' | 'short_term' | 'long_term' | 'compensating_control';
  affected_systems?: string[];
  affected_controls?: string[];
  implementation_steps?: Array<{ step_number: number; description: string; responsible?: string; deadline?: string; status?: string }>;
  verification_method?: string;
  verified_by?: string;
  verification_date?: string;
  cost_estimate?: number;
  actual_cost?: number;
  risk_reduction_score?: number;
  effectiveness_rating?: number;
  rollback_plan?: string;
  dependencies?: string[];
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface RemediationResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: RemediationStatus;
  plan_code?: string;
  plan_type?: string;
  source_finding_id?: string;
  source_finding_type?: string;
  affected_systems?: string[];
  affected_controls?: string[];
  implementation_steps?: Array<{ step_number: number; description: string; responsible?: string; deadline?: string; status?: string }>;
  verification_method?: string;
  verified_by?: string;
  verification_date?: string;
  cost_estimate?: number;
  actual_cost?: number;
  risk_reduction_score?: number;
  effectiveness_rating?: number;
  rollback_plan?: string;
  dependencies?: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface RemediationListItemDTO {
  id: string;
  title: string;
  status: RemediationStatus;
  plan_type?: string;
  source_finding_type?: string;
  cost_estimate?: number;
  actual_cost?: number;
  risk_reduction_score?: number;
  effectiveness_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface RemediationDetailDTO extends RemediationResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface RemediationAdminDTO extends RemediationDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface RemediationImportDTO {
  title: string;
  description?: string;
  status?: string;
  plan_type?: string;
  source_finding_type?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface RemediationExportDTO extends RemediationResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface RemediationSearchResultDTO {
  items: RemediationListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface RemediationAuditDTO {
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

export interface RemediationBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change' | 'verify' | 'rollback';
  payload?: Record<string, unknown>;
}
