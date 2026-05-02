// ============================================
// AGRC-OS — Workflow Mermaid Diagram Service
// Generates Mermaid-syntax diagrams from workflow
// definitions, executions, and lifecycle registries.
// Requirements: Patch 7 §5, MP-02
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '../../ports/platform.port';

// ── Types ────────────────────────────────────────────────────────

/** Minimal node shape for diagram generation. */
interface DiagramNode {
  id: string;
  type: string;
  subType?: string;
  label_en?: string;
  label?: string;
  swimlane?: string;
  slaHours?: number;
}

/** Minimal edge shape for diagram generation. */
interface DiagramEdge {
  from?: string;
  to?: string;
  source?: string;
  target?: string;
  condition?: string;
  label?: string;
}

/** Workflow definition shape used for diagram inputs. */
interface DiagramDefinition {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  swimlanes?: string[];
  triggers?: Array<{ type: string; config?: Record<string, unknown> }>;
}

/** Step log entry from an execution. */
interface StepLogEntry {
  nodeId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  [key: string]: unknown;
}

// ── Node Shape Mapping ───────────────────────────────────────────

/** Map a workflow node type to its Mermaid shape. */
function nodeShape(node: DiagramNode): string {
  const label = escapeLabel(node.label_en || node.label || node.id);
  switch (node.type) {
    case 'start':
      return `${node.id}(["${label}"])`;
    case 'end':
      return `${node.id}(["${label}"])`;
    case 'decision':
    case 'condition':
      return `${node.id}{"${label}"}`;
    case 'approval':
      return `${node.id}[/"${label}"\\]`;
    case 'parallel_gateway':
      return `${node.id}{{"{${label}}"}}`;
    case 'notification':
      return `${node.id}>"${label}"]`;
    default: // task, action, etc.
      return `${node.id}["${label}"]`;
  }
}

