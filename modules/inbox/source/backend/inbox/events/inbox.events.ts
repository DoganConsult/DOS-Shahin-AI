import type { ModuleEventContract } from '@dos/types';

export const INBOX_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'inbox',
  published: {
  'inbox.message_received': { description: 'Emitted when a message is received', version: 1, payloadType: 'InboxEventPayload' },
  'inbox.action_requested': { description: 'Emitted when an action request is created', version: 1, payloadType: 'InboxEventPayload' },
  'inbox.action_completed': { description: 'Emitted when an action request is completed', version: 1, payloadType: 'InboxEventPayload' },
  'inbox.notification_read': { description: 'Emitted when a notification is read', version: 1, payloadType: 'InboxEventPayload' },
  'inbox.digest_sent': { description: 'Emitted when a digest is sent', version: 1, payloadType: 'InboxEventPayload' },
},
  consumed: {
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'governance.action_created': { source: 'governance', handler: 'handleGovernanceActionCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.escalated': { source: 'incident', handler: 'handleIncidentEscalated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'compliance.review_overdue': { source: 'compliance', handler: 'handleComplianceReviewOverdue', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const INBOX_PUBLISHED_EVENTS = Object.keys(INBOX_EVENT_CONTRACT.published);
export const INBOX_CONSUMED_EVENTS = Object.keys(INBOX_EVENT_CONTRACT.consumed);


export const INBOX_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const INBOX_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const INBOX_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const INBOX_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
