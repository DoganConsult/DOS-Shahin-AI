import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
}));

import {
  getPolicyLifecycleState,
  getOverduePolicies,
  getAvailableTransitions,
} from './policy-lifecycle.service';

describe('Policy Lifecycle Service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('getPolicyLifecycleState', () => {
    it('should be a function', () => {
      expect(typeof getPolicyLifecycleState).toBe('function');
    });
  });

  describe('getOverduePolicies', () => {
    it('should be a function', () => {
      expect(typeof getOverduePolicies).toBe('function');
    });
  });

  describe('getAvailableTransitions', () => {
    it('should be a function', () => {
      expect(typeof getAvailableTransitions).toBe('function');
    });
  });
});
