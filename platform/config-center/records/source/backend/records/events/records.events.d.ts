import type { ModuleEventContract } from '@dos/types';
export declare const RECORDS_EVENT_CONTRACT: ModuleEventContract;
export declare const RECORDS_PUBLISHED_EVENTS: string[];
export declare const RECORDS_CONSUMED_EVENTS: string[];
export declare const RECORDS_EVENT_LEGACY_ALIASES: Record<string, string>;
export declare const RECORDS_EVENT_ORDERING: {
    readonly strictOrdering: true;
    readonly partitionKey: "tenantId";
    readonly deduplicationWindow: 300;
    readonly maxRetries: 3;
    readonly retryBackoffMs: readonly [1000, 5000, 15000];
};
export declare const RECORDS_EVENT_SECURITY: {
    readonly requireAuthentication: true;
    readonly allowCrossTenant: false;
    readonly sensitivePayloadFields: string[];
    readonly auditAllPublishes: true;
    readonly auditAllConsumptions: true;
    readonly encryptPayload: false;
    readonly signPayload: false;
};
export declare const RECORDS_EVENT_CORRELATION: {
    readonly enableCorrelation: true;
    readonly propagateCorrelationId: true;
    readonly generateIfMissing: true;
    readonly includeInLogs: true;
    readonly includeInTracing: true;
};
