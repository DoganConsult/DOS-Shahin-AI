import type { ReportingStatus } from './reporting.types';

export interface ReportingCreateDTO {
  title: string;
  description?: string;
  report_template_code?: string;
  report_type?: 'compliance' | 'risk' | 'audit' | 'executive' | 'regulatory' | 'custom';
  output_format?: 'pdf' | 'xlsx' | 'csv' | 'html' | 'docx';
  template_version?: number;
  data_sources?: string[];
  parameters?: Record<string, unknown>;
  schedule_type?: 'on_demand' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipient_ids?: string[];
  distribution_list?: string;
  include_charts?: boolean;
  watermark_text?: string;
  classification?: 'public' | 'internal' | 'confidential';
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ReportingUpdateDTO {
  title?: string;
  description?: string;
  status?: ReportingStatus;
  report_type?: 'compliance' | 'risk' | 'audit' | 'executive' | 'regulatory' | 'custom';
  output_format?: 'pdf' | 'xlsx' | 'csv' | 'html' | 'docx';
  data_sources?: string[];
  parameters?: Record<string, unknown>;
  schedule_type?: 'on_demand' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipient_ids?: string[];
  distribution_list?: string;
  include_charts?: boolean;
  watermark_text?: string;
  classification?: 'public' | 'internal' | 'confidential';
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ReportingResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: ReportingStatus;
  report_template_code?: string;
  report_type?: string;
  output_format?: string;
  template_version?: number;
  data_sources?: string[];
  parameters?: Record<string, unknown>;
  schedule_type?: string;
  generated_by?: string;
  generated_at?: string;
  file_size_bytes?: number;
  download_url?: string;
  expiry_date?: string;
  recipient_ids?: string[];
  distribution_list?: string;
  include_charts?: boolean;
  watermark_text?: string;
  classification?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ReportingListItemDTO {
  id: string;
  title: string;
  status: ReportingStatus;
  report_type?: string;
  output_format?: string;
  schedule_type?: string;
  generated_at?: string;
  file_size_bytes?: number;
  classification?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportingDetailDTO extends ReportingResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface ReportingAdminDTO extends ReportingDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface ReportingImportDTO {
  title: string;
  description?: string;
  status?: string;
  report_type?: string;
  output_format?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface ReportingExportDTO extends ReportingResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface ReportingSearchResultDTO {
  items: ReportingListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface ReportingAuditDTO {
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

export interface ReportingBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'regenerate' | 'distribute' | 'status_change';
  payload?: Record<string, unknown>;
}
