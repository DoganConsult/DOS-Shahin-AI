import type { ModuleEventContract } from '@dos/types';

export const PORTALS_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'portals',
  published: {
  'portals.user_registered': { description: 'Emitted when a portal user registers', version: 1, payloadType: 'PortalsEventPayload' },
  'portals.session_started': { description: 'Emitted when a portal session starts', version: 1, payloadType: 'PortalsEventPayload' },
  'portals.content_published': { description: 'Emitted when portal content is published', version: 1, payloadType: 'PortalsEventPayload' },
  'portals.invitation_sent': { description: 'Emitted when a portal invitation is sent', version: 1, payloadType: 'PortalsEventPayload' },
  'portals.access_revoked': { description: 'Emitted when portal access is revoked', version: 1, payloadType: 'PortalsEventPayload' },
},
  consumed: {
  'vendor.portal_token_issued': { source: 'vendor', handler: 'handleVendorPortalTokenIssued', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const PORTALS_PUBLISHED_EVENTS = Object.keys(PORTALS_EVENT_CONTRACT.published);
export const PORTALS_CONSUMED_EVENTS = Object.keys(PORTALS_EVENT_CONTRACT.consumed);


export const PORTALS_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const PORTALS_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const PORTALS_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const PORTALS_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
