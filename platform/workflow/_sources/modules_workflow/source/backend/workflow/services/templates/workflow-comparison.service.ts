// ============================================
// Shahin — Workflow Comparison Service
// Deterministic diff between two executions or two workflow versions.
//
// Design:
// - No external AI. Pure structural diff, suitable for frontend rendering
//   and backend assertions.
// - Considers node id/type/label/swimlane/slaHours/config, edge from/to/
//   condition, and top-level metadata (swimlanes, escalationChain).
// - Reports added / removed / modified with severity + change type.
// - `breakingChanges = true` whenever a node or edge is added/removed, a
//   node's `type` changes, an approval/sla config changes, or an edge
//   condition flips — anything that alters execution topology.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Diff item contract (for FE) ───────────────────────────────────────

export type DiffChangeType = 'added' | 'removed' | 'modified';
export type DiffSeverity = 'info' | 'minor' | 'major' | 'breaking';
export type DiffCategory =
  | 'node'
  | 'edge'
  | 'step'
  | 'transition'
  | 'approval'
  | 'sla'
  | 'metadata'
  | 'assignment'
  | 'status';

export interface DiffItem {
  path: string;
  category: DiffCategory;
  changeType: DiffChangeType;
  severity: DiffSeverity;
  before: unknown;
  after: unknown;
  note?: string;
}

export interface DiffSummary {
  total: number;
  added: number;
  removed: number;
  modified: number;
  breakingChanges: boolean;
  unchangedNodes: number;
  unchangedEdges: number;
}

// ── Execution comparison shape ────────────────────────────────────────

export interface StepDiff {
  nodeId: string;
  field: string;
  exec1Value: string | number | boolean | null;
  exec2Value: string | number | boolean | null;
}

export interface ExecutionSummary {
  executionId: string;
  status: string;
  stepsCount: number;
  startedAt: string | null;
}

export interface ExecutionComparisonResult {
  exec1: ExecutionSummary;
  exec2: ExecutionSummary;
  diffs: StepDiff[];
  onlyInExec1: Record<string, unknown>[];
  onlyInExec2: Record<string, unknown>[];
  commonSteps: number;
  summary: DiffSummary;
  items: DiffItem[];
}

// ── Version comparison shape ──────────────────────────────────────────

export interface NodeModification {
  nodeId: string;
  field: string;
  v1Value: string | number | boolean | null;
  v2Value: string | number | boolean | null;
}

export interface VersionComparisonResult {
  v1: number;
  v2: number;
  nodesAdded: Record<string, unknown>[];
  nodesRemoved: Record<string, unknown>[];
  nodesModified: NodeModification[];
  edgesAdded: Record<string, unknown>[];
  edgesRemoved: Record<string, unknown>[];
  summary: DiffSummary;
  items: DiffItem[];
}

// ── Workflow/template definition-level diff (pure + deterministic) ────

