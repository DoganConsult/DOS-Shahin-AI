import { describe, it, expect, vi } from 'vitest';

// ── Mock the DB port used by compareExecutions/compareVersions ─────────────
// The comparison service imports `safeQuery, tenantSchema` from
// '../../ports/database.port' and `getFirstRow` from '@dos/db'. We mock both
// so the pure diff logic can be exercised in Node without Postgres.

const queryCalls: Array<{ sql: string; params: unknown[] }> = [];
let queryQueue: Array<{ rows: unknown[] }> = [];

vi.mock('@dos/db', async () => {
  return {
    safeQuery: vi.fn(async (sql: string, params: unknown[]) => {
      queryCalls.push({ sql, params });
      return queryQueue.shift() ?? { rows: [] };
    }),
    tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
    getFirstRow: vi.fn((r: any) => (r?.rows?.[0] ?? null)),
    query: vi.fn(async () => ({ rows: [] })),
    emptyResult: vi.fn(() => ({ rows: [], rowCount: 0 })),
    safeQueryWithClient: vi.fn(async () => ({ rows: [] })),
    withTransaction: vi.fn(async (_opts: unknown, cb: any) => cb({})),
  };
});

import {
  diffDefinitions,
  compareExecutions,
  compareVersions,
  type WorkflowDefinitionLike,
} from '../modules/workflow/source/backend/workflow/services/templates/workflow-comparison.service';

function seed(results: Array<{ rows: unknown[] }>) {
  queryCalls.length = 0;
  queryQueue = [...results];
}

const defA: WorkflowDefinitionLike = {
  nodes: [
    { id: 'start', type: 'start', label_en: 'Start' },
    { id: 'review', type: 'approval', label_en: 'Review', swimlane: 'reviewer', slaHours: 48 },
    { id: 'end', type: 'end', label_en: 'End' },
  ],
  edges: [
    { from: 'start', to: 'review' },
    { from: 'review', to: 'end', condition: 'approved' },
  ],
  swimlanes: ['reviewer'],
  escalationChain: ['manager'],
};

