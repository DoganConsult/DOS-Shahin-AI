import type { ModuleEventContract } from '@dos/types';

export const AI_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'ai',
  published: {
    'ai.agent.started': { description: 'Emitted when an AI agent run begins', version: 1, payloadType: 'AiEventPayload' },
    'ai.agent.completed': { description: 'Emitted when an AI agent completes an inference cycle', version: 1, payloadType: 'AiEventPayload' },
    'ai.agent.failed': { description: 'Emitted when an AI agent run fails', version: 1, payloadType: 'AiEventPayload' },
    'ai.proposal.created': { description: 'Emitted when an AI agent proposes an action', version: 1, payloadType: 'AiEventPayload' },
    'ai.proposal.approved': { description: 'Emitted when a proposed AI action is approved', version: 1, payloadType: 'AiEventPayload' },
    'ai.proposal.rejected': { description: 'Emitted when a proposed AI action is rejected', version: 1, payloadType: 'AiEventPayload' },
    'ai.delegation.granted': { description: 'Emitted when agent-to-agent delegation is granted', version: 1, payloadType: 'AiEventPayload' },
    'ai.delegation.revoked': { description: 'Emitted when agent-to-agent delegation is revoked', version: 1, payloadType: 'AiEventPayload' },
    'ai.delegation.action_executed': { description: 'Emitted when a delegated action is executed', version: 1, payloadType: 'AiEventPayload' },
    'ai.copilot.action': { description: 'Emitted when AI copilot performs an action', version: 1, payloadType: 'AiEventPayload' },
    'ai.copilot.suggestion': { description: 'Emitted when AI copilot generates a suggestion', version: 1, payloadType: 'AiEventPayload' },
    'ai.circuit_breaker.opened': { description: 'Emitted when an agent circuit breaker opens', version: 1, payloadType: 'AiEventPayload' },
    'ai.circuit_breaker.closed': { description: 'Emitted when an agent circuit breaker closes', version: 1, payloadType: 'AiEventPayload' },
    'ai.drift.detected': { description: 'Emitted when AI drift is detected', version: 1, payloadType: 'AiEventPayload' },
    'ai.cost.threshold_exceeded': { description: 'Emitted when AI token/cost budget is exceeded', version: 1, payloadType: 'AiEventPayload' },
    'ai.kill_switch.activated': { description: 'Emitted when AI kill switch is triggered', version: 1, payloadType: 'AiEventPayload' },
    'ai.autonomy.level_changed': { description: 'Emitted when module autonomy level is changed', version: 1, payloadType: 'AiEventPayload' },
    'ai.code_search.queried': { description: 'Emitted when a code search query is executed', version: 1, payloadType: 'AiEventPayload' },
    'ai.code_search.engine_health_checked': { description: 'Emitted when code search engine health is checked', version: 1, payloadType: 'AiEventPayload' },
    'ai.code_search.engine_registered': { description: 'Emitted when a new code search engine is registered', version: 1, payloadType: 'AiEventPayload' },
    'ai.code_search.engine_status_changed': { description: 'Emitted when a code search engine status changes', version: 1, payloadType: 'AiEventPayload' },
    'ai.code_search.surface_indexed': { description: 'Emitted when a codebase surface is indexed', version: 1, payloadType: 'AiEventPayload' },
  },
  consumed: {
    'risk.record.created': { source: 'risk', handler: 'handleRiskCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'risk.record.updated': { source: 'risk', handler: 'handleRiskUpdated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.assessment.completed': { source: 'compliance', handler: 'handleComplianceAssessment', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.gap.detected': { source: 'compliance', handler: 'handleComplianceGap', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'policy.document.approved': { source: 'policy', handler: 'handlePolicyApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'audit.finding.created': { source: 'audit', handler: 'handleAuditFinding', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'workflow.status.changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'governance.health.updated': { source: 'governance', handler: 'handleGovernanceHealth', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const AI_PUBLISHED_EVENTS = Object.keys(AI_EVENT_CONTRACT.published);
export const AI_CONSUMED_EVENTS = Object.keys(AI_EVENT_CONTRACT.consumed);


export const AI_EVENT_LEGACY_ALIASES: Record<string, string> = {
  'ai.agent_cycle_completed': 'ai.agent.completed',
  'ai.agent_action_executed': 'ai.delegation.action_executed',
  'ai.agent_action_blocked': 'ai.proposal.rejected',
  'ai.recommendation_generated': 'ai.proposal.created',
  'ai.draft_created': 'ai.copilot.action',
  'ai.note_created': 'ai.copilot.suggestion',
  'ai.kill_switch_activated': 'ai.kill_switch.activated',
  'ai.budget_exceeded': 'ai.cost.threshold_exceeded',
  'ai.autonomy_level_changed': 'ai.autonomy.level_changed',
};

export const AI_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const AI_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const AI_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
