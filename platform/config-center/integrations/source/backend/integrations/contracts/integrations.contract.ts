export interface IntegrationConnectorContract {
  connectorId: string;
  tenantId: string;
  code: string;
  nameEn: string;
  nameAr: string | null;
  connectorType: 'api' | 'webhook' | 'database' | 'file' | 'saas' | 'custom';
  provider: string;
  status: 'active' | 'inactive' | 'error' | 'pending_auth' | 'deprecated';
  authMethod: 'api_key' | 'oauth2' | 'basic' | 'bearer' | 'mtls' | 'none';
  lastSyncAt: string | null;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual' | null;
  errorCount: number;
  successRate: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationConfigContract {
  configId: string;
  connectorId: string;
  tenantId: string;
  endpoint: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  mappingRules: IntegrationMappingRule[];
  retryPolicy: { maxRetries: number; backoffMs: number[] };
  timeoutMs: number;
  rateLimitPerMinute: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationMappingRule {
  sourceField: string;
  targetField: string;
  transform: 'direct' | 'uppercase' | 'lowercase' | 'date_format' | 'lookup' | 'custom';
  customExpression: string | null;
}

export interface IntegrationSyncLogContract {
  syncId: string;
  connectorId: string;
  tenantId: string;
  direction: 'inbound' | 'outbound' | 'bidirectional';
  status: 'started' | 'completed' | 'partial' | 'failed';
  recordsProcessed: number;
  recordsFailed: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
}

export interface IntegrationWebhookContract {
  webhookId: string;
  tenantId: string;
  nameEn: string;
  targetUrl: string;
  events: string[];
  status: 'active' | 'inactive' | 'failed';
  secretHash: string;
  lastTriggeredAt: string | null;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationApiKeyContract {
  keyId: string;
  tenantId: string;
  nameEn: string;
  prefix: string;
  scopes: string[];
  status: 'active' | 'revoked' | 'expired';
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdBy: string;
  createdAt: string;
}

export interface IntegrationOAuthTokenContract {
  tokenId: string;
  connectorId: string;
  tenantId: string;
  provider: string;
  status: 'valid' | 'expired' | 'revoked' | 'refresh_failed';
  expiresAt: string;
  refreshExpiresAt: string | null;
  scopes: string[];
  lastRefreshedAt: string | null;
}

export interface IntegrationDiagnosticsContract {
  tenantId: string;
  totalConnectors: number;
  activeConnectors: number;
  errorConnectors: number;
  totalWebhooks: number;
  failedWebhooks: number;
  totalApiKeys: number;
  expiredApiKeys: number;
  avgSyncSuccessRate: number | null;
  lastSyncAt: string | null;
  capturedAt: string;
}

export interface IntegrationsListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  connectorType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IntegrationsListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
