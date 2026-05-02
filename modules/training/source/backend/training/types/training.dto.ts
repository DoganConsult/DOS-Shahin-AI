import type { TrainingStatus } from './training.types';

export interface TrainingCreateDTO {
  title: string;
  description?: string;
  program_type?: 'course' | 'workshop' | 'certification' | 'awareness' | 'simulation';
  program_code?: string;
  curriculum_id?: string;
  delivery_method?: 'online' | 'classroom' | 'hybrid' | 'self_paced';
  instructor_id?: string;
  target_audience?: string[];
  required_roles?: string[];
  duration_hours?: number;
  passing_score?: number;
  max_attempts?: number;
  certification_valid_days?: number;
  recurrence_interval_days?: number;
  linked_policy_ids?: string[];
  linked_framework_ids?: string[];
  content_language?: string;
  assessment_type?: 'quiz' | 'practical' | 'simulation' | 'observation';
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface TrainingUpdateDTO {
  title?: string;
  description?: string;
  status?: TrainingStatus;
  program_type?: 'course' | 'workshop' | 'certification' | 'awareness' | 'simulation';
  program_code?: string;
  delivery_method?: 'online' | 'classroom' | 'hybrid' | 'self_paced';
  instructor_id?: string;
  target_audience?: string[];
  required_roles?: string[];
  duration_hours?: number;
  passing_score?: number;
  max_attempts?: number;
  certification_valid_days?: number;
  recurrence_interval_days?: number;
  content_language?: string;
  assessment_type?: 'quiz' | 'practical' | 'simulation' | 'observation';
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface TrainingResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: TrainingStatus;
  program_type?: string;
  program_code?: string;
  curriculum_id?: string;
  delivery_method?: string;
  instructor_id?: string;
  target_audience?: string[];
  required_roles?: string[];
  duration_hours?: number;
  passing_score?: number;
  max_attempts?: number;
  enrollment_count?: number;
  completion_count?: number;
  completion_rate?: number;
  certification_valid_days?: number;
  recurrence_interval_days?: number;
  content_language?: string;
  assessment_type?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface TrainingListItemDTO {
  id: string;
  title: string;
  status: TrainingStatus;
  program_type?: string;
  program_code?: string;
  delivery_method?: string;
  duration_hours?: number;
  enrollment_count?: number;
  completion_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingDetailDTO extends TrainingResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface TrainingAdminDTO extends TrainingDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface TrainingImportDTO {
  title: string;
  description?: string;
  status?: string;
  program_type?: string;
  delivery_method?: string;
  duration_hours?: number;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface TrainingExportDTO extends TrainingResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface TrainingSearchResultDTO {
  items: TrainingListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface TrainingAuditDTO {
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

export interface TrainingBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change' | 'enroll' | 'unenroll';
  payload?: Record<string, unknown>;
}