export interface WorkflowNodeLike {
  id: string;
  type?: string;
  label_en?: string;
  label_ar?: string;
  label?: string;
  swimlane?: string;
  slaHours?: number;
  assignee?: string;
  config?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface WorkflowEdgeLike {
  from: string;
  to: string;
  condition?: string;
  label?: string;
  [k: string]: unknown;
}

export interface WorkflowDefinitionLike {
  nodes?: WorkflowNodeLike[];
  edges?: WorkflowEdgeLike[];
  swimlanes?: string[];
  escalationChain?: string[];
  [k: string]: unknown;
}

/** Fields on a node whose change is considered `breaking` (alters execution topology). */
const BREAKING_NODE_FIELDS = new Set<string>(['type', 'slaHours', 'assignee', 'swimlane']);

/** Fields on a node whose change is considered `major` (visible to users/operators but non-fatal). */
const MAJOR_NODE_FIELDS = new Set<string>(['label_en', 'label_ar', 'label', 'subType']);

function edgeKey(e: WorkflowEdgeLike): string {
  return `${e.from}→${e.to}${e.condition ? `@${e.condition}` : ''}`;
}

function classifyNodeFieldSeverity(field: string): DiffSeverity {
  if (BREAKING_NODE_FIELDS.has(field)) return 'breaking';
  if (MAJOR_NODE_FIELDS.has(field)) return 'major';
  return 'minor';
}

function coerceScalar(v: unknown): string | number | boolean | null {
  if (v == null) return null;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  return JSON.stringify(v);
}

/**
 * Deterministic diff of two workflow/template/version definitions.
 * Returns summary + machine-readable items suitable for FE rendering.
 */
export function diffDefinitions(
  before: WorkflowDefinitionLike | null | undefined,
  after: WorkflowDefinitionLike | null | undefined,
): { summary: DiffSummary; items: DiffItem[] } {
  const beforeNodes = (before?.nodes ?? []) as WorkflowNodeLike[];
  const afterNodes = (after?.nodes ?? []) as WorkflowNodeLike[];
  const beforeEdges = (before?.edges ?? []) as WorkflowEdgeLike[];
  const afterEdges = (after?.edges ?? []) as WorkflowEdgeLike[];

  const items: DiffItem[] = [];
  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchangedNodes = 0;
  let unchangedEdges = 0;

  const beforeNodeMap = new Map(beforeNodes.map((n) => [n.id, n] as const));
  const afterNodeMap = new Map(afterNodes.map((n) => [n.id, n] as const));

  // Added nodes
  for (const [id, node] of afterNodeMap) {
    if (!beforeNodeMap.has(id)) {
      added += 1;
      items.push({
        path: `nodes/${id}`,
        category: node.type === 'approval' ? 'approval' : 'node',
        changeType: 'added',
        severity: 'breaking',
        before: null,
        after: node,
        note: `Added node '${id}'${node.type ? ` (${node.type})` : ''}`,
      });
    }
  }

  // Removed + modified nodes
  for (const [id, beforeNode] of beforeNodeMap) {
    const afterNode = afterNodeMap.get(id);
    if (!afterNode) {
      removed += 1;
      items.push({
        path: `nodes/${id}`,
        category: beforeNode.type === 'approval' ? 'approval' : 'node',
        changeType: 'removed',
        severity: 'breaking',
        before: beforeNode,
        after: null,
        note: `Removed node '${id}'`,
      });
      continue;
    }

    // Field-level comparison of common nodes
    const fields = new Set<string>([...Object.keys(beforeNode), ...Object.keys(afterNode)]);
    let nodeChanged = false;
    for (const field of fields) {
      if (field === 'id') continue;
      const bv = (beforeNode as Record<string, unknown>)[field];
      const av = (afterNode as Record<string, unknown>)[field];
      if (JSON.stringify(bv) === JSON.stringify(av)) continue;
      nodeChanged = true;
      modified += 1;

      const severity = classifyNodeFieldSeverity(field);
      let category: DiffCategory = 'node';
      if (field === 'slaHours') category = 'sla';
      else if (field === 'swimlane' || field === 'assignee') category = 'assignment';
      else if (beforeNode.type === 'approval' || afterNode.type === 'approval') category = 'approval';
      else if (field === 'type') category = 'step';

      items.push({
        path: `nodes/${id}/${field}`,
        category,
        changeType: 'modified',
        severity,
        before: coerceScalar(bv),
        after: coerceScalar(av),
        note: `Node '${id}' field '${field}' changed`,
      });
    }
    if (!nodeChanged) unchangedNodes += 1;
  }

  // Edges
  const beforeEdgeMap = new Map(beforeEdges.map((e) => [edgeKey(e), e] as const));
  const afterEdgeMap = new Map(afterEdges.map((e) => [edgeKey(e), e] as const));

  for (const [k, edge] of afterEdgeMap) {
    if (!beforeEdgeMap.has(k)) {
      added += 1;
      items.push({
        path: `edges/${k}`,
        category: 'transition',
        changeType: 'added',
        severity: 'breaking',
        before: null,
        after: edge,
        note: `Added transition ${k}`,
      });
    } else {
      unchangedEdges += 1;
    }
  }
  for (const [k, edge] of beforeEdgeMap) {
    if (!afterEdgeMap.has(k)) {
      removed += 1;
      items.push({
        path: `edges/${k}`,
        category: 'transition',
        changeType: 'removed',
        severity: 'breaking',
        before: edge,
        after: null,
        note: `Removed transition ${k}`,
      });
    }
  }

  // Top-level metadata (swimlanes, escalationChain)
  const beforeSwim = before?.swimlanes ?? [];
  const afterSwim = after?.swimlanes ?? [];
  if (JSON.stringify(beforeSwim) !== JSON.stringify(afterSwim)) {
    modified += 1;
    items.push({
      path: 'swimlanes',
      category: 'metadata',
      changeType: 'modified',
      severity: 'major',
      before: beforeSwim,
      after: afterSwim,
      note: 'Swimlanes changed',
    });
  }
  const beforeChain = before?.escalationChain ?? [];
  const afterChain = after?.escalationChain ?? [];
  if (JSON.stringify(beforeChain) !== JSON.stringify(afterChain)) {
    modified += 1;
    items.push({
      path: 'escalationChain',
      category: 'metadata',
      changeType: 'modified',
      severity: 'major',
      before: beforeChain,
      after: afterChain,
      note: 'Escalation chain changed',
    });
  }

  // Any other top-level scalar fields present in either side
  const extraKeys = new Set<string>([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const key of extraKeys) {
    if (['nodes', 'edges', 'swimlanes', 'escalationChain'].includes(key)) continue;
    const bv = (before as Record<string, unknown> | undefined)?.[key];
    const av = (after as Record<string, unknown> | undefined)?.[key];
    if (JSON.stringify(bv) === JSON.stringify(av)) continue;
    modified += 1;
    items.push({
      path: key,
      category: 'metadata',
      changeType: 'modified',
      severity: 'minor',
      before: coerceScalar(bv),
      after: coerceScalar(av),
    });
  }

  const breakingChanges = items.some((i) => i.severity === 'breaking');

  const summary: DiffSummary = {
    total: items.length,
    added,
    removed,
    modified,
    breakingChanges,
    unchangedNodes,
    unchangedEdges,
  };

  return { summary, items };
}

// ── Execution comparison (tenant-scoped, DB-backed) ───────────────────

async function loadExecutionSummary(tenantId: string, execId: string): Promise<{
  summary: ExecutionSummary;
  steps: Record<string, GenericRow>;
} | null> {
  const schema = tenantSchema(tenantId);
  const execRes = await safeQuery(
    `SELECT id, status, metadata, created_at
       FROM "${schema}".workflow_instances
      WHERE id = $1 AND tenant_id = $2
      LIMIT 1`,
    [execId, tenantId],
  );
  const exec = getFirstRow(execRes)!;
  if (!exec) return null;

  const stepsRes = await safeQuery(
    `SELECT id, status, metadata, created_at, updated_at
       FROM "${schema}".workflow_steps
      WHERE tenant_id = $1 AND metadata->>'execution_id' = $2
      ORDER BY created_at ASC`,
    [tenantId, execId],
  );
  const rows = (stepsRes.rows ?? []) as GenericRow[];
  const steps: Record<string, GenericRow> = {};
  for (const row of rows) {
    const nodeId = ((row.metadata as Record<string, unknown> | null)?.node_id as string | undefined) ?? String(row.id);
    steps[nodeId] = row;
  }

  return {
    summary: {
      executionId: String(exec.id),
      status: String(exec.status ?? 'unknown'),
      stepsCount: rows.length,
      startedAt: (exec.created_at as string | null) ?? null,
    },
    steps,
  };
}

export async function compareExecutions(
  tenantId: string,
  execId1: string,
  execId2: string,
): Promise<ExecutionComparisonResult> {
  if (!tenantId) {
    throw new Error('compareExecutions: tenantId is required');
  }

  const [a, b] = await Promise.all([
    loadExecutionSummary(tenantId, execId1),
    loadExecutionSummary(tenantId, execId2),
  ]);

  const emptySummary = (execId: string): ExecutionSummary => ({
    executionId: execId,
    status: 'not_found',
    stepsCount: 0,
    startedAt: null,
  });

  const aSteps = a?.steps ?? {};
  const bSteps = b?.steps ?? {};

  const diffs: StepDiff[] = [];
  const items: DiffItem[] = [];

  const onlyInExec1: Record<string, unknown>[] = [];
  const onlyInExec2: Record<string, unknown>[] = [];
  let common = 0;

  const keys = new Set<string>([...Object.keys(aSteps), ...Object.keys(bSteps)]);
  for (const nodeId of keys) {
    const stepA = aSteps[nodeId];
    const stepB = bSteps[nodeId];
    if (stepA && !stepB) {
      onlyInExec1.push({ nodeId, step: stepA });
      items.push({
        path: `steps/${nodeId}`,
        category: 'step',
        changeType: 'removed',
        severity: 'major',
        before: stepA,
        after: null,
      });
      continue;
    }
    if (!stepA && stepB) {
      onlyInExec2.push({ nodeId, step: stepB });
      items.push({
        path: `steps/${nodeId}`,
        category: 'step',
        changeType: 'added',
        severity: 'major',
        before: null,
        after: stepB,
      });
      continue;
    }
    common += 1;

    // Compare status/updated_at as canonical observable fields.
    const fields: Array<keyof GenericRow> = ['status', 'updated_at'];
    for (const field of fields) {
      const av = (stepA?.[field as string] ?? null) as unknown;
      const bv = (stepB?.[field as string] ?? null) as unknown;
      if (JSON.stringify(av) === JSON.stringify(bv)) continue;
      diffs.push({
        nodeId,
        field: String(field),
        exec1Value: coerceScalar(av),
        exec2Value: coerceScalar(bv),
      });
      items.push({
        path: `steps/${nodeId}/${String(field)}`,
        category: 'status',
        changeType: 'modified',
        severity: field === 'status' ? 'major' : 'minor',
        before: coerceScalar(av),
        after: coerceScalar(bv),
      });
    }
  }

  const summary: DiffSummary = {
    total: items.length,
    added: onlyInExec2.length,
    removed: onlyInExec1.length,
    modified: diffs.length,
    breakingChanges: onlyInExec1.length + onlyInExec2.length > 0,
    unchangedNodes: common - diffs.length,
    unchangedEdges: 0,
  };

  return {
    exec1: a?.summary ?? emptySummary(execId1),
    exec2: b?.summary ?? emptySummary(execId2),
    diffs,
    onlyInExec1,
    onlyInExec2,
    commonSteps: common,
    summary,
    items,
  };
}

// ── Version comparison (loads two workflow/template versions by number) ──

async function loadWorkflowDefinitionAtVersion(
  tenantId: string,
  workflowId: string,
  version: number,
): Promise<WorkflowDefinitionLike | null> {
  const schema = tenantSchema(tenantId);

  // Prefer workflow_template_versions snapshot when available (template-style
  // versioning). Fall back to workflow_definitions.version row.
  const snap = await safeQuery(
    `SELECT definition FROM "${schema}".workflow_template_versions
      WHERE template_id = $1 AND version = $2
      LIMIT 1`,
    [workflowId, version],
  );
  const snapRow = getFirstRow(snap)!;
  if (snapRow) {
    const def = (snapRow.definition as unknown);
    return typeof def === 'string' ? JSON.parse(def) as WorkflowDefinitionLike : def as WorkflowDefinitionLike;
  }

  const wf = await safeQuery(
    `SELECT content FROM "${schema}".workflow_definitions
      WHERE id = $1 AND version = $2
      LIMIT 1`,
    [workflowId, version],
  );
  const wfRow = getFirstRow(wf)!;
  if (wfRow) {
    const def = (wfRow.content as unknown);
    return typeof def === 'string' ? JSON.parse(def) as WorkflowDefinitionLike : def as WorkflowDefinitionLike;
  }

  return null;
}

export async function compareVersions(
  tenantId: string,
  workflowId: string,
  v1: number,
  v2: number,
): Promise<VersionComparisonResult> {
  if (!tenantId) {
    throw new Error('compareVersions: tenantId is required');
  }

  const [before, after] = await Promise.all([
    loadWorkflowDefinitionAtVersion(tenantId, workflowId, v1),
    loadWorkflowDefinitionAtVersion(tenantId, workflowId, v2),
  ]);

  const { summary, items } = diffDefinitions(before, after);

  // Added/removed node paths are `nodes/<id>` (one slash); field-level
  // modifications are `nodes/<id>/<field>` (two slashes).
  const isNodeRootPath = (p: string) => p.startsWith('nodes/') && p.split('/').length === 2;
  const nodesAdded = items
    .filter((i) => isNodeRootPath(i.path) && i.changeType === 'added')
    .map((i) => ({ path: i.path, node: i.after as unknown })) as Record<string, unknown>[];
  const nodesRemoved = items
    .filter((i) => isNodeRootPath(i.path) && i.changeType === 'removed')
    .map((i) => ({ path: i.path, node: i.before as unknown })) as Record<string, unknown>[];

  const nodesModified: NodeModification[] = items
    .filter((i) => i.path.startsWith('nodes/') && i.changeType === 'modified')
    .map((i) => {
      const [, idAndField] = i.path.split('nodes/');
      const [nodeId, field] = (idAndField ?? '').split('/');
      return {
        nodeId: nodeId ?? '',
        field: field ?? '',
        v1Value: coerceScalar(i.before),
        v2Value: coerceScalar(i.after),
      };
    });

  const edgesAdded = items.filter((i) => i.path.startsWith('edges/') && i.changeType === 'added')
    .map((i) => ({ path: i.path, edge: i.after as unknown })) as Record<string, unknown>[];
  const edgesRemoved = items.filter((i) => i.path.startsWith('edges/') && i.changeType === 'removed')
    .map((i) => ({ path: i.path, edge: i.before as unknown })) as Record<string, unknown>[];

  return {
    v1,
    v2,
    nodesAdded,
    nodesRemoved,
    nodesModified,
    edgesAdded,
    edgesRemoved,
    summary,
    items,
  };
}
