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

import { autoCloseExpiredExceptions, grantGracePeriod } from './exception-expiry-monitor.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('autoCloseExpiredExceptions — concurrency control', () => {
  const tenantId = 'test-tenant';
  const expiredRow = {
    exception_id: 'exc-1',
    control_id: 'ctrl-1',
    risk_impact: 'low',
    expiry_date: new Date(Date.now() - 30 * 86400000).toISOString(),
    requested_by: 'user-1',
    requested_duration: 30,
    approver_designation: 'manager',
    status: 'approved',
    approval_chain: '[]',
    created_at: new Date(),
  };

  it('re-verifies row with FOR UPDATE SKIP LOCKED inside transaction', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [expiredRow] });
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [expiredRow] })
      .mockResolvedValueOnce({ rows: [{ ...expiredRow, status: 'expired' }] })
      .mockResolvedValueOnce({ rows: [] });

    await autoCloseExpiredExceptions(tenantId);

    expect(mockSafeQueryWithClient.mock.calls[0][0]).toContain('FOR UPDATE SKIP LOCKED');
    expect(mockSafeQueryWithClient.mock.calls[0][1]).toContain('approved');
  });

  it('skips row already processed by concurrent monitor (SKIP LOCKED returns empty)', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [expiredRow] });
    mockSafeQueryWithClient.mockResolvedValueOnce({ rows: [] });

    const result = await autoCloseExpiredExceptions(tenantId);

    expect(result).toHaveLength(0);
    expect(mockSafeQueryWithClient).toHaveBeenCalledTimes(1);
  });

  it('skips control update when control_id is null', async () => {
    const noControlRow = { ...expiredRow, control_id: null };
    mockSafeQuery.mockResolvedValueOnce({ rows: [noControlRow] });
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [noControlRow] })
      .mockResolvedValueOnce({ rows: [{ ...noControlRow, status: 'expired' }] });

    await autoCloseExpiredExceptions(tenantId);

    expect(mockSafeQueryWithClient).toHaveBeenCalledTimes(2);
  });

  it('processes multiple rows with separate transactions', async () => {
    const row2 = { ...expiredRow, exception_id: 'exc-2', control_id: null };
    mockSafeQuery.mockResolvedValueOnce({ rows: [expiredRow, row2] });
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [expiredRow] })
      .mockResolvedValueOnce({ rows: [{ ...expiredRow, status: 'expired' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [row2] })
      .mockResolvedValueOnce({ rows: [{ ...row2, status: 'expired' }] });

    const result = await autoCloseExpiredExceptions(tenantId);

    expect(mockWithTransaction).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });
});

describe('grantGracePeriod — concurrency control', () => {
  const tenantId = 'test-tenant';
  const excRow = {
    exception_id: 'exc-1',
    status: 'approved',
    expiry_date: new Date().toISOString(),
  };

  it('uses FOR UPDATE to lock exception row', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [excRow] })
      .mockResolvedValueOnce({ rows: [] });

    await grantGracePeriod(tenantId, 'exc-1', 30, 'admin', 'extended');

    expect(mockSafeQueryWithClient.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(mockSafeQueryWithClient).toHaveBeenCalledTimes(2);
  });

  it('rejects non-approved/expired exceptions inside transaction', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [{ ...excRow, status: 'draft' }] });

    await expect(grantGracePeriod(tenantId, 'exc-1', 30, 'admin', 'extended'))
      .rejects.toThrow('Grace period can only be granted');
  });
});
