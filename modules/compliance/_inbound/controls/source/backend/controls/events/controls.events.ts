import type { ModuleEventContract } from '@dos/types';

export const CONTROLS_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'controls',
  published: {
    'controls.created': { description: 'Emitted when a new control is registered in the library', version: 1, payloadType: 'ControlsEventPayload' },
    'controls.activated': { description: 'Emitted when a control moves to active status', version: 1, payloadType: 'ControlsEventPayload' },
    'controls.status_changed': { description: 'Emitted when a control status transitions', version: 1, payloadType: 'ControlsEventPayload' },
    'controls.effectiveness_tested': { description: 'Emitted when a control effectiveness test is completed', version: 1, payloadType: 'ControlsEventPayload' },
    'controls.effectiveness_failed': { description: 'Emitted when a control test result is ineffective', version: 1, payloadType: 'ControlsEventPayload' },
    'controls.test_overdue': { description: 'Emitted when a control test passes its due date', version: 1, payloadType: 'ControlsEventPayload' },
    'controls.mapping_changed': { description: 'Emitted when risk/obligation/policy mappings are modified', version: 1, payloadType: 'ControlsEventPayload' },
    'controls.ownership_changed': { description: 'Emitted when control ownership is reassigned', version: 1, payloadType: 'ControlsEventPayload' },
    'controls.automation_failed': { description: 'Emitted when an automated control enters failing state', version: 1, payloadType: 'ControlsEventPayload' },
    'controls.automation_degraded': { description: 'Emitted when an automated control enters degraded state', version: 1, payloadType: 'ControlsEventPayload' },
    'controls.retired': { description: 'Emitted when a control is retired from active use', version: 1, payloadType: 'ControlsEventPayload' },
    'controls.certification_expired': { description: 'Emitted when a control certification expires', version: 1, payloadType: 'ControlsEventPayload' },
    'controls.deficiency_detected': { description: 'Emitted when a control deficiency is identified', version: 1, payloadType: 'ControlsEventPayload' },
  },
  consumed: {
    'risk.score_changed': { source: 'risk', handler: 'handleRiskScoreChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.gap_detected': { source: 'compliance', handler: 'handleComplianceGapDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'audit.finding_created': { source: 'audit', handler: 'handleAuditFindingCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'policy.approved': { source: 'policy', handler: 'handlePolicyApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'evidence.expired': { source: 'evidence', handler: 'handleEvidenceExpired', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'risk.appetite_breached': { source: 'risk', handler: 'handleRiskAppetiteBreached', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'incident.classified': { source: 'incident', handler: 'handleIncidentClassified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'remediation.verified': { source: 'remediation', handler: 'handleRemediationVerified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'foundation.position.holder.unassigned': { source: 'foundation', handler: 'handleFoundationPositionUnassigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'foundation.dept_created': { source: 'foundation', handler: 'handleFoundationDeptCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const CONTROLS_PUBLISHED_EVENTS = Object.keys(CONTROLS_EVENT_CONTRACT.published);
export const CONTROLS_CONSUMED_EVENTS = Object.keys(CONTROLS_EVENT_CONTRACT.consumed);

export const CONTROLS_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const CONTROLS_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const CONTROLS_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const CONTROLS_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
