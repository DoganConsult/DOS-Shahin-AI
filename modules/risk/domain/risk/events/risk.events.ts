import type { ModuleEventContract } from '@dos/types';

export const RISK_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'risk',
  published: {
  'risk.created': { description: 'Emitted when a new risk is registered', version: 1, payloadType: 'RiskEventPayload' },
  'risk.assessment_completed': { description: 'Emitted when a risk assessment cycle completes', version: 1, payloadType: 'RiskEventPayload' },
  'risk.score_changed': { description: 'Emitted when a risk score is recalculated', version: 1, payloadType: 'RiskEventPayload' },
  'risk.inherent_score_changed': { description: 'Emitted when the inherent risk score changes', version: 1, payloadType: 'RiskEventPayload' },
  'risk.residual_high': { description: 'Emitted when residual risk exceeds appetite threshold', version: 1, payloadType: 'RiskEventPayload' },
  'risk.risk_accepted': { description: 'Emitted when a risk is formally accepted', version: 1, payloadType: 'RiskEventPayload' },
  'risk.status_changed': { description: 'Emitted when risk status transitions', version: 1, payloadType: 'RiskEventPayload' },
  'risk.treatment_overdue': { description: 'Emitted when treatment plan passes its due date', version: 1, payloadType: 'RiskEventPayload' },
  'risk.treatment_updated': { description: 'Emitted when a treatment plan is modified', version: 1, payloadType: 'RiskEventPayload' },
  'risk.appetite_breached': { description: 'Emitted when risk appetite statement is breached', version: 1, payloadType: 'RiskEventPayload' },
  'risk.kri_threshold_breached': { description: 'Emitted when a KRI threshold is exceeded', version: 1, payloadType: 'RiskEventPayload' },
  'risk.exceeded_appetite': { description: 'Emitted when risk score exceeds the appetite maximum', version: 1, payloadType: 'RiskEventPayload' },
  'risk.mitigation_required': { description: 'Emitted when untreated high risk requires mitigation', version: 1, payloadType: 'RiskEventPayload' },
},
  consumed: {
  'foundation.scope_changed': { source: 'foundation', handler: 'handleFoundationScopeChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'compliance.gap_detected': { source: 'compliance', handler: 'handleComplianceGapDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'vendor.risk_changed': { source: 'vendor', handler: 'handleVendorRiskChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'asset.classified': { source: 'asset', handler: 'handleAssetClassified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.classified': { source: 'incident', handler: 'handleIncidentClassified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'audit.finding_created': { source: 'audit', handler: 'handleAuditFindingCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.effectiveness_failed': { source: 'controls', handler: 'handleControlEffectivenessLow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'evidence.coverage_low': { source: 'evidence', handler: 'handleEvidenceCoverageLow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'bcp.rto_rpo_drift': { source: 'bcp', handler: 'handleBcpRtoRpoDrift', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.position.holder.unassigned': { source: 'foundation', handler: 'handleFoundationPositionUnassigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const RISK_PUBLISHED_EVENTS = Object.keys(RISK_EVENT_CONTRACT.published);
export const RISK_CONSUMED_EVENTS = Object.keys(RISK_EVENT_CONTRACT.consumed);


export const RISK_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const RISK_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const RISK_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const RISK_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
