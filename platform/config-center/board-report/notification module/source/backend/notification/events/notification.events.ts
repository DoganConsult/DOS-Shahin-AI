import type { ModuleEventContract } from '@dos/types';

export const NOTIFICATION_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'notification',
  published: {
    'notification.sent': { description: 'Emitted when a notification is dispatched to a recipient', version: 1, payloadType: 'NotificationEventPayload' },
    'notification.bulk_sent': { description: 'Emitted when a batch of notifications is dispatched', version: 1, payloadType: 'NotificationEventPayload' },
    'notification.delivery_failed': { description: 'Emitted when notification delivery fails after retries', version: 1, payloadType: 'NotificationEventPayload' },
    'notification.read': { description: 'Emitted when a user reads a notification', version: 1, payloadType: 'NotificationEventPayload' },
    'notification.preference_changed': { description: 'Emitted when a user updates notification preferences', version: 1, payloadType: 'NotificationEventPayload' },
    'notification.digest_generated': { description: 'Emitted when a periodic digest email is generated', version: 1, payloadType: 'NotificationEventPayload' },
    'notification.rule_triggered': { description: 'Emitted when a notification rule fires', version: 1, payloadType: 'NotificationEventPayload' },
  },
  consumed: {
    'risk.score_changed': { source: 'risk', handler: 'handleRiskScoreChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'risk.kri_threshold_breached': { source: 'risk', handler: 'handleKriBreached', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.gap_detected': { source: 'compliance', handler: 'handleComplianceGap', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.posture_changed': { source: 'compliance', handler: 'handlePostureChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'evidence.expired': { source: 'evidence', handler: 'handleEvidenceExpired', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'incident.classified': { source: 'incident', handler: 'handleIncidentCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'workflow.sla_warning': { source: 'workflow', handler: 'handleSlaWarning', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'workflow.sla_breached': { source: 'workflow', handler: 'handleSlaBreach', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'workflow.task_assigned': { source: 'workflow', handler: 'handleTaskAssigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'workflow.approval_requested': { source: 'workflow', handler: 'handleApprovalRequested', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'audit.finding_created': { source: 'audit', handler: 'handleAuditFinding', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'vendor.sla_breached': { source: 'vendor', handler: 'handleVendorSlaBreach', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'policy.approved': { source: 'policy', handler: 'handlePolicyApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'exception.approved': { source: 'exception', handler: 'handleExceptionApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'training.assignment_overdue': { source: 'training', handler: 'handleTrainingOverdue', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'bootstrap.session_blocked': { source: 'bootstrap', handler: 'handleBootstrapSessionBlocked', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'bootstrap.first_run_started': { source: 'bootstrap', handler: 'handleBootstrapFirstRunStarted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'bootstrap.first_run_completed': { source: 'bootstrap', handler: 'handleBootstrapFirstRunCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'bootstrap.stale_session_detected': { source: 'bootstrap', handler: 'handleBootstrapStaleSession', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'controls.deficiency_detected': { source: 'controls', handler: 'handleControlDeficiency', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'governance.health_score_updated': { source: 'governance', handler: 'handleGovernanceHealthScore', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.framework_gap_identified': { source: 'compliance', handler: 'handleComplianceFrameworkGap', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const NOTIFICATION_PUBLISHED_EVENTS = Object.keys(NOTIFICATION_EVENT_CONTRACT.published);
export const NOTIFICATION_CONSUMED_EVENTS = Object.keys(NOTIFICATION_EVENT_CONTRACT.consumed);


export const NOTIFICATION_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const NOTIFICATION_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const NOTIFICATION_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const NOTIFICATION_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
