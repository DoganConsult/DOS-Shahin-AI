import type { ModuleEventContract } from '@dos/types';

export const TRAINING_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'training',
  published: {
  'training.campaign_launched': { description: 'Emitted when a training campaign is launched', version: 1, payloadType: 'TrainingEventPayload' },
  'training.campaign_completed': { description: 'Emitted when a training campaign is completed', version: 1, payloadType: 'TrainingEventPayload' },
  'training.assignment_created': { description: 'Emitted when a training assignment is created', version: 1, payloadType: 'TrainingEventPayload' },
  'training.assignment_completed': { description: 'Emitted when a training assignment is completed', version: 1, payloadType: 'TrainingEventPayload' },
  'training.assignment_overdue': { description: 'Emitted when a training assignment is overdue', version: 1, payloadType: 'TrainingEventPayload' },
  'training.certificate_issued': { description: 'Emitted when a training certificate is issued', version: 1, payloadType: 'TrainingEventPayload' },
},
  consumed: {
  'compliance.posture_changed': { source: 'compliance', handler: 'handleCompliancePostureChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'policy.approved': { source: 'policy', handler: 'handlePolicyApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.lesson_documented': { source: 'incident', handler: 'handleIncidentLessonDocumented', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.closed': { source: 'incident', handler: 'handleIncidentClosed', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'audit.finding_created': { source: 'audit', handler: 'handleAuditFindingCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'user.role_changed': { source: 'admin', handler: 'handleUserRoleChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'team.member_added': { source: 'admin', handler: 'handleUserRoleChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'privacy.dsr_received': { source: 'privacy', handler: 'handlePrivacyDsrReceived', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'compliance.framework_gap_identified': { source: 'compliance', handler: 'handleComplianceFrameworkGap', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.deficiency_detected': { source: 'controls', handler: 'handleControlDeficiency', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.sla_breached': { source: 'incident', handler: 'handleIncidentSlaBreach', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'remediation.overdue': { source: 'remediation', handler: 'handleRemediationOverdue', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.dept_created': { source: 'foundation', handler: 'handleFoundationDeptCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.position.holder.assigned': { source: 'foundation', handler: 'handleFoundationPositionAssigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const TRAINING_PUBLISHED_EVENTS = Object.keys(TRAINING_EVENT_CONTRACT.published);
export const TRAINING_CONSUMED_EVENTS = Object.keys(TRAINING_EVENT_CONTRACT.consumed);


export const TRAINING_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const TRAINING_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const TRAINING_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const TRAINING_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
