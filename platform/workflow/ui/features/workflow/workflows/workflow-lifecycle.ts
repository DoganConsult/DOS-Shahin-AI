export const WORKFLOW_LIFECYCLE_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type WorkflowLifecycleState = (typeof WORKFLOW_LIFECYCLE_STATES)[number];

export const WORKFLOW_INSTANCE_STATES = [
  'pending', 'running', 'awaiting_approval', 'escalated',
  'suspended', 'completed', 'cancelled', 'failed',
] as const;

export type WorkflowInstanceState = (typeof WORKFLOW_INSTANCE_STATES)[number];

export function isTerminalState(state: string): boolean {
  return ['completed', 'cancelled', 'archived'].includes(state);
}
