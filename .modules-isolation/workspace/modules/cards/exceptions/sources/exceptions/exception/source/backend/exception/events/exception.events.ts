import type { ModuleEventContract } from '@dos/types';

export const EXCEPTION_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'exception',
  published: {
  'exception.requested': { description: 'Emitted when an exception is requested', version: 1, payloadType: 'ExceptionEventPayload' },
  'exception.approved': { description: 'Emitted when an exception is approved', version: 1, payloadType: 'ExceptionEventPayload' },
  'exception.rejected': { description: 'Emitted when an exception is rejected', version: 1, payloadType: 'ExceptionEventPayload' },
  'exception.expired': { description: 'Emitted when an exception expires', version: 1, payloadType: 'ExceptionEventPayload' },
  'exception.extended': { description: 'Emitted when an exception is extended', version: 1, payloadType: 'ExceptionEventPayload' },
  'exception.compensating_control_assigned': { description: 'Emitted when a compensating control is assigned', version: 1, payloadType: 'ExceptionEventPayload' },
  'exception.compensating_control_removed': { description: 'Emitted when a compensating control is removed', version: 1, payloadType: 'ExceptionEventPayload' },
  'exception.effectiveness_updated': { description: 'Emitted when compensating control effectiveness is updated', version: 1, payloadType: 'ExceptionEventPayload' },
  'exception.justification_updated': { description: 'Emitted when exception justification is updated', version: 1, payloadType: 'ExceptionEventPayload' },
  'exception.risk_accepted': { description: 'Emitted when exception risk is accepted', version: 1, payloadType: 'ExceptionEventPayload' },
  'exception.review_due': { description: 'Emitted when exception review is due', version: 1, payloadType: 'ExceptionEventPayload' },
},
  consumed: {
  'compliance.gap_detected': { source: 'compliance', handler: 'handleComplianceGapDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'risk.score_changed': { source: 'risk', handler: 'handleRiskScoreChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'policy.approved': { source: 'policy', handler: 'handlePolicyApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.org.manager.changed': { source: 'foundation', handler: 'handleFoundationManagerChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'audit.finding_created': { source: 'audit', handler: 'handleAuditFindingCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'vendor.dd_completed': { source: 'vendor', handler: 'handleVendorDdCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'asset.criticality_changed': { source: 'asset', handler: 'handleAssetCriticalityChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const EXCEPTION_PUBLISHED_EVENTS = Object.keys(EXCEPTION_EVENT_CONTRACT.published);
export const EXCEPTION_CONSUMED_EVENTS = Object.keys(EXCEPTION_EVENT_CONTRACT.consumed);


export const EXCEPTION_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const EXCEPTION_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const EXCEPTION_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const EXCEPTION_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
