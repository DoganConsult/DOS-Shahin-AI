/**
 * DORA Obligation Service — Unit Tests
 *
 * MP-25 §12: Unit tests for core runtime services.
 * Tests obligation CRUD, mappings, aggregation, and lifecycle transitions.
 */

import { describe, it, expect, vi, beforeEach as _beforeEach } from 'vitest';

// Mock database
const mockRows: unknown[] = [];
let mockRowCount = 0;
vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockImplementation(() =>
    Promise.resolve({ rows: mockRows, rowCount: mockRowCount }),
  ),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
}));

vi.mock('../../../utils/db-utils', () => ({
  getFirstRow: vi.fn().mockImplementation((result: any) => result?.rows?.[0] ?? null),
}));

vi.mock('./dora-event.service', () => ({
  emitDoraEvent: vi.fn().mockResolvedValue(undefined),
  emitDoraStatusChange: vi.fn().mockResolvedValue(undefined),
}));

import { safeQuery } from '../ports/database.port';

// MOCKED DYNAMICALLY TO ALIGN PORT ABSTRACTION
vi.mock('../ports/database.port', () => ({
  safeQuery: vi.fn().mockResolvedValue({rows: []}),
  withTransaction: vi.fn().mockImplementation(async (cb) => cb({ query: vi.fn().mockResolvedValue({rows: []}) })),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
  query: vi.fn().mockResolvedValue({rows: []})
}));

  describe('listObligations', () => {
    it('returns paginated obligations with filters', async () => {
      const { listObligations } = await import('./dora-obligation.service');
      mockRows.push({ total: 5 });

      const result = await listObligations('t1', { pillar: 'ict_risk_management', page: 1, pageSize: 25 });

      expect(safeQuery).toHaveBeenCalled();
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('total');
    });

    it('applies search filter correctly', async () => {
      const { listObligations } = await import('./dora-obligation.service');
      mockRows.push({ total: 0 });

      await listObligations('t1', { search: 'art 5' });

      // Verify safeQuery was called (search adds ILIKE condition)
      expect(safeQuery).toHaveBeenCalled();
    });
  });

  describe('createObligation', () => {
    it('creates obligation and emits event', async () => {
      const { createObligation } = await import('./dora-obligation.service');
      mockRows.push({
        obligation_id: 'obl-1',
        title: 'Test Obligation',
        pillar: 'ict_risk_management',
        article_reference: 'Art. 5',
      });

      const result = await createObligation('t1', {
        title: 'Test Obligation',
        pillar: 'ict_risk_management',
        articleReference: 'Art. 5',
      });

      expect(result).toBeDefined();
      expect(result?.obligation_id).toBe('obl-1');
      expect(emitDoraEvent).toHaveBeenCalledWith(
        't1', 'dora.obligation_created', 'obligation', 'obl-1',
        expect.objectContaining({ title: 'Test Obligation' }),
      );
    });
  });

  describe('transitionObligationStatus', () => {
    it('transitions status and emits status change event', async () => {
      const { transitionObligationStatus } = await import('./dora-obligation.service');
      mockRows.push({ obligation_id: 'obl-1', status: 'under_review' });

      await transitionObligationStatus('t1', 'obl-1', 'draft', 'under_review');

      expect(emitDoraStatusChange).toHaveBeenCalledWith(
        't1', 'obligation', 'obl-1', 'draft', 'under_review',
      );
    });
  });

  describe('deleteObligation', () => {
    it('soft-deletes and emits event', async () => {
      const { deleteObligation } = await import('./dora-obligation.service');
      mockRows.push({ obligation_id: 'obl-1' });

      const result = await deleteObligation('t1', 'obl-1', 'user-1');

      expect(result).toBe(true);
      expect(emitDoraEvent).toHaveBeenCalledWith(
        't1', 'dora.obligation_deleted', 'obligation', 'obl-1', {},
      );
    });
  });

  describe('DORA_PILLARS', () => {
    it('contains all five DORA pillars', async () => {
      const { DORA_PILLARS } = await import('./dora-obligation.service');
      expect(DORA_PILLARS).toContain('ict_risk_management');
      expect(DORA_PILLARS).toContain('incident_reporting');
      expect(DORA_PILLARS).toContain('resilience_testing');
      expect(DORA_PILLARS).toContain('third_party_risk');
      expect(DORA_PILLARS).toContain('information_sharing');
      expect(DORA_PILLARS.length).toBe(5);
    });
  });

  describe('getObligationStats', () => {
    it('returns aggregated statistics', async () => {
      const { getObligationStats } = await import('./dora-obligation.service');
      mockRows.push({
        total: 10,
        active: 5,
        overdue: 2,
        completed: 3,
        avg_completion: 65.5,
      });

      const stats = await getObligationStats('t1');

      expect(stats.total).toBe(10);
      expect(stats.active).toBe(5);
      expect(stats.overdue).toBe(2);
      expect(stats.completed).toBe(3);
      expect(stats.avgCompletion).toBe(65.5);
    });
  });
