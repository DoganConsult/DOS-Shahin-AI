import type { BcpStatus } from './bcp.types';

export interface BcpCreateDTO {
  title: string;
  description?: string;
  plan_code?: string;
  plan_type?: 'bcp' | 'drp' | 'crisis';
  business_unit_id?: string;
  rto_hours?: number;
  rpo_hours?: number;
  mtpd_hours?: number;
  last_test_date?: string;
  next_test_date?: string;
  test_result?: string;
  recovery_strategy?: string;
  critical_processes?: string[];
  alternate_site?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface BcpUpdateDTO {
  title?: string;
  description?: string;
  status?: BcpStatus;
  plan_code?: string;
  plan_type?: 'bcp' | 'drp' | 'crisis';
  business_unit_id?: string;
  rto_hours?: number;
  rpo_hours?: number;
  mtpd_hours?: number;
  last_test_date?: string;
  next_test_date?: string;
  test_result?: string;
  recovery_strategy?: string;
  critical_processes?: string[];
  alternate_site?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface BcpResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: BcpStatus;
  plan_code?: string;
  plan_type?: 'bcp' | 'drp' | 'crisis';
  business_unit_id?: string;
  rto_hours?: number;
  rpo_hours?: number;
  mtpd_hours?: number;
  last_test_date?: string;
  next_test_date?: string;
  test_result?: string;
  recovery_strategy?: string;
  critical_processes?: string[];
  alternate_site?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface BcpListItemDTO {
  id: string;
  title: string;
  status: BcpStatus;
  plan_code?: string;
  plan_type?: 'bcp' | 'drp' | 'crisis';
  business_unit_id?: string;
  rto_hours?: number;
  rpo_hours?: number;
  last_test_date?: string;
  next_test_date?: string;
  test_result?: string;
  created_at: string;
  updated_at: string;
}

export interface BcpDetailDTO extends BcpResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface BcpAdminDTO extends BcpDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface BcpImportDTO {
  title: string;
  description?: string;
  status?: string;
  plan_code?: string;
  plan_type?: string;
  business_unit_id?: string;
  rto_hours?: number;
  rpo_hours?: number;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface BcpExportDTO extends BcpResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface BcpSearchResultDTO {
  items: BcpListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface BcpAuditDTO {
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

export interface BcpBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change';
  payload?: Record<string, unknown>;
}
