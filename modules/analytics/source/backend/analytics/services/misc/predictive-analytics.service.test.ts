/**
 * Predictive Analytics Service -- Unit Tests
 *
 * MP-12 SS12: unit tests for predictive analytics functions.
 * Verifies linear regression forecast, remediation time estimation,
 * risk escalation prediction, and BCP readiness forecast.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
const mockQuery = vi.fn();
const mockSafeQuery = vi.fn();
vi.mock('../../../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (tenantId: string) => `tenant_${tenantId}`,
  emptyResult: () => ({ rows: [], rowCount: 0 }),
}));

// Mock db-utils
vi.mock('../../../../utils/db-utils', () => ({
  getFirstRow: (result: any) => result?.rows?.[0] ?? null,
}));

// Mock resilient-catch
vi.mock('../../../../utils/resilient-catch', () => ({
  swallowDefault: (_ec: any, defaultVal: any, promise: Promise<unknown>) =>
    promise.catch(() => defaultVal),
  EC: { FALLBACK_QUERY: 'FALLBACK_QUERY' },
}));

describe('Predictive Analytics Service', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockSafeQuery.mockReset();
  });

  describe('forecastComplianceScore', () => {
    it('returns stable forecast with insufficient data points', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { date: '2026-01-01', score: 50 },
          { date: '2026-01-02', score: 55 },
        ],
      });

      const { forecastComplianceScore } = await import('./predictive-analytics.service');
      const result = await forecastComplianceScore('test-tenant', 90);

      expect(result.trend).toBe('stable');
      expect(result.confidence).toBeLessThanOrEqual(0.1);
      expect(result.dataPoints.length).toBe(2);
    });

    it('returns improving trend with upward data', async () => {
      const upwardData = Array.from({ length: 30 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        score: 50 + i * 2,
      }));
      mockQuery.mockResolvedValueOnce({ rows: upwardData });

      const { forecastComplianceScore } = await import('./predictive-analytics.service');
      const result = await forecastComplianceScore('test-tenant');

      expect(result.trend).toBe('improving');
      // predictedScore is capped at 100, currentScore may exceed 100 since it is raw last data point
      expect(result.predictedScore).toBeGreaterThanOrEqual(0);
      expect(result.predictedScore).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('returns declining trend with downward data', async () => {
      const downwardData = Array.from({ length: 30 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        score: 90 - i * 2,
      }));
      mockQuery.mockResolvedValueOnce({ rows: downwardData });

      const { forecastComplianceScore } = await import('./predictive-analytics.service');
      const result = await forecastComplianceScore('test-tenant');

      expect(result.trend).toBe('declining');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('caps predicted score between 0 and 100', async () => {
      const perfectData = Array.from({ length: 30 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        score: 95 + Math.floor(i / 10),
      }));
      mockQuery.mockResolvedValueOnce({ rows: perfectData });

      const { forecastComplianceScore } = await import('./predictive-analytics.service');
      const result = await forecastComplianceScore('test-tenant', 365);

      expect(result.predictedScore).toBeLessThanOrEqual(100);
      expect(result.predictedScore).toBeGreaterThanOrEqual(0);
    });

    it('returns correct data point structure', async () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, '0')}`,
        score: 60 + i,
      }));
      mockQuery.mockResolvedValueOnce({ rows: data });

      const { forecastComplianceScore } = await import('./predictive-analytics.service');
      const result = await forecastComplianceScore('test-tenant');

      expect(result).toHaveProperty('currentScore');
      expect(result).toHaveProperty('predictedScore');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('dataPoints');
      expect(Array.isArray(result.dataPoints)).toBe(true);
    });
  });

  describe('estimateRemediationTime', () => {
    it('returns default estimates with no data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { estimateRemediationTime } = await import('./predictive-analytics.service');
      const result = await estimateRemediationTime('test-tenant', 'high');

      expect(result.estimatedDays).toBe(14);
      expect(result.p50Days).toBe(14);
      expect(result.p90Days).toBe(30);
      expect(result.sampleSize).toBe(0);
    });

    it('computes percentiles from historical data', async () => {
      const sortedDays = [3, 5, 7, 10, 14, 21, 28, 35, 42, 50];
      mockQuery.mockResolvedValueOnce({
        rows: sortedDays.map(d => ({ days: d })),
      });

      const { estimateRemediationTime } = await import('./predictive-analytics.service');
      const result = await estimateRemediationTime('test-tenant', 'medium');

      expect(result.sampleSize).toBe(10);
      expect(result.estimatedDays).toBeGreaterThan(0);
      expect(result.p50Days).toBeGreaterThan(0);
      expect(result.p90Days).toBeGreaterThanOrEqual(result.p50Days);
    });
  });

  describe('predictRiskEscalation', () => {
    it('returns empty array for no active risks', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { predictRiskEscalation } = await import('./predictive-analytics.service');
      const result = await predictRiskEscalation('test-tenant');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('identifies high escalation probability with increasing scores', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          risk_id: 'r1',
          title: 'Test Risk',
          current_score: 12,
          score_history: ['8', '10', '12'],
        }],
      });

      const { predictRiskEscalation } = await import('./predictive-analytics.service');
      const result = await predictRiskEscalation('test-tenant');

      expect(result.length).toBe(1);
      expect(result[0].escalationProbability).toBeGreaterThanOrEqual(0.7);
      expect(result[0].predictedScore).toBeGreaterThanOrEqual(result[0].currentScore);
    });

    it('returns correct risk structure fields', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          risk_id: 'r1',
          title: 'Data Breach Risk',
          current_score: 8,
          score_history: [],
        }],
      });

      const { predictRiskEscalation } = await import('./predictive-analytics.service');
      const result = await predictRiskEscalation('test-tenant');

      expect(result[0]).toHaveProperty('riskId');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('currentScore');
      expect(result[0]).toHaveProperty('predictedScore');
      expect(result[0]).toHaveProperty('escalationProbability');
    });
  });

  describe('getAnalyticsDashboard', () => {
    it('returns dashboard composite structure', async () => {
      // forecastComplianceScore query
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // predictRiskEscalation query
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // estimateRemediationTime queries (4 severities)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getAnalyticsDashboard } = await import('./predictive-analytics.service');
      const result = await getAnalyticsDashboard('test-tenant');

      expect(result).toHaveProperty('complianceForecast');
      expect(result).toHaveProperty('riskEscalations');
      expect(result).toHaveProperty('remediationEstimates');
      expect(Array.isArray(result.riskEscalations)).toBe(true);
      expect(typeof result.remediationEstimates).toBe('object');
    });
  });
});
