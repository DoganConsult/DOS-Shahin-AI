import type { ModuleEventContract } from '@dos/types';

export const BCP_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'bcp',
  published: {
  'bcp.plan_created': { description: 'Emitted when a BCP plan is created', version: 1, payloadType: 'BcpEventPayload' },
  'bcp.plan_activated': { description: 'Emitted when a BCP plan is activated', version: 1, payloadType: 'BcpEventPayload' },
  'bcp.crisis_declared': { description: 'Emitted when a crisis is declared', version: 1, payloadType: 'BcpEventPayload' },
  'bcp.crisis_resolved': { description: 'Emitted when a crisis is resolved', version: 1, payloadType: 'BcpEventPayload' },
  'bcp.exercise_completed': { description: 'Emitted when a BCP exercise completes', version: 1, payloadType: 'BcpEventPayload' },
  'bcp.impact_analysis_completed': { description: 'Emitted when impact analysis completes', version: 1, payloadType: 'BcpEventPayload' },
  'bcp.recovery_objective_breached': { description: 'Emitted when a recovery objective is breached', version: 1, payloadType: 'BcpEventPayload' },
  'bcp.test_passed': { description: 'Emitted when a BCP test passes', version: 1, payloadType: 'BcpEventPayload' },
  'bcp.test_failed': { description: 'Emitted when a BCP test fails', version: 1, payloadType: 'BcpEventPayload' },
  'bcp.rto_rpo_drift': { description: 'Emitted when actual RTO/RPO deviates from target', version: 1, payloadType: 'BcpEventPayload' },
  'bcp.maturity_regression': { description: 'Emitted when BCP maturity score regresses', version: 1, payloadType: 'BcpEventPayload' },
  'bcp.crisis_readiness_low': { description: 'Emitted when crisis communication readiness is below threshold', version: 1, payloadType: 'BcpEventPayload' },
  'bcp.plan_stale': { description: 'Emitted when a BCP plan has not been reviewed within threshold', version: 1, payloadType: 'BcpEventPayload' },
  'bcp.bia_stale': { description: 'Emitted when a BIA assessment is overdue for refresh', version: 1, payloadType: 'BcpEventPayload' },
  'bcp.exercise_overdue': { description: 'Emitted when a BCP exercise is overdue', version: 1, payloadType: 'BcpEventPayload' },
  'bcp.dependency_critical': { description: 'Emitted when a critical dependency is identified', version: 1, payloadType: 'BcpEventPayload' },
},
  consumed: {
  'risk.residual_high': { source: 'risk', handler: 'handleRiskResidualHigh', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.created': { source: 'incident', handler: 'handleIncidentCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.escalated': { source: 'incident', handler: 'handleIncidentEscalated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'asset.classified': { source: 'asset', handler: 'handleAssetClassified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'vendor.risk_changed': { source: 'vendor', handler: 'handleVendorRiskChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.effectiveness_failed': { source: 'controls', handler: 'handleControlEffectivenessFailed', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.deficiency_detected': { source: 'controls', handler: 'handleControlDeficiencyDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'remediation.overdue': { source: 'remediation', handler: 'handleRemediationOverdue', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const BCP_PUBLISHED_EVENTS = Object.keys(BCP_EVENT_CONTRACT.published);
export const BCP_CONSUMED_EVENTS = Object.keys(BCP_EVENT_CONTRACT.consumed);


export const BCP_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const BCP_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const BCP_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const BCP_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
