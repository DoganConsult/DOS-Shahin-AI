/**
 * @dos/types — integration and connector types
 * Covers integration connectors, mappings, sync jobs, event streams
 */
export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending' | 'testing';
export type IntegrationAuthType = 'api_key' | 'oauth2' | 'basic' | 'certificate' | 'bearer' | 'custom';
export type SyncDirection = 'inbound' | 'outbound' | 'bidirectional';
export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual' | 'on_event';
export interface IntegrationConnector {
    connectorId: string;
    tenantId: string;
    name: string;
    connectorType: string;
    status: IntegrationStatus;
    authType: IntegrationAuthType;
    direction: SyncDirection;
    syncFrequency: SyncFrequency;
    lastSyncAt?: string;
    nextSyncAt?: string;
    configuration: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface ConnectorCredentials {
    connectorId: string;
    tenantId: string;
    authType: IntegrationAuthType;
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: string;
    username?: string;
    password?: string;
    certificate?: string;
    privateKey?: string;
    encryptedAt?: string;
    updatedAt: string;
}
export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'partial';
export interface SyncJob {
    jobId: string;
    connectorId: string;
    tenantId: string;
    status: SyncJobStatus;
    direction: SyncDirection;
    entityType?: string;
    startedAt?: string;
    completedAt?: string;
    recordsTotal?: number;
    recordsProcessed?: number;
    recordsFailed?: number;
    errors?: SyncError[];
    triggeredBy?: 'schedule' | 'manual' | 'event' | 'system';
    correlationId?: string;
    metadata?: Record<string, unknown>;
}
export interface SyncError {
    recordId?: string;
    entityType?: string;
    message: string;
    code?: string;
    timestamp: string;
    retryable?: boolean;
}
export interface SyncResult {
    jobId: string;
    status: SyncJobStatus;
    recordsProcessed: number;
    recordsFailed: number;
    duration: number;
    errors?: SyncError[];
}
export type TransformType = 'direct' | 'rename' | 'lookup' | 'default' | 'concat' | 'split' | 'date_format' | 'enum_map' | 'expression';
export interface FieldMapping {
    mappingId: string;
    connectorId: string;
    tenantId: string;
    entityType: string;
    sourceSystem: string;
    targetSystem: string;
    sourceField: string;
    targetField: string;
    transformType: TransformType;
    transformConfig?: Record<string, unknown>;
    isRequired: boolean;
    defaultValue?: unknown;
    validationRule?: string;
    createdAt: string;
    updatedAt: string;
}
export interface MappingTemplate {
    templateId: string;
    connectorType: string;
    entityType: string;
    name: string;
    description?: string;
    mappings: Omit<FieldMapping, 'mappingId' | 'connectorId' | 'tenantId' | 'createdAt' | 'updatedAt'>[];
    isDefault: boolean;
    version: string;
}
export type InboundEventStatus = 'received' | 'processing' | 'processed' | 'failed' | 'ignored';
export interface InboundEvent {
    eventId: string;
    connectorId: string;
    tenantId: string;
    sourceSystem: string;
    eventType: string;
    payload: Record<string, unknown>;
    status: InboundEventStatus;
    processedAt?: string;
    correlationId?: string;
    retryCount?: number;
    error?: string;
    receivedAt: string;
}
export interface InboundEventFilter {
    connectorId?: string;
    sourceSystem?: string;
    eventType?: string;
    status?: InboundEventStatus;
    fromDate?: string;
    toDate?: string;
}
export type CommonObjectType = 'contact' | 'organization' | 'asset' | 'risk' | 'control' | 'finding' | 'task' | 'incident' | 'evidence' | 'document' | 'ticket';
export interface CommonObject {
    objectId: string;
    tenantId: string;
    objectType: CommonObjectType;
    externalId?: string;
    sourceSystem?: string;
    data: Record<string, unknown>;
    lastSyncedAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface EntityLink {
    linkId: string;
    tenantId: string;
    sourceEntityType: string;
    sourceEntityId: string;
    targetEntityType: string;
    targetEntityId: string;
    linkType: string;
    strength?: 'weak' | 'strong' | 'causal' | 'related';
    metadata?: Record<string, unknown>;
    createdAt: string;
    createdBy?: string;
}
export interface ExternalAPIConfig {
    apiId: string;
    tenantId: string;
    name: string;
    baseUrl: string;
    version?: string;
    authType: IntegrationAuthType;
    credentials?: Partial<ConnectorCredentials>;
    headers?: Record<string, string>;
    timeout?: number;
    retryConfig?: {
        maxRetries: number;
        retryOn: number[];
        backoffMs: number;
    };
    rateLimiting?: {
        requestsPerSecond?: number;
        requestsPerMinute?: number;
        requestsPerHour?: number;
    };
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface APIHealthStatus {
    apiId: string;
    isAvailable: boolean;
    latencyMs?: number;
    lastCheckedAt: string;
    statusCode?: number;
    errorMessage?: string;
}
export type StreamStatus = 'active' | 'paused' | 'closed' | 'error';
export type StreamEventType = string;
export interface EventStream {
    streamId: string;
    tenantId: string;
    streamType: string;
    status: StreamStatus;
    subscriberCount?: number;
    lastEventAt?: string;
    eventsPerSecond?: number;
    createdAt: string;
}
export interface StreamSubscription {
    subscriptionId: string;
    streamId: string;
    tenantId: string;
    subscriberId: string;
    subscriberType: 'module' | 'webhook' | 'user' | 'system';
    eventTypes: StreamEventType[];
    filter?: Record<string, unknown>;
    isActive: boolean;
    createdAt: string;
}
export interface ConnectorDefinition {
    connectorType: string;
    displayName: string;
    displayNameAr: string;
    description?: string;
    logoUrl?: string;
    category: 'iam' | 'itsm' | 'cmdb' | 'siem' | 'erp' | 'storage' | 'ticketing' | 'custom';
    supportedAuthTypes: IntegrationAuthType[];
    supportedEntities: string[];
    defaultSyncFrequency: SyncFrequency;
    requiredFields: string[];
    optionalFields: string[];
    documentationUrl?: string;
    isActive: boolean;
    version: string;
}
export interface ConnectorCapabilities {
    connectorType: string;
    canRead: boolean;
    canWrite: boolean;
    canStream: boolean;
    supportsWebhooks: boolean;
    supportsBatch: boolean;
    maxBatchSize?: number;
    supportedEntityTypes: string[];
}
export type ERPType = 'sap' | 'oracle' | 'dynamics' | 'custom' | string;
export type AuthMethod = IntegrationAuthType;
export interface ERPConnection {
    connectionId?: string;
    erpType?: ERPType;
    host?: string;
    status?: string;
    lastSyncAt?: string;
    [k: string]: unknown;
}
export interface FieldMappingConfig {
    sourceField?: string;
    targetField?: string;
    transform?: string;
    required?: boolean;
    [k: string]: unknown;
}
export interface SyncJobResult {
    jobId?: string;
    status?: string;
    recordsSynced?: number;
    recordsFailed?: number;
    startedAt?: string;
    completedAt?: string;
    [k: string]: unknown;
}
