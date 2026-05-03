export interface PlatformEvent {
    event_id?: string;
    event_type?: string;
    eventType?: string;
    module_code?: string;
    moduleCode?: string;
    module?: string;
    sourceService?: string;
    entity_type?: string;
    entity_id?: string;
    tenant_id?: string;
    tenantId?: string;
    userId?: string;
    actorId?: string;
    actor_type?: 'user' | 'system' | 'agent' | 'webhook';
    actor_id?: string;
    source?: string;
    correlation_id?: string;
    correlationId?: string;
    occurred_at?: string;
    occurredAt?: string;
    severity?: string;
    category?: string;
    entityId?: string;
    entityType?: string;
    payload?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    data?: Record<string, unknown>;
    event?: string;
}
export type EventCategory = 'domain' | 'platform' | 'security' | 'lifecycle' | 'integration' | 'ai';
export type EventSeverity = 'info' | 'warning' | 'error' | 'critical';
export interface EventRegistration {
    eventType: string;
    category: EventCategory;
    severity: EventSeverity;
    moduleCode: string;
    description?: string;
    payloadSchema?: Record<string, unknown>;
    version: number;
}
export interface EventSubscription {
    subscriberId: string;
    eventType: string;
    handler: string | ((event: PlatformEvent) => Promise<void> | void);
    idempotent?: boolean;
    retryPolicy?: 'none' | 'exponential' | 'fixed';
    deadLetterEnabled?: boolean;
}
export interface RetryPolicy {
    maxRetries: number;
    baseDelayMs: number;
    backoffMultiplier: number;
}
export declare const DEFAULT_RETRY_POLICY: RetryPolicy;
