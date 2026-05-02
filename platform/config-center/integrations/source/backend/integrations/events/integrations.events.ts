import type { ModuleEventContract } from '@dos/types';

export const INTEGRATIONS_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'integrations',
  published: {
    'integrations.connector_synced': { description: 'Emitted when a connector completes a sync cycle', version: 1, payloadType: 'IntegrationsEventPayload' },
    'integrations.connector_sync_failed': { description: 'Emitted when a connector sync fails', version: 1, payloadType: 'IntegrationsEventPayload' },
    'integrations.connector_activated': { description: 'Emitted when a new connector is activated', version: 1, payloadType: 'IntegrationsEventPayload' },
    'integrations.connector_deactivated': { description: 'Emitted when a connector is deactivated', version: 1, payloadType: 'IntegrationsEventPayload' },
    'integrations.webhook_received': { description: 'Emitted when an inbound webhook is received', version: 1, payloadType: 'IntegrationsEventPayload' },
    'integrations.data_imported': { description: 'Emitted when external data is imported via connector', version: 1, payloadType: 'IntegrationsEventPayload' },
    'integrations.sso_config_changed': { description: 'Emitted when SSO configuration is updated', version: 1, payloadType: 'IntegrationsEventPayload' },
  },
  consumed: {
    'admin.config_updated': { source: 'admin', handler: 'handleConfigUpdated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'workflow.task_completed': { source: 'workflow', handler: 'handleTaskCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const INTEGRATIONS_PUBLISHED_EVENTS = Object.keys(INTEGRATIONS_EVENT_CONTRACT.published);
export const INTEGRATIONS_CONSUMED_EVENTS = Object.keys(INTEGRATIONS_EVENT_CONTRACT.consumed);


export const INTEGRATIONS_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const INTEGRATIONS_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const INTEGRATIONS_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const INTEGRATIONS_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
