"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECORDS_EVENT_CORRELATION = exports.RECORDS_EVENT_SECURITY = exports.RECORDS_EVENT_ORDERING = exports.RECORDS_EVENT_LEGACY_ALIASES = exports.RECORDS_CONSUMED_EVENTS = exports.RECORDS_PUBLISHED_EVENTS = exports.RECORDS_EVENT_CONTRACT = void 0;
exports.RECORDS_EVENT_CONTRACT = {
    moduleCode: 'records',
    published: {
        'records.created': { description: 'Emitted when a record is created', version: 1, payloadType: 'RecordsEventPayload' },
        'records.classified': { description: 'Emitted when a record is classified', version: 1, payloadType: 'RecordsEventPayload' },
        'records.retention_set': { description: 'Emitted when retention schedule is set', version: 1, payloadType: 'RecordsEventPayload' },
        'records.disposal_requested': { description: 'Emitted when disposal is requested', version: 1, payloadType: 'RecordsEventPayload' },
        'records.disposal_approved': { description: 'Emitted when disposal is approved', version: 1, payloadType: 'RecordsEventPayload' },
        'records.hold_placed': { description: 'Emitted when a legal hold is placed', version: 1, payloadType: 'RecordsEventPayload' },
        'records.hold_released': { description: 'Emitted when a legal hold is released', version: 1, payloadType: 'RecordsEventPayload' },
    },
    consumed: {
        'compliance.posture_changed': { source: 'compliance', handler: 'handleCompliancePostureChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'policy.approved': { source: 'policy', handler: 'handlePolicyApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'audit.engagement_completed': { source: 'audit', handler: 'handleAuditEngagementCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
        'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    },
};
exports.RECORDS_PUBLISHED_EVENTS = Object.keys(exports.RECORDS_EVENT_CONTRACT.published);
exports.RECORDS_CONSUMED_EVENTS = Object.keys(exports.RECORDS_EVENT_CONTRACT.consumed);
exports.RECORDS_EVENT_LEGACY_ALIASES = {};
exports.RECORDS_EVENT_ORDERING = {
    strictOrdering: true,
    partitionKey: 'tenantId',
    deduplicationWindow: 300,
    maxRetries: 3,
    retryBackoffMs: [1000, 5000, 15000],
};
exports.RECORDS_EVENT_SECURITY = {
    requireAuthentication: true,
    allowCrossTenant: false,
    sensitivePayloadFields: [],
    auditAllPublishes: true,
    auditAllConsumptions: true,
    encryptPayload: false,
    signPayload: false,
};
exports.RECORDS_EVENT_CORRELATION = {
    enableCorrelation: true,
    propagateCorrelationId: true,
    generateIfMissing: true,
    includeInLogs: true,
    includeInTracing: true,
};
//# sourceMappingURL=records.events.js.map