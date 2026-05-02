import type { ModuleEventContract } from '@dos/types';

export const POLICY_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'policy',
  published: {
  'policy.created': { description: 'Emitted when a new policy is created', version: 1, payloadType: 'PolicyEventPayload' },
  'policy.approved': { description: 'Emitted when a policy is approved', version: 1, payloadType: 'PolicyEventPayload' },
  'policy.published': { description: 'Emitted when a policy is published', version: 1, payloadType: 'PolicyEventPayload' },
  'policy.rejected': { description: 'Emitted when a policy is rejected', version: 1, payloadType: 'PolicyEventPayload' },
  'policy.expired': { description: 'Emitted when a policy reaches expiration', version: 1, payloadType: 'PolicyEventPayload' },
  'policy.revoked': { description: 'Emitted when a policy is revoked', version: 1, payloadType: 'PolicyEventPayload' },
  'policy.version_created': { description: 'Emitted when a new policy version is created', version: 1, payloadType: 'PolicyEventPayload' },
  'policy.review_due': { description: 'Emitted when a policy review is due', version: 1, payloadType: 'PolicyEventPayload' },
  'policy.review_started': { description: 'Emitted when policy review begins', version: 1, payloadType: 'PolicyEventPayload' },
  'policy.exception_approved': { description: 'Emitted when a policy exception is approved', version: 1, payloadType: 'PolicyEventPayload' },
  'policy.exception_rejected': { description: 'Emitted when a policy exception is rejected', version: 1, payloadType: 'PolicyEventPayload' },
  'policy.acknowledgement_required': { description: 'Emitted when policy acknowledgement is required', version: 1, payloadType: 'PolicyEventPayload' },
  'policy.acknowledgement_received': { description: 'Emitted when policy acknowledgement is received', version: 1, payloadType: 'PolicyEventPayload' },
  'policy.drift_detected': { description: 'Emitted when policy drift is detected', version: 1, payloadType: 'PolicyEventPayload' },
},
  consumed: {
  'foundation.scope_changed': { source: 'foundation', handler: 'handleFoundationScopeChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'compliance.framework_mapping_updated': { source: 'compliance', handler: 'handleFrameworkMappingUpdated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'governance.charter_approved': { source: 'governance', handler: 'handleCharterApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'risk.assessment_completed': { source: 'risk', handler: 'handleRiskAssessmentCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'team.structure_changed': { source: 'team', handler: 'handleTeamStructureChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'onboarding.completed': { source: 'onboarding', handler: 'handleOnboardingCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.instance_completed': { source: 'workflow', handler: 'handleWorkflowCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'dora.obligation_created': { source: 'dora', handler: 'handleDoraObligationCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'governance_ai.signal_detected': { source: 'governance_ai', handler: 'handleGovernanceSignalDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'dashboard.widget_created': { source: 'dashboard', handler: 'handleDashboardWidgetCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: false },
  'navigation.item_updated': { source: 'navigation', handler: 'handleNavigationItemUpdated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: false },
},
};

export const POLICY_PUBLISHED_EVENTS = Object.keys(POLICY_EVENT_CONTRACT.published);
export const POLICY_CONSUMED_EVENTS = Object.keys(POLICY_EVENT_CONTRACT.consumed);


export const POLICY_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const POLICY_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const POLICY_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const POLICY_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
