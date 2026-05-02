import type { RiskStatus, RiskSeverity, RiskPriority } from './risk.types';

export interface RiskCreateDTO {
  title: string;
  description?: string;
  category: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  risk_score?: number;
  inherent_score?: number;
  residual_score?: number;
  treatment_plan?: string;
  treatment_status?: string;
  owner?: string;
  risk_code?: string;
  statement?: string;
  cause_text?: string;
  event_text?: string;
  impact_text?: string;
  business_unit_id?: string;
  trend_direction?: 'increasing' | 'stable' | 'decreasing';
  appetite_status?: 'within' | 'exceeded' | 'approaching';
  next_review_date?: string;
  severity?: RiskSeverity;
  priority?: RiskPriority;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface RiskUpdateDTO {
  title?: string;
  description?: string;
  status?: RiskStatus;
  category?: string;
  likelihood?: 1 | 2 | 3 | 4 | 5;
  impact?: 1 | 2 | 3 | 4 | 5;
  risk_score?: number;
  inherent_score?: number;
  residual_score?: number;
  treatment_plan?: string;
  treatment_status?: string;
  owner?: string;
  risk_code?: string;
  statement?: string;
  cause_text?: string;
  event_text?: string;
  impact_text?: string;
  business_unit_id?: string;
  trend_direction?: 'increasing' | 'stable' | 'decreasing';
  appetite_status?: 'within' | 'exceeded' | 'approaching';
  next_review_date?: string;
  severity?: RiskSeverity;
  priority?: RiskPriority;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface RiskResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: RiskStatus;
  category?: string;
  likelihood?: 1 | 2 | 3 | 4 | 5;
  impact?: 1 | 2 | 3 | 4 | 5;
  risk_score?: number;
  inherent_score?: number;
  residual_score?: number;
  treatment_status?: string;
  owner?: string;
  risk_code?: string;
  business_unit_id?: string;
  trend_direction?: 'increasing' | 'stable' | 'decreasing';
  appetite_status?: 'within' | 'exceeded' | 'approaching';
  next_review_date?: string;
  severity?: RiskSeverity;
  priority?: RiskPriority;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface RiskListItemDTO {
  id: string;
  title: string;
  status: RiskStatus;
  category?: string;
  likelihood?: 1 | 2 | 3 | 4 | 5;
  impact?: 1 | 2 | 3 | 4 | 5;
  risk_score?: number;
  residual_score?: number;
  severity?: RiskSeverity;
  priority?: RiskPriority;
  owner?: string;
  trend_direction?: 'increasing' | 'stable' | 'decreasing';
  appetite_status?: 'within' | 'exceeded' | 'approaching';
  next_review_date?: string;
  created_at: string;
  updated_at: string;
}

export interface RiskDetailDTO extends RiskResponseDTO {
  treatment_plan?: string;
  statement?: string;
  cause_text?: string;
  event_text?: string;
  impact_text?: string;
  risk_code?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface RiskAdminDTO extends RiskDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface RiskImportDTO {
  title: string;
  description?: string;
  status?: string;
  category?: string;
  likelihood?: number;
  impact?: number;
  risk_score?: number;
  owner?: string;
  risk_code?: string;
  severity?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface RiskExportDTO extends RiskResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface RiskSearchResultDTO {
  items: RiskListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface RiskAuditDTO {
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

export interface RiskBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change';
  payload?: Record<string, unknown>;
}
