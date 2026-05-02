import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
}));

import {
  transitionStatus,
  getLifecycleHistory,
  getAllowedTransitions,
  doesTransitionRequireApproval,
  doesTransitionRequireWorkflow,
} from './records-lifecycle.service';

describe('Records Lifecycle Service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('transitionStatus', () => {
    it('should be a function', () => {
      expect(typeof transitionStatus).toBe('function');
    });
  });

  describe('getLifecycleHistory', () => {
    it('should be a function', () => {
      expect(typeof getLifecycleHistory).toBe('function');
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return array for active', () => {
      const result = getAllowedTransitions('active');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty for unknown', () => {
      expect(getAllowedTransitions('nonexistent')).toEqual([]);
    });
  });

  describe('doesTransitionRequireApproval', () => {
    it('should be a function', () => {
      expect(typeof doesTransitionRequireApproval).toBe('function');
    });
  });

  describe('doesTransitionRequireWorkflow', () => {
    it('should be a function', () => {
      expect(typeof doesTransitionRequireWorkflow).toBe('function');
    });
  });
});
