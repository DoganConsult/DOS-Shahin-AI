import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClientQuery = vi.fn().mockResolvedValue({ rows: [] });
const mockWithTransaction = vi.fn(async (_tenantId: string, fn: (client: { query: typeof mockClientQuery }) => Promise<void>) => {
  await fn({ query: mockClientQuery });
});

vi.mock('@dos/db', () => ({
  withTransaction: (...args: unknown[]) => mockWithTransaction(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { anonymizeUser } from './user-anonymization.service';

describe('DAuth SCIM User Anonymization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wipes user PII and returns true on success', async () => {
    const result = await anonymizeUser('t-001', 'u-001', 'admin-001');

    expect(result).toBe(true);
    expect(mockWithTransaction).toHaveBeenCalledWith('t-001', expect.any(Function));
    // Should have 4 queries: update users, update memberships, delete mfa, delete active_sessions, insert audit log
    expect(mockClientQuery).toHaveBeenCalledTimes(5);
  });

  it('returns false on transaction failure', async () => {
    mockWithTransaction.mockRejectedValueOnce(new Error('DB error'));

    const result = await anonymizeUser('t-001', 'u-001', 'admin-001');
    expect(result).toBe(false);
  });

  it('anonymizes email to deleted_<userId>@anonymized.local', async () => {
    await anonymizeUser('t-001', 'u-001', 'admin-001');

    const firstCall = mockClientQuery.mock.calls[0];
    expect(firstCall[1]).toContain('deleted_u-001@anonymized.local');
  });
});
