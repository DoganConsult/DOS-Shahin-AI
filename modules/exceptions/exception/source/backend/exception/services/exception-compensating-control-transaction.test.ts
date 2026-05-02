import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = { query: vi.fn() };
const mockSafeQueryWithClient = vi.fn();
const mockWithTransaction = vi.fn(async (_tenantId: string, fn: (client: any) => Promise<unknown>) => fn(mockClient));

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn(),
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

import { linkCompensatingControl, unlinkCompensatingControl } from './exception-compensating-control.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('linkCompensatingControl — concurrency control', () => {
  const tenantId = 'test-tenant';
  const data = {
    exceptionId: 'exc-1',
    controlId: 'ctrl-1',
    controlTitle: 'Test Control',
    linkedBy: 'user-1',
  };

  it('uses FOR UPDATE to lock exception row', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [{ exception_id: 'exc-1' }] })
      .mockResolvedValueOnce({ rows: [{ link_id: 'lnk-1', exception_id: 'exc-1', control_id: 'ctrl-1', control_title: 'Test Control', effectiveness_rating: 'not_assessed', linked_by: 'user-1', created_at: new Date() }] });

    await linkCompensatingControl(tenantId, data);

    expect(mockSafeQueryWithClient.mock.calls[0][0]).toContain('FOR UPDATE');
  });

  it('throws 404 when exception not found inside transaction', async () => {
    mockSafeQueryWithClient.mockResolvedValueOnce({ rows: [] });

    await expect(linkCompensatingControl(tenantId, data)).rejects.toThrow('Exception not found');
  });
});

describe('unlinkCompensatingControl — concurrency control', () => {
  const tenantId = 'test-tenant';
  const linkRow = { link_id: 'lnk-1', exception_id: 'exc-1', control_id: 'ctrl-1' };

  it('uses FOR UPDATE to lock link row before delete', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [linkRow] })
      .mockResolvedValueOnce({ rows: [] });

    await unlinkCompensatingControl(tenantId, 'lnk-1', 'user-1');

    expect(mockSafeQueryWithClient.mock.calls[0][0]).toContain('FOR UPDATE');
  });

  it('throws 404 when link not found inside transaction', async () => {
    mockSafeQueryWithClient.mockResolvedValueOnce({ rows: [] });

    await expect(unlinkCompensatingControl(tenantId, 'lnk-1', 'user-1')).rejects.toThrow('Link not found');
  });

  it('rolls back DELETE when it fails', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [linkRow] })
      .mockRejectedValueOnce(new Error('FK violation'));

    await expect(unlinkCompensatingControl(tenantId, 'lnk-1', 'user-1')).rejects.toThrow('FK violation');
  });
});
