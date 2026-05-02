export interface AgentExecution {
  execution_id: string;
  tenant_id: string;
  agent_id: string;
  module_code: string;
  status: string;
  action_type: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface AgentExecutionCreateInput {
  tenant_id: string;
  agent_id: string;
  module_code: string;
  status: string;
  action_type: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  created_by: string;
}

export interface AgentExecutionUpdateInput {
  
  agent_id: string;
  module_code: string;
  status: string;
  action_type: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
  updated_by: string;
}

export interface AgentExecutionListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface AgentExecutionListResult {
  rows: AgentExecution[];
  total: number;
}

export type AiStatus = 'idle' | 'processing' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled';

export const AI_STATUSES: readonly AiStatus[] = ['idle', 'processing', 'awaiting_approval', 'completed', 'failed', 'cancelled'] as const;



export type AiSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export const AI_SOURCES: readonly AiSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type AiStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface AiEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'ai';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: AiStatus;
  newState?: AiStatus;
  data: Record<string, unknown>;
}
