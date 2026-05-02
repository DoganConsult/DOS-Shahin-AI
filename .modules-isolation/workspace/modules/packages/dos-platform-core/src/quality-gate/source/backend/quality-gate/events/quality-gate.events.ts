/**
 * quality-gate — Event Contracts
 * Published and consumed events for quality gate lifecycle.
 */

import type { ModuleEventContract } from '@dos/types';

export const QGATE_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'quality-gate',
  published: {
    'quality-gate.run.started': { description: 'Quality gate evaluation started for a tenant', version: 1, payloadType: 'QgateEventPayload' },
    'quality-gate.run.completed': { description: 'Quality gate evaluation completed (all stages)', version: 1, payloadType: 'QgateEventPayload' },
    'quality-gate.run.failed': { description: 'Quality gate evaluation failed (one or more blocking stages)', version: 1, payloadType: 'QgateEventPayload' },
    'quality-gate.run.overridden': { description: 'Failing quality gate overridden by authorized user', version: 1, payloadType: 'QgateEventPayload' },
    'quality-gate.stage.passed': { description: 'Individual quality gate stage passed', version: 1, payloadType: 'QgateEventPayload' },
    'quality-gate.stage.failed': { description: 'Individual quality gate stage failed', version: 1, payloadType: 'QgateEventPayload' },
    'quality-gate.drift.detected': { description: 'Schema drift detected for tenant schema', version: 1, payloadType: 'QgateEventPayload' },
    'quality-gate.ai.injection_blocked': { description: 'Prompt injection attack blocked during AI guardrail evaluation', version: 1, payloadType: 'QgateEventPayload' },
    'quality-gate.ai.tenant_leak': { description: 'Tenant isolation breach detected during AI guardrail evaluation', version: 1, payloadType: 'QgateEventPayload' },
    'quality-gate.threshold.updated': { description: 'Quality gate threshold updated for a tenant', version: 1, payloadType: 'QgateEventPayload' },
  },
  consumed: {
    'delivery.quality_gate.evaluated': { source: 'platform', handler: 'handlePlatformGateEvaluated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'provisioning.completed': { source: 'provisioning', handler: 'handleProvisioningCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const QGATE_PUBLISHED_EVENTS = Object.keys(QGATE_EVENT_CONTRACT.published);
export const QGATE_CONSUMED_EVENTS = Object.keys(QGATE_EVENT_CONTRACT.consumed);

export const QGATE_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const QGATE_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const QGATE_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: ['override_reason'] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const QGATE_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
