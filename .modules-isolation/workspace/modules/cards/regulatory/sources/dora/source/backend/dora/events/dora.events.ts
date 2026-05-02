import type { ModuleEventContract } from '@dos/types';

export const DORA_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'dora',
  published: {
    'dora.ict_asset_created': { description: 'Emitted when an ICT asset is registered', version: 1, payloadType: 'DoraEventPayload' },
    'dora.ict_asset_updated': { description: 'Emitted when an ICT asset is updated', version: 1, payloadType: 'DoraEventPayload' },
    'dora.ict_asset_decommissioned': { description: 'Emitted when an ICT asset is decommissioned', version: 1, payloadType: 'DoraEventPayload' },
    'dora.resilience_test_created': { description: 'Emitted when a resilience test is scheduled', version: 1, payloadType: 'DoraEventPayload' },
    'dora.resilience_test_completed': { description: 'Emitted when a resilience test completes', version: 1, payloadType: 'DoraEventPayload' },
    'dora.resilience_test_failed': { description: 'Emitted when a resilience test fails', version: 1, payloadType: 'DoraEventPayload' },
    'dora.resilience_test_overdue': { description: 'Emitted when a scheduled resilience test is overdue', version: 1, payloadType: 'DoraEventPayload' },
    'dora.resilience_finding_created': { description: 'Emitted when a resilience test finding is recorded', version: 1, payloadType: 'DoraEventPayload' },
    'dora.major_incident_reported': { description: 'Emitted when a major ICT incident is reported', version: 1, payloadType: 'DoraEventPayload' },
    'dora.major_incident_resolved': { description: 'Emitted when a major ICT incident is resolved', version: 1, payloadType: 'DoraEventPayload' },
    'dora.threat_intel_received': { description: 'Emitted when a threat intelligence signal is received', version: 1, payloadType: 'DoraEventPayload' },
    'dora.threat_intel_acknowledged': { description: 'Emitted when threat intelligence is acknowledged', version: 1, payloadType: 'DoraEventPayload' },
    'dora.third_party_flagged': { description: 'Emitted when a third-party provider is flagged', version: 1, payloadType: 'DoraEventPayload' },
    'dora.third_party_reviewed': { description: 'Emitted when a third-party provider review completes', version: 1, payloadType: 'DoraEventPayload' },
    'dora.backup_verified': { description: 'Emitted when a backup restore test passes', version: 1, payloadType: 'DoraEventPayload' },
    'dora.backup_failed': { description: 'Emitted when a backup restore test fails', version: 1, payloadType: 'DoraEventPayload' },
    'dora.obligation_created': { description: 'Emitted when a DORA obligation is created', version: 1, payloadType: 'DoraEventPayload' },
    'dora.obligation_updated': { description: 'Emitted when a DORA obligation is updated', version: 1, payloadType: 'DoraEventPayload' },
    'dora.obligation_deleted': { description: 'Emitted when a DORA obligation is deleted', version: 1, payloadType: 'DoraEventPayload' },
    'dora.obligation_overdue': { description: 'Emitted when a DORA obligation passes its deadline', version: 1, payloadType: 'DoraEventPayload' },
    'dora.obligation_mapping_created': { description: 'Emitted when an obligation mapping is created', version: 1, payloadType: 'DoraEventPayload' },
    'dora.framework_mapping_created': { description: 'Emitted when a framework mapping is created', version: 1, payloadType: 'DoraEventPayload' },
    'dora.control_mapping_created': { description: 'Emitted when a control mapping is created', version: 1, payloadType: 'DoraEventPayload' },
    'dora.concentration_risk_detected': { description: 'Emitted when third-party concentration risk is detected', version: 1, payloadType: 'DoraEventPayload' },
    'dora.status_changed': { description: 'Emitted when DORA entity status changes', version: 1, payloadType: 'DoraEventPayload' },
    'dora.ai_analysis_completed': { description: 'Emitted when AI analysis completes for audit trail', version: 1, payloadType: 'DoraEventPayload' },
  },
  consumed: {
    'incident.created': { source: 'incident', handler: 'handleIncidentCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'incident.escalated': { source: 'incident', handler: 'handleIncidentEscalated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'asset.classified': { source: 'asset', handler: 'handleAssetClassified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'vendor.risk_changed': { source: 'vendor', handler: 'handleVendorRiskChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'bcp.test_failed': { source: 'bcp', handler: 'handleBcpTestFailed', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.framework_gap_identified': { source: 'compliance', handler: 'handleComplianceFrameworkGap', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'controls.effectiveness_failed': { source: 'controls', handler: 'handleControlEffectivenessFailed', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'controls.deficiency_detected': { source: 'controls', handler: 'handleControlDeficiencyDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'incident.sla_breached': { source: 'incident', handler: 'handleIncidentSlaBreach', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'remediation.overdue': { source: 'remediation', handler: 'handleRemediationOverdue', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'governance.decision_recorded': { source: 'governance', handler: 'handleGovernanceDecisionRecorded', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const DORA_PUBLISHED_EVENTS = Object.keys(DORA_EVENT_CONTRACT.published);
export const DORA_CONSUMED_EVENTS = Object.keys(DORA_EVENT_CONTRACT.consumed);

export const DORA_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const DORA_EVENT_ORDERING = {
  strictOrdering: false,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const DORA_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const DORA_EVENT_CORRELATION = {} as const;
