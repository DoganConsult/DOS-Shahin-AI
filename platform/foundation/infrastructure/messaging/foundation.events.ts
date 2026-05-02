import type { ModuleEventContract } from '@dos/types';

export const FOUNDATION_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'foundation',
  published: {
    'foundation.org_created': { description: 'Emitted when an organization node is created', version: 1, payloadType: 'FoundationEventPayload' },
    'foundation.org_updated': { description: 'Emitted when an organization node is updated', version: 1, payloadType: 'FoundationEventPayload' },
    'foundation.dept_created': { description: 'Emitted when a department is created', version: 1, payloadType: 'FoundationEventPayload' },
    'foundation.dept_updated': { description: 'Emitted when a department is updated', version: 1, payloadType: 'FoundationEventPayload' },
    'foundation.scope_changed': { description: 'Emitted when scope changes in the hierarchy', version: 1, payloadType: 'FoundationEventPayload' },

    // Phase F-3 / J-1: events consumed by the OpenFGA tuple-sync subscriber
    // at platform/dauth/packages/core/events/openfga-tuple-sync.subscriber.ts.
    // Names use dotted segments to match the subscriber's pattern; the
    // older underscore-style events stay for backward compatibility.
    'foundation.position.holder.assigned':   { description: 'A user was assigned to a position (primary or secondary)', version: 1, payloadType: 'FoundationEventPayload' },
    'foundation.position.holder.unassigned': { description: 'A user was unassigned from a position',                       version: 1, payloadType: 'FoundationEventPayload' },
    'foundation.org.manager.changed':        { description: "A position's reports_to (manager) changed",                   version: 1, payloadType: 'FoundationEventPayload' },
    'foundation.role.assigned':              { description: 'A role was assigned to a user (dotted, replaces role_assigned)', version: 1, payloadType: 'FoundationEventPayload' },
    'foundation.role.unassigned':            { description: 'A role was unassigned from a user',                          version: 1, payloadType: 'FoundationEventPayload' },
  },
  consumed: {
    'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'team.member_added':       { source: 'team',     handler: 'handleTeamMemberAdded',       idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'team.member_removed':     { source: 'team',     handler: 'handleTeamMemberRemoved',     idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'onboarding.completed':    { source: 'onboarding', handler: 'handleOnboardingCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const FOUNDATION_PUBLISHED_EVENTS = Object.keys(FOUNDATION_EVENT_CONTRACT.published);
export const FOUNDATION_CONSUMED_EVENTS = Object.keys(FOUNDATION_EVENT_CONTRACT.consumed);

export const FOUNDATION_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const FOUNDATION_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const FOUNDATION_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
