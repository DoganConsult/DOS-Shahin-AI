export interface BaseRow {
  id: string;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

export interface AuditableRow extends BaseRow {
  is_deleted: boolean;
  deleted_at?: Date;
  deleted_by?: string;
  version: number;
}

export type DbJson = Record<string, unknown>;
export type DbJsonArray = unknown[];

export interface GenericRow {
  [key: string]: any;
}

export interface ControlRow extends BaseRow {
  code: string;
  title: string;
  description?: string;
  framework_id?: string;
  domain_id?: string;
  status?: string;
  priority?: string;
  [key: string]: unknown;
}

export interface QueryResultLike<T = GenericRow> {
  rows: T[];
  rowCount?: number | null;
}

export interface PaginationParams {
  page: number;
  limit?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pageSize?: number;
  totalPages: number;
}
