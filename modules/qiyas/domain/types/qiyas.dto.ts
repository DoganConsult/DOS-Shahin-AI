import type { QiyasStatus } from './qiyas.types';

export interface QiyasCreateDTO {
  title: string;
  description?: string;
  assessment_type?: 'maturity' | 'capability' | 'readiness' | 'gap_analysis' | 'benchmark';
  assessment_code?: string;
  framework_id?: string;
  framework_name?: string;
  domain_area?: string;
  target_maturity_level?: number;
  question_count?: number;
  benchmark_group?: string;
  assessment_period_start?: string;
  assessment_period_end?: string;
  assessor_id?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface QiyasUpdateDTO {
  title?: string;
  description?: string;
  status?: QiyasStatus;
  assessment_type?: 'maturity' | 'capability' | 'readiness' | 'gap_analysis' | 'benchmark';
  framework_id?: string;
  framework_name?: string;
  domain_area?: string;
  target_maturity_level?: number;
  current_maturity_level?: number;
  maturity_score?: number;
  completed_questions?: number;
  response_rate?: number;
  improvement_areas?: string[];
  strengths?: string[];
  next_assessment_date?: string;
  assessor_id?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface QiyasResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: QiyasStatus;
  assessment_type?: string;
  assessment_code?: string;
  framework_id?: string;
  framework_name?: string;
  domain_area?: string;
  target_maturity_level?: number;
  current_maturity_level?: number;
  maturity_score?: number;
  question_count?: number;
  completed_questions?: number;
  response_rate?: number;
  benchmark_group?: string;
  industry_average?: number;
  percentile_rank?: number;
  improvement_areas?: string[];
  strengths?: string[];
  assessment_period_start?: string;
  assessment_period_end?: string;
  next_assessment_date?: string;
  assessor_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface QiyasListItemDTO {
  id: string;
  title: string;
  status: QiyasStatus;
  assessment_type?: string;
  framework_name?: string;
  domain_area?: string;
  current_maturity_level?: number;
  target_maturity_level?: number;
  maturity_score?: number;
  response_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface QiyasDetailDTO extends QiyasResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface QiyasAdminDTO extends QiyasDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface QiyasImportDTO {
  title: string;
  description?: string;
  status?: string;
  assessment_type?: string;
  framework_name?: string;
  domain_area?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface QiyasExportDTO extends QiyasResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface QiyasSearchResultDTO {
  items: QiyasListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface QiyasAuditDTO {
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

export interface QiyasBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change';
  payload?: Record<string, unknown>;
}
