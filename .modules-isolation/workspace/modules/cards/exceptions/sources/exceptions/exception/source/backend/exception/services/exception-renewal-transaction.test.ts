import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = { query: vi.fn() };
const mockSafeQuery = vi.fn();
const mockSafeQueryWithClient = vi.fn();
const mockWithTransaction = vi.fn(async (_tenantId: string, fn: (client: any) => Promise<unknown>) => fn(mockClient));

vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  safeQueryWithClient: (...args: unknown[]) => mockSafeQueryWithClient(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
  withTransaction: (...args: unknown[]) => mockWithTransaction(...args),
}));

vi.mock('../../../utils/db-utils', () => ({
  getFirstRow: (r: any) => r?.rows?.[0] ?? null,
}));

import { reviewRenewal, requestRenewal } from './exception-renewal.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reviewRenewal — concurrency control', () => {
  const tenantId = 'test-tenant';
  const renewalRow = {
    renewal_id: 'ren-1',
    exception_id: 'exc-1',
    requested_by: 'user-1',
    additional_days: 30,
    justification: 'needed',
    updated_compensating_controls: null,
    status: 'approved',
    reviewed_by: 'rev-1',
    reviewed_at: new Date(),
    review_comments: 'ok',
    created_at: new Date(),
  };
  const excRow = {
    exception_id: 'exc-1',
    expiry_date: new Date().toISOString(),
    requested_duration: 60,
  };

  it('uses FOR UPDATE when reading exception for expiry extension', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [renewalRow] })
      .mockResolvedValueOnce({ rows: [excRow] })
      .mockResolvedValueOnce({ rows: [] });

    await reviewRenewal(tenantId, 'ren-1', 'rev-1', 'approved', 'ok');

    expect(mockSafeQueryWithClient.mock.calls[1][0]).toContain('FOR UPDATE');
  });

  it('only updates renewal on rejection (no exception lock needed)', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [{ ...renewalRow, status: 'rejected' }] });

    await reviewRenewal(tenantId, 'ren-1', 'rev-1', 'rejected', 'denied');

    expect(mockSafeQueryWithClient).toHaveBeenCalledTimes(1);
  });

  it('rolls back all changes when exception update fails', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [renewalRow] })
      .mockResolvedValueOnce({ rows: [excRow] })
      .mockRejectedValueOnce(new Error('Exception update failed'));

    await expect(reviewRenewal(tenantId, 'ren-1', 'rev-1', 'approved', 'ok'))
      .rejects.toThrow('Exception update failed');
  });
});

describe('requestRenewal — concurrency control', () => {
  const tenantId = 'test-tenant';
  const data = {
    exceptionId: 'exc-1',
    requestedBy: 'user-1',
    additionalDays: 30,
    justification: 'business need',
  };

  it('wraps in transaction with FOR UPDATE on exception row', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [{ exception_id: 'exc-1', status: 'approved' }] })
      .mockResolvedValueOnce({ rows: [{ renewal_id: 'ren-1', exception_id: 'exc-1', requested_by: 'user-1', additional_days: 30, justification: 'business need', updated_compensating_controls: null, status: 'requested', created_at: new Date() }] });

    await requestRenewal(tenantId, data);

    expect(mockWithTransaction).toHaveBeenCalledTimes(1);
    expect(mockSafeQueryWithClient.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(mockSafeQueryWithClient).toHaveBeenCalledTimes(2);
  });

  it('rejects non-approved exceptions', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [{ exception_id: 'exc-1', status: 'draft' }] });

    await expect(requestRenewal(tenantId, data))
      .rejects.toThrow('Can only renew approved exceptions');
  });
});
