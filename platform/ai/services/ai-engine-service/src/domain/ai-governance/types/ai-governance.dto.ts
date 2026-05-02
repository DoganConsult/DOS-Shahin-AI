import type { AiGovernanceStatus } from './ai-governance.types';

export interface AiGovernanceCreateDTO {
  title: string;
  description?: string;
  ai_system_name: string;
  ai_system_id?: string;
  ai_system_type?: 'ml_model' | 'llm' | 'rule_engine' | 'hybrid' | 'autonomous';
  risk_level?: 'low' | 'medium' | 'high' | 'unacceptable';
  deployment_status?: 'development' | 'testing' | 'staging' | 'production' | 'retired';
  use_case_description?: string;
  data_sources?: string[];
  model_version?: string;
  accountability_owner_id?: string;
  human_oversight_level?: 'full' | 'partial' | 'minimal' | 'none';
  regulatory_classification?: string;
  explainability_method?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AiGovernanceUpdateDTO {
  title?: string;
  description?: string;
  status?: AiGovernanceStatus;
  ai_system_name?: string;
  ai_system_type?: 'ml_model' | 'llm' | 'rule_engine' | 'hybrid' | 'autonomous';
  risk_level?: 'low' | 'medium' | 'high' | 'unacceptable';
  deployment_status?: 'development' | 'testing' | 'staging' | 'production' | 'retired';
  use_case_description?: string;
  data_sources?: string[];
  model_version?: string;
  fairness_score?: number;
  transparency_score?: number;
  accountability_owner_id?: string;
  impact_assessment_date?: string;
  bias_audit_date?: string;
  human_oversight_level?: 'full' | 'partial' | 'minimal' | 'none';
  regulatory_classification?: string;
  explainability_method?: string;
  ethical_review_status?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AiGovernanceResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: AiGovernanceStatus;
  ai_system_name?: string;
  ai_system_id?: string;
  ai_system_type?: string;
  risk_level?: string;
  deployment_status?: string;
  use_case_description?: string;
  data_sources?: string[];
  model_version?: string;
  fairness_score?: number;
  transparency_score?: number;
  accountability_owner_id?: string;
  impact_assessment_date?: string;
  bias_audit_date?: string;
  human_oversight_level?: string;
  regulatory_classification?: string;
  explainability_method?: string;
  ethical_review_status?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface AiGovernanceListItemDTO {
  id: string;
  title: string;
  status: AiGovernanceStatus;
  ai_system_name?: string;
  ai_system_type?: string;
  risk_level?: string;
  deployment_status?: string;
  fairness_score?: number;
  transparency_score?: number;
  created_at: string;
  updated_at: string;
}

export interface AiGovernanceDetailDTO extends AiGovernanceResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface AiGovernanceAdminDTO extends AiGovernanceDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface AiGovernanceImportDTO {
  title: string;
  description?: string;
  status?: string;
  ai_system_name: string;
  ai_system_type?: string;
  risk_level?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface AiGovernanceExportDTO extends AiGovernanceResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface AiGovernanceSearchResultDTO {
  items: AiGovernanceListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface AiGovernanceAuditDTO {
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

export interface AiGovernanceBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change';
  payload?: Record<string, unknown>;
}
