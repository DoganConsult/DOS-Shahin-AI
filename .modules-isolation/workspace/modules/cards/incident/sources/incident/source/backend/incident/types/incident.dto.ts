import type { IncidentStatus } from './incident.types';

export interface IncidentCreateDTO {
  title: string;
  description?: string;
  incident_code?: string;
  incident_type?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  impact_assessment?: string;
  affected_systems?: string[];
  affected_users_count?: number;
  detection_method?: string;
  detection_date?: string;
  containment_date?: string;
  resolution_date?: string;
  root_cause?: string;
  lessons_learned?: string;
  reporter_id?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface IncidentUpdateDTO {
  title?: string;
  description?: string;
  status?: IncidentStatus;
  incident_code?: string;
  incident_type?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  impact_assessment?: string;
  affected_systems?: string[];
  affected_users_count?: number;
  detection_method?: string;
  detection_date?: string;
  containment_date?: string;
  resolution_date?: string;
  root_cause?: string;
  lessons_learned?: string;
  reporter_id?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface IncidentResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: IncidentStatus;
  incident_code?: string;
  incident_type?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  impact_assessment?: string;
  affected_systems?: string[];
  affected_users_count?: number;
  detection_method?: string;
  detection_date?: string;
  containment_date?: string;
  resolution_date?: string;
  root_cause?: string;
  reporter_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface IncidentListItemDTO {
  id: string;
  title: string;
  status: IncidentStatus;
  incident_code?: string;
  incident_type?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  detection_date?: string;
  resolution_date?: string;
  affected_users_count?: number;
  created_at: string;
  updated_at: string;
}

export interface IncidentDetailDTO extends IncidentResponseDTO {
  lessons_learned?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface IncidentAdminDTO extends IncidentDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface IncidentImportDTO {
  title: string;
  description?: string;
  status?: string;
  incident_code?: string;
  incident_type?: string;
  severity?: string;
  detection_date?: string;
  root_cause?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface IncidentExportDTO extends IncidentResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface IncidentSearchResultDTO {
  items: IncidentListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface IncidentAuditDTO {
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

export interface IncidentBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change';
  payload?: Record<string, unknown>;
}
