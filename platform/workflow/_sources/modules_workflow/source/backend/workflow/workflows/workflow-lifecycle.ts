import type { WorkflowDefinitionContract as _WorkflowDefinitionContract } from '../contracts/workflow.contracts';

export const WORKFLOW_LIFECYCLE_STATES = [
  'draft',
  'in_review',
  'approved',
  'active',
  'suspended',
  'archived',
] as const;

export type WorkflowLifecycleState = (typeof WORKFLOW_LIFECYCLE_STATES)[number];

export const WORKFLOW_LIFECYCLE_TRANSITIONS: Record<WorkflowLifecycleState, WorkflowLifecycleState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

export const WORKFLOW_INSTANCE_STATES = [
  'pending',
  'running',
  'awaiting_approval',
  'escalated',
  'suspended',
  'completed',
  'cancelled',
  'failed',
] as const;

export type WorkflowInstanceState = (typeof WORKFLOW_INSTANCE_STATES)[number];

export const WORKFLOW_INSTANCE_TRANSITIONS: Record<WorkflowInstanceState, WorkflowInstanceState[]> = {
  pending: ['running', 'cancelled'],
  running: ['awaiting_approval', 'completed', 'failed', 'suspended', 'cancelled'],
  awaiting_approval: ['running', 'escalated', 'cancelled'],
  escalated: ['running', 'cancelled'],
  suspended: ['running', 'cancelled'],
  completed: [],
  cancelled: [],
  failed: ['running'],
};

export function isValidTransition(
  currentState: string,
  targetState: string,
  stateMap: Record<string, string[]>,
): boolean {
  const allowed = stateMap[currentState];
  if (!allowed) return false;
  return allowed.includes(targetState);
}

export function getTerminalStates(stateMap: Record<string, string[]>): string[] {
  return Object.entries(stateMap)
    .filter(([, targets]) => targets.length === 0)
    .map(([state]) => state);
}
