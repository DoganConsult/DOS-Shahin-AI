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
  setDueDate,
  extendDueDate,
  checkOverdue,
  getUpcomingDeadlines,
} from './action-duedate.service';

const mockSafeQuery = vi.mocked(safeQuery);

const TENANT = '00000000-0000-0000-0000-000000000001';
const ACTION_ID = '00000000-0000-0000-0000-000000000010';
const ADMIN = '00000000-0000-0000-0000-00000000000c';

// ── setDueDate ──────────────────────────────────────────────────

describe('setDueDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets due date and returns result', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ deadline: null }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const deadline = '2026-06-01T00:00:00Z';
    const result = await setDueDate(TENANT, ACTION_ID, deadline, ADMIN);

    expect(result).toEqual({ actionId: ACTION_ID, deadline });
    expect(mockSafeQuery).toHaveBeenCalledTimes(2);
  });

  it('throws 404 when action item not found', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    await expect(setDueDate(TENANT, ACTION_ID, '2026-06-01T00:00:00Z', ADMIN))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 for invalid date', async () => {
    await expect(setDueDate(TENANT, ACTION_ID, 'not-a-date', ADMIN))
      .rejects.toMatchObject({ statusCode: 400, message: 'Invalid deadline date' });
  });
});

// ── extendDueDate ───────────────────────────────────────────────

describe('extendDueDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extends due date when new date is after current', async () => {
    mockSafeQuery
      .mockResolvedValueOnce({ rows: [{ deadline: '2026-05-01T00:00:00Z' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const newDeadline = '2026-07-01T00:00:00Z';
    const result = await extendDueDate(TENANT, ACTION_ID, newDeadline, ADMIN, 'Scope change');

    expect(result).toEqual({
      actionId: ACTION_ID,
      previousDeadline: '2026-05-01T00:00:00Z',
      newDeadline,
    });
  });

  it('throws 404 when action item not found', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    await expect(extendDueDate(TENANT, ACTION_ID, '2026-07-01T00:00:00Z', ADMIN, 'reason'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 400 when new deadline is not after current', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ deadline: '2026-08-01T00:00:00Z' }],
      rowCount: 1,
    } as never);

    await expect(extendDueDate(TENANT, ACTION_ID, '2026-07-01T00:00:00Z', ADMIN, 'reason'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 for invalid date', async () => {
    await expect(extendDueDate(TENANT, ACTION_ID, 'bad-date', ADMIN, 'reason'))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

// ── checkOverdue ────────────────────────────────────────────────

describe('checkOverdue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns overdue entries with daysOverdue calculated', async () => {
    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        action_id: ACTION_ID,
        title: 'Fix bug',
        deadline: pastDate,
        assigned_to: ADMIN,
        status: 'in_progress',
        criticality: 'high',
      }],
      rowCount: 1,
    } as never);

    const result = await checkOverdue(TENANT);

    expect(result).toHaveLength(1);
    expect(result[0].actionId).toBe(ACTION_ID);
    expect(result[0].daysOverdue).toBeGreaterThanOrEqual(2);
  });

  it('returns empty array when nothing is overdue', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await checkOverdue(TENANT);

    expect(result).toEqual([]);
  });
});

// ── getUpcomingDeadlines ────────────────────────────────────────

describe('getUpcomingDeadlines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns upcoming deadline entries', async () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        action_id: ACTION_ID,
        title: 'Submit report',
        deadline: futureDate,
        assigned_to: ADMIN,
        status: 'in_progress',
        criticality: 'medium',
      }],
      rowCount: 1,
    } as never);

    const result = await getUpcomingDeadlines(TENANT, 7);

    expect(result).toHaveLength(1);
    expect(result[0].actionId).toBe(ACTION_ID);
    expect(result[0].hoursRemaining).toBeGreaterThan(0);
  });

  it('returns empty array when no upcoming deadlines', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const result = await getUpcomingDeadlines(TENANT, 7);

    expect(result).toEqual([]);
  });

  it('throws 400 for negative withinDays', async () => {
    await expect(getUpcomingDeadlines(TENANT, -1))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});
