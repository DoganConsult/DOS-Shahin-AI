import type { NotificationStatus } from './notification.types';

export interface NotificationCreateDTO {
  title: string;
  description?: string;
  channel?: 'in_app' | 'email' | 'sms' | 'push' | 'webhook';
  template_code?: string;
  template_version?: number;
  recipient_type?: 'user' | 'role' | 'group' | 'broadcast';
  recipient_id: string;
  sender_module?: string;
  trigger_event?: string;
  trigger_entity_type?: string;
  trigger_entity_id?: string;
  max_retries?: number;
  scheduled_at?: string;
  digest_group?: string;
  batch_id?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface NotificationUpdateDTO {
  title?: string;
  description?: string;
  status?: NotificationStatus;
  channel?: 'in_app' | 'email' | 'sms' | 'push' | 'webhook';
  delivery_status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced';
  delivery_attempts?: number;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface NotificationResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: NotificationStatus;
  channel?: string;
  template_code?: string;
  template_version?: number;
  recipient_type?: string;
  recipient_id?: string;
  sender_module?: string;
  trigger_event?: string;
  trigger_entity_type?: string;
  trigger_entity_id?: string;
  delivery_status?: string;
  delivery_attempts?: number;
  max_retries?: number;
  scheduled_at?: string;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
  digest_group?: string;
  batch_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface NotificationListItemDTO {
  id: string;
  title: string;
  status: NotificationStatus;
  channel?: string;
  recipient_id?: string;
  sender_module?: string;
  delivery_status?: string;
  delivery_attempts?: number;
  scheduled_at?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationDetailDTO extends NotificationResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface NotificationAdminDTO extends NotificationDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface NotificationImportDTO {
  title: string;
  description?: string;
  status?: string;
  channel?: string;
  recipient_id: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationExportDTO extends NotificationResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface NotificationSearchResultDTO {
  items: NotificationListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface NotificationAuditDTO {
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

export interface NotificationBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'resend' | 'mark_read' | 'status_change';
  payload?: Record<string, unknown>;
}
