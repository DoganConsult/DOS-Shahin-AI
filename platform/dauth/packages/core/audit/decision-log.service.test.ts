/**
 * Co-located tests for DAuth decision-log.service.
 * Covers: logAuthDecision, queryDecisionLog, getDecisionsByCorrelation,
 *         getDecisionSummary, getRecentDenials.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

const mockPublish = vi.fn();
vi.mock('../../dos/events/event-bus', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  logAuthDecision,
  queryDecisionLog,
  getDecisionsByCorrelation,
  getDecisionSummary,
  getRecentDenials,
} from './decision-log.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

/* ------------------------------------------------------------------ */
/*  logAuthDecision                                                    */
/* ------------------------------------------------------------------ */
describe('logAuthDecision', () => {
  it('inserts a decision row with all fields', async () => {
    await logAuthDecision('t1', {
      userId: 'u1',
      permissionCode: 'risk.item.read',
      moduleCode: 'risk',
      decision: 'allow',
      reason: 'role_match',
      matchedRole: 'grc_admin',
      scopeType: 'org',
      authorityLevel: 'full',
      correlationId: 'corr-1',
      context: { extra: true },
    });

    expect(mockSafeQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO "tenant_t1".authz_decision_log');
    expect(params).toEqual([
      'u1', 'risk.item.read', 'risk', 'allow', 'role_match',
      'grc_admin', 'org', 'full', 'corr-1', JSON.stringify({ extra: true }),
    ]);
  });

  it('defaults optional fields to null', async () => {
    await logAuthDecision('t2', {
      userId: 'u2',
      permissionCode: 'audit.log.read',
      decision: 'deny',
      reason: 'no_permission',
    });

    const [, params] = mockSafeQuery.mock.calls[0];
    // moduleCode, matchedRole, scopeType, authorityLevel, correlationId all null
    expect(params[2]).toBeNull();
    expect(params[5]).toBeNull();
    expect(params[6]).toBeNull();
    expect(params[7]).toBeNull();
    expect(params[8]).toBeNull();
    expect(params[9]).toBe('{}');
  });

  it('includes correlationId when provided', async () => {
    await logAuthDecision('t1', {
      userId: 'u1',
      permissionCode: 'ctrl.view',
      decision: 'allow',
      reason: 'ok',
      correlationId: 'corr-42',
    });

    const [, params] = mockSafeQuery.mock.calls[0];
    expect(params[8]).toBe('corr-42');
  });
});

/* ------------------------------------------------------------------ */
/*  queryDecisionLog                                                   */
/* ------------------------------------------------------------------ */
describe('queryDecisionLog', () => {
  it('returns entries and total on happy path', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'log-1', user_id: 'u1', permission_code: 'p1', module_code: 'mod',
          decision: 'allow', reason: 'ok', matched_role: 'r1',
          matched_scope_type: 'org', authority_level: 'full',
          correlation_id: null, record_context: {}, created_at: '2026-01-01',
        }],
      });

    const result = await queryDecisionLog('t1', { userId: 'u1' });

    expect(result.total).toBe(1);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].logId).toBe('log-1');
    expect(result.entries[0].userId).toBe('u1');
  });

  it('returns empty results when no matches', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await queryDecisionLog('t1', { decision: 'deny' });

    expect(result.total).toBe(0);
    expect(result.entries).toHaveLength(0);
  });

  it('applies all filter conditions', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    await queryDecisionLog('t1', {
      userId: 'u1',
      permissionCode: 'p1',
      decision: 'deny',
      moduleCode: 'risk',
      correlationId: 'corr-1',
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
      limit: 10,
      offset: 5,
    });

    // Count query should have 7 filter params
    const [countSql, countParams] = mockSafeQuery.mock.calls[0];
    expect(countParams).toHaveLength(7);
    expect(countSql).toContain('WHERE');

    // Data query should have 7 filter params + limit + offset
    const [, dataParams] = mockSafeQuery.mock.calls[1];
    expect(dataParams).toHaveLength(9);
    expect(dataParams[7]).toBe(10); // limit
    expect(dataParams[8]).toBe(5);  // offset
  });

  it('uses default limit=50 and offset=0', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    await queryDecisionLog('t1', {});

    const [, dataParams] = mockSafeQuery.mock.calls[1];
    expect(dataParams[0]).toBe(50); // default limit
    expect(dataParams[1]).toBe(0);  // default offset
  });
});

