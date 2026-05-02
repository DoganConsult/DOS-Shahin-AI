export const WORKFLOW_NODE_TYPES_EXECUTED = [
  'start', 'end', 'approval', 'task', 'condition', 'parallel',
  'timer', 'notification', 'escalation', 'subprocess', 'script',
] as const;

export const WORKFLOW_NODE_TYPES_UI_ONLY = [
  'note', 'group', 'swimlane', 'label',
] as const;

export const ALL_PALETTE_NODE_TYPES = [
  ...WORKFLOW_NODE_TYPES_EXECUTED,
  ...WORKFLOW_NODE_TYPES_UI_ONLY,
] as const;

export type ExecutedNodeType = typeof WORKFLOW_NODE_TYPES_EXECUTED[number];
export type UiOnlyNodeType = typeof WORKFLOW_NODE_TYPES_UI_ONLY[number];
export type PaletteNodeType = typeof ALL_PALETTE_NODE_TYPES[number];

export function isExecutedNodeType(value: unknown): value is ExecutedNodeType {
  return typeof value === 'string' && (WORKFLOW_NODE_TYPES_EXECUTED as readonly string[]).includes(value);
}

export const WORKFLOW_ACTION_SUBTYPES_EXECUTED = [
  'api_call', 'send_email', 'webhook', 'db_query', 'script_run',
  'approval', 'task', 'script', 'subprocess',
] as const;

export type ExecutableActionSubType = typeof WORKFLOW_ACTION_SUBTYPES_EXECUTED[number];

export function isExecutableActionSubType(value: unknown): boolean {
  return typeof value === 'string' && (WORKFLOW_ACTION_SUBTYPES_EXECUTED as readonly string[]).includes(value);
}

export function isTenantWideExecutionRole(role: string): boolean {
  return ['tenant_admin', 'workflow_admin', 'platform_super_admin'].includes(role);
}

export interface WorkflowNode {
  id: string;
  type: PaletteNodeType;
  label: string;
  position: { x: number; y: number };
  data?: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface WorkflowDefinition {
  id: string;
  code: string;
  name: string;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: 'draft' | 'active' | 'deprecated';
}
