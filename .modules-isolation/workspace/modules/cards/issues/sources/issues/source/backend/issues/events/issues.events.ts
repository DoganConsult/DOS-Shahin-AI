import type { ModuleEventContract } from '@dos/types';

export const ISSUES_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'issues',
  published: {
  'issues.created': { description: 'Emitted when an issue is created', version: 1, payloadType: 'IssuesEventPayload' },
  'issues.assigned': { description: 'Emitted when an issue is assigned', version: 1, payloadType: 'IssuesEventPayload' },
  'issues.escalated': { description: 'Emitted when an issue is escalated', version: 1, payloadType: 'IssuesEventPayload' },
  'issues.resolved': { description: 'Emitted when an issue is resolved', version: 1, payloadType: 'IssuesEventPayload' },
  'issues.closed': { description: 'Emitted when an issue is closed', version: 1, payloadType: 'IssuesEventPayload' },
  'issues.reopened': { description: 'Emitted when an issue is reopened', version: 1, payloadType: 'IssuesEventPayload' },
  'issues.overdue': { description: 'Emitted when an issue is overdue', version: 1, payloadType: 'IssuesEventPayload' },
  'issues.linked': { description: 'Emitted when an issue is linked to another entity', version: 1, payloadType: 'IssuesEventPayload' },
},
  consumed: {
  'compliance.gap_detected': { source: 'compliance', handler: 'handleComplianceGapDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'audit.finding_created': { source: 'audit', handler: 'handleAuditFindingCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'risk.residual_high': { source: 'risk', handler: 'handleRiskResidualHigh', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.created': { source: 'incident', handler: 'handleIncidentCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'vendor.issue_created': { source: 'vendor', handler: 'handleVendorIssueCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.org.manager.changed': { source: 'foundation', handler: 'handleFoundationManagerChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.position.holder.unassigned': { source: 'foundation', handler: 'handleFoundationPositionUnassigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const ISSUES_PUBLISHED_EVENTS = Object.keys(ISSUES_EVENT_CONTRACT.published);
export const ISSUES_CONSUMED_EVENTS = Object.keys(ISSUES_EVENT_CONTRACT.consumed);


export const ISSUES_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const ISSUES_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const ISSUES_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const ISSUES_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
