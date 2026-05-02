/**
 * reporting — API Contracts
 * Typed request/response shapes for the module's public API.
 */

export interface ReportingListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReportingListResponse {
  success: boolean;
  data: unknown[];
  total: number;
  page: number;
  limit: number;
}

export interface ReportingDetailResponse {
  success: boolean;
  data: unknown;
}

export interface ReportingMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
}
