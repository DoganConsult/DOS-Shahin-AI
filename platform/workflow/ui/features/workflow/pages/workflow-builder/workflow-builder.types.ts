/**
 * Workflow Builder — shared types and pure validation functions.
 *
 * Extracted from workflow-builder.component.ts for reuse by
 * child presentational components and PBT tests.
 */

// ── Workflow Canvas Models (exported for PBT) ──────────────────────────────

export interface WorkflowNode {
  nodeId: string;
  type: 'start' | 'end' | 'action' | 'decision' | 'approval';
  label: string;
  x: number;
  y: number;
  config: Record<string, any>;
}

export interface WorkflowEdge {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
}

export interface WorkflowCanvas {
  workflowId: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowStep {
  trigger: string;
  action: string;
  condition: string;
  notification: string;
}

export interface WorkflowDefinition {
  workflow_id?: string;
  id?: string;
  name: string;
  description?: string;
  trigger_type?: string;
  trigger?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  stepCount?: number;
  definition?: { steps?: WorkflowStep[]; triggerConditions?: string[] };
  canvas?: WorkflowCanvas;
  bpmn_xml?: string;
  [key: string]: unknown;
}

// ── Node type metadata ──────────────────────────────────────────────────────

export const NODE_TYPE_LABELS: Record<string, string> = {
  start: 'Start', end: 'End', action: 'Action', decision: 'Decision', approval: 'Approval',
  trigger: 'Trigger', condition: 'Condition', notification: 'Notification', task: 'Task', governance: 'Governance',
};

export const NODE_COLORS: Record<string, string> = {
  start: 'var(--success)',
  end: 'var(--error)',
  action: '#3b82f6',
  decision: 'var(--warning)',
  approval: '#8b5cf6',
};

export const NODE_ICONS: Record<string, string> = {
  start: '\u25B6',
  end: '\u25A0',
  action: '\u26A1',
  decision: '\u25C6',
  approval: '\u2713',
};

// ── Pure validation functions (exported for PBT -- Properties 19, 20) ─────

/**
 * Validates a workflow graph: exactly one start node and at least one end node.
 * Returns { valid, errors } where errors lists all validation failures.
 *
 * Feature: smart-seeding-quick-wins, Property 19: Workflow graph validation
 * **Validates: Requirements 17.5**
 */
export function validateWorkflowGraph(nodes: WorkflowNode[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const startNodes = nodes.filter(n => n.type === 'start');
  const endNodes = nodes.filter(n => n.type === 'end');

  if (startNodes.length !== 1) {
    errors.push(`Expected exactly 1 start node, found ${startNodes.length}`);
  }
  if (endNodes.length < 1) {
    errors.push(`Expected at least 1 end node, found ${endNodes.length}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Serializes a WorkflowCanvas to a plain object for persistence.
 * Deserializing the result should produce an equivalent canvas.
 *
 * Feature: smart-seeding-quick-wins, Property 20: Workflow canvas round-trip
 * **Validates: Requirements 17.4**
 */
export function serializeCanvas(canvas: WorkflowCanvas): Record<string, any> {
  return {
    workflowId: canvas.workflowId,
    nodes: canvas.nodes.map(n => ({
      nodeId: n.nodeId,
      type: n.type,
      label: n.label,
      x: n.x,
      y: n.y,
      config: { ...n.config },
    })),
    edges: canvas.edges.map(e => ({
      edgeId: e.edgeId,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      ...(e.label != null ? { label: e.label } : {}),
    })),
  };
}

/**
 * Deserializes a plain object back into a WorkflowCanvas.
 */
export function deserializeCanvas(data: any): WorkflowCanvas {
  return {
    workflowId: data.workflowId,
    nodes: (data.nodes || []).map((n: Record<string, any>) => ({
      nodeId: n.nodeId,
      type: n.type,
      label: n.label,
      x: n.x,
      y: n.y,
      config: n.config || {},
    })),
    edges: (data.edges || []).map((e: Record<string, any>) => ({
      edgeId: e.edgeId,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      ...(e.label != null ? { label: e.label } : {}),
    })),
  };
}

/** Generate a unique ID for nodes/edges. */
export function uid(): string {
  return 'n' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
