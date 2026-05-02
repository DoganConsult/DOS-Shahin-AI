/**
 * compliance — API Contracts
 * Typed request/response shapes for the module's public API.
 */

export interface ComplianceListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ComplianceListResponse {
  success: boolean;
  data: unknown[];
  total: number;
  page: number;
  limit: number;
}

export interface ComplianceDetailResponse {
  success: boolean;
  data: unknown;
}

export interface ComplianceMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
}
