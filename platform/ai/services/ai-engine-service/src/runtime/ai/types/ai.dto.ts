import type { AiStatus } from './ai.types';

export interface AiCreateDTO {
  title: string;
  description?: string;
  agent_id?: string;
  agent_code?: string;
  agent_name?: string;
  agent_type?: 'risk' | 'compliance' | 'policy' | 'evidence' | 'audit' | 'incident' | 'vendor' | 'remediation' | 'training' | 'ai_governance';
  model_provider?: 'azure_openai' | 'ollama' | 'anthropic';
  model_id?: string;
  prompt_template_id?: string;
  max_tokens?: number;
  temperature?: number;
  bound_modules?: string[];
  autonomy_level?: number;
  human_review_required?: boolean;
  budget_limit_monthly?: number;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AiUpdateDTO {
  title?: string;
  description?: string;
  status?: AiStatus;
  agent_name?: string;
  model_provider?: 'azure_openai' | 'ollama' | 'anthropic';
  model_id?: string;
  max_tokens?: number;
  temperature?: number;
  bound_modules?: string[];
  autonomy_level?: number;
  human_review_required?: boolean;
  kill_switch_active?: boolean;
  budget_limit_monthly?: number;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AiResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: AiStatus;
  agent_id?: string;
  agent_code?: string;
  agent_name?: string;
  agent_type?: string;
  model_provider?: string;
  model_id?: string;
  max_tokens?: number;
  temperature?: number;
  token_usage_total?: number;
  token_usage_month?: number;
  invocation_count?: number;
  success_rate?: number;
  avg_response_time_ms?: number;
  last_invoked_at?: string;
  bound_modules?: string[];
  autonomy_level?: number;
  human_review_required?: boolean;
  kill_switch_active?: boolean;
  budget_limit_monthly?: number;
  budget_used_monthly?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface AiListItemDTO {
  id: string;
  title: string;
  status: AiStatus;
  agent_code?: string;
  agent_type?: string;
  model_provider?: string;
  invocation_count?: number;
  success_rate?: number;
  kill_switch_active?: boolean;
  budget_used_monthly?: number;
  last_invoked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AiDetailDTO extends AiResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface AiAdminDTO extends AiDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface AiImportDTO {
  title: string;
  description?: string;
  status?: string;
  agent_code?: string;
  agent_type?: string;
  model_provider?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface AiExportDTO extends AiResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface AiSearchResultDTO {
  items: AiListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface AiAuditDTO {
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

export interface AiBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'activate' | 'kill_switch' | 'status_change';
  payload?: Record<string, unknown>;
}
