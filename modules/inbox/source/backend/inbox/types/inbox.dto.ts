import type { InboxStatus } from './inbox.types';

export interface InboxCreateDTO {
  title: string;
  description?: string;
  subject: string;
  body?: string;
  entity_type?: string;
  entity_id?: string;
  source_module?: string;
  action_type?: 'approval' | 'review' | 'assignment' | 'notification' | 'escalation';
  action_required?: boolean;
  action_url?: string;
  sender_id?: string;
  recipient_id: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  priority_score?: number;
  channel?: 'in_app' | 'email' | 'sms' | 'push';
  expires_at?: string;
  parent_message_id?: string;
  thread_id?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface InboxUpdateDTO {
  title?: string;
  description?: string;
  status?: InboxStatus;
  subject?: string;
  body?: string;
  action_required?: boolean;
  action_url?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  priority_score?: number;
  read_at?: string;
  actioned_at?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface InboxResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: InboxStatus;
  subject: string;
  body?: string;
  entity_type?: string;
  entity_id?: string;
  source_module?: string;
  action_type?: string;
  action_required?: boolean;
  action_url?: string;
  sender_id?: string;
  recipient_id?: string;
  priority?: string;
  priority_score?: number;
  channel?: string;
  read_at?: string;
  actioned_at?: string;
  expires_at?: string;
  parent_message_id?: string;
  thread_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface InboxListItemDTO {
  id: string;
  title: string;
  status: InboxStatus;
  subject: string;
  source_module?: string;
  action_type?: string;
  action_required?: boolean;
  priority?: string;
  channel?: string;
  read_at?: string;
  sender_id?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InboxDetailDTO extends InboxResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface InboxAdminDTO extends InboxDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface InboxImportDTO {
  title: string;
  description?: string;
  status?: string;
  subject: string;
  recipient_id: string;
  channel?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface InboxExportDTO extends InboxResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface InboxSearchResultDTO {
  items: InboxListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface InboxAuditDTO {
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

export interface InboxBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change' | 'mark_read' | 'mark_actioned';
  payload?: Record<string, unknown>;
}
