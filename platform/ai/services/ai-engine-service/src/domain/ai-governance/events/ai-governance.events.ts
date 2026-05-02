import type { ModuleEventContract } from '@dos/types';

export const AI_GOVERNANCE_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'ai-governance',
  published: {
  'ai_governance.model_registered': { description: 'Emitted when an AI model is registered', version: 1, payloadType: 'AiGovernanceEventPayload' },
  'ai_governance.assessment_completed': { description: 'Emitted when an AI governance assessment completes', version: 1, payloadType: 'AiGovernanceEventPayload' },
  'ai_governance.bias_detected': { description: 'Emitted when AI bias is detected', version: 1, payloadType: 'AiGovernanceEventPayload' },
  'ai_governance.fairness_scored': { description: 'Emitted when AI fairness is scored', version: 1, payloadType: 'AiGovernanceEventPayload' },
  'ai_governance.ethical_review_completed': { description: 'Emitted when an ethical review completes', version: 1, payloadType: 'AiGovernanceEventPayload' },
  'ai_governance.impact_assessed': { description: 'Emitted when AI impact is assessed', version: 1, payloadType: 'AiGovernanceEventPayload' },
  'ai_governance.monitoring_alert': { description: 'Emitted when an AI monitoring alert fires', version: 1, payloadType: 'AiGovernanceEventPayload' },
  'ai_governance.policy_violated': { description: 'Emitted when an AI policy is violated', version: 1, payloadType: 'AiGovernanceEventPayload' },
},
  consumed: {
  'compliance.posture_changed': { source: 'compliance', handler: 'handleCompliancePostureChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'risk.score_changed': { source: 'risk', handler: 'handleRiskScoreChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'audit.finding_created': { source: 'audit', handler: 'handleAuditFindingCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const AI_GOVERNANCE_PUBLISHED_EVENTS = Object.keys(AI_GOVERNANCE_EVENT_CONTRACT.published);
export const AI_GOVERNANCE_CONSUMED_EVENTS = Object.keys(AI_GOVERNANCE_EVENT_CONTRACT.consumed);


export const AI_GOVERNANCE_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const AI_GOVERNANCE_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const AI_GOVERNANCE_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const AI_GOVERNANCE_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
