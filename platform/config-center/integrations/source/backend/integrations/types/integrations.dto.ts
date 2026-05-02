import type { IntegrationsStatus } from './integrations.types';

export interface IntegrationsCreateDTO {
  title: string;
  description?: string;
  integration_type?: 'api' | 'webhook' | 'sftp' | 'email' | 'sso' | 'ldap' | 'siem' | 'grc_connector';
  integration_code?: string;
  provider_name?: string;
  endpoint_url?: string;
  auth_type?: 'api_key' | 'oauth2' | 'basic' | 'certificate' | 'none';
  direction?: 'inbound' | 'outbound' | 'bidirectional';
  sync_frequency?: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  data_mapping_id?: string;
  transformation_rules?: Record<string, unknown>;
  rate_limit_per_minute?: number;
  timeout_seconds?: number;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface IntegrationsUpdateDTO {
  title?: string;
  description?: string;
  status?: IntegrationsStatus;
  provider_name?: string;
  endpoint_url?: string;
  auth_type?: 'api_key' | 'oauth2' | 'basic' | 'certificate' | 'none';
  direction?: 'inbound' | 'outbound' | 'bidirectional';
  sync_frequency?: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  rate_limit_per_minute?: number;
  timeout_seconds?: number;
  health_status?: 'healthy' | 'degraded' | 'down' | 'unknown';
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface IntegrationsResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: IntegrationsStatus;
  integration_type?: string;
  integration_code?: string;
  provider_name?: string;
  endpoint_url?: string;
  auth_type?: string;
  direction?: string;
  sync_frequency?: string;
  last_sync_at?: string;
  last_sync_status?: string;
  records_synced?: number;
  error_count?: number;
  retry_count?: number;
  health_status?: string;
  rate_limit_per_minute?: number;
  timeout_seconds?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface IntegrationsListItemDTO {
  id: string;
  title: string;
  status: IntegrationsStatus;
  integration_type?: string;
  provider_name?: string;
  direction?: string;
  sync_frequency?: string;
  last_sync_at?: string;
  last_sync_status?: string;
  health_status?: string;
  error_count?: number;
  created_at: string;
  updated_at: string;
}

export interface IntegrationsDetailDTO extends IntegrationsResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface IntegrationsAdminDTO extends IntegrationsDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface IntegrationsImportDTO {
  title: string;
  description?: string;
  status?: string;
  integration_type?: string;
  provider_name?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationsExportDTO extends IntegrationsResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface IntegrationsSearchResultDTO {
  items: IntegrationsListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface IntegrationsAuditDTO {
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

export interface IntegrationsBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'sync' | 'health_check' | 'status_change';
  payload?: Record<string, unknown>;
}
