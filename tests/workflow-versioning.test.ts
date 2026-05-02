import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryCalls: Array<{ sql: string; params: unknown[] }> = [];
let queryQueue: Array<{ rows: unknown[]; rowCount?: number }> = [];

vi.mock('@dos/db', () => ({
  safeQuery: vi.fn(async (sql: string, params: unknown[]) => {
    queryCalls.push({ sql, params });
    return queryQueue.shift() ?? { rows: [], rowCount: 0 };
  }),
  tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
  getFirstRow: vi.fn((r: any) => (r?.rows?.[0] ?? null)),
  query: vi.fn(async () => ({ rows: [] })),
  emptyResult: vi.fn(() => ({ rows: [], rowCount: 0 })),
  safeQueryWithClient: vi.fn(async () => ({ rows: [] })),
  withTransaction: vi.fn(async (_opts: unknown, cb: any) => cb({})),
}));

import {
  bumpWorkflowVersion,
  snapshotGraph,
  diffGraphVersions,
} from '../modules/workflow/source/backend/workflow/services/templates/workflow-versioning.service';

import {
  updateTemplate,
  getTemplateVersions,
} from '../modules/workflow/source/backend/workflow/services/core/workflow-template-crud.service';

function seed(results: Array<{ rows: unknown[]; rowCount?: number }>) {
  queryCalls.length = 0;
  queryQueue = [...results];
}

beforeEach(() => {
  queryCalls.length = 0;
  queryQueue = [];
});

describe('bumpWorkflowVersion — monotonic workflow version increment', () => {
  it('increments version deterministically on successful update', async () => {
    seed([
      { rows: [{ id: 'wf-1', version: 4, name: 'X' }] },
    ]);
    const out = await bumpWorkflowVersion('t1', 'wf-1', { nodes: [], edges: [] }, 'X', { changedBy: 'u1' });
    expect(out.version).toBe(4);
    // Must use tenant-scoped schema.
    expect(queryCalls[0].sql).toContain('"tenant_t1"');
    // Must UPDATE with version = COALESCE(version, 0) + 1.
    expect(queryCalls[0].sql.toUpperCase()).toContain('VERSION = COALESCE');
  });

  it('returns { version: 1, row: {} } fallback when the update silently fails', async () => {
    seed([
      { rows: [] },
    ]);
    const out = await bumpWorkflowVersion('t1', 'wf-missing', { nodes: [], edges: [] }, 'X');
    expect(out.version).toBe(1);
    expect(out.row).toEqual({});
  });
});

describe('snapshotGraph — workflow_graph_versions monotonic numbering', () => {
  it('allocates next_version as MAX(version_number)+1 and persists', async () => {
    seed([
      { rows: [{ next_version: 7 }] },
      { rows: [{ version_id: 'vg-7' }] },
    ]);
    const versionId = await snapshotGraph('t1', 'run-1', { nodes: [{ id: 'a' }], edges: [] }, { changedBy: 'u1', changeSummary: 'added a', changeType: 'manual' });
    expect(versionId).toBe('vg-7');
    expect(queryCalls[0].sql).toContain('MAX(version_number)');
  });
});

describe('diffGraphVersions — node-level diff across snapshot rows', () => {
  it('returns added / removed / changed', async () => {
    const a = { version_id: 'va', tenant_id: 't1', run_id: 'run-1', version_number: 1, graph_snapshot: { nodes: [{ id: 'x', value: 1 }, { id: 'y', value: 2 }], edges: [] }, change_summary: null, changed_by: null, change_type: 'auto', created_at: 'now' };
    const b = { version_id: 'vb', tenant_id: 't1', run_id: 'run-1', version_number: 2, graph_snapshot: { nodes: [{ id: 'x', value: 9 }, { id: 'z', value: 3 }], edges: [] }, change_summary: null, changed_by: null, change_type: 'auto', created_at: 'now' };
    seed([
      { rows: [a] },
      { rows: [b] },
    ]);
    const diff = await diffGraphVersions('t1', 'va', 'vb');
    expect(diff.added).toContain('z');
    expect(diff.removed).toContain('y');
    expect(diff.changed).toContain('x');
  });
});

describe('Template-version publish rules (via updateTemplate)', () => {
  it('publishing with status=active on an updated template bumps version and snapshots', async () => {
    // Base row has version=2 already (prior publish).
    const base = { template_id: 'tpl-1', tenant_id: 't1', template_code: 'TPL_X', name_en: 'X', name_ar: '', description_en: 'd', description_ar: '', definition: JSON.stringify({ nodes: [{ id: 'start', type: 'start', label_en: 'S' }, { id: 'end', type: 'end', label_en: 'E' }], edges: [{ from: 'start', to: 'end' }], swimlanes: [] }), version: 2, status: 'active', category: 'x', module_code: null, created_by: 'u', created_at: 'now', updated_at: 'now' };
    seed([
      { rows: [base] },
      { rows: [{ ...base, version: 3, status: 'active' }] },
      { rows: [] },
    ]);
    const out = await updateTemplate('t1', 'TPL_X', { status: 'active', updatedBy: 'u', changeSummary: 'republish' });
    expect(out.version).toBe(3);
  });

  it('updating with an invalid definition rejects (preserves publish-safety gate)', async () => {
    // update fetches current row, then validates definition — never reaches UPDATE.
    const base = { template_id: 'tpl-1', tenant_id: 't1', template_code: 'TPL_X', name_en: 'X', name_ar: '', description_en: 'd', description_ar: '', definition: JSON.stringify({ nodes: [], edges: [], swimlanes: [] }), version: 1, status: 'active', category: null, module_code: null, created_by: 'u', created_at: 'now', updated_at: 'now' };
    seed([{ rows: [base] }]);
    try {
      await updateTemplate('t1', 'TPL_X', {
        definition: { nodes: [], edges: [], swimlanes: [] } as any,
        updatedBy: 'u',
      });
      throw new Error('expected ValidationError');
    } catch (e: any) {
      expect(e.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(e.details)).toMatch(/at least one node/);
    }
  });

  it('getTemplateVersions returns snapshots ordered newest-first', async () => {
    seed([
      { rows: [
        { version_id: 'v-2', template_id: 'tpl-1', template_code: 'TPL_X', version: 2, definition: JSON.stringify({ nodes: [], edges: [], swimlanes: [] }), change_summary: 'v2', created_by: 'u', created_at: '2026-02-01' },
        { version_id: 'v-1', template_id: 'tpl-1', template_code: 'TPL_X', version: 1, definition: JSON.stringify({ nodes: [], edges: [], swimlanes: [] }), change_summary: 'init', created_by: 'u', created_at: '2026-01-01' },
      ] },
    ]);
    const out = await getTemplateVersions('t1', 'TPL_X');
    expect(out).toHaveLength(2);
    expect(out[0].version).toBe(2);
    expect(out[1].version).toBe(1);
  });
});
