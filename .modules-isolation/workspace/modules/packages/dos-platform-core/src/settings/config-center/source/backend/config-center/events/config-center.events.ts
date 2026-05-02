import type { ModuleEventContract } from '@dos/types';

export const CONFIG_CENTER_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'config-center',
  published: {
    'config-center.setting_updated': { description: 'Emitted when a config setting is created or updated', version: 1, payloadType: 'ConfigCenterEventPayload' },
    'config-center.setting_deleted': { description: 'Emitted when a config setting is deleted', version: 1, payloadType: 'ConfigCenterEventPayload' },
    'config-center.config_imported': { description: 'Emitted when a config snapshot is imported', version: 1, payloadType: 'ConfigCenterEventPayload' },
    'config-center.config_exported': { description: 'Emitted when a config snapshot is exported', version: 1, payloadType: 'ConfigCenterEventPayload' },
    'config-center.drift_detected': { description: 'Emitted when config drift is detected', version: 1, payloadType: 'ConfigCenterEventPayload' },
  },
  consumed: {},
};

export const CONFIG_CENTER_PUBLISHED_EVENTS = Object.keys(CONFIG_CENTER_EVENT_CONTRACT.published);
export const CONFIG_CENTER_CONSUMED_EVENTS = Object.keys(CONFIG_CENTER_EVENT_CONTRACT.consumed);

export const CONFIG_CENTER_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const CONFIG_CENTER_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: ['oldValue', 'newValue'] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;
