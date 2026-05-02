import type { ExceptionStatus } from './exception.types';

export interface ExceptionCreateDTO {
  title: string;
  description?: string;
  control_id?: string;
  justification?: string;
  compensating_controls?: string;
  risk_impact?: 'critical' | 'high' | 'medium' | 'low';
  requested_by?: string;
  requested_duration?: number;
  approver_designation?: string;
  expiry_date?: string;
  approval_chain?: string[];
  renewal_count?: number;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ExceptionUpdateDTO {
  title?: string;
  description?: string;
  status?: ExceptionStatus;
  control_id?: string;
  justification?: string;
  compensating_controls?: string;
  risk_impact?: 'critical' | 'high' | 'medium' | 'low';
  requested_by?: string;
  requested_duration?: number;
  approver_designation?: string;
  expiry_date?: string;
  approval_chain?: string[];
  renewal_count?: number;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ExceptionResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: ExceptionStatus;
  control_id?: string;
  justification?: string;
  compensating_controls?: string;
  risk_impact?: 'critical' | 'high' | 'medium' | 'low';
  requested_by?: string;
  requested_duration?: number;
  approver_designation?: string;
  expiry_date?: string;
  approval_chain?: string[];
  renewal_count?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ExceptionListItemDTO {
  id: string;
  title: string;
  status: ExceptionStatus;
  control_id?: string;
  risk_impact?: 'critical' | 'high' | 'medium' | 'low';
  requested_by?: string;
  expiry_date?: string;
  renewal_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ExceptionDetailDTO extends ExceptionResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface ExceptionAdminDTO extends ExceptionDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface ExceptionImportDTO {
  title: string;
  description?: string;
  status?: string;
  control_id?: string;
  risk_impact?: string;
  requested_by?: string;
  expiry_date?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface ExceptionExportDTO extends ExceptionResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface ExceptionSearchResultDTO {
  items: ExceptionListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface ExceptionAuditDTO {
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

export interface ExceptionBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change';
  payload?: Record<string, unknown>;
}
