import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────

vi.mock('../ports/database.port', () => ({
  safeQuery: vi.fn(),
  tenantSchema: (tenantId: string) => `tenant_${tenantId}`,
  query: vi.fn(),
}));

vi.mock('../ports/logger.port', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../ports/audit.port', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../ports/events.port', () => ({
  emitEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@dos/platform-core/resilience', () => ({
  catchHandler: () => () => undefined,
  EC: { EVENT_BUS: 'EVENT_BUS' },
}));

import { safeQuery } from '../ports/database.port';
import {
  getCompletionStatus,
  validateCompletionReadiness,
  recordVerification,
} from './action-completion.service';

const mockSafeQuery = vi.mocked(safeQuery);

const TENANT = '00000000-0000-0000-0000-000000000001';
const ACTION_ID = '00000000-0000-0000-0000-000000000010';
const USER_A = '00000000-0000-0000-0000-00000000000a';
const USER_B = '00000000-0000-0000-0000-00000000000b';

// ── getCompletionStatus ─────────────────────────────────────────

describe('getCompletionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns completion status with evidence count', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({
        rows: [{
          action_id: ACTION_ID,
          status: 'completed',
          completed_by: USER_A,
          verified_by: null,
          verified_at: null,
          completed_at: '2026-01-10T00:00:00Z',
          verification_required: true,
          verification_method: 'manual',
          progress_percentage: 100,
        }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [{ count: 3 }], rowCount: 1 } as never);

    const result = await getCompletionStatus(TENANT, ACTION_ID);

    expect(result.actionId).toBe(ACTION_ID);
    expect(result.status).toBe('completed');
    expect(result.evidenceCount).toBe(3);
    expect(result.verificationRequired).toBe(true);
    expect(result.progressPercent).toBe(100);
  });

  it('throws 404 when action item not found', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    await expect(getCompletionStatus(TENANT, ACTION_ID))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('defaults evidence count to 0 on query failure', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({
        rows: [{
          action_id: ACTION_ID,
          status: 'in_progress',
          completed_by: null,
          verified_by: null,
          verified_at: null,
          completed_at: null,
          verification_required: false,
          verification_method: null,
          progress_percentage: 50,
        }],
        rowCount: 1,
      } as never)
      .mockRejectedValueOnce(new Error('table missing'));

    const result = await getCompletionStatus(TENANT, ACTION_ID);

    expect(result.evidenceCount).toBe(0);
  });
});

// ── validateCompletionReadiness ─────────────────────────────────

describe('validateCompletionReadiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ready when all conditions met', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({
        rows: [{ status: 'in_progress', assigned_to: USER_A, verification_required: false }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [{ count: 0 }], rowCount: 1 } as never);

    const result = await validateCompletionReadiness(TENANT, ACTION_ID);

    expect(result.ready).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('returns not ready when status is not in_progress', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({
        rows: [{ status: 'open', assigned_to: USER_A, verification_required: false }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [{ count: 0 }], rowCount: 1 } as never);

    const result = await validateCompletionReadiness(TENANT, ACTION_ID);

    expect(result.ready).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('returns not ready when no assigned user', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({
        rows: [{ status: 'in_progress', assigned_to: null, verification_required: false }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [{ count: 0 }], rowCount: 1 } as never);

    const result = await validateCompletionReadiness(TENANT, ACTION_ID);

    expect(result.ready).toBe(false);
    expect(result.reasons).toContain('Action item has no assigned user');
  });

  it('returns not ready when verification required but no evidence', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({
        rows: [{ status: 'in_progress', assigned_to: USER_A, verification_required: true }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [{ count: 0 }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ count: 0 }], rowCount: 1 } as never);

    const result = await validateCompletionReadiness(TENANT, ACTION_ID);

    expect(result.ready).toBe(false);
    expect(result.reasons).toContain('Verification is required but no evidence has been attached');
  });

  it('returns not ready when item not found', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await validateCompletionReadiness(TENANT, ACTION_ID);

    expect(result.ready).toBe(false);
    expect(result.reasons).toContain('Action item not found');
  });
});

// ── recordVerification ──────────────────────────────────────────

describe('recordVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records verification for a completed action', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({
        rows: [{ status: 'completed', completed_by: USER_A }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({
        rows: [{ verified_at: '2026-01-15T12:00:00Z' }],
        rowCount: 1,
      } as never);

    const result = await recordVerification(TENANT, ACTION_ID, USER_B);

    expect(result.actionId).toBe(ACTION_ID);
    expect(result.verifiedBy).toBe(USER_B);
    expect(result.verifiedAt).toBe('2026-01-15T12:00:00Z');
  });

  it('throws 404 when action item not found', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    await expect(recordVerification(TENANT, ACTION_ID, USER_B))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 when action is not in completed status', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ status: 'open', completed_by: null }],
      rowCount: 1,
    } as never);

    await expect(recordVerification(TENANT, ACTION_ID, USER_B))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when verifier is the same as completer (SoD)', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ status: 'completed', completed_by: USER_A }],
      rowCount: 1,
    } as never);

    await expect(recordVerification(TENANT, ACTION_ID, USER_A))
      .rejects.toMatchObject({
        statusCode: 400,
        message: 'Verifier must be different from the person who completed the item',
      });
  });
});