describe('diffDefinitions — pure structural comparison', () => {
  it('returns all-zero summary and no items when inputs are identical', () => {
    const { summary, items } = diffDefinitions(defA, JSON.parse(JSON.stringify(defA)));
    expect(items).toEqual([]);
    expect(summary.added).toBe(0);
    expect(summary.removed).toBe(0);
    expect(summary.modified).toBe(0);
    expect(summary.breakingChanges).toBe(false);
    expect(summary.unchangedNodes).toBe(defA.nodes!.length);
  });

  it('detects an added step', () => {
    const after: WorkflowDefinitionLike = {
      ...defA,
      nodes: [
        ...defA.nodes!,
        { id: 'notify', type: 'notification', label_en: 'Notify' },
      ],
      edges: [
        ...defA.edges!,
        { from: 'end', to: 'notify' },
      ],
    };
    const { summary, items } = diffDefinitions(defA, after);
    expect(summary.added).toBeGreaterThanOrEqual(1);
    expect(summary.breakingChanges).toBe(true);
    expect(items.find((i) => i.path === 'nodes/notify' && i.changeType === 'added')).toBeTruthy();
  });

  it('detects a removed step', () => {
    const after: WorkflowDefinitionLike = {
      ...defA,
      nodes: defA.nodes!.filter((n) => n.id !== 'review'),
      edges: defA.edges!.filter((e) => e.from !== 'review' && e.to !== 'review'),
    };
    const { summary, items } = diffDefinitions(defA, after);
    expect(summary.removed).toBeGreaterThanOrEqual(1);
    expect(summary.breakingChanges).toBe(true);
    const removedNode = items.find((i) => i.path === 'nodes/review' && i.changeType === 'removed');
    expect(removedNode).toBeTruthy();
    expect(removedNode!.category).toBe('approval');
  });

  it('detects a modified step (label is major, not breaking)', () => {
    const after: WorkflowDefinitionLike = JSON.parse(JSON.stringify(defA));
    after.nodes![1].label_en = 'Peer Review';
    const { summary, items } = diffDefinitions(defA, after);
    expect(summary.modified).toBeGreaterThanOrEqual(1);
    const mod = items.find((i) => i.path === 'nodes/review/label_en');
    expect(mod).toBeTruthy();
    expect(mod!.severity).toBe('major');
    expect(summary.breakingChanges).toBe(false);
  });

  it('flags a transition condition change as a breaking edge change', () => {
    const after: WorkflowDefinitionLike = JSON.parse(JSON.stringify(defA));
    after.edges![1] = { from: 'review', to: 'end', condition: 'rejected' };
    const { summary, items } = diffDefinitions(defA, after);
    // edge key changed (condition differs) so one removed + one added
    const added = items.find((i) => i.changeType === 'added' && i.path.startsWith('edges/'));
    const removed = items.find((i) => i.changeType === 'removed' && i.path.startsWith('edges/'));
    expect(added).toBeTruthy();
    expect(removed).toBeTruthy();
    expect(summary.breakingChanges).toBe(true);
  });

  it('flags an approval-rule / sla change as breaking', () => {
    const after: WorkflowDefinitionLike = JSON.parse(JSON.stringify(defA));
    after.nodes![1].slaHours = 24;
    const { summary, items } = diffDefinitions(defA, after);
    const mod = items.find((i) => i.path === 'nodes/review/slaHours');
    expect(mod).toBeTruthy();
    expect(mod!.severity).toBe('breaking');
    expect(mod!.category).toBe('sla');
    expect(summary.breakingChanges).toBe(true);
  });

  it('flags a node type change as breaking', () => {
    const after: WorkflowDefinitionLike = JSON.parse(JSON.stringify(defA));
    after.nodes![1].type = 'task';
    const { summary, items } = diffDefinitions(defA, after);
    const mod = items.find((i) => i.path === 'nodes/review/type');
    expect(mod).toBeTruthy();
    expect(mod!.severity).toBe('breaking');
    expect(summary.breakingChanges).toBe(true);
  });

  it('records metadata changes (swimlanes, escalationChain)', () => {
    const after: WorkflowDefinitionLike = JSON.parse(JSON.stringify(defA));
    after.swimlanes = ['reviewer', 'approver'];
    after.escalationChain = ['manager', 'vp'];
    const { items } = diffDefinitions(defA, after);
    expect(items.find((i) => i.path === 'swimlanes')).toBeTruthy();
    expect(items.find((i) => i.path === 'escalationChain')).toBeTruthy();
  });

  it('treats unknown top-level fields as metadata diff when present in either side', () => {
    const before: WorkflowDefinitionLike = { ...defA, customField: 'a' } as WorkflowDefinitionLike;
    const after: WorkflowDefinitionLike = { ...defA, customField: 'b' } as WorkflowDefinitionLike;
    const { items } = diffDefinitions(before, after);
    expect(items.find((i) => i.path === 'customField')).toBeTruthy();
  });
});

