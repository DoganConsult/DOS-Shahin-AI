import { describe, it, expect, vi, beforeEach as _beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
}));

import {
  transitionStatus,
  getIssueSla,
  getLifecycleHistory,
  runSlaEscalationJob,
} from './issues-lifecycle.service';
import { safeQuery } from '../ports/database.port';


// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({rows: []}),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({rows: []}) })),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
  query: vi.fn().mockResolvedValue({rows: []})
}));

  describe('transitionStatus', () => {
    it('should be a function', () => {
      expect(typeof transitionStatus).toBe('function');
    });
  });

  describe('getIssueSla', () => {
    it('should be a function', () => {
      expect(typeof getIssueSla).toBe('function');
    });
  });

  describe('getLifecycleHistory', () => {
    it('should return array', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await getLifecycleHistory('t1', 'e1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('runSlaEscalationJob', () => {
    it('should be a function', () => {
      expect(typeof runSlaEscalationJob).toBe('function');
    });
  });
