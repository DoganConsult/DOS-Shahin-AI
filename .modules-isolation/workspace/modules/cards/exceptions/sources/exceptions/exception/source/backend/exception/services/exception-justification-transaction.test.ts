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

import { upsertJustification } from './exception-justification.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('upsertJustification — concurrency control', () => {
  const tenantId = 'test-tenant';
  const data = {
    exceptionId: 'exc-1',
    businessJustification: 'Critical business need',
    justifiedBy: 'user-1',
  };
  const justRow = {
    justification_id: 'just-1',
    exception_id: 'exc-1',
    business_justification: 'Critical business need',
    risk_acceptance_statement: null,
    impact_analysis: null,
    alternatives_considered: '[]',
    justified_by: 'user-1',
    created_at: new Date(),
  };

  it('uses FOR UPDATE to lock exception row before upsert', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [{ exception_id: 'exc-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [justRow] });

    await upsertJustification(tenantId, data);

    expect(mockSafeQueryWithClient.mock.calls[0][0]).toContain('FOR UPDATE');
  });

  it('throws 404 when exception not found inside transaction', async () => {
    mockSafeQueryWithClient.mockResolvedValueOnce({ rows: [] });

    await expect(upsertJustification(tenantId, data)).rejects.toThrow('Exception not found');
    expect(mockSafeQueryWithClient).toHaveBeenCalledTimes(1);
  });

  it('rolls back UPSERT on failure', async () => {
    mockSafeQueryWithClient
      .mockResolvedValueOnce({ rows: [{ exception_id: 'exc-1' }] })
      .mockRejectedValueOnce(new Error('UPSERT failed'));

    await expect(upsertJustification(tenantId, data)).rejects.toThrow('UPSERT failed');
  });
});
