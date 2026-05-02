export interface AuthenticatedUser {
  userId?: string;
  id?: string;
  email?: string;
  tenantId?: string;
  role?: string;
  is_super_admin?: boolean;
  roles?: string[];
  role_code?: string;
  departmentId?: string;
  orgUnitIds?: string[];
  name?: string;
  permissions?: string[];
  userRole?: string;
  [key: string]: unknown;
}

export interface ExternalScope {
  tenantId: string;
  entityType: string;
  entityId: string;
  role: string;
  permissions: string[];
}

export interface AuthenticatedRequest {
  user?: AuthenticatedUser;
  tenantId?: string;
  tenantSchema?: string;
  moduleCode?: string;
  module?: string;
  resolvedTenantId?: string;
  correlationId?: string;
  lang?: string;
  userId?: string;
  externalScope?: ExternalScope;
  permissions?: string[];
  userRole?: string;
  ownershipField?: string;
  requestingUserId?: string;
  aiOperationMode?: string;
  _catalogAll?: boolean;
  resolvedProductKey?: string;
  lifecycleAuth?: { allowed: boolean; reason?: string; fromStatus?: string; toStatus?: string };
  scope?: { tenantId: string; orgId?: string; buId?: string; deptId?: string; teamId?: string };
  apiKey?: Record<string, unknown>;
  params: Record<string, string>;
  body: any;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
  method: string;
  path: string;
  url: string;
  originalUrl: string;
  baseUrl: string;
  ip?: string;
  socket?: { remoteAddress?: string };
  get(name: 'set-cookie'): string[] | undefined;
  get(name: string): string | undefined;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
}

export interface PaginatedMeta extends ResponseMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginatedMeta;
}

export interface ApiActionResponse {
  success: true;
  message: string;
  meta: ResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  correlationId?: string;
}
