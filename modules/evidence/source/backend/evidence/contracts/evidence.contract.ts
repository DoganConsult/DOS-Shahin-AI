/**
 * evidence — API Contracts
 * Typed request/response shapes for the module's public API.
 */

export interface EvidenceListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EvidenceListResponse {
  success: boolean;
  data: unknown[];
  total: number;
  page: number;
  limit: number;
}

export interface EvidenceDetailResponse {
  success: boolean;
  data: unknown;
}

export interface EvidenceMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
}
