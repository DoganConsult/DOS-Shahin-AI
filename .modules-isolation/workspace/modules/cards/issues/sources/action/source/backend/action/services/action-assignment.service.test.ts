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
  assignAction,
  reassignAction,
  getAssignmentHistory,
  getAssigneeWorkload,
} from './action-assignment.service';

const mockSafeQuery = vi.mocked(safeQuery);

const TENANT = '00000000-0000-0000-0000-000000000001';
const ACTION_ID = '00000000-0000-0000-0000-000000000010';
const USER_A = '00000000-0000-0000-0000-00000000000a';
const USER_B = '00000000-0000-0000-0000-00000000000b';
const ADMIN = '00000000-0000-0000-0000-00000000000c';

// ── assignAction ────────────────────────────────────────────────

describe('assignAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assigns an action item and returns result', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ assigned_to: null }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const result = await assignAction(TENANT, ACTION_ID, USER_A, ADMIN);

    expect(result).toEqual({ actionId: ACTION_ID, assigneeId: USER_A });
    expect(mockSafeQuery).toHaveBeenCalledTimes(3);
  });

  it('throws 404 when action item not found', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    await expect(assignAction(TENANT, ACTION_ID, USER_A, ADMIN))
      .rejects.toMatchObject({ message: 'Action item not found', statusCode: 404 });
  });
});

// ── reassignAction ──────────────────────────────────────────────

describe('reassignAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reassigns to a different user', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ assigned_to: USER_A }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const result = await reassignAction(TENANT, ACTION_ID, USER_B, ADMIN, 'Workload balancing');

    expect(result).toEqual({
      actionId: ACTION_ID,
      newAssigneeId: USER_B,
      previousAssigneeId: USER_A,
    });
  });

  it('throws 404 when action item not found', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    await expect(reassignAction(TENANT, ACTION_ID, USER_B, ADMIN, 'reason'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 when reassigning to the same user', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ assigned_to: USER_A }], rowCount: 1 } as never);

    await expect(reassignAction(TENANT, ACTION_ID, USER_A, ADMIN, 'reason'))
      .rejects.toMatchObject({ statusCode: 400, message: 'Cannot reassign to the same user' });
  });
});

// ── getAssignmentHistory ────────────────────────────────────────

describe('getAssignmentHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns history entries', async () => {
    const mockRows = [
      {
        assignmentId: '1',
        actionId: ACTION_ID,
        previousAssignee: null,
        newAssignee: USER_A,
        assignedBy: ADMIN,
        reason: 'Initial',
        assignedAt: '2026-01-01T00:00:00Z',
      },
    ];
    mockSafeQuery.mockResolvedValueOnce({ rows: mockRows, rowCount: 1 } as never);

    const result = await getAssignmentHistory(TENANT, ACTION_ID);

    expect(result).toEqual(mockRows);
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no history', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await getAssignmentHistory(TENANT, ACTION_ID);

    expect(result).toEqual([]);
  });
});

// ── getAssigneeWorkload ─────────────────────────────────────────

describe('getAssigneeWorkload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns workload entries', async () => {
    const mockRows = [
      { assigneeId: USER_A, openCount: 3, inProgressCount: 2, overdueCount: 1, totalActive: 6 },
    ];
    mockSafeQuery.mockResolvedValueOnce({ rows: mockRows, rowCount: 1 } as never);

    const result = await getAssigneeWorkload(TENANT);

    expect(result).toEqual(mockRows);
  });

  it('returns empty array when no active assignments', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await getAssigneeWorkload(TENANT);

    expect(result).toEqual([]);
  });
});
