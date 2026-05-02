import type { ModuleEventContract } from '@dos/types';

export const COMPLIANCE_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'compliance',
  published: {
  'compliance.gap_detected': { description: 'Emitted when a compliance gap is identified against a framework control', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.gap_closed': { description: 'Emitted when a compliance gap is resolved', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.finding_raised': { description: 'Emitted when a compliance finding is created', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.finding_closed': { description: 'Emitted when a compliance finding is resolved', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.posture_changed': { description: 'Emitted when overall compliance posture score changes', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.posture_updated': { description: 'Emitted when compliance posture data is refreshed', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.assessment_completed': { description: 'Emitted when a compliance assessment finishes', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.obligation_created': { description: 'Emitted when a new regulatory obligation is created', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.obligation_updated': { description: 'Emitted when an obligation record is modified', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.owner_assigned': { description: 'Emitted when an owner is assigned to a compliance entity', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.control_mapped': { description: 'Emitted when a control is mapped to a framework requirement', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.control_bulk_assigned': { description: 'Emitted when controls are bulk-assigned', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.evidence_linked': { description: 'Emitted when evidence is linked to a compliance entity', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.finding_bulk_updated': { description: 'Emitted when findings are bulk-updated', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.review_overdue': { description: 'Emitted when a compliance review passes its due date', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.attestation_campaign_started': { description: 'Emitted when an attestation campaign begins', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.attestation_recorded': { description: 'Emitted when an attestation record is submitted', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.framework_mapping_updated': { description: 'Emitted when framework mapping changes', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.gap_remediation_started': { description: 'Emitted when gap remediation process begins', version: 1, payloadType: 'ComplianceEventPayload' },
  'compliance.framework_gap_identified': { description: 'Emitted when a framework coverage gap is identified', version: 1, payloadType: 'ComplianceEventPayload' },
},
  consumed: {
  'foundation.scope_changed': { source: 'foundation', handler: 'handleFoundationScopeChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'risk.score_changed': { source: 'risk', handler: 'handleRiskScoreChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'risk.assessment_completed': { source: 'risk', handler: 'handleRiskAssessmentCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'evidence.collected': { source: 'evidence', handler: 'handleEvidenceCollected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'evidence.expired': { source: 'evidence', handler: 'handleEvidenceExpired', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'audit.finding_created': { source: 'audit', handler: 'handleAuditFindingCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'policy.approved': { source: 'policy', handler: 'handlePolicyApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'vendor.compliance_gap_propagated': { source: 'vendor', handler: 'handleVendorComplianceGap', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.effectiveness_failed': { source: 'controls', handler: 'handleControlEffectivenessLow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'compliance.framework_gap_identified': { source: 'compliance', handler: 'handleFrameworkGapIdentified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'evidence.coverage_low': { source: 'evidence', handler: 'handleEvidenceCoverageLow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const COMPLIANCE_PUBLISHED_EVENTS = Object.keys(COMPLIANCE_EVENT_CONTRACT.published);
export const COMPLIANCE_CONSUMED_EVENTS = Object.keys(COMPLIANCE_EVENT_CONTRACT.consumed);


export const COMPLIANCE_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const COMPLIANCE_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const COMPLIANCE_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const COMPLIANCE_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
