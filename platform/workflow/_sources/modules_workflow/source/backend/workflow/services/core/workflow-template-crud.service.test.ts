import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
vi.mock('../../../../config/database', () => ({
  safeQuery: vi.fn(),
  tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
}));
vi.mock('../../../../utils/db-utils', () => ({
  getFirstRow: vi.fn((r: any) => r?.rows?.[0] ?? null),
}));
vi.mock('../../../../utils/resilient-catch', () => ({
  catchHandler: vi.fn(() => () => {}),
  EC: { EVENT_BUS: 'EVENT_BUS' },
}));
vi.mock('../../../../errors/index', () => ({
  NotFoundError: class NotFoundError extends Error {
    constructor(type: string, id: string) { super(`${type} ${id} not found`); }
  },
  ValidationError: class ValidationError extends Error {
    constructor(public errors: unknown[]) { super(errors[0]?.message ?? 'Validation error'); }
  },
  ConflictError: class ConflictError extends Error {
    constructor(msg: string) { super(msg); }
  },
}));

import {
  createTemplate,
  getTemplate,
  getTemplateById,
  listTemplates,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,
  getTemplateVersions,
  getTemplateVersion,
} from './workflow-template-crud.service';
import { safeQuery } from '../../ports/database.port';

const validDefinition = {
  nodes: [
    { id: 'start', type: 'start', label_en: 'Start' },
    { id: 'task1', type: 'action', label_en: 'Task 1' },
    { id: 'end', type: 'end', label_en: 'End' },
  ],
  edges: [
    { from: 'start', to: 'task1' },
    { from: 'task1', to: 'end' },
  ],
  swimlanes: ['default'],
};

const mockTemplateRow = {
  template_id: 'tpl-1',
  tenant_id: 't1',
  template_code: 'TPL_RISK_REVIEW',
  name_en: 'Risk Review Template',
  name_ar: '',
  description_en: 'Standard risk review workflow',
  description_ar: '',
  definition: JSON.stringify(validDefinition),
  version: 1,
  status: 'active',
  category: 'risk',
  module_code: 'risk',
  created_by: 'user-1',
  created_at: '2026-04-04T00:00:00Z',
  updated_at: '2026-04-04T00:00:00Z',
};

