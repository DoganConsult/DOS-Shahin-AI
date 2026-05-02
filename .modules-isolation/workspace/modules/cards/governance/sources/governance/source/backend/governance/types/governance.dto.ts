import type { GovernanceStatus } from './governance.types';

export interface GovernanceCreateDTO {
  title: string;
  description?: string;
  charter_type?: string;
  governance_body?: string;
  meeting_frequency?: string;
  chair_person_id?: string;
  secretary_id?: string;
  mandate?: string;
  authority_level?: string;
  reporting_line?: string;
  review_cycle?: string;
  member_count?: number;
  quorum_requirement?: number;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface GovernanceUpdateDTO {
  title?: string;
  description?: string;
  status?: GovernanceStatus;
  charter_type?: string;
  governance_body?: string;
  meeting_frequency?: string;
  chair_person_id?: string;
  secretary_id?: string;
  mandate?: string;
  authority_level?: string;
  reporting_line?: string;
  review_cycle?: string;
  member_count?: number;
  quorum_requirement?: number;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface GovernanceResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: GovernanceStatus;
  charter_type?: string;
  governance_body?: string;
  meeting_frequency?: string;
  chair_person_id?: string;
  secretary_id?: string;
  mandate?: string;
  authority_level?: string;
  reporting_line?: string;
  review_cycle?: string;
  member_count?: number;
  quorum_requirement?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface GovernanceListItemDTO {
  id: string;
  title: string;
  status: GovernanceStatus;
  charter_type?: string;
  governance_body?: string;
  meeting_frequency?: string;
  chair_person_id?: string;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export interface GovernanceDetailDTO extends GovernanceResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface GovernanceAdminDTO extends GovernanceDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface GovernanceImportDTO {
  title: string;
  description?: string;
  status?: string;
  charter_type?: string;
  governance_body?: string;
  meeting_frequency?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface GovernanceExportDTO extends GovernanceResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface GovernanceSearchResultDTO {
  items: GovernanceListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface GovernanceAuditDTO {
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

export interface GovernanceBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change';
  payload?: Record<string, unknown>;
}
