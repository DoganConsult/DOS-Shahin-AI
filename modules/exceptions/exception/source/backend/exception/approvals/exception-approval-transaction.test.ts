import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = { query: vi.fn() };
const mockSafeQueryWithClient = vi.fn();
const mockSafeQuery = vi.fn();
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

vi.mock('../../audit/services/audit/core/audit-trail.service', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../platform/services/module-lifecycle.service', () => ({
  tryLifecycleTransition: vi.fn().mockResolvedValue({ handled: false, denied: false }),
}));

import { recordApprovalDecision } from './exception-approval.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('recordApprovalDecision — transaction + concurrency', () => {
  const tenantId = 'test-tenant';
  const data = { exceptionId: 'exc-1', reviewerId: 'user-1', decision: 'approved' as const, comments: 'ok' };

  it('SELECT, INSERT, and UPDATE all run inside withTransaction via safeQueryWithClient', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [{ exception_id: 'exc-1', status: 'under_review' }] })
      .mockResolvedValueOnce({ rows: [{ approval_id: 'ap-1', exception_id: 'exc-1', reviewer_id: 'user-1', decision: 'approved', comments: 'ok', decided_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [] });

    await recordApprovalDecision(tenantId, data);

    expect(mockWithTransaction).toHaveBeenCalledTimes(1);
    expect(mockSafeQueryWithClient).toHaveBeenCalledTimes(3);
    expect(mockSafeQueryWithClient.mock.calls[0][2]).toBe(mockClient);
    expect(mockSafeQueryWithClient.mock.calls[1][2]).toBe(mockClient);
    expect(mockSafeQueryWithClient.mock.calls[2][2]).toBe(mockClient);
  });

  it('uses FOR UPDATE on the exception row to prevent concurrent modifications', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [{ exception_id: 'exc-1', status: 'under_review' }] })
      .mockResolvedValueOnce({ rows: [{ approval_id: 'ap-1', exception_id: 'exc-1', reviewer_id: 'user-1', decision: 'approved', comments: 'ok', decided_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [] });

    await recordApprovalDecision(tenantId, data);

    expect(mockSafeQueryWithClient.mock.calls[0][0]).toContain('FOR UPDATE');
  });

  it('passes correct SQL for SELECT, INSERT, and UPDATE', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [{ exception_id: 'exc-1', status: 'under_review' }] })
      .mockResolvedValueOnce({ rows: [{ approval_id: 'ap-1', exception_id: 'exc-1', reviewer_id: 'user-1', decision: 'approved', comments: 'ok', decided_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [] });

    await recordApprovalDecision(tenantId, data);

    expect(mockSafeQueryWithClient.mock.calls[0][0]).toContain('SELECT');
    expect(mockSafeQueryWithClient.mock.calls[1][0]).toContain('INSERT INTO');
    expect(mockSafeQueryWithClient.mock.calls[1][0]).toContain('exception_approvals');
    expect(mockSafeQueryWithClient.mock.calls[2][0]).toContain('UPDATE');
    expect(mockSafeQueryWithClient.mock.calls[2][0]).toContain('exceptions');
  });

  it('rolls back all operations when INSERT fails', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [{ exception_id: 'exc-1', status: 'under_review' }] })
      .mockRejectedValueOnce(new Error('DB constraint violation'));

    await expect(recordApprovalDecision(tenantId, data)).rejects.toThrow('DB constraint violation');
    expect(mockSafeQueryWithClient).toHaveBeenCalledTimes(2);
  });

  it('rolls back INSERT when UPDATE fails', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [{ exception_id: 'exc-1', status: 'under_review' }] })
      .mockResolvedValueOnce({ rows: [{ approval_id: 'ap-1', exception_id: 'exc-1', reviewer_id: 'user-1', decision: 'approved', comments: 'ok', decided_at: new Date() }] })
      .mockRejectedValueOnce(new Error('Update failed'));

    await expect(recordApprovalDecision(tenantId, data)).rejects.toThrow('Update failed');
  });

  it('audit recording happens outside transaction', async () => {
    const { recordAudit } = await import('../../audit/services/audit/core/audit-trail.service');
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [{ exception_id: 'exc-1', status: 'under_review' }] })
      .mockResolvedValueOnce({ rows: [{ approval_id: 'ap-1', exception_id: 'exc-1', reviewer_id: 'user-1', decision: 'approved', comments: 'ok', decided_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [] });

    await recordApprovalDecision(tenantId, data);

    expect(recordAudit).toHaveBeenCalledTimes(1);
  });
});
