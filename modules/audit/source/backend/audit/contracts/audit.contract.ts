/**
 * audit — API Contracts
 * Typed request/response shapes for the module's public API.
 */

export interface AuditListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditListResponse {
  success: boolean;
  data: unknown[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditDetailResponse {
  success: boolean;
  data: unknown;
}

export interface AuditMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
}
