export interface ActionItem {
  item_id: string;
  tenant_id: string;
  title: string;
  description?: string;
  source_type: string;
  source_id: string;
  status: string;
  priority: string;
  assigned_to: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface ActionItemCreateInput {
  tenant_id: string;
  title: string;
  description?: string;
  source_type: string;
  source_id: string;
  status: string;
  priority: string;
  assigned_to: string;
  due_date?: string;
  created_by: string;
}

export interface ActionItemUpdateInput {
  
  title: string;
  description?: string;
  source_type: string;
  source_id: string;
  status: string;
  priority: string;
  assigned_to: string;
  due_date?: string;
  updated_by: string;
}

export interface ActionItemListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface ActionItemListResult {
  rows: ActionItem[];
  total: number;
}

export type ActionStatus = 'open' | 'in_progress' | 'pending_review' | 'completed' | 'overdue' | 'cancelled' | 'archived';

export const ACTION_STATUSES: readonly ActionStatus[] = ['open', 'in_progress', 'pending_review', 'completed', 'overdue', 'cancelled', 'archived'] as const;


export type ActionPriority = 'critical' | 'high' | 'medium' | 'low';
export const ACTION_PRIORITIES: readonly ActionPriority[] = ['critical', 'high', 'medium', 'low'] as const;

export type ActionSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const ACTION_SOURCES: readonly ActionSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type ActionStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface ActionEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'action';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: ActionStatus;
  newState?: ActionStatus;
  data: Record<string, unknown>;
}