describe('compareExecutions — tenant-scoped DB-backed diff', () => {
  it('throws when tenantId is missing', async () => {
    await expect(compareExecutions('', 'e1', 'e2')).rejects.toThrow(/tenantId/);
  });

  it('returns not_found summaries when both executions are missing', async () => {
    seed([
      { rows: [] }, // loadExecutionSummary #1: workflow_instances empty
      { rows: [] }, // loadExecutionSummary #2: workflow_instances empty
    ]);
    const result = await compareExecutions('t1', 'e1', 'e2');
    expect(result.exec1.status).toBe('not_found');
    expect(result.exec2.status).toBe('not_found');
    expect(result.commonSteps).toBe(0);
    expect(result.summary.breakingChanges).toBe(false);
  });

  it('reports only-in-exec1 / only-in-exec2 and modified status', async () => {
    // Note: compareExecutions runs both loadExecutionSummary calls under
    // Promise.all, so the two instance queries are issued before either
    // steps query. Queue order must interleave accordingly.
    seed([
      // exec1 instance
      { rows: [{ id: 'e1', status: 'completed', metadata: {}, created_at: '2026-01-01' }] },
      // exec2 instance
      { rows: [{ id: 'e2', status: 'completed', metadata: {}, created_at: '2026-01-05' }] },
      // exec1 steps
      {
        rows: [
          { id: 's-a', status: 'done', metadata: { execution_id: 'e1', node_id: 'review' }, created_at: '2026-01-01', updated_at: '2026-01-02' },
          { id: 's-b', status: 'done', metadata: { execution_id: 'e1', node_id: 'only-in-1' }, created_at: '2026-01-01', updated_at: '2026-01-02' },
        ],
      },
      // exec2 steps
      {
        rows: [
          { id: 's-c', status: 'failed', metadata: { execution_id: 'e2', node_id: 'review' }, created_at: '2026-01-05', updated_at: '2026-01-06' },
          { id: 's-d', status: 'done', metadata: { execution_id: 'e2', node_id: 'only-in-2' }, created_at: '2026-01-05', updated_at: '2026-01-06' },
        ],
      },
    ]);

    const result = await compareExecutions('t1', 'e1', 'e2');
    expect(result.exec1.stepsCount).toBe(2);
    expect(result.exec2.stepsCount).toBe(2);
    expect(result.commonSteps).toBe(1);
    expect(result.onlyInExec1.length).toBe(1);
    expect(result.onlyInExec2.length).toBe(1);
    expect(result.diffs.find((d) => d.field === 'status')).toBeTruthy();
    expect(result.summary.breakingChanges).toBe(true);
  });
});

describe('compareVersions — snapshot-backed diff', () => {
  it('detects added / removed / modified nodes between two template versions', async () => {
    const v1 = { nodes: [{ id: 'start', type: 'start', label_en: 'Start' }, { id: 'end', type: 'end', label_en: 'End' }], edges: [{ from: 'start', to: 'end' }], swimlanes: [] };
    const v2 = {
      nodes: [
        { id: 'start', type: 'start', label_en: 'Start' },
        { id: 'review', type: 'approval', label_en: 'Review', slaHours: 48 },
        { id: 'end', type: 'end', label_en: 'End' },
      ],
      edges: [{ from: 'start', to: 'review' }, { from: 'review', to: 'end', condition: 'approved' }],
      swimlanes: ['reviewer'],
    };
    seed([
      // snapshot v1 lookup
      { rows: [{ definition: v1 }] },
      // snapshot v2 lookup
      { rows: [{ definition: v2 }] },
    ]);

    const result = await compareVersions('t1', 'wf-1', 1, 2);
    expect(result.v1).toBe(1);
    expect(result.v2).toBe(2);
    expect(result.nodesAdded.length).toBeGreaterThanOrEqual(1);
    expect(result.nodesRemoved.length).toBe(0);
    expect(result.edgesAdded.length).toBeGreaterThanOrEqual(1);
    expect(result.summary.breakingChanges).toBe(true);
  });

  it('falls through to workflow_definitions when template snapshot is missing', async () => {
    seed([
      // snapshot v1 miss
      { rows: [] },
      // workflow_definitions v1 hit
      { rows: [{ content: { nodes: [{ id: 'start', type: 'start', label_en: 'Start' }, { id: 'end', type: 'end', label_en: 'End' }], edges: [], swimlanes: [] } }] },
      // snapshot v2 miss
      { rows: [] },
      // workflow_definitions v2 hit
      { rows: [{ content: { nodes: [{ id: 'start', type: 'start', label_en: 'Start' }, { id: 'end', type: 'end', label_en: 'End' }], edges: [], swimlanes: [] } }] },
    ]);
    const result = await compareVersions('t1', 'wf-1', 1, 2);
    expect(result.summary.total).toBe(0);
    expect(result.summary.breakingChanges).toBe(false);
  });

  it('throws when tenantId is missing', async () => {
    await expect(compareVersions('', 'wf-1', 1, 2)).rejects.toThrow(/tenantId/);
  });
});
