import type { ModuleEventContract } from '@dos/types';

export const KSA_REGULATORY_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'ksa-regulatory',
  published: {
    'ksa_regulatory.change_detected': { description: 'Emitted when a KSA regulatory change is detected', version: 1, payloadType: 'KsaRegulatoryChangePayload' },
    'ksa_regulatory.maturity_scored': { description: 'Emitted when sector maturity score is computed', version: 1, payloadType: 'KsaRegulatoryMaturityPayload' },
    'ksa_regulatory.mapping_updated': { description: 'Emitted when cross-framework mapping is updated', version: 1, payloadType: 'KsaRegulatoryMappingPayload' },
    'ksa_regulatory.obligation_status_updated': { description: 'Emitted when an obligation status changes', version: 1, payloadType: 'KsaRegulatoryObligationPayload' },
    'ksa_regulatory.readiness_snapshot_created': { description: 'Emitted when a readiness snapshot is generated', version: 1, payloadType: 'KsaRegulatorySnapshotPayload' },
    'ksa_regulatory.authority_directive_received': { description: 'Emitted when a new regulatory directive is received from a KSA authority', version: 1, payloadType: 'KsaRegulatoryDirectivePayload' },
    'ksa_regulatory.gap_identified': { description: 'Emitted when a regulatory compliance gap is identified', version: 1, payloadType: 'KsaRegulatoryGapPayload' },
  },
  consumed: {
    'compliance.assessment_completed': { source: 'compliance', handler: 'handleComplianceAssessmentCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.framework_gap_identified': { source: 'compliance', handler: 'handleComplianceFrameworkGap', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'risk.assessment_completed': { source: 'risk', handler: 'handleRiskAssessmentCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'policy.approved': { source: 'policy', handler: 'handlePolicyApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const KSA_REGULATORY_PUBLISHED_EVENTS = Object.keys(KSA_REGULATORY_EVENT_CONTRACT.published);
export const KSA_REGULATORY_CONSUMED_EVENTS = Object.keys(KSA_REGULATORY_EVENT_CONTRACT.consumed);

export const KSA_REGULATORY_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const KSA_REGULATORY_EVENT_ORDERING = {
  strictOrdering: false,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const KSA_REGULATORY_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const KSA_REGULATORY_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
