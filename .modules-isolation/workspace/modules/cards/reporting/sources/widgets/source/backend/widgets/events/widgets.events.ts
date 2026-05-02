import type { PlatformEvent as _PlatformEvent } from '../ports/events.port';

export const WIDGETS_EVENT_TYPES = {
  RECORD_CREATED: 'widgets.record.created',
  RECORD_UPDATED: 'widgets.record.updated',
  RECORD_DELETED: 'widgets.record.deleted',
  STATUS_CHANGED: 'widgets.status.changed',
  DATA_REFRESHED: 'widgets.data.refreshed',
  AI_USAGE: 'widgets.ai.usage',
} as const;

export type WIDGETS_EventType = typeof WIDGETS_EVENT_TYPES[keyof typeof WIDGETS_EVENT_TYPES];

/**
 * Module event contract for the widgets module.
 * Declares published and consumed events following the canonical pattern.
 */
export const WIDGETS_EVENT_CONTRACT = {
  moduleCode: 'widgets',
  published: {
    'widgets.record.created': { description: 'Widget registry entry created', version: 1, payloadType: 'WidgetEventPayload' },
    'widgets.record.updated': { description: 'Widget registry entry updated', version: 1, payloadType: 'WidgetEventPayload' },
    'widgets.record.deleted': { description: 'Widget registry entry deleted', version: 1, payloadType: 'WidgetEventPayload' },
    'widgets.status.changed': { description: 'Widget status transitioned', version: 1, payloadType: 'WidgetEventPayload' },
    'widgets.data.refreshed': { description: 'Widget data source refreshed', version: 1, payloadType: 'WidgetEventPayload' },
  },
  consumed: {
    'risk.score_changed': { source: 'risk', handler: 'handleRiskScoreChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'risk.record.created': { source: 'risk', handler: 'handleRiskRecordChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'risk.record.updated': { source: 'risk', handler: 'handleRiskRecordChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.posture_changed': { source: 'compliance', handler: 'handleCompliancePostureChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.assessment_completed': { source: 'compliance', handler: 'handleComplianceAssessmentCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'audit.finding_created': { source: 'audit', handler: 'handleAuditChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'audit.record.updated': { source: 'audit', handler: 'handleAuditChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'evidence.record.created': { source: 'evidence', handler: 'handleEvidenceChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'evidence.record.deleted': { source: 'evidence', handler: 'handleEvidenceChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'incident.record.created': { source: 'incident', handler: 'handleIncidentChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'incident.status_changed': { source: 'incident', handler: 'handleIncidentChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'policy.record.updated': { source: 'policy', handler: 'handlePolicyUpdated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'governance.decision_made': { source: 'governance', handler: 'handleGovernanceDecision', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'dashboard.layout.changed': { source: 'dashboard', handler: 'handleDashboardLayoutChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'provisioning.completed': { source: 'provisioning', handler: 'handleProvisioningCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'team.created': { source: 'team', handler: 'handleTeamChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'team.archived': { source: 'team', handler: 'handleTeamChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'team.member_added': { source: 'team', handler: 'handleTeamChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'team.member_removed': { source: 'team', handler: 'handleTeamChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'team.capacity_changed': { source: 'team', handler: 'handleTeamChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'journey.milestone_achieved': { source: 'journey', handler: 'handleJourneyMilestoneChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'journey.maturity_level_changed': { source: 'journey', handler: 'handleJourneyMaturityChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'journey.roadmap_created': { source: 'journey', handler: 'handleJourneyMaturityChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'journey.roadmap_completed': { source: 'journey', handler: 'handleJourneyMaturityChange', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
} as const;

export const WIDGETS_PUBLISHED_EVENTS = Object.keys(WIDGETS_EVENT_CONTRACT.published);
export const WIDGETS_CONSUMED_EVENTS = Object.keys(WIDGETS_EVENT_CONTRACT.consumed);

export const WIDGETS_EVENT_ORDERING = {
  strictOrdering: false,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const WIDGETS_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;
