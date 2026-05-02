/**
 * Co-located tests for ownership-scope.adapter.ts
 * Queries grc_ownership_matrix view for entity ownership resolution.
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
  resolveOwnershipScope,
  isEntityOwner,
  isPrimaryOwner,
  getEntityOwners,
  getOwnedEntityIds,
} from './ownership-scope.adapter';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('resolveOwnershipScope', () => {
  it('returns ownership records for the user filtered by entity type', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { entity_type: 'risk', entity_id: 'risk-1', user_id: 'user-1', ownership_type: 'accountable', is_primary: true, primary_team_id: 'team-1', dept_id: null },
        { entity_type: 'risk', entity_id: 'risk-2', user_id: 'user-1', ownership_type: 'responsible', is_primary: false, primary_team_id: null, dept_id: 'dept-1' },
      ],
      rowCount: 2,
    });
    const result = await resolveOwnershipScope('t1', 'user-1', 'risk');
    expect(result).toHaveLength(2);
    expect(result[0].entityId).toBe('risk-1');
    expect(result[0].isPrimary).toBe(true);
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('grc_ownership_matrix'),
      ['user-1', 'risk'],
    );
  });

  it('returns empty array when user owns no entities of that type', async () => {
    const result = await resolveOwnershipScope('t1', 'user-1', 'control');
    expect(result).toEqual([]);
  });

  it('uses correct tenant schema', async () => {
    await resolveOwnershipScope('acme', 'user-1', 'risk');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('"tenant_acme"'),
      expect.any(Array),
    );
  });
});

describe('isEntityOwner', () => {
  it('returns true when user owns the specific entity', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 });
    const result = await isEntityOwner('t1', 'user-1', 'risk', 'risk-1');
    expect(result).toBe(true);
  });

  it('returns false when user does not own the entity', async () => {
    const result = await isEntityOwner('t1', 'user-1', 'risk', 'risk-99');
    expect(result).toBe(false);
  });

  it('passes all four parameters to the query', async () => {
    await isEntityOwner('t1', 'u1', 'control', 'c1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('entity_id'),
      ['u1', 'control', 'c1'],
    );
  });
});

describe('isPrimaryOwner', () => {
  it('returns true when user is the primary owner', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 });
    const result = await isPrimaryOwner('t1', 'user-1', 'risk', 'risk-1');
    expect(result).toBe(true);
  });

  it('returns false when user is not the primary owner', async () => {
    const result = await isPrimaryOwner('t1', 'user-1', 'risk', 'risk-1');
    expect(result).toBe(false);
  });
});

describe('getEntityOwners', () => {
  it('returns owners with ownership type and primary flag', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { user_id: 'u-1', ownership_type: 'accountable', is_primary: true },
        { user_id: 'u-2', ownership_type: 'responsible', is_primary: false },
      ],
      rowCount: 2,
    });
    const result = await getEntityOwners('t1', 'risk', 'risk-1');
    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe('u-1');
    expect(result[0].isPrimary).toBe(true);
  });

  it('returns empty array when entity has no owners', async () => {
    const result = await getEntityOwners('t1', 'risk', 'risk-orphan');
    expect(result).toEqual([]);
  });

  it('passes entity_type and entity_id as query parameters', async () => {
    await getEntityOwners('t1', 'control', 'c1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('entity_type = $1'),
      ['control', 'c1'],
    );
  });
});

describe('getOwnedEntityIds', () => {
  it('returns just entity IDs for a specific type', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { entity_type: 'control', entity_id: 'c1', user_id: 'u1', ownership_type: 'accountable', is_primary: true, primary_team_id: null, dept_id: null },
        { entity_type: 'control', entity_id: 'c2', user_id: 'u1', ownership_type: 'responsible', is_primary: false, primary_team_id: null, dept_id: null },
      ],
      rowCount: 2,
    });
    const result = await getOwnedEntityIds('t1', 'u1', 'control');
    expect(result).toEqual(['c1', 'c2']);
  });
});
