import type { ModuleEventContract } from '@dos/types';

export const REMEDIATION_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'remediation',
  published: {
  'remediation.plan_created': { description: 'Emitted when a remediation plan is created', version: 1, payloadType: 'RemediationEventPayload' },
  'remediation.plan_approved': { description: 'Emitted when a remediation plan is approved', version: 1, payloadType: 'RemediationEventPayload' },
  'remediation.action_assigned': { description: 'Emitted when a remediation action is assigned', version: 1, payloadType: 'RemediationEventPayload' },
  'remediation.action_completed': { description: 'Emitted when a remediation action is completed', version: 1, payloadType: 'RemediationEventPayload' },
  'remediation.milestone_reached': { description: 'Emitted when a remediation milestone is reached', version: 1, payloadType: 'RemediationEventPayload' },
  'remediation.overdue': { description: 'Emitted when remediation is overdue', version: 1, payloadType: 'RemediationEventPayload' },
  'remediation.verified': { description: 'Emitted when remediation is verified', version: 1, payloadType: 'RemediationEventPayload' },
  'remediation.closed': { description: 'Emitted when remediation is closed', version: 1, payloadType: 'RemediationEventPayload' },
},
  consumed: {
  'compliance.gap_detected': { source: 'compliance', handler: 'handleComplianceGapDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'audit.finding_created': { source: 'audit', handler: 'handleAuditFindingCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'risk.residual_high': { source: 'risk', handler: 'handleRiskResidualHigh', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.capa_assigned': { source: 'incident', handler: 'handleIncidentCapaAssigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'vendor.issue_created': { source: 'vendor', handler: 'handleVendorIssueCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.org.manager.changed': { source: 'foundation', handler: 'handleFoundationManagerChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'risk.treatment_overdue': { source: 'risk', handler: 'handleRiskMitigationRequired', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'compliance.framework_gap_identified': { source: 'compliance', handler: 'handleFrameworkGapIdentified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'audit.remediation_due': { source: 'audit', handler: 'handleAuditRemediationDue', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'bcp.maturity_regression': { source: 'bcp', handler: 'handleBcpMaturityRegression', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.effectiveness_failed': { source: 'controls', handler: 'handleControlEffectivenessLow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.pir_completed': { source: 'incident', handler: 'handleIncidentPirCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.closed': { source: 'incident', handler: 'handleIncidentClosed', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.deficiency_detected': { source: 'controls', handler: 'handleControlDeficiencyDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'governance.action_created': { source: 'governance', handler: 'handleGovernanceActionCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const REMEDIATION_PUBLISHED_EVENTS = Object.keys(REMEDIATION_EVENT_CONTRACT.published);
export const REMEDIATION_CONSUMED_EVENTS = Object.keys(REMEDIATION_EVENT_CONTRACT.consumed);


export const REMEDIATION_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const REMEDIATION_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const REMEDIATION_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const REMEDIATION_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
