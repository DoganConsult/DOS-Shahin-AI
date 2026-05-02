import type { ModuleEventContract } from '@dos/types';

export const WORKFLOW_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'workflow',
  published: {
    'workflow.instance_created': { description: 'Emitted when a new workflow instance is created', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.instance_completed': { description: 'Emitted when a workflow instance reaches terminal state', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.instance_cancelled': { description: 'Emitted when a workflow is cancelled', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.step_completed': { description: 'Emitted when a workflow step is completed', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.step_failed': { description: 'Emitted when a workflow step fails', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.step_skipped': { description: 'Emitted when a workflow step is skipped', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.approval_requested': { description: 'Emitted when a step requires approval', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.approval_granted': { description: 'Emitted when an approval is granted', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.approval_rejected': { description: 'Emitted when an approval is rejected', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.task_assigned': { description: 'Emitted when a process task is assigned to a user', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.task_completed': { description: 'Emitted when a process task is completed', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.task_reassigned': { description: 'Emitted when a process task is reassigned', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.sla_warning': { description: 'Emitted when a task approaches SLA deadline (75%)', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.sla_breached': { description: 'Emitted when a task exceeds SLA deadline', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.escalation_triggered': { description: 'Emitted when task is escalated to next level', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.chain_started': { description: 'Emitted when a cross-module workflow chain begins', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.chain_completed': { description: 'Emitted when a cross-module chain completes', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.automation_executed': { description: 'Emitted when an automation rule fires', version: 1, payloadType: 'WorkflowEventPayload' },
    'workflow.status_changed': { description: 'Emitted when workflow instance status transitions', version: 1, payloadType: 'WorkflowEventPayload' },
  },
  consumed: {
    'risk.status_changed': { source: 'risk', handler: 'handleRiskStatusChanged', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'compliance.gap_detected': { source: 'compliance', handler: 'handleComplianceGapDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'incident.classified': { source: 'incident', handler: 'handleIncidentClassified', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'evidence.collected': { source: 'evidence', handler: 'handleEvidenceCollected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'audit.finding_created': { source: 'audit', handler: 'handleAuditFindingCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'policy.approved': { source: 'policy', handler: 'handlePolicyApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'vendor.sla_breached': { source: 'vendor', handler: 'handleVendorSlaBreach', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'exception.approved': { source: 'exception', handler: 'handleExceptionApproved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'team.member_removed': { source: 'team', handler: 'handleTeamMemberRemoved', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'dashboard.widget_created': { source: 'dashboard', handler: 'handleDashboardWidgetCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: false },
    'navigation.item_updated': { source: 'navigation', handler: 'handleNavigationItemUpdated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: false },
    'provisioning.tenant_provisioned': { source: 'provisioning', handler: 'handleTenantProvisioned', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'onboarding.completed': { source: 'onboarding', handler: 'handleOnboardingCompleted', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'dora.obligation_created': { source: 'dora', handler: 'handleDoraObligationCreated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'governance_ai.signal_detected': { source: 'governance_ai', handler: 'handleGovernanceSignalDetected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

export const WORKFLOW_PUBLISHED_EVENTS = Object.keys(WORKFLOW_EVENT_CONTRACT.published);
export const WORKFLOW_CONSUMED_EVENTS = Object.keys(WORKFLOW_EVENT_CONTRACT.consumed);


export const WORKFLOW_EVENT_LEGACY_ALIASES: Record<string, string> = {};

export const WORKFLOW_EVENT_ORDERING = {
  strictOrdering: true,
  partitionKey: 'tenantId',
  deduplicationWindow: 300,
  maxRetries: 3,
  retryBackoffMs: [1000, 5000, 15000],
} as const;

export const WORKFLOW_EVENT_SECURITY = {
  requireAuthentication: true,
  allowCrossTenant: false,
  sensitivePayloadFields: [] as string[],
  auditAllPublishes: true,
  auditAllConsumptions: true,
  encryptPayload: false,
  signPayload: false,
} as const;

export const WORKFLOW_EVENT_CORRELATION = {
  enableCorrelation: true,
  propagateCorrelationId: true,
  generateIfMissing: true,
  includeInLogs: true,
  includeInTracing: true,
} as const;
