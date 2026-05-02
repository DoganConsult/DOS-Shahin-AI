import type { ModuleEventContract } from '@dos/types';

export const PROACTIVE_LEADERSHIP_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'proactive-leadership',
  published: {
    'proactive.cycle_completed': { description: 'Emitted when a proactive leadership cycle completes', version: 1, payloadType: 'ProactiveCyclePayload' },
    'proactive.critical_signal_detected': { description: 'Emitted when a critical governance signal is detected', version: 1, payloadType: 'ProactiveSignalPayload' },
  },
  consumed: {
    'risk.exceeded_appetite': { source: 'autonomous-grc-engine', handler: 'handleRiskExceededAppetite', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'incident.sla_breached': { source: 'autonomous-grc-engine', handler: 'handleIncidentSlaBreach', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'bcp.crisis_readiness_low': { source: 'autonomous-grc-engine', handler: 'handleBcpCrisisReadinessLow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'control.effectiveness_low': { source: 'autonomous-grc-engine', handler: 'handleControlEffectivenessLow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.posture_changed': { source: 'autonomous-grc-engine', handler: 'handleCompliancePostureChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'bcp.maturity_regression': { source: 'autonomous-grc-engine', handler: 'handleBcpMaturityRegression', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const PROACTIVE_LEADERSHIP_PUBLISHED_EVENTS = Object.keys(PROACTIVE_LEADERSHIP_EVENT_CONTRACT.published);
export const PROACTIVE_LEADERSHIP_CONSUMED_EVENTS = Object.keys(PROACTIVE_LEADERSHIP_EVENT_CONTRACT.consumed);

export const PROACTIVE_LEADERSHIP_EVENT_ORDERING = {
  strictOrdering: false,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const PROACTIVE_LEADERSHIP_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;
