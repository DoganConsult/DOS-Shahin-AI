import type { WorkflowStatus } from './workflow.types';

export interface WorkflowCreateDTO {
  title: string;
  description?: string;
  definition_code?: string;
  definition_version?: number;
  workflow_type?: 'approval' | 'review' | 'assessment' | 'lifecycle' | 'remediation' | 'escalation';
  trigger_type?: 'manual' | 'event' | 'schedule' | 'condition';
  owning_module?: string;
  entity_type?: string;
  sla_hours?: number;
  is_template?: boolean;
  template_category?: string;
  parallel_branches_enabled?: boolean;
  max_instances?: number;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface WorkflowUpdateDTO {
  title?: string;
  description?: string;
  status?: WorkflowStatus;
  workflow_type?: 'approval' | 'review' | 'assessment' | 'lifecycle' | 'remediation' | 'escalation';
  trigger_type?: 'manual' | 'event' | 'schedule' | 'condition';
  sla_hours?: number;
  is_template?: boolean;
  template_category?: string;
  parallel_branches_enabled?: boolean;
  max_instances?: number;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface WorkflowResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: WorkflowStatus;
  definition_code?: string;
  definition_version?: number;
  workflow_type?: string;
  trigger_type?: string;
  owning_module?: string;
  entity_type?: string;
  node_count?: number;
  edge_count?: number;
  avg_completion_hours?: number;
  sla_hours?: number;
  is_template?: boolean;
  template_category?: string;
  parallel_branches_enabled?: boolean;
  max_instances?: number;
  active_instances?: number;
  last_executed_at?: string;
  success_rate?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface WorkflowListItemDTO {
  id: string;
  title: string;
  status: WorkflowStatus;
  definition_code?: string;
  workflow_type?: string;
  trigger_type?: string;
  owning_module?: string;
  active_instances?: number;
  success_rate?: number;
  last_executed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowDetailDTO extends WorkflowResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface WorkflowAdminDTO extends WorkflowDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface WorkflowImportDTO {
  title: string;
  description?: string;
  status?: string;
  workflow_type?: string;
  trigger_type?: string;
  owning_module?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowExportDTO extends WorkflowResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface WorkflowSearchResultDTO {
  items: WorkflowListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface WorkflowAuditDTO {
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

export interface WorkflowBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'activate' | 'pause' | 'status_change';
  payload?: Record<string, unknown>;
}
