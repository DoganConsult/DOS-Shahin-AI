import type { ModuleEventContract } from '@dos/types';

export const AGRC_ENGINE_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'agrc-engine',
  published: {
    'agrc_engine.assessment_completed_processed': { description: 'Emitted when a risk/compliance assessment event is processed by the engine', version: 1, payloadType: 'AgrcEngineEventPayload' },
    'agrc_engine.created_processed': { description: 'Emitted when an incident creation event is processed by the engine', version: 1, payloadType: 'AgrcEngineEventPayload' },
    'agrc_engine.status_changed_processed': { description: 'Emitted when an audit status change is processed by the engine', version: 1, payloadType: 'AgrcEngineEventPayload' },
    'agrc_engine.decision_made_processed': { description: 'Emitted when a governance decision event is processed by the engine', version: 1, payloadType: 'AgrcEngineEventPayload' },
    'agrc_engine.task.completed_processed': { description: 'Emitted when a workflow task completion is processed by the engine', version: 1, payloadType: 'AgrcEngineEventPayload' },
    'agrc_engine.agent.completed_processed': { description: 'Emitted when an AI agent completion is processed by the engine', version: 1, payloadType: 'AgrcEngineEventPayload' },
    'agrc_engine.health_snapshot_created': { description: 'Emitted when the engine creates an aggregated health snapshot', version: 1, payloadType: 'AgrcEngineEventPayload' },
  },
  consumed: {
    'risk.assessment_completed': { source: 'risk', handler: 'handle_risk_assessment_completed', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.assessment_completed': { source: 'compliance', handler: 'handle_compliance_assessment_completed', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'incident.created': { source: 'incident', handler: 'handle_incident_created', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'audit.status_changed': { source: 'audit', handler: 'handle_audit_status_changed', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'governance.decision_recorded': { source: 'governance', handler: 'handle_governance_decision_made', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'workflow.status_changed': { source: 'workflow', handler: 'handle_workflow_task_completed', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'ai.agent.completed': { source: 'ai', handler: 'handle_ai_agent_completed', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const AGRC_ENGINE_PUBLISHED_EVENTS = Object.keys(AGRC_ENGINE_EVENT_CONTRACT.published);
export const AGRC_ENGINE_CONSUMED_EVENTS = Object.keys(AGRC_ENGINE_EVENT_CONTRACT.consumed);

export const AGRC_ENGINE_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const AGRC_ENGINE_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const AGRC_ENGINE_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const AGRC_ENGINE_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
