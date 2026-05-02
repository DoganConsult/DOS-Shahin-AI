/**
 * Co-located tests for DAuth access-review.service.
 * Covers: createAccessReview, completeAccessReview,
 *         getPendingAccessReviews, getAccessReviewHistory.
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

vi.mock('uuid', () => ({ v4: () => 'mock-uuid-001' }));

import {
  createAccessReview,
  completeAccessReview,
  getPendingAccessReviews,
  getAccessReviewHistory,
} from './access-review.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockPublish.mockResolvedValue(undefined);
});

/* ------------------------------------------------------------------ */
/*  createAccessReview                                                 */
/* ------------------------------------------------------------------ */
describe('createAccessReview', () => {
  it('creates a review with current role assignments', async () => {
    // First query: fetch role assignments
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ role_code: 'grc_admin' }, { role_code: 'risk_analyst' }],
    });
    // Second query: insert review
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const review = await createAccessReview('t1', 'u1', 'rev1', 'periodic');

    expect(review.reviewId).toBe('mock-uuid-001');
    expect(review.status).toBe('pending');
    expect(review.roleAssignments).toEqual(['grc_admin', 'risk_analyst']);
    expect(review.reviewType).toBe('periodic');
    expect(review.completedAt).toBeNull();

    expect(mockPublish).toHaveBeenCalledWith(
      'dauth.access_review.created', 't1',
      expect.objectContaining({ reviewId: 'mock-uuid-001', userId: 'u1' }),
    );
  });

  it('creates review with empty role assignments when user has none', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const review = await createAccessReview('t1', 'u1', 'rev1', 'offboarding');

    expect(review.roleAssignments).toEqual([]);
    expect(review.reviewType).toBe('offboarding');
  });

  it('publishes event after creation', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await createAccessReview('t1', 'u1', 'rev1', 'triggered');

    expect(mockPublish).toHaveBeenCalledTimes(1);
    expect(mockPublish.mock.calls[0][0]).toBe('dauth.access_review.created');
  });
});

/* ------------------------------------------------------------------ */
/*  completeAccessReview                                               */
/* ------------------------------------------------------------------ */
describe('completeAccessReview', () => {
  it('returns true and publishes event when review is pending', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rowCount: 1 });

    const result = await completeAccessReview('t1', 'rev-1', 'approved', 'checker1');

    expect(result).toBe(true);
    expect(mockPublish).toHaveBeenCalledWith(
      'dauth.access_review.completed', 't1',
      expect.objectContaining({ reviewId: 'rev-1', decision: 'approved' }),
    );
  });

  it('returns false when review not found or already completed', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rowCount: 0 });

    const result = await completeAccessReview('t1', 'nonexistent', 'revoked', 'checker1');

    expect(result).toBe(false);
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('supports revoked decision', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rowCount: 1 });

    const result = await completeAccessReview('t1', 'rev-2', 'revoked', 'checker2');

    expect(result).toBe(true);
    const [_sql, params] = mockSafeQuery.mock.calls[0];
    expect(params[0]).toBe('revoked');
  });

  it('uses correct SQL parameters', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rowCount: 1 });

    await completeAccessReview('t1', 'rev-3', 'approved', 'checker3');

    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('UPDATE "tenant_t1".access_reviews');
    expect(params).toEqual(['approved', 'checker3', 'rev-3']);
  });
});

/* ------------------------------------------------------------------ */
/*  getPendingAccessReviews                                            */
/* ------------------------------------------------------------------ */
describe('getPendingAccessReviews', () => {
  it('returns mapped pending reviews', async () => {
    const now = new Date('2026-03-01T00:00:00Z');
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        review_id: 'r1', tenant_id: 't1', user_id: 'u1',
        reviewer_id: 'rev1', status: 'pending', review_type: 'periodic',
        role_assignments: ['admin'], created_at: now, completed_at: null,
      }],
    });

    const reviews = await getPendingAccessReviews('t1');

    expect(reviews).toHaveLength(1);
    expect(reviews[0].reviewId).toBe('r1');
    expect(reviews[0].status).toBe('pending');
    expect(reviews[0].completedAt).toBeNull();
  });

  it('returns empty array when none pending', async () => {
    const reviews = await getPendingAccessReviews('t1');
    expect(reviews).toHaveLength(0);
  });

  it('filters by reviewerId when provided', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });

    await getPendingAccessReviews('t1', 'rev1');

    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('reviewer_id = $1');
    expect(params).toEqual(['rev1']);
  });

  it('does not filter by reviewerId when omitted', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });

    await getPendingAccessReviews('t1');

    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).not.toContain('reviewer_id = $1');
    expect(params).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  getAccessReviewHistory                                             */
/* ------------------------------------------------------------------ */
describe('getAccessReviewHistory', () => {
  it('returns all reviews for a user ordered by date', async () => {
    const d1 = new Date('2026-03-01T00:00:00Z');
    const d2 = new Date('2026-02-01T00:00:00Z');
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          review_id: 'r1', tenant_id: 't1', user_id: 'u1',
          reviewer_id: 'rev1', status: 'approved', review_type: 'periodic',
          role_assignments: ['admin'], created_at: d1, completed_at: d1,
        },
        {
          review_id: 'r2', tenant_id: 't1', user_id: 'u1',
          reviewer_id: 'rev2', status: 'pending', review_type: 'triggered',
          role_assignments: [], created_at: d2, completed_at: null,
        },
      ],
    });

    const history = await getAccessReviewHistory('t1', 'u1');

    expect(history).toHaveLength(2);
    expect(history[0].reviewId).toBe('r1');
    expect(history[1].completedAt).toBeNull();
  });

  it('returns empty array for user with no reviews', async () => {
    const history = await getAccessReviewHistory('t1', 'u-none');
    expect(history).toHaveLength(0);
  });

  it('passes userId to query', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });

    await getAccessReviewHistory('t1', 'u42');

    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('user_id = $1');
    expect(params).toEqual(['u42']);
  });

  it('handles null role_assignments gracefully', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        review_id: 'r3', tenant_id: 't1', user_id: 'u1',
        reviewer_id: 'rev1', status: 'pending', review_type: 'periodic',
        role_assignments: null, created_at: null, completed_at: null,
      }],
    });

    const history = await getAccessReviewHistory('t1', 'u1');

    expect(history[0].roleAssignments).toEqual([]);
  });
});
