import type { ModuleEventContract } from '@dos/types';

export const QIYAS_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'qiyas',
  published: {
  'qiyas.assessment_started': { description: 'Emitted when a Qiyas assessment starts', version: 1, payloadType: 'QiyasEventPayload' },
  'qiyas.assessment_completed': { description: 'Emitted when a Qiyas assessment completes', version: 1, payloadType: 'QiyasEventPayload' },
  'qiyas.maturity_scored': { description: 'Emitted when maturity is scored', version: 1, payloadType: 'QiyasEventPayload' },
  'qiyas.gap_identified': { description: 'Emitted when a maturity gap is identified', version: 1, payloadType: 'QiyasEventPayload' },
  'qiyas.improvement_planned': { description: 'Emitted when an improvement is planned', version: 1, payloadType: 'QiyasEventPayload' },
  'qiyas.roadmap_created': { description: 'Emitted when a roadmap is created', version: 1, payloadType: 'QiyasEventPayload' },
  'qiyas.benchmark_compared': { description: 'Emitted when benchmark comparison completes', version: 1, payloadType: 'QiyasEventPayload' },
  'qiyas.strategy_direction_set': { description: 'Emitted when strategy direction is set', version: 1, payloadType: 'QiyasEventPayload' },
},
  consumed: {
  'compliance.posture_changed': { source: 'compliance', handler: 'handleCompliancePostureChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'risk.assessment_completed': { source: 'risk', handler: 'handleRiskAssessmentCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'governance.health_score_updated': { source: 'governance', handler: 'handleGovernanceHealthScoreUpdated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'audit.engagement_completed': { source: 'audit', handler: 'handleAuditEngagementCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const QIYAS_PUBLISHED_EVENTS = Object.keys(QIYAS_EVENT_CONTRACT.published);
export const QIYAS_CONSUMED_EVENTS = Object.keys(QIYAS_EVENT_CONTRACT.consumed);


export const QIYAS_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const QIYAS_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const QIYAS_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const QIYAS_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