describe('Workflow Template CRUD Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTemplate', () => {
    it('should create a template with valid definition', async () => {
      // Check duplicate
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      // Insert template
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockTemplateRow] });
      // Insert version snapshot
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      const result = await createTemplate('t1', {
        templateCode: 'TPL_RISK_REVIEW',
        nameEn: 'Risk Review Template',
        descriptionEn: 'Standard risk review workflow',
        definition: validDefinition as any,
        category: 'risk',
        moduleCode: 'risk',
        createdBy: 'user-1',
      });

      expect(result.template_code).toBe('TPL_RISK_REVIEW');
      expect(result.version).toBe(1);
      expect(result.status).toBe('active');
    });

    it('should throw ValidationError for definition without start node', async () => {
      const invalidDef = {
        nodes: [{ id: 'task1', type: 'action', label_en: 'Task' }, { id: 'end', type: 'end', label_en: 'End' }],
        edges: [{ from: 'task1', to: 'end' }],
        swimlanes: [],
      };

      await expect(
        createTemplate('t1', {
          templateCode: 'TPL_INVALID', nameEn: 'Invalid', descriptionEn: 'No start',
          definition: invalidDef as any, createdBy: 'u1',
        }),
      ).rejects.toThrow('start node');
    });

    it('should throw ValidationError for empty nodes', async () => {
      const emptyDef = { nodes: [], edges: [], swimlanes: [] };

      await expect(
        createTemplate('t1', {
          templateCode: 'TPL_EMPTY', nameEn: 'Empty', descriptionEn: 'Empty',
          definition: emptyDef as any, createdBy: 'u1',
        }),
      ).rejects.toThrow('at least one node');
    });

    it('should throw ConflictError for duplicate template code', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ template_id: 'existing' }] });

      await expect(
        createTemplate('t1', {
          templateCode: 'TPL_RISK_REVIEW', nameEn: 'Duplicate', descriptionEn: 'Dup',
          definition: validDefinition as any, createdBy: 'u1',
        }),
      ).rejects.toThrow('already exists');
    });
  });

  describe('getTemplate', () => {
    it('should return template by code', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockTemplateRow] });
      const result = await getTemplate('t1', 'TPL_RISK_REVIEW');
      expect(result).not.toBeNull();
      expect(result!.template_code).toBe('TPL_RISK_REVIEW');
    });

    it('should return null when template not found', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await getTemplate('t1', 'NONEXISTENT');
      expect(result).toBeNull();
    });
  });

  describe('getTemplateById', () => {
    it('should return template by ID', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockTemplateRow] });
      const result = await getTemplateById('t1', 'tpl-1');
      expect(result).not.toBeNull();
      expect(result!.template_id).toBe('tpl-1');
    });
  });

  describe('listTemplates', () => {
    it('should return paginated template list', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ total: 1 }] });
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockTemplateRow] });

      const result = await listTemplates('t1', { status: 'active', limit: 10 });
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('should filter by category and moduleCode', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ total: 0 }] });
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      const result = await listTemplates('t1', { category: 'audit', moduleCode: 'audit' });
      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('updateTemplate', () => {
    it('should increment version on update', async () => {
      // Fetch current
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockTemplateRow] });
      // Update
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ ...mockTemplateRow, version: 2, name_en: 'Updated Name' }] });
      // Version snapshot
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      const result = await updateTemplate('t1', 'TPL_RISK_REVIEW', {
        nameEn: 'Updated Name',
        updatedBy: 'user-2',
        changeSummary: 'Updated name',
      });

      expect(result.version).toBe(2);
      expect(result.name_en).toBe('Updated Name');
    });

    it('should throw NotFoundError for non-existent template', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(
        updateTemplate('t1', 'NONEXISTENT', { updatedBy: 'u1' }),
      ).rejects.toThrow('not found');
    });
  });

  describe('deleteTemplate', () => {
    it('should soft-delete by setting status to archived', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rowCount: 1 });
      const result = await deleteTemplate('t1', 'TPL_RISK_REVIEW');
      expect(result).toBe(true);
    });

    it('should return false when template not found', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rowCount: 0 });
      const result = await deleteTemplate('t1', 'NONEXISTENT');
      expect(result).toBe(false);
    });
  });

  describe('cloneTemplate', () => {
    it('should clone a template with new code', async () => {
      // getTemplate (source)
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockTemplateRow] });
      // Check new code
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      // Insert clone
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ ...mockTemplateRow, template_id: 'tpl-2', template_code: 'TPL_RISK_REVIEW_COPY', version: 1, status: 'draft', name_en: 'Risk Review Template (Copy)' }],
      });
      // Version snapshot
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      const result = await cloneTemplate('t1', 'TPL_RISK_REVIEW', 'TPL_RISK_REVIEW_COPY', 'user-2');
      expect(result.template_code).toBe('TPL_RISK_REVIEW_COPY');
      expect(result.version).toBe(1);
      expect(result.status).toBe('draft');
    });

    it('should throw NotFoundError when source template does not exist', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(
        cloneTemplate('t1', 'NONEXISTENT', 'NEW_CODE', 'u1'),
      ).rejects.toThrow('not found');
    });
  });

  describe('getTemplateVersions', () => {
    it('should return version history', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [
          { version_id: 'v-2', template_id: 'tpl-1', template_code: 'TPL_RISK_REVIEW', version: 2, definition: JSON.stringify(validDefinition), change_summary: 'v2', created_by: 'u1', created_at: '2026-04-04T12:00:00Z' },
          { version_id: 'v-1', template_id: 'tpl-1', template_code: 'TPL_RISK_REVIEW', version: 1, definition: JSON.stringify(validDefinition), change_summary: 'Initial', created_by: 'u1', created_at: '2026-04-04T00:00:00Z' },
        ],
      });

      const result = await getTemplateVersions('t1', 'TPL_RISK_REVIEW');
      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2);
    });
  });

  describe('getTemplateVersion', () => {
    it('should return specific version snapshot', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ version_id: 'v-1', template_id: 'tpl-1', template_code: 'TPL_RISK_REVIEW', version: 1, definition: JSON.stringify(validDefinition), change_summary: 'Initial', created_by: 'u1', created_at: '2026-04-04T00:00:00Z' }],
      });

      const result = await getTemplateVersion('t1', 'TPL_RISK_REVIEW', 1);
      expect(result).not.toBeNull();
      expect(result!.version).toBe(1);
    });

    it('should return null for non-existent version', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await getTemplateVersion('t1', 'TPL_RISK_REVIEW', 99);
      expect(result).toBeNull();
    });
  });
});
