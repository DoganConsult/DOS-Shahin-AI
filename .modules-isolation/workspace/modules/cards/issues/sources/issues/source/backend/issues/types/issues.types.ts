export interface Issue {
  issue_id: string;
  tenant_id: string;
  title: string;
  description?: string;
  category: string;
  severity: string;
  status: string;
  source_module?: string;
  source_id?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface IssueCreateInput {
  tenant_id: string;
  title: string;
  description?: string;
  category?: string;
  severity: string;
  source_module?: string;
  source_id?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  created_by: string;
}

export interface IssueUpdateInput {
  title?: string;
  description?: string;
  category?: string;
  severity?: string;
  status?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  updated_by: string;
}

export interface IssueListFilter {
  status?: string;
  category?: string;
  severity?: string;
  assigned_to?: string;
  source_module?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface IssueListResult {
  rows: Issue[];
  total: number;
}

export type IssuesStatus = 'open' | 'triaged' | 'investigating' | 'in_progress' | 'pending_verification' | 'resolved' | 'closed' | 'archived';

export const ISSUES_STATUSES: readonly IssuesStatus[] = ['open', 'triaged', 'investigating', 'in_progress', 'pending_verification', 'resolved', 'closed', 'archived'] as const;

export type IssuesSeverity = 'critical' | 'high' | 'medium' | 'low';
export const ISSUES_SEVERITIES: readonly IssuesSeverity[] = ['critical', 'high', 'medium', 'low'] as const;

export type IssuesPriority = 'critical' | 'high' | 'medium' | 'low';
export const ISSUES_PRIORITIES: readonly IssuesPriority[] = ['critical', 'high', 'medium', 'low'] as const;

export type IssuesSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const ISSUES_SOURCES: readonly IssuesSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type IssuesStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface IssuesEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'issues';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: IssuesStatus;
  newState?: IssuesStatus;
  data: Record<string, unknown>;
}
