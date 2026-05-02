import type { ModuleEventContract } from '@dos/types';

export const BENCHMARKS_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'benchmarks',
  published: {
    'benchmarks.catalog.created': { description: 'Emitted when a new benchmark catalog is created', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.catalog.updated': { description: 'Emitted when a benchmark catalog is updated', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.catalog.approved': { description: 'Emitted when a benchmark catalog is approved', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.catalog.published': { description: 'Emitted when a benchmark catalog is published', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.catalog.archived': { description: 'Emitted when a benchmark catalog is archived', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.catalog.suspended': { description: 'Emitted when a benchmark catalog is suspended', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.evaluation.created': { description: 'Emitted when a new benchmark evaluation is created', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.evaluation.started': { description: 'Emitted when a benchmark evaluation begins execution', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.evaluation.completed': { description: 'Emitted when a benchmark evaluation finishes', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.evaluation.approved': { description: 'Emitted when a benchmark evaluation is approved', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.evaluation.published': { description: 'Emitted when a benchmark evaluation is published', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.evaluation.archived': { description: 'Emitted when a benchmark evaluation is archived', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.evaluation.failed': { description: 'Emitted when a benchmark evaluation fails', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.peer_group.threshold_breached': { description: 'Emitted when a peer group threshold is breached', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.peer_group.percentile_changed': { description: 'Emitted when a peer group percentile ranking changes significantly', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.score.updated': { description: 'Emitted when a benchmark score is updated', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.maturity.level_changed': { description: 'Emitted when benchmark maturity level changes', version: 1, payloadType: 'BenchmarksEventPayload' },
    'benchmarks.sector_profile.updated': { description: 'Emitted when sector benchmark profile data is refreshed', version: 1, payloadType: 'BenchmarksEventPayload' },
  },
  consumed: {
    'compliance.posture_changed': { source: 'compliance', handler: 'handleCompliancePostureChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.assessment_completed': { source: 'compliance', handler: 'handleComplianceAssessmentCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'risk.score_changed': { source: 'risk', handler: 'handleRiskScoreChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'risk.assessment_completed': { source: 'risk', handler: 'handleRiskAssessmentCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'asset.discovery.completed': { source: 'asset', handler: 'handleAssetDiscoveryCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'asset.classification_changed': { source: 'asset', handler: 'handleAssetClassificationChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'controls.effectiveness_failed': { source: 'controls', handler: 'handleControlEffectivenessFailed', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'controls.effectiveness_updated': { source: 'controls', handler: 'handleControlEffectivenessUpdated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const BENCHMARKS_PUBLISHED_EVENTS = Object.keys(BENCHMARKS_EVENT_CONTRACT.published);
export const BENCHMARKS_CONSUMED_EVENTS = Object.keys(BENCHMARKS_EVENT_CONTRACT.consumed);

export const BENCHMARKS_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const BENCHMARKS_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const BENCHMARKS_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
