import type { ModuleEventContract } from '@dos/types';

export const EVIDENCE_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'evidence',
  published: {
  'evidence.collected': { description: 'Emitted when evidence is collected', version: 1, payloadType: 'EvidenceEventPayload' },
  'evidence.auto_collected': { description: 'Emitted when evidence is auto-collected', version: 1, payloadType: 'EvidenceEventPayload' },
  'evidence.expired': { description: 'Emitted when evidence expires', version: 1, payloadType: 'EvidenceEventPayload' },
  'evidence.coverage_low': { description: 'Emitted when evidence coverage drops below threshold', version: 1, payloadType: 'EvidenceEventPayload' },
  'evidence.more_info_requested': { description: 'Emitted when additional info is requested', version: 1, payloadType: 'EvidenceEventPayload' },
  'evidence.freshness_verified': { description: 'Emitted when evidence freshness is verified', version: 1, payloadType: 'EvidenceEventPayload' },
  'evidence.quality_scored': { description: 'Emitted when evidence quality is scored', version: 1, payloadType: 'EvidenceEventPayload' },
  'evidence.package_created': { description: 'Emitted when evidence package is created', version: 1, payloadType: 'EvidenceEventPayload' },
  'evidence.review_completed': { description: 'Emitted when evidence review completes', version: 1, payloadType: 'EvidenceEventPayload' },
  'evidence.review_rejected': { description: 'Emitted when evidence review is rejected', version: 1, payloadType: 'EvidenceEventPayload' },
  'evidence.connector_synced': { description: 'Emitted when connector sync completes', version: 1, payloadType: 'EvidenceEventPayload' },
  'evidence.retention_applied': { description: 'Emitted when retention policy is applied', version: 1, payloadType: 'EvidenceEventPayload' },
  'evidence.request_created': { description: 'Emitted when evidence request is created', version: 1, payloadType: 'EvidenceEventPayload' },
  'evidence.request_fulfilled': { description: 'Emitted when evidence request is fulfilled', version: 1, payloadType: 'EvidenceEventPayload' },
},
  consumed: {
  'compliance.assessment_completed': { source: 'compliance', handler: 'handleComplianceAssessmentCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'audit.finding_created': { source: 'audit', handler: 'handleAuditFindingCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'risk.assessment_completed': { source: 'risk', handler: 'handleRiskAssessmentCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'vendor.assessment_due': { source: 'vendor', handler: 'handleVendorAssessmentDue', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.effectiveness_failed': { source: 'controls', handler: 'handleControlEffectivenessLow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'evidence.coverage_low': { source: 'evidence', handler: 'handleEvidenceCoverageLow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.position.holder.unassigned': { source: 'foundation', handler: 'handleFoundationPositionUnassigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const EVIDENCE_PUBLISHED_EVENTS = Object.keys(EVIDENCE_EVENT_CONTRACT.published);
export const EVIDENCE_CONSUMED_EVENTS = Object.keys(EVIDENCE_EVENT_CONTRACT.consumed);


export const EVIDENCE_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const EVIDENCE_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const EVIDENCE_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const EVIDENCE_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
