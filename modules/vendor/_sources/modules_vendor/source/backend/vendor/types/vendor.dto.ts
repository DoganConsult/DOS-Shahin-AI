import type { VendorStatus } from './vendor.types';

export interface VendorCreateDTO {
  title: string;
  description?: string;
  vendor_code?: string;
  vendor_name?: string;
  vendor_type?: string;
  risk_tier?: 'critical' | 'high' | 'medium' | 'low';
  contract_id?: string;
  contract_value?: number;
  contract_start?: string;
  contract_end?: string;
  due_diligence_status?: string;
  sla_compliance_score?: number;
  data_access_level?: string;
  country?: string;
  certification_status?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface VendorUpdateDTO {
  title?: string;
  description?: string;
  status?: VendorStatus;
  vendor_code?: string;
  vendor_name?: string;
  vendor_type?: string;
  risk_tier?: 'critical' | 'high' | 'medium' | 'low';
  contract_id?: string;
  contract_value?: number;
  contract_start?: string;
  contract_end?: string;
  due_diligence_status?: string;
  sla_compliance_score?: number;
  data_access_level?: string;
  country?: string;
  certification_status?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface VendorResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: VendorStatus;
  vendor_code?: string;
  vendor_name?: string;
  vendor_type?: string;
  risk_tier?: 'critical' | 'high' | 'medium' | 'low';
  contract_id?: string;
  contract_value?: number;
  contract_start?: string;
  contract_end?: string;
  due_diligence_status?: string;
  sla_compliance_score?: number;
  data_access_level?: string;
  country?: string;
  certification_status?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface VendorListItemDTO {
  id: string;
  title: string;
  status: VendorStatus;
  vendor_code?: string;
  vendor_name?: string;
  vendor_type?: string;
  risk_tier?: 'critical' | 'high' | 'medium' | 'low';
  contract_end?: string;
  sla_compliance_score?: number;
  country?: string;
  certification_status?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorDetailDTO extends VendorResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface VendorAdminDTO extends VendorDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface VendorImportDTO {
  title: string;
  description?: string;
  status?: string;
  vendor_code?: string;
  vendor_name?: string;
  vendor_type?: string;
  risk_tier?: string;
  country?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface VendorExportDTO extends VendorResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface VendorSearchResultDTO {
  items: VendorListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface VendorAuditDTO {
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

export interface VendorBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change';
  payload?: Record<string, unknown>;
}
