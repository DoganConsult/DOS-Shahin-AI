import { describe, it, expect, vi, beforeEach as _beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
}));

import {
  getLifecycleStages,
  getLifecycleDistribution,
  transitionStage,
  getLifecycleEvents,
  getValidTransitions,
} from './asset-lifecycle.service';
import { safeQuery } from '../ports/database.port';


// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({rows: []}),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({rows: []}) })),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
  query: vi.fn().mockResolvedValue({rows: []})
}));

  describe('getLifecycleStages', () => {
    it('should return array of stages', () => {
      const stages = getLifecycleStages();
      expect(Array.isArray(stages)).toBe(true);
      expect(stages.length).toBeGreaterThan(0);
    });
  });

  describe('getValidTransitions', () => {
    it('should return valid transitions for a stage', () => {
      const stages = getLifecycleStages();
      const transitions = getValidTransitions(stages[0]);
      expect(Array.isArray(transitions)).toBe(true);
    });

    it('should return empty for unknown stage', () => {
      expect(getValidTransitions('nonexistent')).toEqual([]);
    });
  });

  describe('getLifecycleDistribution', () => {
    it('should return distribution array', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [{ stage: 'active', count: 5 }] });
      const result = await getLifecycleDistribution('t1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getLifecycleEvents', () => {
    it('should return events array', async () => {
      (safeQuery as any).mockResolvedValueOnce({ rows: [] });
      const result = await getLifecycleEvents('t1', 'a1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('transitionStage', () => {
    it('should be a function', () => {
      expect(typeof transitionStage).toBe('function');
    });
  });
