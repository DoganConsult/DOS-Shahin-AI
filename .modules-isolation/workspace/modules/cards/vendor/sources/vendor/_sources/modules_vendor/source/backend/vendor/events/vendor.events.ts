import type { ModuleEventContract } from '@dos/types';

export const VENDOR_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'vendor',
  published: {
  'vendor.onboarded': { description: 'Emitted when a vendor is onboarded', version: 1, payloadType: 'VendorEventPayload' },
  'vendor.assessment_due': { description: 'Emitted when vendor assessment is due', version: 1, payloadType: 'VendorEventPayload' },
  'vendor.dd_initiated': { description: 'Emitted when due diligence is initiated', version: 1, payloadType: 'VendorEventPayload' },
  'vendor.dd_completed': { description: 'Emitted when due diligence completes', version: 1, payloadType: 'VendorEventPayload' },
  'vendor.risk_changed': { description: 'Emitted when vendor risk level changes', version: 1, payloadType: 'VendorEventPayload' },
  'vendor.sla_breached': { description: 'Emitted when vendor SLA is breached', version: 1, payloadType: 'VendorEventPayload' },
  'vendor.concentration_high': { description: 'Emitted when vendor concentration is high', version: 1, payloadType: 'VendorEventPayload' },
  'vendor.issue_created': { description: 'Emitted when a vendor issue is created', version: 1, payloadType: 'VendorEventPayload' },
  'vendor.issue_escalated': { description: 'Emitted when a vendor issue is escalated', version: 1, payloadType: 'VendorEventPayload' },
  'vendor.offboarding_initiated': { description: 'Emitted when vendor offboarding is initiated', version: 1, payloadType: 'VendorEventPayload' },
  'vendor.compliance_gap_propagated': { description: 'Emitted when compliance gap propagates to vendor', version: 1, payloadType: 'VendorEventPayload' },
},
  consumed: {
  'risk.score_changed': { source: 'risk', handler: 'handleRiskScoreChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'risk.vendor_risk_changed': { source: 'risk', handler: 'handleRiskVendorRiskChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'compliance.gap_detected': { source: 'compliance', handler: 'handleComplianceGapDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'compliance.vendor_finding': { source: 'compliance', handler: 'handleComplianceVendorFinding', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'audit.finding_created': { source: 'audit', handler: 'handleAuditFindingCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.classified': { source: 'incident', handler: 'handleIncidentClassified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.vendor_involved': { source: 'incident', handler: 'handleIncidentVendorInvolved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'bcp.crisis_declared': { source: 'bcp', handler: 'handleBcpCrisisDeclared', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'bcp.dependency_critical': { source: 'bcp', handler: 'handleBcpDependencyCritical', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'vendor.contract_expiring': { source: 'vendor', handler: 'handleVendorContractExpiring', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'evidence.vendor_evidence_rejected': { source: 'evidence', handler: 'handleEvidenceVendorRejected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.position.holder.unassigned': { source: 'foundation', handler: 'handleFoundationPositionUnassigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const VENDOR_PUBLISHED_EVENTS = Object.keys(VENDOR_EVENT_CONTRACT.published);
export const VENDOR_CONSUMED_EVENTS = Object.keys(VENDOR_EVENT_CONTRACT.consumed);


export const VENDOR_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const VENDOR_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const VENDOR_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const VENDOR_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
