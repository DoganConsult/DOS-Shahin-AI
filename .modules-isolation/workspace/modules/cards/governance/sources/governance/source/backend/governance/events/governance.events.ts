import type { ModuleEventContract } from '@dos/types';

export const GOVERNANCE_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'governance',
  published: {
  'governance.charter_approved': { description: 'Emitted when a charter is approved', version: 1, payloadType: 'GovernanceEventPayload' },
  'governance.committee_meeting_scheduled': { description: 'Emitted when a committee meeting is scheduled', version: 1, payloadType: 'GovernanceEventPayload' },
  'governance.decision_recorded': { description: 'Emitted when a decision is recorded', version: 1, payloadType: 'GovernanceEventPayload' },
  'governance.delegation_created': { description: 'Emitted when a delegation is created', version: 1, payloadType: 'GovernanceEventPayload' },
  'governance.health_score_updated': { description: 'Emitted when governance health score updates', version: 1, payloadType: 'GovernanceEventPayload' },
  'governance.mandate_activated': { description: 'Emitted when a mandate is activated', version: 1, payloadType: 'GovernanceEventPayload' },
  'governance.obligation_created': { description: 'Emitted when an obligation is created', version: 1, payloadType: 'GovernanceEventPayload' },
  'governance.action_created': { description: 'Emitted when a governance action is created', version: 1, payloadType: 'GovernanceEventPayload' },
  'governance.review_completed': { description: 'Emitted when a governance review completes', version: 1, payloadType: 'GovernanceEventPayload' },
  'governance.board_pack_generated': { description: 'Emitted when a board pack is generated', version: 1, payloadType: 'GovernanceEventPayload' },
  'governance.milestone_reached': { description: 'Emitted when a milestone is reached', version: 1, payloadType: 'GovernanceEventPayload' },
  'governance.initiative_started': { description: 'Emitted when an initiative starts', version: 1, payloadType: 'GovernanceEventPayload' },
  'governance.digest_published': { description: 'Emitted when a digest is published', version: 1, payloadType: 'GovernanceEventPayload' },
  'governance.exec_summary_generated': { description: 'Emitted when an executive summary is generated', version: 1, payloadType: 'GovernanceEventPayload' },
  'governance.structure_changed': { description: 'Emitted when governance structure changes', version: 1, payloadType: 'GovernanceEventPayload' },
},
  consumed: {
  'compliance.posture_changed': { source: 'compliance', handler: 'handleCompliancePostureChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'risk.assessment_completed': { source: 'risk', handler: 'handleRiskAssessmentCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'policy.approved': { source: 'policy', handler: 'handlePolicyApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'audit.engagement_completed': { source: 'audit', handler: 'handleAuditEngagementCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'workflow.status_changed': { source: 'workflow', handler: 'handleWorkflowStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'risk.appetite_breached': { source: 'risk', handler: 'handleRiskExceededAppetite', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'compliance.framework_gap_identified': { source: 'compliance', handler: 'handleFrameworkGapIdentified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.sla_breached': { source: 'incident', handler: 'handleIncidentSlaBreach', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'privacy.impact_assessment_completed': { source: 'privacy', handler: 'handlePrivacyImpactHigh', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'bcp.rto_rpo_drift': { source: 'bcp', handler: 'handleBcpRtoRpoDrift', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'bcp.crisis_readiness_low': { source: 'bcp', handler: 'handleBcpCrisisReadinessLow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'bcp.maturity_regression': { source: 'bcp', handler: 'handleBcpMaturityRegression', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'bcp.plan_stale': { source: 'bcp', handler: 'handleBcpPlanStale', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'bcp.bia_stale': { source: 'bcp', handler: 'handleBcpBiaStale', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'incident.escalated': { source: 'incident', handler: 'handleIncidentEscalated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'controls.effectiveness_failed': { source: 'controls', handler: 'handleControlEffectivenessLow', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'remediation.overdue': { source: 'remediation', handler: 'handleRemediationOverdue', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.role.assigned': { source: 'foundation', handler: 'handleFoundationRoleAssigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  'foundation.role.unassigned': { source: 'foundation', handler: 'handleFoundationRoleUnassigned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
},
};

export const GOVERNANCE_PUBLISHED_EVENTS = Object.keys(GOVERNANCE_EVENT_CONTRACT.published);
export const GOVERNANCE_CONSUMED_EVENTS = Object.keys(GOVERNANCE_EVENT_CONTRACT.consumed);


export const GOVERNANCE_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const GOVERNANCE_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const GOVERNANCE_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const GOVERNANCE_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
