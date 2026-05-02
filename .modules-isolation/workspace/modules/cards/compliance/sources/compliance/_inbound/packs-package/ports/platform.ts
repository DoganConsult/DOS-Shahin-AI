/**
 * @dos/types — API, webhook, and platform event types
 * Covers API keys, rate limits, webhook config, platform events, audit logs
 */

// ── API Key & Auth Types ──────────────────────────────────────────────────

export type ApiKeyStatus = 'active' | 'inactive' | 'revoked' | 'expired';
export type ApiKeyScope = 'read' | 'write' | 'admin' | 'webhook';

export interface ApiKey {
  keyId: string;
  tenantId: string;
  name: string;
  description?: string;
  status: ApiKeyStatus;
  scopes: ApiKeyScope[];
  allowedIPs?: string[];
  allowedOrigins?: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  createdBy: string;
  revokedBy?: string;
  revokedAt?: string;
  revocationReason?: string;
  hashedKey: string;
  prefix?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyUsageStats {
  keyId: string;
  tenantId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitBreaches: number;
  topEndpoints: EndpointStat[];
  lastCalculatedAt: string;
}

export interface EndpointStat {
  path: string;
  method: string;
  count: number;
  avgLatencyMs?: number;
}

// ── Rate Limit Types ──────────────────────────────────────────────────────

export type RateLimitScope = 'tenant' | 'api_key' | 'user' | 'ip' | 'endpoint';

export interface RateLimitPolicy {
  policyId: string;
  tenantId?: string;
  scope: RateLimitScope;
  entityId?: string;
  name?: string;
  requestsPerSecond?: number;
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  requestsPerMonth?: number;
  burstAllowance?: number;
  retryAfter?: number;
  isGlobal?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RateLimitStatus {
  entityId: string;
  scope: RateLimitScope;
  periodEnd: string;
  limit: number;
  remaining: number;
  used: number;
  resetAt: string;
  isThrottled: boolean;
}

// ── Webhook Types ──────────────────────────────────────────────────────────

export type WebhookStatus = 'active' | 'paused' | 'disabled' | 'error';
export type WebhookEventCategory =
  | 'risk'
  | 'compliance'
  | 'incident'
  | 'task'
  | 'approval'
  | 'audit'
  | 'user'
  | 'workspace'
  | 'integration'
  | 'notification';

export interface WebhookConfig {
  webhookId: string;
  tenantId: string;
  name?: string;
  description?: string;
  url: string;
  status: WebhookStatus;
  events: string[];
  signingSecret?: string;
  headers?: Record<string, string>;
  retryPolicy?: WebhookRetryPolicy;
  payloadFormat?: 'json' | 'form';
  maxPayloadKb?: number;
  lastTriggeredAt?: string;
  successCount?: number;
  failureCount?: number;
  consecutiveFailures?: number;
  disabledAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookRetryPolicy {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
}

export interface WebhookDeliveryRecord {
  deliveryId: string;
  webhookId: string;
  tenantId: string;
  eventType: string;
  eventId: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'delivered' | 'failed' | 'skipped';
  attempt: number;
  maxAttempts: number;
  statusCode?: number;
  responseBody?: string;
  latencyMs?: number;
  scheduledAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
  nextRetryAt?: string;
  createdAt: string;
}

// ── Platform Event / Domain Event Types ──────────────────────────────────

export type PlatformEventType =
  | 'risk.created'
  | 'risk.updated'
  | 'risk.closed'
  | 'risk.escalated'
  | 'control.created'
  | 'control.testing_due'
  | 'control.failed'
  | 'compliance.obligation.updated'
  | 'compliance.score.changed'
  | 'incident.created'
  | 'incident.escalated'
  | 'incident.closed'
  | 'task.created'
  | 'task.assigned'
  | 'task.completed'
  | 'task.overdue'
  | 'approval.requested'
  | 'approval.approved'
  | 'approval.rejected'
  | 'audit.started'
  | 'audit.finding.raised'
  | 'audit.completed'
  | 'vendor.assessment.due'
  | 'vendor.assessment.completed'
  | 'policy.published'
  | 'policy.attestation.due'
  | 'user.invited'
  | 'user.activated'
  | 'user.deactivated'
  | 'workspace.created'
  | 'workspace.archived'
  | 'alert.triggered'
  | 'sla.breached'
  | 'report.ready'
  | 'data_breach.detected'
  | 'dsar.received'
  | 'custom';

export interface PlatformEvent {
  eventId: string;
  tenantId: string;
  type: PlatformEventType;
  sourceModule?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  isSystemEvent?: boolean;
  payload: Record<string, unknown>;
  correlationId?: string;
  causalEventId?: string;
  metadata?: Record<string, unknown>;
  publishedAt: string;
  ttl?: number;
}

export interface EventSubscription {
  subscriptionId: string;
  tenantId?: string;
  subscriber: 'webhook' | 'email' | 'in_app' | 'integration' | 'job';
  subscriberId: string;
  eventTypes: string[];
  filter?: EventSubscriptionFilter;
  isActive: boolean;
  priority?: 'high' | 'normal' | 'low';
  createdAt: string;
  updatedAt: string;
}

export interface EventSubscriptionFilter {
  entityTypes?: string[];
  entityIds?: string[];
  modules?: string[];
  workspaceIds?: string[];
  conditions?: Record<string, unknown>;
}

// ── Audit Trail Types ─────────────────────────────────────────────────────

export type AuditTrailAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'export'
  | 'import'
  | 'approve'
  | 'reject'
  | 'publish'
  | 'archive'
  | 'restore'
  | 'login'
  | 'logout'
  | 'invite'
  | 'revoke'
  | 'execute';

export interface AuditTrailEntry {
  entryId: string;
  tenantId: string;
  workspaceId?: string;
  actorId?: string;
  actorType?: 'user' | 'api_key' | 'system' | 'agent';
  actorEmail?: string;
  action: AuditTrailAction;
  entityType: string;
  entityId?: string;
  entityName?: string;
  changes?: AuditTrailChanges;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  correlationId?: string;
  resultStatus: 'success' | 'failure' | 'partial';
  errorCode?: string;
  errorMessage?: string;
  requestMethod?: string;
  requestPath?: string;
  durationMs?: number;
  isSensitive?: boolean;
  timestamp: string;
}

export interface AuditTrailChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  fields?: AuditFieldChange[];
}

export interface AuditFieldChange {
  field: string;
  action: 'added' | 'changed' | 'removed';
  before?: unknown;
  after?: unknown;
}

export interface AuditTrailFilter {
  actorId?: string[];
  entityType?: string[];
  entityId?: string;
  action?: AuditTrailAction[];
  dateFrom?: string;
  dateTo?: string;
  resultStatus?: 'success' | 'failure';
  workspaceId?: string;
  isSensitive?: boolean;
}

// ── Health Check Types ────────────────────────────────────────────────────

export type ServiceHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ServiceHealth {
  serviceId: string;
  name: string;
  status: ServiceHealthStatus;
  version?: string;
  uptime?: number;
  lastCheckAt: string;
  checks?: HealthCheck[];
  dependencies?: ServiceDependencyHealth[];
  metadata?: Record<string, unknown>;
}

export interface HealthCheck {
  name: string;
  status: ServiceHealthStatus;
  latencyMs?: number;
  message?: string;
  checkedAt: string;
}

export interface ServiceDependencyHealth {
  name: string;
  type: 'database' | 'cache' | 'queue' | 'storage' | 'external_api' | 'service';
  status: ServiceHealthStatus;
  latencyMs?: number;
  message?: string;
}

// ── System Configuration ───────────────────────────────────────────────────

export interface SystemSetting {
  settingId: string;
  tenantId?: string;
  category: string;
  key: string;
  value: unknown;
  dataType: 'string' | 'number' | 'boolean' | 'json' | 'array';
  displayName?: string;
  description?: string;
  isSecret?: boolean;
  isReadOnly?: boolean;
  isEncrypted?: boolean;
  validationRules?: string[];
  allowedValues?: unknown[];
  scope: 'global' | 'tenant' | 'workspace';
  modifiedBy?: string;
  modifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemMaintenanceWindow {
  windowId: string;
  name: string;
  description?: string;
  startAt: string;
  endAt?: string;
  type: 'planned' | 'emergency';
  affectedServices?: string[];
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  notificationSentAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
