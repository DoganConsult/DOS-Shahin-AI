import type { ComplianceStatus } from './compliance.types';

export interface ComplianceCreateDTO {
  title: string;
  description?: string;
  framework_id: string;
  framework_name?: string;
  scope?: string;
  score?: number;
  assessment_type?: string;
  assessor_id?: string;
  control_count?: number;
  compliant_count?: number;
  gap_count?: number;
  compliance_percentage?: number;
  regulatory_body?: string;
  certification_status?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ComplianceUpdateDTO {
  title?: string;
  description?: string;
  status?: ComplianceStatus;
  framework_id?: string;
  framework_name?: string;
  scope?: string;
  score?: number;
  assessment_type?: string;
  assessor_id?: string;
  control_count?: number;
  compliant_count?: number;
  gap_count?: number;
  compliance_percentage?: number;
  regulatory_body?: string;
  certification_status?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ComplianceResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: ComplianceStatus;
  framework_id?: string;
  framework_name?: string;
  scope?: string;
  score?: number;
  assessment_type?: string;
  assessor_id?: string;
  control_count?: number;
  compliant_count?: number;
  gap_count?: number;
  compliance_percentage?: number;
  regulatory_body?: string;
  certification_status?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ComplianceListItemDTO {
  id: string;
  title: string;
  status: ComplianceStatus;
  framework_id?: string;
  framework_name?: string;
  score?: number;
  compliance_percentage?: number;
  certification_status?: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceDetailDTO extends ComplianceResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface ComplianceAdminDTO extends ComplianceDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface ComplianceImportDTO {
  title: string;
  description?: string;
  status?: string;
  framework_id?: string;
  framework_name?: string;
  scope?: string;
  score?: number;
  regulatory_body?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface ComplianceExportDTO extends ComplianceResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface ComplianceSearchResultDTO {
  items: ComplianceListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface ComplianceAuditDTO {
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

export interface ComplianceBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change';
  payload?: Record<string, unknown>;
}
