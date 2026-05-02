import type { ModuleEventContract } from '@dos/types';

export const AUDIT_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'audit',
  published: {
  'audit.finding_created': { description: 'Emitted when an audit finding is created', version: 1, payloadType: 'AuditEventPayload' },
  'audit.finding_issued': { description: 'Emitted when an audit finding is formally issued', version: 1, payloadType: 'AuditEventPayload' },
  'audit.status_changed': { description: 'Emitted when audit status transitions', version: 1, payloadType: 'AuditEventPayload' },
  'audit.remediation_due': { description: 'Emitted when audit remediation is due', version: 1, payloadType: 'AuditEventPayload' },
  'audit.report_imported': { description: 'Emitted when an audit report is imported', version: 1, payloadType: 'AuditEventPayload' },
  'audit.workpaper_generated': { description: 'Emitted when a workpaper is generated', version: 1, payloadType: 'AuditEventPayload' },
  'audit.prep_generated': { description: 'Emitted when audit prep materials are generated', version: 1, payloadType: 'AuditEventPayload' },
  'audit.plan_approved': { description: 'Emitted when an audit plan is approved', version: 1, payloadType: 'AuditEventPayload' },
  'audit.engagement_started': { description: 'Emitted when an audit engagement starts', version: 1, payloadType: 'AuditEventPayload' },
  'audit.engagement_completed': { description: 'Emitted when an audit engagement completes', version: 1, payloadType: 'AuditEventPayload' },
  'audit.scope_changed': { description: 'Emitted when audit scope is modified', version: 1, payloadType: 'AuditEventPayload' },
},
  consumed: {
  'compliance.gap_detected': { source: 'compliance', handler: 'handleComplianceGapDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'risk.residual_high': { source: 'risk', handler: 'handleRiskResidualHigh', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'evidence.collected': { source: 'evidence', handler: 'handleEvidenceCollected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.classified': { source: 'incident', handler: 'handleIncidentClassified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'vendor.assessment_due': { source: 'vendor', handler: 'handleVendorAssessmentDue', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.effectiveness_failed': { source: 'controls', handler: 'handleControlEffectivenessLow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.status_changed': { source: 'controls', handler: 'handleControlStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.deficiency_detected': { source: 'controls', handler: 'handleControlDeficiencyDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'risk.appetite_breached': { source: 'risk', handler: 'handleRiskExceededAppetite', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'bcp.maturity_regression': { source: 'bcp', handler: 'handleBcpMaturityRegression', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.role.assigned': { source: 'foundation', handler: 'handleFoundationRoleAssigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.role.unassigned': { source: 'foundation', handler: 'handleFoundationRoleUnassigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const AUDIT_PUBLISHED_EVENTS = Object.keys(AUDIT_EVENT_CONTRACT.published);
export const AUDIT_CONSUMED_EVENTS = Object.keys(AUDIT_EVENT_CONTRACT.consumed);


export const AUDIT_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const AUDIT_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const AUDIT_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const AUDIT_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
