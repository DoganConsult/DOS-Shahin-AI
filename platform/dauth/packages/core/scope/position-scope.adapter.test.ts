/**
 * Co-located tests for position-scope.adapter.ts
 * Queries: positions table (reports_to_position_id chain for hierarchy).
 * @owner DAuth
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  resolvePositionScope,
  getPositionHierarchy,
  getSubordinatePositions,
  isWithinPositionScope,
  getPositionDepartment,
  getReportsToPosition,
} from './position-scope.adapter';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('resolvePositionScope', () => {
  it('returns position scope IDs assigned to the user', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ scope_id: 'pos-cfo' }, { scope_id: 'pos-cro' }],
      rowCount: 2,
    });
    const result = await resolvePositionScope('t1', 'user-1');
    expect(result).toEqual(['pos-cfo', 'pos-cro']);
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining("scope_type = 'position'"),
      ['user-1'],
    );
  });

  it('returns empty array when user holds no positions', async () => {
    const result = await resolvePositionScope('t1', 'user-none');
    expect(result).toEqual([]);
  });

  it('queries the correct tenant schema', async () => {
    await resolvePositionScope('acme', 'user-1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('"tenant_acme"'),
      expect.any(Array),
    );
  });
});

describe('getPositionHierarchy', () => {
  it('returns the upward chain of positions via reports_to_position_id', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ position_id: 'pos-mgr' }, { position_id: 'pos-dir' }, { position_id: 'pos-ceo' }],
      rowCount: 3,
    });
    const result = await getPositionHierarchy('t1', 'pos-mgr');
    expect(result).toEqual(['pos-mgr', 'pos-dir', 'pos-ceo']);
  });

  it('returns single position when it is the root', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ position_id: 'pos-ceo' }],
      rowCount: 1,
    });
    const result = await getPositionHierarchy('t1', 'pos-ceo');
    expect(result).toEqual(['pos-ceo']);
  });

  it('returns empty array for nonexistent position', async () => {
    const result = await getPositionHierarchy('t1', 'nonexistent');
    expect(result).toEqual([]);
  });

  it('uses recursive CTE with reports_to_position_id', async () => {
    await getPositionHierarchy('t1', 'pos-1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('RECURSIVE'),
      ['pos-1'],
    );
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('reports_to_position_id'),
      ['pos-1'],
    );
  });
});

describe('getSubordinatePositions', () => {
  it('returns all subordinate positions recursively', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ position_id: 'pos-team-lead' }, { position_id: 'pos-analyst' }],
      rowCount: 2,
    });
    const result = await getSubordinatePositions('t1', 'pos-dir');
    expect(result).toEqual(['pos-team-lead', 'pos-analyst']);
  });

  it('returns empty array when position has no subordinates', async () => {
    const result = await getSubordinatePositions('t1', 'pos-leaf');
    expect(result).toEqual([]);
  });

  it('uses recursive CTE with reports_to_position_id', async () => {
    await getSubordinatePositions('t1', 'pos-1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('RECURSIVE'),
      ['pos-1'],
    );
  });
});

describe('isWithinPositionScope', () => {
  it('returns true when target position is directly assigned', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ scope_id: 'pos-mgr' }],
      rowCount: 1,
    });
    const result = await isWithinPositionScope('t1', 'user-1', 'pos-mgr');
    expect(result).toBe(true);
  });

  it('returns true when target is a subordinate of assigned position', async () => {
    // resolvePositionScope
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ scope_id: 'pos-dir' }],
      rowCount: 1,
    });
    // getSubordinatePositions for pos-dir
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ position_id: 'pos-mgr' }, { position_id: 'pos-analyst' }],
      rowCount: 2,
    });
    const result = await isWithinPositionScope('t1', 'user-1', 'pos-analyst');
    expect(result).toBe(true);
  });

  it('returns false when target is outside position scope', async () => {
    // resolvePositionScope
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ scope_id: 'pos-a' }],
      rowCount: 1,
    });
    // getSubordinatePositions for pos-a
    mockSafeQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    });
    const result = await isWithinPositionScope('t1', 'user-1', 'pos-b');
    expect(result).toBe(false);
  });

  it('returns false when user holds no positions', async () => {
    const result = await isWithinPositionScope('t1', 'user-none', 'pos-mgr');
    expect(result).toBe(false);
  });
});

describe('getPositionDepartment', () => {
  it('returns dept_id for a position', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ dept_id: 'dept-1' }],
      rowCount: 1,
    });
    const result = await getPositionDepartment('t1', 'pos-1');
    expect(result).toBe('dept-1');
  });

  it('returns null when position has no department', async () => {
    const result = await getPositionDepartment('t1', 'pos-orphan');
    expect(result).toBeNull();
  });
});

describe('getReportsToPosition', () => {
  it('returns the reports-to position ID', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ reports_to_position_id: 'pos-dir' }],
      rowCount: 1,
    });
    const result = await getReportsToPosition('t1', 'pos-mgr');
    expect(result).toBe('pos-dir');
  });

  it('returns null when position is at the top', async () => {
    const result = await getReportsToPosition('t1', 'pos-ceo');
    expect(result).toBeNull();
  });
});
