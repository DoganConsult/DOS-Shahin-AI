import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  isValidTransition: vi.fn(() => true),
  WORKFLOW_INSTANCE_TRANSITIONS: [],
}));
vi.mock('../integration/lifecycle-bridge.service', () => ({
  authorizeWorkflowTransition: vi.fn().mockResolvedValue({ allowed: true, reason: 'ok' }),
}));

import {
  getTransitionRulesForStep,
  getTransitionRulesForDefinition,
  resolveNextStep,
  executeTransition,
  validateTransitionGraph,
} from './transition-registry.service';
import { safeQuery } from '../../ports/database.port';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] })
}));
import { authorizeWorkflowTransition } from '../integration/lifecycle-bridge.service';

const mockTransitionRow = {
  transition_id: 'tr-1',
  definition_id: 'def-1',
  from_step_id: 'step-1',
  from_step_code: 'draft',
  to_step_id: 'step-2',
  to_step_code: 'review',
  transition_type: 'sequential',
  label_en: null,
  condition_expression: null,
  priority: 0,
  requires_approval: false,
  required_permission: null,
};

describe('Transition Registry Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTransitionRulesForStep', () => {
    it('should return transition rules for a given step', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockTransitionRow] });

      const result = await getTransitionRulesForStep('t1', 'def-1', 'step-1');
      expect(result).toHaveLength(1);
      expect(result[0].fromStepCode).toBe('draft');
      expect(result[0].toStepCode).toBe('review');
      expect(result[0].transitionType).toBe('sequential');
    });

    it('should return empty array on query failure', async () => {
      (safeQuery as any).mockRejectedValueOnce(new Error('DB error'));
      const result = await getTransitionRulesForStep('t1', 'def-1', 'step-x');
      expect(result).toEqual([]);
    });
  });

  describe('getTransitionRulesForDefinition', () => {
    it('should return all transition rules for a definition', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [
          mockTransitionRow,
          { ...mockTransitionRow, transition_id: 'tr-2', from_step_id: 'step-2', from_step_code: 'review', to_step_id: 'step-3', to_step_code: 'complete' },
        ],
      });

      const result = await getTransitionRulesForDefinition('t1', 'def-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('resolveNextStep', () => {
    it('should resolve conditional transition when outcome matches', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [
          { ...mockTransitionRow, transition_type: 'conditional', label_en: 'approved', to_step_code: 'approved_step', to_step_id: 'step-a' },
          { ...mockTransitionRow, transition_type: 'conditional', label_en: 'rejected', to_step_code: 'rejected_step', to_step_id: 'step-r' },
        ],
      });

      const result = await resolveNextStep('t1', 'def-1', 'step-1', 'approved');
      expect(result).not.toBeNull();
      expect(result!.toStepCode).toBe('approved_step');
    });

    it('should fall back to sequential transition', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [
          { ...mockTransitionRow, transition_type: 'sequential' },
        ],
      });

      const result = await resolveNextStep('t1', 'def-1', 'step-1', 'unknown_outcome');
      expect(result).not.toBeNull();
      expect(result!.transitionType).toBe('sequential');
    });

    it('should return null when no transitions exist', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await resolveNextStep('t1', 'def-1', 'step-1');
      expect(result).toBeNull();
    });
  });

  describe('executeTransition', () => {
    it('should deny transition when lifecycle auth fails', async () => {
      // Execution query
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ execution_id: 'inst-1', status: 'running', definition_id: 'def-1', definition_code: 'WF1', module_code: 'risk' }],
      });
      // resolveNextStep
      (safeQuery as any).mockResolvedValueOnce({ rows: [mockTransitionRow] });
      // fromStep code lookup
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ step_code: 'draft' }] });

      (authorizeWorkflowTransition as any).mockResolvedValueOnce({ allowed: false, reason: 'permission_denied' });

      const result = await executeTransition('t1', {
        instanceId: 'inst-1', fromStepId: 'step-1', outcome: 'approved',
      } as any, 'u1');

      expect(result.status).not.toBe('completed');
      expect(result.lifecycleAuthResult.allowed).toBe(false);
    });

    it('should throw when execution is not in running state', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ execution_id: 'inst-1', status: 'completed', definition_id: 'def-1', module_code: 'risk' }],
      });

      await expect(
        executeTransition('t1', { instanceId: 'inst-1', fromStepId: 'step-1' } as any, 'u1'),
      ).rejects.toThrow('transitions not allowed');
    });
  });

  describe('validateTransitionGraph', () => {
    it('should report errors for missing start/end steps', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ step_id: 'step-1', step_code: 'task', is_start: false, is_end: false }],
      });
      // Transition rules for definition
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });

      const result = await validateTransitionGraph('t1', 'def-1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No start step defined');
      expect(result.errors).toContain('No end step defined');
    });

    it('should pass for a valid graph', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [
          { step_id: 'step-1', step_code: 'start', is_start: true, is_end: false },
          { step_id: 'step-2', step_code: 'end', is_start: false, is_end: true },
        ],
      });
      // Transitions
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ ...mockTransitionRow, from_step_id: 'step-1', to_step_id: 'step-2' }],
      });

      const result = await validateTransitionGraph('t1', 'def-1');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unreachable steps', async () => {
      (safeQuery as any).mockResolvedValueOnce({
        rows: [
          { step_id: 'step-1', step_code: 'start', is_start: true, is_end: false },
          { step_id: 'step-2', step_code: 'end', is_start: false, is_end: true },
          { step_id: 'step-3', step_code: 'orphan', is_start: false, is_end: false },
        ],
      });
      (safeQuery as any).mockResolvedValueOnce({
        rows: [{ ...mockTransitionRow, from_step_id: 'step-1', to_step_id: 'step-2' }],
      });

      const result = await validateTransitionGraph('t1', 'def-1');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('unreachable'))).toBe(true);
    });
  });
});
