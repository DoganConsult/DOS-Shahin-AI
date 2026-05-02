import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
}));

import {
  transitionStatus,
  getStatusHistory,
  resolveFoundationOwnership,
} from './evidence-lifecycle.service';

describe('Evidence Lifecycle Service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('exported functions', () => {
    it('should export transitionStatus', () => {
      expect(typeof transitionStatus).toBe('function');
    });

    it('should export getStatusHistory', () => {
      expect(typeof getStatusHistory).toBe('function');
    });

    it('should export resolveFoundationOwnership', () => {
      expect(typeof resolveFoundationOwnership).toBe('function');
    });
  });
});