/* ------------------------------------------------------------------ */
/*  getDecisionsByCorrelation                                          */
/* ------------------------------------------------------------------ */
describe('getDecisionsByCorrelation', () => {
  it('returns entries matching correlation ID', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ total: 2 }] })
      .mockResolvedValueOnce({
        rows: [
          { id: 'l1', user_id: 'u1', permission_code: 'p1', module_code: null,
            decision: 'allow', reason: 'ok', matched_role: null,
            matched_scope_type: null, authority_level: null,
            correlation_id: 'corr-5', record_context: {}, created_at: '2026-01-01' },
          { id: 'l2', user_id: 'u1', permission_code: 'p2', module_code: null,
            decision: 'deny', reason: 'no', matched_role: null,
            matched_scope_type: null, authority_level: null,
            correlation_id: 'corr-5', record_context: {}, created_at: '2026-01-01' },
        ],
      });

    const entries = await getDecisionsByCorrelation('t1', 'corr-5');
    expect(entries).toHaveLength(2);
    expect(entries[0].correlationId).toBe('corr-5');
  });

  it('returns empty array when no decisions share the correlation ID', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const entries = await getDecisionsByCorrelation('t1', 'nonexistent');
    expect(entries).toHaveLength(0);
  });

  it('passes limit of 1000 to queryDecisionLog', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    await getDecisionsByCorrelation('t1', 'corr-1');

    // Data query params: correlationId filter + limit(1000) + offset(0)
    const [, dataParams] = mockSafeQuery.mock.calls[1];
    expect(dataParams).toContain(1000);
  });
});

/* ------------------------------------------------------------------ */
/*  getDecisionSummary                                                 */
/* ------------------------------------------------------------------ */
describe('getDecisionSummary', () => {
  it('returns aggregated counts on happy path', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ total: 100, allow_count: 80, deny_count: 20 }] })
      .mockResolvedValueOnce({
        rows: [
          { permission_code: 'risk.item.delete', cnt: 12 },
          { permission_code: 'ctrl.approve', cnt: 8 },
        ],
      });

    const summary = await getDecisionSummary('t1', '2026-01-01', '2026-12-31');

    expect(summary.totalDecisions).toBe(100);
    expect(summary.allowCount).toBe(80);
    expect(summary.denyCount).toBe(20);
    expect(summary.topDeniedPermissions).toHaveLength(2);
    expect(summary.topDeniedPermissions[0].permissionCode).toBe('risk.item.delete');
    expect(summary.topDeniedPermissions[0].count).toBe(12);
  });

  it('returns zero counts when no data in range', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ total: 0, allow_count: 0, deny_count: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const summary = await getDecisionSummary('t1', '2099-01-01', '2099-12-31');

    expect(summary.totalDecisions).toBe(0);
    expect(summary.allowCount).toBe(0);
    expect(summary.denyCount).toBe(0);
    expect(summary.topDeniedPermissions).toHaveLength(0);
  });

  it('handles missing count row gracefully', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const summary = await getDecisionSummary('t1', '2026-01-01', '2026-12-31');

    expect(summary.totalDecisions).toBe(0);
    expect(summary.allowCount).toBe(0);
    expect(summary.denyCount).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  getRecentDenials                                                   */
/* ------------------------------------------------------------------ */
describe('getRecentDenials', () => {
  it('returns denied entries using default limit', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'd1', user_id: 'u1', permission_code: 'p1', module_code: null,
          decision: 'deny', reason: 'no_role', matched_role: null,
          matched_scope_type: null, authority_level: null,
          correlation_id: null, record_context: {}, created_at: '2026-03-01',
        }],
      });

    const denials = await getRecentDenials('t1');

    expect(denials).toHaveLength(1);
    expect(denials[0].decision).toBe('deny');
  });

  it('returns empty array when no denials exist', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const denials = await getRecentDenials('t1');
    expect(denials).toHaveLength(0);
  });

  it('respects custom limit parameter', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    await getRecentDenials('t1', 5);

    // Data query should use limit=5
    const [, dataParams] = mockSafeQuery.mock.calls[1];
    expect(dataParams).toContain(5);
  });
});
