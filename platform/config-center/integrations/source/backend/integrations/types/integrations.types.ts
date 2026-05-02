export interface Connector {
  connector_id: string;
  tenant_id: string;
  name: string;
  connector_type: string;
  status: string;
  provider: string;
  last_sync_at?: string;
  sync_interval_minutes?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface ConnectorCreateInput {
  tenant_id: string;
  name: string;
  connector_type: string;
  status: string;
  provider: string;
  last_sync_at?: string;
  sync_interval_minutes?: number;
  created_by: string;
}

export interface ConnectorUpdateInput {
  
  name: string;
  connector_type: string;
  status: string;
  provider: string;
  last_sync_at?: string;
  sync_interval_minutes?: number;
  updated_by: string;
}

export interface ConnectorListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface ConnectorListResult {
  rows: Connector[];
  total: number;
}

export type IntegrationsStatus = 'configured' | 'testing' | 'active' | 'paused' | 'error' | 'disabled' | 'archived';

export const INTEGRATIONS_STATUSES: readonly IntegrationsStatus[] = ['configured', 'testing', 'active', 'paused', 'error', 'disabled', 'archived'] as const;



export type IntegrationsSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const INTEGRATIONS_SOURCES: readonly IntegrationsSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type IntegrationsStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface IntegrationsEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'integrations';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: IntegrationsStatus;
  newState?: IntegrationsStatus;
  data: Record<string, unknown>;
}
