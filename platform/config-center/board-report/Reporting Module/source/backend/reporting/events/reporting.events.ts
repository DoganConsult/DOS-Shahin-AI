import type { ModuleEventContract } from '@dos/types';

export const REPORTING_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'reporting',
  published: {
    'reporting.report_generated': { description: 'Emitted when a report is generated', version: 1, payloadType: 'ReportingEventPayload' },
    'reporting.report_scheduled': { description: 'Emitted when a report schedule is created/updated', version: 1, payloadType: 'ReportingEventPayload' },
    'reporting.report_delivered': { description: 'Emitted when a report is delivered to recipients', version: 1, payloadType: 'ReportingEventPayload' },
    'reporting.board_pack_assembled': { description: 'Emitted when a board pack is assembled', version: 1, payloadType: 'ReportingEventPayload' },
    'reporting.export_completed': { description: 'Emitted when a data export completes', version: 1, payloadType: 'ReportingEventPayload' },
    'reporting.template_created': { description: 'Emitted when a new report template is created', version: 1, payloadType: 'ReportingEventPayload' },
  },
  consumed: {
    'risk.score_changed': { source: 'risk', handler: 'handleRiskScoreChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.posture_changed': { source: 'compliance', handler: 'handlePostureChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'analytics.kpi_snapshot_generated': { source: 'analytics', handler: 'handleKpiSnapshot', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'audit.finding_created': { source: 'audit', handler: 'handleAuditFinding', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'incident.classified': { source: 'incident', handler: 'handleIncidentCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const REPORTING_PUBLISHED_EVENTS = Object.keys(REPORTING_EVENT_CONTRACT.published);
export const REPORTING_CONSUMED_EVENTS = Object.keys(REPORTING_EVENT_CONTRACT.consumed);


export const REPORTING_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const REPORTING_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const REPORTING_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const REPORTING_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
