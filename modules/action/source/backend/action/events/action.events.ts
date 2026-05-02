import type { ModuleEventContract } from '@dos/types';

export const ACTION_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'action',
  published: {
  'action.created': { description: 'Emitted when an action item is created', version: 1, payloadType: 'ActionEventPayload' },
  'action.assigned': { description: 'Emitted when an action item is assigned', version: 1, payloadType: 'ActionEventPayload' },
  'action.started': { description: 'Emitted when an action item is started', version: 1, payloadType: 'ActionEventPayload' },
  'action.completed': { description: 'Emitted when an action item is completed', version: 1, payloadType: 'ActionEventPayload' },
  'action.overdue': { description: 'Emitted when an action item is overdue', version: 1, payloadType: 'ActionEventPayload' },
  'action.escalated': { description: 'Emitted when an action item is escalated', version: 1, payloadType: 'ActionEventPayload' },
  'action.cancelled': { description: 'Emitted when an action item is cancelled', version: 1, payloadType: 'ActionEventPayload' },
},
  consumed: {
  'remediation.action_assigned': { source: 'remediation', handler: 'handleRemediationActionAssigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'governance.action_created': { source: 'governance', handler: 'handleGovernanceActionCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'audit.finding_created': { source: 'audit', handler: 'handleAuditFindingCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.capa_assigned': { source: 'incident', handler: 'handleIncidentCapaAssigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'compliance.gap_detected': { source: 'compliance', handler: 'handleComplianceGapDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'evidence.expired': { source: 'evidence', handler: 'handleEvidenceExpired', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'bcp.exercise_overdue': { source: 'bcp', handler: 'handleBcpExerciseOverdue', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'report.generation_failed': { source: 'reporting', handler: 'handleReportGenerationFailed', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.effectiveness_failed': { source: 'controls', handler: 'handleControlEffectivenessFailed', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'governance.decision_recorded': { source: 'governance', handler: 'handleGovernanceDecisionRecorded', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'compliance.framework_gap_identified': { source: 'compliance', handler: 'handleComplianceFrameworkGap', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.position.holder.unassigned': { source: 'foundation', handler: 'handleFoundationPositionUnassigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const ACTION_PUBLISHED_EVENTS = Object.keys(ACTION_EVENT_CONTRACT.published);
export const ACTION_CONSUMED_EVENTS = Object.keys(ACTION_EVENT_CONTRACT.consumed);


export const ACTION_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const ACTION_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const ACTION_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const ACTION_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
