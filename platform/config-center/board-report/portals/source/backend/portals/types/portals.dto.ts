import type { PortalsStatus } from './portals.types';

export interface PortalsCreateDTO {
  title: string;
  description?: string;
  portal_type: 'vendor' | 'audit' | 'stakeholder' | 'client' | 'regulator';
  portal_name: string;
  portal_url?: string;
  branding_config?: Record<string, unknown>;
  access_policy?: string;
  allowed_roles?: string[];
  allowed_domains?: string[];
  content_modules?: string[];
  language_default?: string;
  expiry_date?: string;
  portal_owner_id?: string;
  portal_admin_ids?: string[];
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface PortalsUpdateDTO {
  title?: string;
  description?: string;
  status?: PortalsStatus;
  portal_type?: 'vendor' | 'audit' | 'stakeholder' | 'client' | 'regulator';
  portal_name?: string;
  portal_url?: string;
  branding_config?: Record<string, unknown>;
  access_policy?: string;
  allowed_roles?: string[];
  allowed_domains?: string[];
  content_modules?: string[];
  language_default?: string;
  expiry_date?: string;
  portal_owner_id?: string;
  portal_admin_ids?: string[];
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface PortalsResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: PortalsStatus;
  portal_type?: string;
  portal_name?: string;
  portal_url?: string;
  branding_config?: Record<string, unknown>;
  access_policy?: string;
  allowed_roles?: string[];
  allowed_domains?: string[];
  content_modules?: string[];
  language_default?: string;
  expiry_date?: string;
  published_at?: string;
  visitor_count?: number;
  last_accessed_at?: string;
  portal_owner_id?: string;
  portal_admin_ids?: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface PortalsListItemDTO {
  id: string;
  title: string;
  status: PortalsStatus;
  portal_type?: string;
  portal_name?: string;
  portal_url?: string;
  visitor_count?: number;
  last_accessed_at?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PortalsDetailDTO extends PortalsResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface PortalsAdminDTO extends PortalsDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface PortalsImportDTO {
  title: string;
  description?: string;
  status?: string;
  portal_type?: string;
  portal_name: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface PortalsExportDTO extends PortalsResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface PortalsSearchResultDTO {
  items: PortalsListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface PortalsAuditDTO {
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

export interface PortalsBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change' | 'publish' | 'suspend';
  payload?: Record<string, unknown>;
}
