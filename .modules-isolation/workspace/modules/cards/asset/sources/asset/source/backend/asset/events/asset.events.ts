import type { ModuleEventContract } from '@dos/types';

export const ASSET_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'asset',
  published: {
  'asset.created': { description: 'Emitted when an asset is created', version: 1, payloadType: 'AssetEventPayload' },
  'asset.classified': { description: 'Emitted when an asset is classified', version: 1, payloadType: 'AssetEventPayload' },
  'asset.reclassified': { description: 'Emitted when an asset is reclassified', version: 1, payloadType: 'AssetEventPayload' },
  'asset.custody_transferred': { description: 'Emitted when asset custody is transferred', version: 1, payloadType: 'AssetEventPayload' },
  'asset.decommissioned': { description: 'Emitted when an asset is decommissioned', version: 1, payloadType: 'AssetEventPayload' },
  'asset.vulnerability_detected': { description: 'Emitted when a vulnerability is detected', version: 1, payloadType: 'AssetEventPayload' },
  'asset.criticality_changed': { description: 'Emitted when asset criticality changes', version: 1, payloadType: 'AssetEventPayload' },
},
  consumed: {
  'risk.score_changed': { source: 'risk', handler: 'handleRiskScoreChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'vendor.risk_changed': { source: 'vendor', handler: 'handleVendorRiskChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.classified': { source: 'incident', handler: 'handleIncidentClassified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'compliance.gap_detected': { source: 'compliance', handler: 'handleComplianceGapDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.sla_breached': { source: 'incident', handler: 'handleIncidentSlaBreach', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.breach_reported': { source: 'incident', handler: 'handleIncidentBreachReported', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.effectiveness_failed': { source: 'controls', handler: 'handleControlEffectivenessFailed', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.deficiency_detected': { source: 'controls', handler: 'handleControlDeficiencyDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'remediation.overdue': { source: 'remediation', handler: 'handleRemediationOverdue', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.position.holder.unassigned': { source: 'foundation', handler: 'handleFoundationPositionUnassigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const ASSET_PUBLISHED_EVENTS = Object.keys(ASSET_EVENT_CONTRACT.published);
export const ASSET_CONSUMED_EVENTS = Object.keys(ASSET_EVENT_CONTRACT.consumed);


export const ASSET_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const ASSET_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const ASSET_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const ASSET_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
