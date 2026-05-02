import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
}));

vi.mock('../../../../utils/db-utils', () => ({
  getFirstRow: vi.fn().mockResolvedValue(null),
}));

vi.mock('./policy-template-catalog', () => ({
  WORKFLOW_STEPS: [],
}));

import {
  trackPolicyAction,
  getPolicyWorkflowHistory,
  createPolicyWorkflowSteps,
  getPolicyProcessSteps,
  advancePolicyStep,
} from './policy-template-workflow.service';

describe('Policy Template Workflow Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exported functions', () => {
    it('should export trackPolicyAction', () => {
      expect(typeof trackPolicyAction).toBe('function');
    });

    it('should export getPolicyWorkflowHistory', () => {
      expect(typeof getPolicyWorkflowHistory).toBe('function');
    });

    it('should export createPolicyWorkflowSteps', () => {
      expect(typeof createPolicyWorkflowSteps).toBe('function');
    });

    it('should export getPolicyProcessSteps', () => {
      expect(typeof getPolicyProcessSteps).toBe('function');
    });

    it('should export advancePolicyStep', () => {
      expect(typeof advancePolicyStep).toBe('function');
    });
  });

  describe('getPolicyWorkflowHistory', () => {
    it('should return array', async () => {
      const result = await getPolicyWorkflowHistory('t1', 'p1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getPolicyProcessSteps', () => {
    it('should return array', async () => {
      const result = await getPolicyProcessSteps('t1', 'p1');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
