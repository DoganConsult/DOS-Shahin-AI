import type { EvidenceStatus } from './evidence.types';

export interface EvidenceCreateDTO {
  title: string;
  description?: string;
  evidence_type?: 'document' | 'screenshot' | 'log' | 'attestation' | 'report';
  source_module?: string;
  source_entity_id?: string;
  control_id?: string;
  file_path?: string;
  file_size?: number;
  file_hash?: string;
  collection_date?: string;
  validity_start?: string;
  validity_end?: string;
  collector_id?: string;
  review_status?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface EvidenceUpdateDTO {
  title?: string;
  description?: string;
  status?: EvidenceStatus;
  evidence_type?: 'document' | 'screenshot' | 'log' | 'attestation' | 'report';
  source_module?: string;
  source_entity_id?: string;
  control_id?: string;
  file_path?: string;
  file_size?: number;
  file_hash?: string;
  collection_date?: string;
  validity_start?: string;
  validity_end?: string;
  collector_id?: string;
  review_status?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface EvidenceResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: EvidenceStatus;
  evidence_type?: 'document' | 'screenshot' | 'log' | 'attestation' | 'report';
  source_module?: string;
  source_entity_id?: string;
  control_id?: string;
  file_path?: string;
  file_size?: number;
  file_hash?: string;
  collection_date?: string;
  validity_start?: string;
  validity_end?: string;
  collector_id?: string;
  review_status?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface EvidenceListItemDTO {
  id: string;
  title: string;
  status: EvidenceStatus;
  evidence_type?: 'document' | 'screenshot' | 'log' | 'attestation' | 'report';
  source_module?: string;
  control_id?: string;
  collection_date?: string;
  validity_end?: string;
  review_status?: string;
  created_at: string;
  updated_at: string;
}

export interface EvidenceDetailDTO extends EvidenceResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface EvidenceAdminDTO extends EvidenceDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface EvidenceImportDTO {
  title: string;
  description?: string;
  status?: string;
  evidence_type?: string;
  source_module?: string;
  control_id?: string;
  collection_date?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface EvidenceExportDTO extends EvidenceResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface EvidenceSearchResultDTO {
  items: EvidenceListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface EvidenceAuditDTO {
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

export interface EvidenceBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change';
  payload?: Record<string, unknown>;
}