/** Escape special Mermaid characters in labels. */
function escapeLabel(text: string): string {
  return text
    .replace(/"/g, "'")
    .replace(/\n/g, ' ')
    .replace(/[#;]/g, '_');
}

// ── Status Styling ───────────────────────────────────────────────

/** CSS class based on execution step status. */
function statusClass(status: string): string {
  switch (status) {
    case 'completed':
    case 'success':
      return 'completed';
    case 'running':
    case 'in_progress':
    case 'active':
      return 'active';
    case 'failed':
    case 'error':
      return 'failed';
    case 'skipped':
      return 'skipped';
    case 'paused':
    case 'pending':
      return 'pending';
    default:
      return 'default';
  }
}

// ── Build Execution Mermaid ──────────────────────────────────────

/**
 * Generate a Mermaid flowchart diagram for a workflow execution.
 * Highlights the current position and completed/failed steps.
 * This is the primary export consumed by workflow-crud.service.ts.
 *
 * @param definition - The workflow definition with nodes and edges
 * @param stepLog - Array of step log entries from the execution
 * @returns Mermaid diagram string
 */
export function buildExecutionMermaid(
  definition: DiagramDefinition,
  stepLog: StepLogEntry[],
): string {
  if (!definition || !Array.isArray(definition.nodes) || definition.nodes.length === 0) {
    return 'graph TD\n  empty["No workflow definition"]';
  }

  const lines: string[] = ['graph TD'];
  const stepStatusMap = new Map<string, string>();

  // Build status map from step log
  for (const step of stepLog || []) {
    if (step.nodeId) {
      stepStatusMap.set(step.nodeId, step.status);
    }
  }

  // Emit subgraphs for swimlanes if present
  const swimlanes = definition.swimlanes || [];
  const nodesBySwimlane = new Map<string, DiagramNode[]>();
  const noSwimlane: DiagramNode[] = [];

  for (const node of definition.nodes) {
    const lane = node.swimlane;
    if (lane && swimlanes.includes(lane)) {
      if (!nodesBySwimlane.has(lane)) {
        nodesBySwimlane.set(lane, []);
      }
      nodesBySwimlane.get(lane)!.push(node);
    } else {
      noSwimlane.push(node);
    }
  }

  // Emit nodes without swimlanes first
  for (const node of noSwimlane) {
    lines.push(`  ${nodeShape(node)}`);
  }

  // Emit swimlane subgraphs
  for (const [lane, nodes] of nodesBySwimlane) {
    lines.push(`  subgraph ${escapeLabel(lane)}`);
    for (const node of nodes) {
      lines.push(`    ${nodeShape(node)}`);
    }
    lines.push('  end');
  }

  // Emit edges
  for (const edge of definition.edges || []) {
    const from = edge.from || edge.source || '';
    const to = edge.to || edge.target || '';
    if (!from || !to) continue;

    const label = edge.condition || edge.label;
    if (label) {
      lines.push(`  ${from} -->|"${escapeLabel(label)}"| ${to}`);
    } else {
      lines.push(`  ${from} --> ${to}`);
    }
  }

  // Style definitions for execution status
  lines.push('');
  lines.push('  classDef completed fill:#d4edda,stroke:#28a745,color:#155724');
  lines.push('  classDef active fill:#fff3cd,stroke:#ffc107,color:#856404,stroke-width:3px');
  lines.push('  classDef failed fill:#f8d7da,stroke:#dc3545,color:#721c24');
  lines.push('  classDef skipped fill:#e2e3e5,stroke:#6c757d,color:#383d41');
  lines.push('  classDef pending fill:#cce5ff,stroke:#007bff,color:#004085');

  // Apply status classes to nodes
  const classAssignments: Record<string, string[]> = {};
  for (const [nodeId, status] of stepStatusMap) {
    const cls = statusClass(status);
    if (cls !== 'default') {
      if (!classAssignments[cls]) classAssignments[cls] = [];
      classAssignments[cls].push(nodeId);
    }
  }

  for (const [cls, nodeIds] of Object.entries(classAssignments)) {
    lines.push(`  class ${nodeIds.join(',')} ${cls}`);
  }

  return lines.join('\n');
}

// ── Generate Workflow Diagram (from DB) ──────────────────────────

/**
 * Load a workflow execution from the database and generate its Mermaid diagram.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param workflowInstanceId - The execution/instance ID
 * @returns Mermaid diagram string or null if not found
 */
export async function generateWorkflowDiagram(
  tenantId: string,
  workflowInstanceId: string,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT wi.step_log, w.definition
     FROM "${schema}".workflow_instances wi
     LEFT JOIN "${schema}".workflows w ON w.workflow_id = wi.workflow_id
     WHERE wi.execution_id = $1`,
    [workflowInstanceId],
  );

  const row = getFirstRow(result)!;
  if (!row) return null;

  const definition: DiagramDefinition = typeof row.definition === 'string'
    ? JSON.parse(row.definition)
    : (row.definition || { nodes: [], edges: [] });

  const stepLog: StepLogEntry[] = Array.isArray(row.step_log)
    ? row.step_log
    : (row.step_log ? JSON.parse(JSON.stringify(row.step_log)) : []);

  return buildExecutionMermaid(definition, stepLog);
}

// ── Generate Template Diagram ────────────────────────────────────

/**
 * Generate a Mermaid diagram from a template definition (no execution state).
 * Produces a clean flowchart showing the template structure.
 *
 * @param definition - The template definition
 * @returns Mermaid diagram string
 */
export function generateTemplateDiagram(definition: DiagramDefinition): string {
  if (!definition || !Array.isArray(definition.nodes) || definition.nodes.length === 0) {
    return 'graph TD\n  empty["No template definition"]';
  }

  const lines: string[] = ['graph TD'];

  // Emit subgraphs for swimlanes
  const swimlanes = definition.swimlanes || [];
  const nodesBySwimlane = new Map<string, DiagramNode[]>();
  const noSwimlane: DiagramNode[] = [];

  for (const node of definition.nodes) {
    const lane = node.swimlane;
    if (lane && swimlanes.includes(lane)) {
      if (!nodesBySwimlane.has(lane)) nodesBySwimlane.set(lane, []);
      nodesBySwimlane.get(lane)!.push(node);
    } else {
      noSwimlane.push(node);
    }
  }

  for (const node of noSwimlane) {
    lines.push(`  ${nodeShape(node)}`);
  }

  for (const [lane, nodes] of nodesBySwimlane) {
    lines.push(`  subgraph ${escapeLabel(lane)}`);
    for (const node of nodes) {
      lines.push(`    ${nodeShape(node)}`);
    }
    lines.push('  end');
  }

  for (const edge of definition.edges || []) {
    const from = edge.from || edge.source || '';
    const to = edge.to || edge.target || '';
    if (!from || !to) continue;

    const label = edge.condition || edge.label;
    if (label) {
      lines.push(`  ${from} -->|"${escapeLabel(label)}"| ${to}`);
    } else {
      lines.push(`  ${from} --> ${to}`);
    }
  }

  // SLA annotations on nodes that define them
  const slaNodes = definition.nodes.filter(n => n.slaHours);
  if (slaNodes.length > 0) {
    lines.push('');
    lines.push('  %% SLA annotations');
    for (const node of slaNodes) {
      lines.push(`  %% ${node.id}: SLA ${node.slaHours}h`);
    }
  }

  return lines.join('\n');
}

// ── State Transition Diagram ─────────────────────────────────────

/**
 * Generate a Mermaid state diagram from a lifecycle definition.
 * Reads lifecycle_definitions from the tenant schema and produces
 * a stateDiagram-v2 showing allowed transitions.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param moduleCode - Module code (e.g. 'risk', 'policy')
 * @param entityType - Entity type within the module (e.g. 'risk_item')
 * @returns Mermaid state diagram string
 */
export async function generateStateTransitionDiagram(
  tenantId: string,
  moduleCode: string,
  entityType: string,
): Promise<string> {
  const schema = tenantSchema(tenantId);

  // Try lifecycle_definitions table first
  const result = await safeQuery(
    `SELECT definition FROM "${schema}".lifecycle_definitions
     WHERE module_code = $1 AND entity_type = $2
     ORDER BY version DESC LIMIT 1`,
    [moduleCode, entityType],
  );

  const row = getFirstRow(result)!;
  if (!row || !row.definition) {
    return `stateDiagram-v2\n  [*] --> no_definition : No lifecycle defined for ${moduleCode}.${entityType}`;
  }

  const def = typeof row.definition === 'string'
    ? JSON.parse(row.definition)
    : row.definition;

  const states: Array<{ code: string; label?: string }> = def.states || [];
  const transitions: Array<{ from: string; to: string; label?: string; action?: string }> = def.transitions || [];

  const lines: string[] = ['stateDiagram-v2'];

  // Initial state
  const initialState = def.initialState || (states.length > 0 ? states[0].code : 'draft');
  lines.push(`  [*] --> ${initialState}`);

  // State labels
  for (const state of states) {
    if (state.label) {
      lines.push(`  ${state.code} : ${escapeLabel(state.label)}`);
    }
  }

  // Transitions
  for (const t of transitions) {
    const label = t.label || t.action;
    if (label) {
      lines.push(`  ${t.from} --> ${t.to} : ${escapeLabel(label)}`);
    } else {
      lines.push(`  ${t.from} --> ${t.to}`);
    }
  }

  // Terminal states
  const terminalStates = def.terminalStates || [];
  for (const ts of terminalStates) {
    lines.push(`  ${ts} --> [*]`);
  }

  return lines.join('\n');
}

// ── Flowchart Formatter ──────────────────────────────────────────

/**
 * Format raw steps and transitions as a Mermaid flowchart.
 * Useful for custom / ad-hoc diagram generation.
 *
 * @param steps - Array of step objects with id, label, and type
 * @param transitions - Array of transitions with from, to, and optional label
 * @returns Mermaid flowchart string
 */
export function formatAsFlowchart(
  steps: Array<{ id: string; label: string; type?: string }>,
  transitions: Array<{ from: string; to: string; label?: string }>,
): string {
  const lines: string[] = ['graph TD'];

  for (const step of steps) {
    const node: DiagramNode = {
      id: step.id,
      type: step.type || 'task',
      label_en: step.label,
    };
    lines.push(`  ${nodeShape(node)}`);
  }

  for (const t of transitions) {
    if (t.label) {
      lines.push(`  ${t.from} -->|"${escapeLabel(t.label)}"| ${t.to}`);
    } else {
      lines.push(`  ${t.from} --> ${t.to}`);
    }
  }

  return lines.join('\n');
}

// ── Sequence Diagram (Approvals) ─────────────────────────────────

/**
 * Format an approval chain as a Mermaid sequence diagram.
 * Shows the request, escalation, and decision flow.
 *
 * @param approvals - Array of approval records with approver, status, and timing
 * @returns Mermaid sequence diagram string
 */
export function formatAsSequenceDiagram(
  approvals: Array<{
    approver_id: string;
    status: string;
    decision_comment?: string | null;
    escalation_chain?: string[];
    created_at: string;
    decided_at?: string | null;
  }>,
): string {
  if (!approvals || approvals.length === 0) {
    return 'sequenceDiagram\n  Note over System: No approvals recorded';
  }

  const lines: string[] = ['sequenceDiagram'];
  const participants = new Set<string>();
  participants.add('System');

  // Collect all participants
  for (const a of approvals) {
    participants.add(a.approver_id);
    if (a.escalation_chain) {
      for (const e of a.escalation_chain) {
        participants.add(e);
      }
    }
  }

  // Emit participants
  for (const p of participants) {
    lines.push(`  participant ${escapeLabel(p)}`);
  }

  // Emit approval flow
  for (const a of approvals) {
    lines.push(`  System->>+${escapeLabel(a.approver_id)}: Request Approval`);

    if (a.status === 'escalated' && a.escalation_chain && a.escalation_chain.length > 0) {
      const target = a.escalation_chain[0];
      lines.push(`  ${escapeLabel(a.approver_id)}-->>System: Escalated`);
      lines.push(`  System->>+${escapeLabel(target)}: Escalated Approval`);
      lines.push(`  ${escapeLabel(target)}->>-System: Decision`);
    } else if (a.status === 'approved') {
      const comment = a.decision_comment ? ` (${escapeLabel(a.decision_comment.slice(0, 40))})` : '';
      lines.push(`  ${escapeLabel(a.approver_id)}->>-System: Approved${comment}`);
    } else if (a.status === 'rejected') {
      const comment = a.decision_comment ? ` (${escapeLabel(a.decision_comment.slice(0, 40))})` : '';
      lines.push(`  ${escapeLabel(a.approver_id)}->>-System: Rejected${comment}`);
    } else {
      lines.push(`  Note over ${escapeLabel(a.approver_id)}: Pending`);
    }
  }

  return lines.join('\n');
}
