import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
vi.mock('../../../../config/database', () => ({
  safeQuery: vi.fn(),
  tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
}));
vi.mock('../../../../utils/db-utils', () => ({
  getFirstRow: vi.fn((r: any) => r?.rows?.[0] ?? null),
}));
vi.mock('../../../platform/services/misc/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../../../utils/http-error.util', () => ({
  toErrorMessage: vi.fn((e: unknown) => e instanceof Error ? e.message : String(e)),
}));
vi.mock('../../../../errors/index', () => ({
  NotFoundError: class NotFoundError extends Error {
    constructor(type: string, id: string) { super(`${type} ${id} not found`); }
  },
  ValidationError: class ValidationError extends Error {
    constructor(public errors: unknown[]) { super(errors[0]?.message ?? 'Validation error'); }
  },
}));
vi.mock('../../../audit/services/audit/core/audit-trail.service', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../../platform/dos/workflows', () => ({
  emitWorkflowEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../workflows/workflow-lifecycle', () => ({
  WORKFLOW_LIFECYCLE_TRANSITIONS: [],
  isValidTransition: vi.fn(() => true),
}));

import {
  createDefinition,
  getDefinitionById,
  getDefinitionByCode,
  listDefinitions,
  updateDefinitionStatus,
  deleteDefinition,
} from './workflow-definition.service';
import { safeQuery } from '../../ports/database.port';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] })
}));
import { isValidTransition } from '../../workflows/workflow-lifecycle';

const mockRow = {
  definition_id: 'def-1',
  code: 'WF_TEST',
  version: 1,
  name_en: 'Test Workflow',
  name_ar: null,
  module_code: 'risk',
  entity_type: 'risk_record',
  trigger_type: 'manual',
  status: 'draft',
  sla_hours: 24,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('Workflow Definition Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDefinition', () => {
    it('should throw ValidationError when required fields are missing', async () => {
      await expect(
        createDefinition('t1', { code: '', nameEn: '', moduleCode: '', entityType: '', steps: [], transitions: [] } as any, 'u1'),
      ).rejects.toThrow('code, nameEn, moduleCode, and entityType are required');
    });

    it('should throw ValidationError when steps are empty', async () => {
      await expect(
        createDefinition('t1', { code: 'WF1', nameEn: 'Test', moduleCode: 'risk', entityType: 'risk_record', steps: [], transitions: [] } as any, 'u1'),
      ).rejects.toThrow('At least one step is required');
    });

    it('should throw ValidationError when code already exists', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ definition_id: 'existing' }] });
      await expect(
        createDefinition('t1', {
          code: 'WF1', nameEn: 'Test', moduleCode: 'risk', entityType: 'risk_record',
          steps: [{ code: 's1', nameEn: 'Step 1', stepType: 'task', sequenceOrder: 1 }],
          transitions: [],
        } as any, 'u1'),
      ).rejects.toThrow('already exists');
    });

    it('should create a definition and return mapped contract', async () => {
      // Check for existing code
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      // Insert definition
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockRow] });
      // Insert step
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      const result = await createDefinition('t1', {
        code: 'WF_TEST', nameEn: 'Test Workflow', moduleCode: 'risk', entityType: 'risk_record',
        triggerType: 'manual', slaHours: 24,
        steps: [{ code: 's1', nameEn: 'Step 1', stepType: 'task', sequenceOrder: 1 }],
        transitions: [],
      } as any, 'u1');

      expect(result.code).toBe('WF_TEST');
      expect(result.definitionId).toBe('def-1');
      expect(result.status).toBe('draft');
    });
  });

  describe('getDefinitionById', () => {
    it('should return definition when found', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ ...mockRow, step_count: 3, transition_count: 2 }],
      });
      const result = await getDefinitionById('t1', 'def-1');
      expect(result.definitionId).toBe('def-1');
      expect(result.stepCount).toBe(3);
      expect(result.transitionCount).toBe(2);
    });

    it('should throw NotFoundError when definition does not exist', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(getDefinitionById('t1', 'nonexistent')).rejects.toThrow('not found');
    });
  });

  describe('getDefinitionByCode', () => {
    it('should return latest version by default', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ ...mockRow, step_count: 1, transition_count: 0 }],
      });
      const result = await getDefinitionByCode('t1', 'WF_TEST');
      expect(result.code).toBe('WF_TEST');
    });

    it('should throw NotFoundError for unknown code', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      await expect(getDefinitionByCode('t1', 'UNKNOWN')).rejects.toThrow('not found');
    });
  });

  describe('listDefinitions', () => {
    it('should return paginated list', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: [{ ...mockRow, step_count: 2, transition_count: 1 }] });

      const result = await listDefinitions('t1', { moduleCode: 'risk', page: 1, pageSize: 10 });
      expect(result.total).toBe(1);
      expect(result.definitions).toHaveLength(1);
    });
  });

  describe('updateDefinitionStatus', () => {
    it('should throw when transition is invalid', async () => {
      (isValidTransition as any).mockReturnValue(false);
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ ...mockRow, step_count: 1, transition_count: 0 }],
      });

      await expect(updateDefinitionStatus('t1', 'def-1', 'archived', 'u1')).rejects.toThrow('Invalid status transition');
    });

    it('should update status when transition is valid', async () => {
      (isValidTransition as any).mockReturnValue(true);
      // getDefinitionById query
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ ...mockRow, step_count: 1, transition_count: 0 }],
      });
      // update query
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ ...mockRow, status: 'active' }],
      });

      const result = await updateDefinitionStatus('t1', 'def-1', 'active', 'u1');
      expect(result.status).toBe('active');
    });
  });

  describe('deleteDefinition', () => {
    it('should prevent deletion with active instances', async () => {
      // getDefinitionById
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ ...mockRow, step_count: 1, transition_count: 0 }],
      });
      // active instances count
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ cnt: 3 }] });

      await expect(deleteDefinition('t1', 'def-1', 'u1')).rejects.toThrow('active instances');
    });
  });
});
