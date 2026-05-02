import type { ResponseMeta, PaginatedMeta } from '@dos/types';

export interface ApiContract {
  route: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  ownerScope: 'platform' | 'product' | 'module';
  moduleCode?: string;
  contractVersion: string;
  authMode: 'authenticated' | 'public' | 'api_key' | 'service';
  permission?: string;
  description?: string;
  requestSchema?: string;
  responseSchema?: string;
  eventBehavior?: string;
  errorModel?: string;
  idempotent?: boolean;
  rateLimitTier?: 'standard' | 'elevated' | 'unlimited';
}

export * from './versioning';

export interface StandardListParams {
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface StandardListResponse<T> {
  success: true;
  data: T[];
  meta: PaginatedMeta;
}

export interface StandardDetailResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

export interface StandardMutationResponse {
  success: true;
  id?: string;
  message: string;
  meta: ResponseMeta;
}

export interface StandardDeleteResponse {
  success: true;
  message: string;
  meta: ResponseMeta;
}
export * from './ai-engine-contracts';
