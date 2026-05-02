import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Capture + queue DB responses for the service under test ──────────
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
  createTemplate,
  updateTemplate,
  cloneTemplate,
  getTemplate,
  listTemplates,
  deleteTemplate,
} from '../modules/workflow/source/backend/workflow/services/core/workflow-template-crud.service';
import {
  instantiateTemplate,
  startModuleWorkflow,
  WorkflowTemplateNotFoundError,
} from '../modules/workflow/source/backend/workflow/services/templates/workflow-templates.service';

const validDef = {
  nodes: [
    { id: 'start', type: 'start', label_en: 'Start' },
    { id: 'task1', type: 'task', label_en: 'Task 1' },
    { id: 'end', type: 'end', label_en: 'End' },
  ],
  edges: [
    { from: 'start', to: 'task1' },
    { from: 'task1', to: 'end' },
  ],
  swimlanes: ['default'],
};

function seed(results: Array<{ rows: unknown[]; rowCount?: number }>) {
  queryCalls.length = 0;
  queryQueue = [...results];
}

beforeEach(() => {
  queryCalls.length = 0;
  queryQueue = [];
});

describe('Workflow Template CRUD (tenant-scoped)', () => {
  it('createTemplate persists a row and records a v1 snapshot', async () => {
    seed([
      { rows: [] },                                   // duplicate check → none
      { rows: [{ template_id: 'tpl-1', tenant_id: 't1', template_code: 'TPL_X', name_en: 'X', name_ar: '', description_en: 'd', description_ar: '', definition: JSON.stringify(validDef), version: 1, status: 'active', category: 'risk', module_code: 'risk', created_by: 'u1', created_at: 'now', updated_at: 'now' }] },
      { rows: [] },                                   // version snapshot insert
    ]);

    const out = await createTemplate('t1', {
      templateCode: 'TPL_X',
      nameEn: 'X',
      descriptionEn: 'd',
      definition: validDef as any,
      category: 'risk',
      moduleCode: 'risk',
      createdBy: 'u1',
    });
    expect(out.template_code).toBe('TPL_X');
    expect(out.version).toBe(1);
    expect(out.status).toBe('active');
  });

  it('createTemplate rejects empty tenantId', async () => {
    try {
      await createTemplate('', { templateCode: 'X', nameEn: 'X', descriptionEn: 'd', definition: validDef as any, createdBy: 'u' });
      throw new Error('expected ValidationError');
    } catch (e: any) {
      expect(e.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(e.details)).toMatch(/tenantId/);
    }
  });

  it('createTemplate rejects a definition without a start node', async () => {
    const badDef = {
      nodes: [{ id: 'task', type: 'task', label_en: 'Task' }, { id: 'end', type: 'end', label_en: 'End' }],
      edges: [{ from: 'task', to: 'end' }],
      swimlanes: [],
    };
    try {
      await createTemplate('t1', { templateCode: 'X', nameEn: 'X', descriptionEn: 'd', definition: badDef as any, createdBy: 'u' });
      throw new Error('expected ValidationError');
    } catch (e: any) {
      expect(e.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(e.details)).toMatch(/start node/);
    }
  });

  it('createTemplate rejects duplicate template_code', async () => {
    seed([
      { rows: [{ template_id: 'existing' }] },
    ]);
    await expect(
      createTemplate('t1', { templateCode: 'DUP', nameEn: 'X', descriptionEn: 'd', definition: validDef as any, createdBy: 'u' }),
    ).rejects.toThrow(/already exists/);
  });

  it('updateTemplate increments version monotonically and snapshots', async () => {
    seed([
      // fetch current row (version=1)
      { rows: [{ template_id: 'tpl-1', tenant_id: 't1', template_code: 'TPL_X', name_en: 'X', name_ar: '', description_en: 'd', description_ar: '', definition: JSON.stringify(validDef), version: 1, status: 'active', category: 'risk', module_code: 'risk', created_by: 'u1', created_at: 'now', updated_at: 'now' }] },
      // update result (version=2)
      { rows: [{ template_id: 'tpl-1', tenant_id: 't1', template_code: 'TPL_X', name_en: 'X2', name_ar: '', description_en: 'd', description_ar: '', definition: JSON.stringify(validDef), version: 2, status: 'active', category: 'risk', module_code: 'risk', created_by: 'u1', created_at: 'now', updated_at: 'now' }] },
      // snapshot insert
      { rows: [] },
    ]);
    const out = await updateTemplate('t1', 'TPL_X', { nameEn: 'X2', updatedBy: 'u2', changeSummary: 'rename' });
    expect(out.version).toBe(2);
    expect(out.name_en).toBe('X2');
  });

  it('updateTemplate throws NotFound when template is missing', async () => {
    seed([{ rows: [] }]);
    await expect(updateTemplate('t1', 'MISSING', { updatedBy: 'u' })).rejects.toThrow(/not found/i);
  });

  it('cloneTemplate creates a draft v1 from the source', async () => {
    const source = { template_id: 'tpl-src', tenant_id: 't1', template_code: 'SRC', name_en: 'Source', name_ar: '', description_en: 'd', description_ar: '', definition: JSON.stringify(validDef), version: 1, status: 'active', category: 'risk', module_code: 'risk', created_by: 'u1', created_at: 'now', updated_at: 'now' };
    seed([
      // getTemplate (source) → active query
      { rows: [source] },
      // collision check on newCode
      { rows: [] },
      // insert clone
      { rows: [{ ...source, template_id: 'tpl-clone', template_code: 'SRC_COPY', status: 'draft', version: 1, name_en: 'Source (Copy)' }] },
      // snapshot
      { rows: [] },
    ]);
    const out = await cloneTemplate('t1', 'SRC', 'SRC_COPY', 'u2');
    expect(out.template_code).toBe('SRC_COPY');
    expect(out.status).toBe('draft');
    expect(out.version).toBe(1);
    expect(out.name_en).toBe('Source (Copy)');
  });

  it('cloneTemplate throws NotFound when source is missing', async () => {
    seed([{ rows: [] }]);
    await expect(cloneTemplate('t1', 'MISSING', 'NEW', 'u')).rejects.toThrow(/not found/i);
  });

  it('listTemplates filters by status and paginates, never leaking cross-tenant data', async () => {
    seed([
      { rows: [{ total: 1 }] },
      { rows: [{ template_id: 'tpl-1', tenant_id: 't1', template_code: 'TPL_X', name_en: 'X', name_ar: '', description_en: '', description_ar: '', definition: JSON.stringify(validDef), version: 1, status: 'active', category: 'risk', module_code: 'risk', created_by: 'u1', created_at: 'now', updated_at: 'now' }] },
    ]);
    const result = await listTemplates('t1', { status: 'active', moduleCode: 'risk', limit: 10 });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    // Every SQL issued must reference the tenant-scoped schema.
    for (const call of queryCalls) {
      expect(call.sql).toContain('"tenant_t1"');
    }
  });

  it('getTemplate returns null for a missing row (tenant isolation)', async () => {
    seed([{ rows: [] }]);
    const out = await getTemplate('t1', 'MISSING');
    expect(out).toBeNull();
  });

  it('deleteTemplate is a soft archive', async () => {
    seed([{ rows: [], rowCount: 1 }]);
    const out = await deleteTemplate('t1', 'TPL_X');
    expect(out).toBe(true);
    expect(queryCalls[0].sql).toContain("status = 'archived'");
  });
});

