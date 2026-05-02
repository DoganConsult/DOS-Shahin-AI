import type { ModuleEventContract } from '@dos/types';

export const INCIDENT_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'incident',
  published: {
  'incident.created': { description: 'Emitted when an incident is reported', version: 1, payloadType: 'IncidentEventPayload' },
  'incident.classified': { description: 'Emitted when an incident is classified', version: 1, payloadType: 'IncidentEventPayload' },
  'incident.contained': { description: 'Emitted when an incident is contained', version: 1, payloadType: 'IncidentEventPayload' },
  'incident.escalated': { description: 'Emitted when an incident is escalated', version: 1, payloadType: 'IncidentEventPayload' },
  'incident.closed': { description: 'Emitted when an incident is closed', version: 1, payloadType: 'IncidentEventPayload' },
  'incident.breach_reported': { description: 'Emitted when a breach is reported', version: 1, payloadType: 'IncidentEventPayload' },
  'incident.capa_assigned': { description: 'Emitted when CAPA is assigned', version: 1, payloadType: 'IncidentEventPayload' },
  'incident.near_miss_reported': { description: 'Emitted when a near miss is reported', version: 1, payloadType: 'IncidentEventPayload' },
  'incident.pir_completed': { description: 'Emitted when post-incident review completes', version: 1, payloadType: 'IncidentEventPayload' },
  'incident.lesson_documented': { description: 'Emitted when a lesson learned is documented', version: 1, payloadType: 'IncidentEventPayload' },
  'incident.severity_changed': { description: 'Emitted when incident severity changes', version: 1, payloadType: 'IncidentEventPayload' },
  'incident.owner_assigned': { description: 'Emitted when incident owner is assigned', version: 1, payloadType: 'IncidentEventPayload' },
  'incident.war_room_opened': { description: 'Emitted when war room is opened', version: 1, payloadType: 'IncidentEventPayload' },
  'incident.triage_completed': { description: 'Emitted when triage completes', version: 1, payloadType: 'IncidentEventPayload' },
  'incident.impact_assessed': { description: 'Emitted when impact is assessed', version: 1, payloadType: 'IncidentEventPayload' },
  'incident.sla_breached': { description: 'Emitted when incident SLA is breached', version: 1, payloadType: 'IncidentEventPayload' },
},
  consumed: {
  'risk.residual_high': { source: 'risk', handler: 'handleRiskResidualHigh', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'compliance.posture_changed': { source: 'compliance', handler: 'handleCompliancePostureChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'vendor.risk_changed': { source: 'vendor', handler: 'handleVendorRiskChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'bcp.crisis_declared': { source: 'bcp', handler: 'handleBcpCrisisDeclared', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.org.manager.changed': { source: 'foundation', handler: 'handleFoundationManagerChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.sla_breached': { source: 'incident', handler: 'handleIncidentSlaBreach', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'bcp.crisis_readiness_low': { source: 'bcp', handler: 'handleBcpCrisisReadinessLow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'remediation.verified': { source: 'remediation', handler: 'handleRemediationVerified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'remediation.overdue': { source: 'remediation', handler: 'handleRemediationOverdue', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.effectiveness_failed': { source: 'controls', handler: 'handleControlEffectivenessLow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'audit.finding_created': { source: 'audit', handler: 'handleAuditFindingCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const INCIDENT_PUBLISHED_EVENTS = Object.keys(INCIDENT_EVENT_CONTRACT.published);
export const INCIDENT_CONSUMED_EVENTS = Object.keys(INCIDENT_EVENT_CONTRACT.consumed);


export const INCIDENT_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const INCIDENT_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const INCIDENT_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const INCIDENT_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
