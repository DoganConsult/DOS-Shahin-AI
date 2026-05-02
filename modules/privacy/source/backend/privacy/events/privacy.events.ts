import type { ModuleEventContract } from '@dos/types';

export const PRIVACY_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'privacy',
  published: {
  'privacy.dsr_received': { description: 'Emitted when a data subject request is received', version: 1, payloadType: 'PrivacyEventPayload' },
  'privacy.dsr_completed': { description: 'Emitted when a data subject request is completed', version: 1, payloadType: 'PrivacyEventPayload' },
  'privacy.dsr_overdue': { description: 'Emitted when a data subject request is overdue', version: 1, payloadType: 'PrivacyEventPayload' },
  'privacy.consent_given': { description: 'Emitted when consent is given', version: 1, payloadType: 'PrivacyEventPayload' },
  'privacy.consent_withdrawn': { description: 'Emitted when consent is withdrawn', version: 1, payloadType: 'PrivacyEventPayload' },
  'privacy.impact_assessment_completed': { description: 'Emitted when a privacy impact assessment completes', version: 1, payloadType: 'PrivacyEventPayload' },
  'privacy.breach_detected': { description: 'Emitted when a privacy breach is detected', version: 1, payloadType: 'PrivacyEventPayload' },
  'privacy.breach_notified': { description: 'Emitted when a privacy breach notification is sent', version: 1, payloadType: 'PrivacyEventPayload' },
  'privacy.cross_border_flagged': { description: 'Emitted when a cross-border transfer is flagged', version: 1, payloadType: 'PrivacyEventPayload' },
},
  consumed: {
  'incident.breach_reported': { source: 'incident', handler: 'handleIncidentBreachReported', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'compliance.posture_changed': { source: 'compliance', handler: 'handleCompliancePostureChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'vendor.dd_completed': { source: 'vendor', handler: 'handleVendorDdCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'policy.approved': { source: 'policy', handler: 'handlePolicyApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'asset.created': { source: 'asset', handler: 'handleAssetCreatedUpdated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'asset.updated': { source: 'asset', handler: 'handleAssetCreatedUpdated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'exception.approved': { source: 'exception', handler: 'handleExceptionApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.contained': { source: 'incident', handler: 'handleIncidentContained', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.sla_breached': { source: 'incident', handler: 'handleIncidentSlaBreach', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.effectiveness_failed': { source: 'controls', handler: 'handlePrivacyControlFailed', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'governance.health_score_updated': { source: 'governance', handler: 'handleGovernanceHealthScore', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.role.assigned': { source: 'foundation', handler: 'handleFoundationRoleAssigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.role.unassigned': { source: 'foundation', handler: 'handleFoundationRoleUnassigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const PRIVACY_PUBLISHED_EVENTS = Object.keys(PRIVACY_EVENT_CONTRACT.published);
export const PRIVACY_CONSUMED_EVENTS = Object.keys(PRIVACY_EVENT_CONTRACT.consumed);


export const PRIVACY_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const PRIVACY_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const PRIVACY_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const PRIVACY_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