describe('Template instantiation / module start', () => {
  it('instantiateTemplate creates a workflow_instances row using a DB template', async () => {
    seed([
      // DB template lookup
      { rows: [{ template_id: 'tpl-1', template_code: 'risk_treatment', name_en: 'Risk', description_en: 'd', definition: validDef }] },
      // insert workflow_instances
      { rows: [{ id: 'inst-1', tenant_id: 't1', status: 'active', metadata: {}, created_at: 'now' }] },
    ]);
    const out = await instantiateTemplate('t1', 'risk_treatment', { entityId: 'r-42' }, 'u1');
    expect(out.instanceId).toBe('inst-1');
    expect(out.status).toBe('active');
    expect(out.templateKey).toBe('risk_treatment');
    expect(out.initialStepIds).toContain('start');
  });

  it('instantiateTemplate falls back to a predefined template when DB is empty', async () => {
    seed([
      { rows: [] },
      { rows: [{ id: 'inst-2', tenant_id: 't1', status: 'active', metadata: {}, created_at: 'now' }] },
    ]);
    const out = await instantiateTemplate('t1', 'policy_lifecycle', {}, 'u1');
    expect(out.instanceId).toBe('inst-2');
    expect(out.templateKey).toBe('policy_lifecycle');
  });

  it('instantiateTemplate throws WorkflowTemplateNotFoundError for unknown templateKey', async () => {
    seed([
      { rows: [] }, // DB miss
    ]);
    await expect(instantiateTemplate('t1', 'never_heard_of_me', {}, 'u1'))
      .rejects.toBeInstanceOf(WorkflowTemplateNotFoundError);
  });

  it('instantiateTemplate throws when tenantId is empty', async () => {
    await expect(instantiateTemplate('', 'policy_lifecycle', {}, 'u1')).rejects.toThrow(/tenantId/);
  });

  it('startModuleWorkflow resolves module → templateCode → instance', async () => {
    seed([
      // getWorkflowTemplateByCode: DB lookup
      { rows: [{ template_code: 'policy_lifecycle', definition: validDef }] },
      // instantiateTemplate: DB template lookup
      { rows: [{ template_id: 'tpl-1', template_code: 'policy_lifecycle', name_en: 'P', description_en: '', definition: validDef }] },
      // instantiateTemplate: insert instance
      { rows: [{ id: 'inst-3', tenant_id: 't1', status: 'active', metadata: {}, created_at: 'now' }] },
    ]);
    const out = await startModuleWorkflow('t1', 'policy', { entityId: 'p-1' }, 'u1');
    expect(out.instanceId).toBe('inst-3');
    // startModuleWorkflow enriches params with moduleCode before handing off
    // to instantiateTemplate, which stashes params under metadata.params.
    expect((out.metadata as any).params.moduleCode).toBe('policy');
    expect((out.metadata as any).params.resolvedTemplateCode).toBe('policy_lifecycle');
  });

  it('startModuleWorkflow throws for platform-only / unknown module codes', async () => {
    await expect(startModuleWorkflow('t1', 'not_a_real_module', {}, 'u1'))
      .rejects.toBeInstanceOf(WorkflowTemplateNotFoundError);
  });
});
