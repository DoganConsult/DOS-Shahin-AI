export type WorkflowNodeKind =
  | 'start' | 'end' | 'task' | 'approval' | 'gateway-and' | 'gateway-or'
  | 'gateway-xor' | 'timer' | 'subprocess' | 'service-call' | 'script'
  | 'event-catch' | 'event-throw' | 'parallel-fork' | 'parallel-join'
  | 'note' | 'group';

export const WORKFLOW_NODE_TYPES_EXECUTED: readonly WorkflowNodeKind[] = [
  'start', 'end', 'task', 'approval',
  'gateway-and', 'gateway-or', 'gateway-xor',
  'timer', 'subprocess', 'service-call', 'script',
  'event-catch', 'event-throw',
  'parallel-fork', 'parallel-join',
] as const;

export const WORKFLOW_NODE_TYPES_UI_ONLY: readonly WorkflowNodeKind[] = [
  'note', 'group',
] as const;

export const ALL_PALETTE_NODE_TYPES: readonly WorkflowNodeKind[] = [
  ...WORKFLOW_NODE_TYPES_EXECUTED,
  ...WORKFLOW_NODE_TYPES_UI_ONLY,
] as const;
