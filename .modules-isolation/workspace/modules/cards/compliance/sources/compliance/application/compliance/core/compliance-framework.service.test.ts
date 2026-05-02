import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../config/database', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
}));

vi.mock('../../../platform/services/activity/activity-stream.service', () => ({
  recordActivity: vi.fn(),
}));

vi.mock('../../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: vi.fn() },
}));

vi.mock('../../../../utils/db-utils', () => ({
  getFirstRow: (r: any) => r?.rows?.[0] ?? null,
}));

vi.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));

import {
  mapFramework,
  mapControlToNodes,
  getGapAnalysis,
  testControl,
} from './compliance.service';
import { safeQuery } from '../../../ports/database.port';


// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../../../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  query: vi.fn().mockResolvedValue({ rows: [] })
}));
describe('Compliance Framework Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapFramework', () => {
    it('should return framework mapping with coverage stats', async () => {
      const registryControls = [
        { node_id: 'n1', code: 'CTRL-1', title_en: 'Control 1', level: 4, priority: 'high', evidence_types: [] },
        { node_id: 'n2', code: 'CTRL-2', title_en: 'Control 2', level: 4, priority: 'medium', evidence_types: [] },
      ];
      const tenantControls = [
        { control_id: 'c1', title: 'Mapped Ctrl', status: 'active', test_status: 'passed', mapped_registry_nodes: ['n1'] },
      ];
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: registryControls })
        .mockResolvedValueOnce({ rows: tenantControls });

      const result = await mapFramework('t1', 'fw1');
      expect(result.frameworkId).toBe('fw1');
      expect(result.totalRegistryControls).toBe(2);
      expect(result.mappedControls).toBe(1);
      expect(result.unmappedControls).toBe(1);
      expect(result.coveragePercent).toBe(50);
      expect(result.mapping).toHaveLength(2);
    });

    it('should return 0% coverage when no registry controls exist', async () => {
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await mapFramework('t1', 'fw-empty');
      expect(result.coveragePercent).toBe(0);
      expect(result.totalRegistryControls).toBe(0);
    });
  });

  describe('mapControlToNodes', () => {
    it('should update control with mapped registry nodes', async () => {
      const updated = { control_id: 'c1', mapped_registry_nodes: ['n1', 'n2'] };
      (safeQuery as any).mockResolvedValueOnce({ rows: [updated] });

      const result = await mapControlToNodes('t1', 'c1', ['n1', 'n2']);
      expect(result).toBeDefined();
      const params = (safeQuery as any).mock.calls[0][1];
      expect(params[0]).toEqual(['n1', 'n2']);
      expect(params[1]).toBe('c1');
    });
  });

  describe('testControl', () => {
    it('should insert a control test result', async () => {
      const mockResult = { test_id: 'test-1', control_id: 'c1', result: 'pass' };
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: [mockResult] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await testControl('t1', 'c1', {
        result: 'pass',
        tested_by: 'u1',
        notes: 'All checks passed',
      });
      expect(result).toBeDefined();
      expect(safeQuery).toHaveBeenCalled();
    });
  });

  describe('getGapAnalysis', () => {
    it('should return gap analysis for a framework', async () => {
      const registryNodes = [
        { node_id: 'n1', code: 'C-1', title_en: 'Ctrl 1', priority: 'high', evidence_types: ['document'], level: 4 },
      ];
      const tenantControls = [
        { control_id: 'c1', mapped_registry_nodes: ['n1'], status: 'active', test_status: 'passed', evidence_ids: ['ev1'] },
      ];
      const evidence = [{ evidence_id: 'ev1', status: 'valid' }];

      (safeQuery as any)
        .mockResolvedValueOnce({ rows: registryNodes })
        .mockResolvedValueOnce({ rows: tenantControls })
        .mockResolvedValueOnce({ rows: evidence });

      const result = await getGapAnalysis('t1', 'fw1');
      expect(result.frameworkId).toBe('fw1');
      expect(result.gaps).toBeDefined();
      expect(Array.isArray(result.gaps)).toBe(true);
    });

    it('should identify unmapped controls as gaps', async () => {
      const registryNodes = [
        { node_id: 'n1', code: 'C-1', title_en: 'Unmapped', priority: 'critical', evidence_types: [], level: 4 },
      ];
      (safeQuery as any)
        .mockResolvedValueOnce({ rows: registryNodes })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await getGapAnalysis('t1', 'fw2');
      expect(result.gaps.length).toBeGreaterThan(0);
    });
  });
});
