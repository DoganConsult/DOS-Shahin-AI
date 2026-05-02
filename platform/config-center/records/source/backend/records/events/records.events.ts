import type { ModuleEventContract } from '@dos/types';

export const RECORDS_EVENT_CONTRACT: ModuleEventContract = {
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

export const RECORDS_PUBLISHED_EVENTS = Object.keys(RECORDS_EVENT_CONTRACT.published);
export const RECORDS_CONSUMED_EVENTS = Object.keys(RECORDS_EVENT_CONTRACT.consumed);


export const RECORDS_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const RECORDS_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const RECORDS_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const RECORDS_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
