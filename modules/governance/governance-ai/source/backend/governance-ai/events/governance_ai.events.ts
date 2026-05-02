import type { ModuleEventContract } from '@dos/types';

export const GOVERNANCE_AI_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'governance-ai',
  published: {
    'governance_ai.signal_detected': { description: 'Emitted when a new governance signal is detected by ML/rule engine', version: 1, payloadType: 'GovernanceAiEventPayload' },
    'governance_ai.signal_interpreted': { description: 'Emitted when a signal interpretation is completed', version: 1, payloadType: 'GovernanceAiEventPayload' },
    'governance_ai.signal_escalated': { description: 'Emitted when a signal is escalated for human review', version: 1, payloadType: 'GovernanceAiEventPayload' },
    'governance_ai.signal_resolved': { description: 'Emitted when a governance signal is resolved', version: 1, payloadType: 'GovernanceAiEventPayload' },
    'governance_ai.signal_dismissed': { description: 'Emitted when a signal is dismissed as false positive', version: 1, payloadType: 'GovernanceAiEventPayload' },
    'governance_ai.narrative_generated': { description: 'Emitted when an escalation narrative is generated', version: 1, payloadType: 'GovernanceAiEventPayload' },
    'governance_ai.narrative_approved': { description: 'Emitted when a narrative is approved for distribution', version: 1, payloadType: 'GovernanceAiEventPayload' },
    'governance_ai.model_accuracy_degraded': { description: 'Emitted when a model accuracy drops below threshold', version: 1, payloadType: 'GovernanceAiEventPayload' },
    'governance_ai.model_retrained': { description: 'Emitted when a model completes retraining', version: 1, payloadType: 'GovernanceAiEventPayload' },
    'governance_ai.human_override': { description: 'Emitted when a human overrides an AI interpretation', version: 1, payloadType: 'GovernanceAiEventPayload' },
    'governance_ai.threshold_breach': { description: 'Emitted when a monitored governance metric breaches threshold', version: 1, payloadType: 'GovernanceAiEventPayload' },
  },
  consumed: {
    // ── Risk module ────────────────────────────────────────────────────────
    'risk.score_changed': { source: 'risk', handler: 'handleRiskScoreChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'risk.kri_threshold_breached': { source: 'risk', handler: 'handleKriBreached', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'risk.appetite_breached': { source: 'risk', handler: 'handleRiskAppetiteBreached', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    // ── Compliance module ──────────────────────────────────────────────────
    'compliance.posture_changed': { source: 'compliance', handler: 'handleCompliancePostureChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.gap_detected': { source: 'compliance', handler: 'handleComplianceGapDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    // ── Controls module ────────────────────────────────────────────────────
    'controls.effectiveness_failed': { source: 'controls', handler: 'handleControlEffectivenessFailure', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'controls.test_overdue': { source: 'controls', handler: 'handleControlTestOverdue', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'controls.deficiency_detected': { source: 'controls', handler: 'handleControlDeficiency', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    // ── Incident module ────────────────────────────────────────────────────
    'incident.classified': { source: 'incident', handler: 'handleIncidentClassified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'incident.escalated': { source: 'incident', handler: 'handleIncidentEscalated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    // ── Audit module ───────────────────────────────────────────────────────
    'audit.finding_created': { source: 'audit', handler: 'handleAuditFinding', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    // ── Exception module ───────────────────────────────────────────────────
    'exception.approved': { source: 'exception', handler: 'handleExceptionApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'exception.expired': { source: 'exception', handler: 'handleExceptionExpired', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    // ── Workflow module ────────────────────────────────────────────────────
    'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'workflow.sla_breached': { source: 'workflow', handler: 'handleWorkflowSlaBreached', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    // ── AI Governance module ───────────────────────────────────────────────
    'ai_governance.monitoring_alert': { source: 'ai_governance', handler: 'handleAiMonitoringAlert', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const GOVERNANCE_AI_PUBLISHED_EVENTS = Object.keys(GOVERNANCE_AI_EVENT_CONTRACT.published);
export const GOVERNANCE_AI_CONSUMED_EVENTS = Object.keys(GOVERNANCE_AI_EVENT_CONTRACT.consumed);

export const GOVERNANCE_AI_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const GOVERNANCE_AI_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const GOVERNANCE_AI_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: ['modelConfiguration'] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const GOVERNANCE_AI_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
