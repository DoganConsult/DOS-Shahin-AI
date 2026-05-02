import type { PolicyStatus } from './policy.types';

export interface PolicyCreateDTO {
  title: string;
  description?: string;
  policy_code?: string;
  version?: string;
  effective_date?: string;
  review_date?: string;
  approval_status?: string;
  approver_id?: string;
  policy_type?: 'policy' | 'standard' | 'procedure' | 'guideline';
  scope?: string;
  audience?: string;
  owner_id?: string;
  supersedes_id?: string;
  classification?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface PolicyUpdateDTO {
  title?: string;
  description?: string;
  status?: PolicyStatus;
  policy_code?: string;
  version?: string;
  effective_date?: string;
  review_date?: string;
  approval_status?: string;
  approver_id?: string;
  policy_type?: 'policy' | 'standard' | 'procedure' | 'guideline';
  scope?: string;
  audience?: string;
  owner_id?: string;
  supersedes_id?: string;
  classification?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface PolicyResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: PolicyStatus;
  policy_code?: string;
  version?: string;
  effective_date?: string;
  review_date?: string;
  approval_status?: string;
  approver_id?: string;
  policy_type?: 'policy' | 'standard' | 'procedure' | 'guideline';
  scope?: string;
  audience?: string;
  owner_id?: string;
  supersedes_id?: string;
  classification?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface PolicyListItemDTO {
  id: string;
  title: string;
  status: PolicyStatus;
  policy_code?: string;
  version?: string;
  policy_type?: 'policy' | 'standard' | 'procedure' | 'guideline';
  effective_date?: string;
  review_date?: string;
  approval_status?: string;
  classification?: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyDetailDTO extends PolicyResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface PolicyAdminDTO extends PolicyDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface PolicyImportDTO {
  title: string;
  description?: string;
  status?: string;
  policy_code?: string;
  version?: string;
  policy_type?: string;
  effective_date?: string;
  classification?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyExportDTO extends PolicyResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface PolicySearchResultDTO {
  items: PolicyListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface PolicyAuditDTO {
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

export interface PolicyBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change';
  payload?: Record<string, unknown>;
}
