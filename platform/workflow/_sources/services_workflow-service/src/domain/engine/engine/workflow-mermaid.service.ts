import { safeQuery, tenantSchema, getFirstRow } from '@dos/db';

interface DiagramNode {
  id: string;
  type: string;
  subType?: string;
  label_en?: string;
  label?: string;
  swimlane?: string;
  slaHours?: number;
}

interface DiagramEdge {
  from?: string;
  to?: string;
  source?: string;
  target?: string;
  label?: string;
  conditionType?: string;
}

export async function generateWorkflowMermaid(
  tenantId: string,
  workflowId: string,
): Promise<string> {
  const schema = tenantSchema(tenantId);
  const wf = getFirstRow(await safeQuery(
    `SELECT * FROM "${schema}".workflow_templates WHERE id = $1`,
    [workflowId],
  ));
  if (!wf) return 'graph TD\n  A[Workflow not found]';

  const definition = typeof wf.definition === 'string' ? JSON.parse(wf.definition) : wf.definition;
  const nodes: DiagramNode[] = definition?.nodes || [];
  const edges: DiagramEdge[] = definition?.edges || [];

  const lines: string[] = ['graph TD'];
  for (const node of nodes) {
    const label = node.label_en || node.label || node.id;
    lines.push(`  ${node.id}["${label}"]`);
  }
  for (const edge of edges) {
    const src = edge.from || edge.source || '';
    const tgt = edge.to || edge.target || '';
    const lbl = edge.label ? `|${edge.label}|` : '';
    lines.push(`  ${src} -->${lbl} ${tgt}`);
  }
  return lines.join('\n');
}

export async function generateExecutionMermaid(
  tenantId: string,
  executionId: string,
): Promise<string> {
  const schema = tenantSchema(tenantId);
  const exec = getFirstRow(await safeQuery(
    `SELECT * FROM "${schema}".workflow_executions WHERE id = $1`,
    [executionId],
  ));
  if (!exec) return 'graph TD\n  A[Execution not found]';
  return `graph TD\n  START --> ${exec.current_step || 'END'}`;
}

/**
 * Build a Mermaid diagram that annotates each workflow node with its
 * current execution status (completed / running / failed / pending).
 * Pure — no I/O. Consumed by workflow-crud.service when rendering an
 * execution's live graph snapshot.
 */
interface ExecutionStepLike {
  nodeId?: string;
  step_id?: string;
  status?: string;
  node_id?: string;
}

export function buildExecutionMermaid(
  definition: { nodes?: DiagramNode[]; edges?: DiagramEdge[] } | null | undefined,
  stepLog: ExecutionStepLike[] = [],
): string {
  const nodes: DiagramNode[] = definition?.nodes ?? [];
  const edges: DiagramEdge[] = definition?.edges ?? [];
  const statusByNode = new Map<string, string>();
  for (const step of stepLog) {
    const id = step.nodeId ?? step.node_id ?? step.step_id;
    if (id && typeof step.status === 'string') statusByNode.set(id, step.status);
  }

  const lines: string[] = ['graph TD'];
  for (const node of nodes) {
    const label = node.label_en || node.label || node.id;
    const status = statusByNode.get(node.id);
    const suffix = status ? ` (${status})` : '';
    lines.push(`  ${node.id}["${label}${suffix}"]`);
    if (status === 'completed') lines.push(`  class ${node.id} completed;`);
    else if (status === 'failed') lines.push(`  class ${node.id} failed;`);
    else if (status === 'running') lines.push(`  class ${node.id} running;`);
  }
  for (const edge of edges) {
    const src = edge.from || edge.source || '';
    const tgt = edge.to || edge.target || '';
    const lbl = edge.label ? `|${edge.label}|` : '';
    lines.push(`  ${src} -->${lbl} ${tgt}`);
  }
  lines.push('  classDef completed fill:#bbf7d0,stroke:#16a34a;');
  lines.push('  classDef running fill:#bfdbfe,stroke:#2563eb;');
  lines.push('  classDef failed fill:#fecaca,stroke:#dc2626;');
  return lines.join('\n');
}
