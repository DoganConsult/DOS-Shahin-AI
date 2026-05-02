export interface InboxMessage {
  message_id: string;
  tenant_id: string;
  subject: string;
  body?: string;
  channel: string;
  priority: string;
  status: string;
  read: boolean;
  archived: boolean;
  starred: boolean;
  recipient_id: string;
  related_module?: string;
  related_entity_id?: string;
  action_url?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  deleted_at?: string | null;
}

export interface InboxMessageCreateInput {
  tenant_id: string;
  subject: string;
  body?: string;
  channel: string;
  priority: string;
  recipient_ids: string[];
  related_module?: string;
  related_entity_id?: string;
  action_url?: string;
  expires_at?: string;
  created_by: string;
}

export interface InboxMessageUpdateInput {
  read?: boolean;
  archived?: boolean;
  starred?: boolean;
  status?: string;
  updated_by: string;
}

export interface InboxMessageListFilter {
  status?: string;
  channel?: string;
  priority?: string;
  read?: string;
  related_module?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface InboxMessageListResult {
  rows: InboxMessage[];
  total: number;
}

export type InboxStatus = 'unread' | 'read' | 'actioned' | 'archived' | 'deleted';

export const INBOX_STATUSES: readonly InboxStatus[] = ['unread', 'read', 'actioned', 'archived', 'deleted'] as const;



export type InboxSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const INBOX_SOURCES: readonly InboxSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type InboxStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface InboxEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'inbox';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: InboxStatus;
  newState?: InboxStatus;
  data: Record<string, unknown>;
}
