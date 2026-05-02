import type { AnalyticsStatus } from './analytics.types';

export interface AnalyticsCreateDTO {
  title: string;
  description?: string;
  report_type?: 'dashboard' | 'kpi' | 'trend' | 'comparison' | 'audit_log' | 'executive_summary';
  report_code?: string;
  data_source_modules?: string[];
  refresh_interval_minutes?: number;
  cache_ttl_minutes?: number;
  visualization_type?: 'chart' | 'table' | 'heatmap' | 'treemap' | 'gauge' | 'timeline';
  date_range_start?: string;
  date_range_end?: string;
  aggregation_level?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  filters?: Record<string, unknown>;
  drill_down_enabled?: boolean;
  export_formats?: string[];
  schedule_cron?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AnalyticsUpdateDTO {
  title?: string;
  description?: string;
  status?: AnalyticsStatus;
  report_type?: 'dashboard' | 'kpi' | 'trend' | 'comparison' | 'audit_log' | 'executive_summary';
  data_source_modules?: string[];
  refresh_interval_minutes?: number;
  cache_ttl_minutes?: number;
  visualization_type?: string;
  date_range_start?: string;
  date_range_end?: string;
  aggregation_level?: string;
  filters?: Record<string, unknown>;
  drill_down_enabled?: boolean;
  export_formats?: string[];
  schedule_cron?: string;
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AnalyticsResponseDTO {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  status: AnalyticsStatus;
  report_type?: string;
  report_code?: string;
  data_source_modules?: string[];
  refresh_interval_minutes?: number;
  cache_ttl_minutes?: number;
  visualization_type?: string;
  date_range_start?: string;
  date_range_end?: string;
  aggregation_level?: string;
  filters?: Record<string, unknown>;
  drill_down_enabled?: boolean;
  export_formats?: string[];
  schedule_cron?: string;
  last_generated_at?: string;
  row_count?: number;
  generation_time_ms?: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface AnalyticsListItemDTO {
  id: string;
  title: string;
  status: AnalyticsStatus;
  report_type?: string;
  report_code?: string;
  visualization_type?: string;
  data_source_modules?: string[];
  last_generated_at?: string;
  row_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsDetailDTO extends AnalyticsResponseDTO {
  assigned_to?: string;
  due_date?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  audit_trail?: Array<{ action: string; actor: string; timestamp: string; details?: string }>;
  linked_entities?: Array<{ module: string; entity_id: string; entity_type: string }>;
}

export interface AnalyticsAdminDTO extends AnalyticsDetailDTO {
  tenant_id: string;
  deleted_at?: string | null;
  internal_notes?: string;
  system_flags?: Record<string, boolean>;
}

export interface AnalyticsImportDTO {
  title: string;
  description?: string;
  status?: string;
  report_type?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsExportDTO extends AnalyticsResponseDTO {
  export_timestamp: string;
  export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}

export interface AnalyticsSearchResultDTO {
  items: AnalyticsListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface AnalyticsAuditDTO {
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

export interface AnalyticsBulkOperationDTO {
  ids: string[];
  operation: 'update' | 'delete' | 'archive' | 'refresh' | 'schedule' | 'status_change';
  payload?: Record<string, unknown>;
}
