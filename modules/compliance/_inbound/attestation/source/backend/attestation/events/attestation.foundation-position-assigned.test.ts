/**
 * Phase 7 — attestation subscriber for foundation.position.holder.assigned (F-061).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  safeQueryMock: vi.fn(async () => ({ rows: [] })),
}));

vi.mock('@dos/module-sdk', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  toErrorMessage: (e: any) => String(e?.message ?? e),
}));
vi.mock('../../../config/database.js', () => ({
  safeQuery: mocks.safeQueryMock,
  tenantSchema: (t: string) => `tenant_${t}`,
}));

import { handleFoundationPositionAssigned } from './attestation.subscribers.ts';

const { safeQueryMock } = mocks;

describe('Phase 7 attestation ← foundation.position.holder.assigned', () => {
  beforeEach(() => safeQueryMock.mockReset());

  it('issues attestation records on insert', async () => {
    await handleFoundationPositionAssigned({
      tenantId: 't_1',
      payload: { userId: 'u_1', positionId: 'pos_1' },
    });
    expect(safeQueryMock).toHaveBeenCalledTimes(1);
    const sql = safeQueryMock.mock.calls[0][0] as string;
    expect(sql).toMatch(/INSERT INTO/);
    expect(sql).toMatch(/attestation_records/);
    expect(safeQueryMock.mock.calls[0][1]).toEqual(['u_1', 'pos_1']);
  });

  it('no-op when userId missing', async () => {
    await handleFoundationPositionAssigned({
      tenantId: 't_1',
      payload: { positionId: 'pos_1' },
    });
    expect(safeQueryMock).not.toHaveBeenCalled();
  });

  it('no-op when positionId missing', async () => {
    await handleFoundationPositionAssigned({
      tenantId: 't_1',
      payload: { userId: 'u_1' },
    });
    expect(safeQueryMock).not.toHaveBeenCalled();
  });

  it('no-op when tenantId missing', async () => {
    await handleFoundationPositionAssigned({
      payload: { userId: 'u_1', positionId: 'pos_1' },
    });
    expect(safeQueryMock).not.toHaveBeenCalled();
  });
});
