/**
 * Analytics KPI Service -- Unit Tests
 *
 * MP-12 SS12: unit tests for core KPI computation.
 * Verifies computeKPIs produces correct results from tenant data,
 * handles edge cases, and produces expected structure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
const mockSafeQuery = vi.fn();
vi.mock('../../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (tenantId: string) => `tenant_${tenantId}`,
}));

// Mock evidence quality scoring
vi.mock('../../../evidence/services/analysis/evidence-quality-scoring.service', () => ({
  getControlEvidenceQualityAverage: vi.fn().mockResolvedValue({
    evidenceCount: 2, averageScore: 80, tier: 'B',
  }),
}));

// Mock db-utils
vi.mock('../../../../utils/db-utils', () => ({
  getFirstRow: (result: any) => result?.rows?.[0] ?? null,
}));

describe('Analytics KPI Service', () => {
  beforeEach(() => {
    mockSafeQuery.mockReset();
  });

  describe('computeKPIs', () => {
    it('returns all required KPI fields', async () => {
      // Controls query
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{ control_id: 'c1', test_status: 'effective' }],
      });
      // Risk score query
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ avg_risk: '15.5' }] });
      // Total controls count
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: '5' }] });
      // Covered controls
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ covered: '3' }] });
      // Remediation total
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: '10' }] });
      // Remediation completed
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ completed: '7' }] });
      // Process tasks
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: '5', completed: '3' }] });
      // Vendor health
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ avg_score: '85', total_vendors: '3', high_risk_vendors: '1' }] });
      // Vendor controls
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ vendor_controls: '2' }] });

      const { computeKPIs } = await import('./analytics-kpi.service');
      const result = await computeKPIs('test-tenant');

      expect(result).toHaveProperty('complianceScore');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('evidenceCoverage');
      expect(result).toHaveProperty('remediationClosureRate');
      expect(result).toHaveProperty('vendorHealthScore');
      expect(result).toHaveProperty('vendorRiskExposure');
      expect(result).toHaveProperty('computedAt');
      expect(result.computedAt).toBeInstanceOf(Date);
    });

    it('handles empty controls gracefully', async () => {
      // Empty controls
      mockSafeQuery.mockResolvedValueOnce({ rows: [] });
      // Risk score
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ avg_risk: '0' }] });
      // Total controls
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] });
      // Remediation total
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] });
      // Process tasks
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: '0', completed: '0' }] });
      // Vendor health
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ avg_score: '100', total_vendors: '0', high_risk_vendors: '0' }] });
      // Vendor controls
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ vendor_controls: '0' }] });

      const { computeKPIs } = await import('./analytics-kpi.service');
      const result = await computeKPIs('empty-tenant');

      expect(result.complianceScore).toBe(0);
      expect(result.evidenceCoverage).toBe(0);
      expect(result.remediationClosureRate).toBe(0);
    });

    it('computes compliance score based on control test statuses', async () => {
      // Controls with mixed statuses
      mockSafeQuery.mockResolvedValueOnce({
        rows: [
          { control_id: 'c1', test_status: 'effective' },
          { control_id: 'c2', test_status: 'ineffective' },
          { control_id: 'c3', test_status: 'partially_effective' },
          { control_id: 'c4', test_status: 'not_tested' },
        ],
      });
      // Risk score
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ avg_risk: '10' }] });
      // Total controls
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: '4' }] });
      // Covered controls
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ covered: '4' }] });
      // Remediation total
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] });
      // Process tasks
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: '0', completed: '0' }] });
      // Vendor health -- catch
      mockSafeQuery.mockRejectedValueOnce(new Error('table not found'));

      const { computeKPIs } = await import('./analytics-kpi.service');
      const result = await computeKPIs('mixed-tenant');

      // effective=100, ineffective=30, partially_effective=70, not_tested=50
      // Average before evidence adjustment: (100 + 30 + 70 + 50) / 4 = 62.5
      expect(result.complianceScore).toBeGreaterThan(0);
      expect(result.complianceScore).toBeLessThanOrEqual(100);
    });

    it('computes evidence coverage percentage', async () => {
      // Controls
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ control_id: 'c1', test_status: 'effective' }] });
      // Risk score
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ avg_risk: '5' }] });
      // Total controls = 10
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: '10' }] });
      // Covered controls = 8
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ covered: '8' }] });
      // Remediation total
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] });
      // Process tasks
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: '0', completed: '0' }] });
      // Vendor health
      mockSafeQuery.mockRejectedValueOnce(new Error('table not found'));

      const { computeKPIs } = await import('./analytics-kpi.service');
      const result = await computeKPIs('coverage-tenant');

      expect(result.evidenceCoverage).toBe(80); // 8/10 * 100
    });

    it('computes remediation closure rate combining tasks', async () => {
      // Controls
      mockSafeQuery.mockResolvedValueOnce({ rows: [] });
      // Risk score
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ avg_risk: '0' }] });
      // Total controls
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] });
      // Remediation total = 20
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: '20' }] });
      // Remediation completed = 15
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ completed: '15' }] });
      // Process tasks: total=10, completed=5
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ total: '10', completed: '5' }] });
      // Vendor health
      mockSafeQuery.mockRejectedValueOnce(new Error('table not found'));

      const { computeKPIs } = await import('./analytics-kpi.service');
      const result = await computeKPIs('remediation-tenant');

      // (15 + 5) / (20 + 10) * 100 = 66.67
      expect(result.remediationClosureRate).toBeCloseTo(66.67, 0);
    });
  });
});
