/**
 * Packs -- Module Event Contract
 *
 * Canonical event definitions for the packs module.
 * Published events: installation lifecycle, catalog changes, compatibility results.
 * Consumed events: provisioning, module activation, tenant tier changes.
 *
 * MP-36 Section 11.1: Required logs for catalog changes, installation events,
 * compatibility results, and AI usage.
 *
 * @owner DOS
 * @module packs
 */

import type { ModuleEventContract } from '@dos/types';

export const PACKS_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'packs',
  published: {
    'packs.installed': {
      description: 'Emitted when a pack is successfully installed for a tenant',
      version: 1,
      payloadType: 'PacksEventPayload',
    },
    'packs.updated': {
      description: 'Emitted when an installed pack is updated to a new version',
      version: 1,
      payloadType: 'PacksEventPayload',
    },
    'packs.uninstalled': {
      description: 'Emitted when a pack is uninstalled from a tenant',
      version: 1,
      payloadType: 'PacksEventPayload',
    },
    'packs.install_failed': {
      description: 'Emitted when a pack installation fails',
      version: 1,
      payloadType: 'PacksEventPayload',
    },
    'packs.compatibility_checked': {
      description: 'Emitted when a compatibility check is performed on a pack',
      version: 1,
      payloadType: 'PacksEventPayload',
    },
    'packs.catalog_synced': {
      description: 'Emitted when the pack catalog is synced from disk to database',
      version: 1,
      payloadType: 'PacksEventPayload',
    },
    'packs.policy_evaluated': {
      description: 'Emitted when pack selection policies are evaluated for a session',
      version: 1,
      payloadType: 'PacksEventPayload',
    },
    'packs.health_check_completed': {
      description: 'Emitted when pack health monitoring job completes',
      version: 1,
      payloadType: 'PacksEventPayload',
    },
  },
  consumed: {
  'foundation.scope_changed': { source: 'foundation', handler: 'handleFoundationScopeChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'provisioning.job.started': {
      source: 'provisioning',
      handler: 'handleProvisioningStarted',
      idempotent: true,
      retryPolicy: 'exponential',
      deadLetterEnabled: true,
    },
    'provisioning.job.completed': {
      source: 'provisioning',
      handler: 'handleProvisioningCompleted',
      idempotent: true,
      retryPolicy: 'exponential',
      deadLetterEnabled: true,
    },
    'module.activated': {
      source: 'modules',
      handler: 'handleModuleActivated',
      idempotent: true,
      retryPolicy: 'exponential',
      deadLetterEnabled: true,
    },
    'tenant.tier.changed': {
      source: 'tenants',
      handler: 'handleTenantTierChanged',
      idempotent: true,
      retryPolicy: 'exponential',
      deadLetterEnabled: true,
    },
  },
};

export const PACKS_PUBLISHED_EVENTS = Object.keys(PACKS_EVENT_CONTRACT.published);
export const PACKS_CONSUMED_EVENTS = Object.keys(PACKS_EVENT_CONTRACT.consumed);

export const PACKS_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const PACKS_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: ['install_log', 'policy_snapshot'] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const PACKS_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
