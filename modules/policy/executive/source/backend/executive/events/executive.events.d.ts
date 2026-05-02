import type { ModuleEventContract } from '@dos/types';
export declare const EXECUTIVE_EVENT_CONTRACT: ModuleEventContract;
export declare const EXECUTIVE_PUBLISHED_EVENTS: string[];
export declare const EXECUTIVE_CONSUMED_EVENTS: string[];
export declare const EXECUTIVE_EVENT_ORDERING: {
    readonly strictOrdering: true;
    readonly partitionKey: "tenantId";
    readonly deduplicationWindow: 300;
    readonly maxRetries: 3;
    readonly retryBackoffMs: readonly [1000, 5000, 15000];
};
export declare const EXECUTIVE_EVENT_SECURITY: {
    readonly requireAuthentication: true;
    readonly allowCrossTenant: false;
    readonly sensitivePayloadFields: string[];
    readonly auditAllPublishes: true;
    readonly auditAllConsumptions: true;
    readonly encryptPayload: false;
    readonly signPayload: true;
};
export declare const EXECUTIVE_EVENT_CORRELATION: {
    readonly enableCorrelation: true;
    readonly propagateCorrelationId: true;
    readonly generateIfMissing: true;
    readonly includeInLogs: true;
    readonly includeInTracing: true;
};
