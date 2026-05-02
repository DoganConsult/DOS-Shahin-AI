import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (tenantId: string) => `tenant_${tenantId}`,
}));

import {
  resolveExternalScope,
  isWithinExternalScope,
  hasExternalPermission,
  getExternalEntityIds,
} from './external-scope.adapter';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ExternalScopeAdapter', () => {
  it('resolveExternalScope returns all grants for a user', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { scope_id: 's-1', user_id: 'u-ext', role: 'auditor', entity_type: 'risk_record', entity_id: 'r-1', permissions: ['read'] },
        { scope_id: 's-2', user_id: 'u-ext', role: 'auditor', entity_type: 'control', entity_id: 'c-1', permissions: ['read', 'comment'] },
      ],
    });
    const scopes = await resolveExternalScope('t-001', 'u-ext');
    expect(scopes).toHaveLength(2);
    expect(scopes[0].entityType).toBe('risk_record');
    expect(scopes[1].permissions).toEqual(['read', 'comment']);
  });

  it('resolveExternalScope returns empty array when no grants', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    const scopes = await resolveExternalScope('t-001', 'u-ext');
    expect(scopes).toEqual([]);
  });

  it('resolveExternalScope handles null permissions as empty array', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ scope_id: 's-1', user_id: 'u-ext', role: 'vendor', entity_type: 'engagement', entity_id: 'e-1', permissions: null }],
    });
    const scopes = await resolveExternalScope('t-001', 'u-ext');
    expect(scopes[0].permissions).toEqual([]);
  });

  it('isWithinExternalScope returns true when grant exists', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const result = await isWithinExternalScope('t-001', 'u-ext', 'risk_record', 'r-1');
    expect(result).toBe(true);
  });

  it('isWithinExternalScope returns false when no grant', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    const result = await isWithinExternalScope('t-001', 'u-ext', 'risk_record', 'r-99');
    expect(result).toBe(false);
  });

  it('hasExternalPermission returns true when permission exists', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ permissions: ['read', 'comment'] }] });
    const result = await hasExternalPermission('t-001', 'u-ext', 'control', 'c-1', 'read');
    expect(result).toBe(true);
  });

  it('hasExternalPermission returns false when permission missing', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ permissions: ['read'] }] });
    const result = await hasExternalPermission('t-001', 'u-ext', 'control', 'c-1', 'write');
    expect(result).toBe(false);
  });

  it('hasExternalPermission returns false when no scope grant exists', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    const result = await hasExternalPermission('t-001', 'u-ext', 'control', 'c-99', 'read');
    expect(result).toBe(false);
  });

  it('getExternalEntityIds returns all entities of a type', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ entity_id: 'r-1' }, { entity_id: 'r-2' }, { entity_id: 'r-3' }],
    });
    const ids = await getExternalEntityIds('t-001', 'u-ext', 'risk_record');
    expect(ids).toEqual(['r-1', 'r-2', 'r-3']);
  });

  it('uses correct tenant schema in queries', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });
    await resolveExternalScope('my-tenant', 'u-ext');
    expect(mockSafeQuery.mock.calls[0][0]).toContain('tenant_my-tenant');
  });
});
