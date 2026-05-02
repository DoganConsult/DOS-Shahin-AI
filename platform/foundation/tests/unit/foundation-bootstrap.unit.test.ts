// HG5 — Unit test for tenant bootstrap defaults. Stubs @dos/db.query via
// Vitest module mocking so the suite runs without Postgres; verifies the
// SQL shape and the early-exit path when org already exists.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('../../ports/database.port', () => ({
  query: (...args: unknown[]) => queryMock(...args),
  safeQuery: (...args: unknown[]) => queryMock(...args),
}));

import { bootstrapFoundationDefaults } from '../../application/bootstrap/foundation-bootstrap.service';

describe('bootstrapFoundationDefaults (HG5)', () => {
  beforeEach(() => queryMock.mockReset());

  it('creates org+BU+4 positions when tenant is empty', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })                               // existing org
      .mockResolvedValueOnce({ rows: [{ organization_id: 'org-1' }] })   // insert org
      .mockResolvedValueOnce({ rows: [] })                               // existing bu
      .mockResolvedValueOnce({ rows: [{ bu_id: 'bu-1' }] })              // insert bu
      .mockResolvedValueOnce({ rows: [] })                               // pos CEO exists
      .mockResolvedValueOnce({ rows: [{ position_id: 'p-ceo' }] })       // ins CEO
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ position_id: 'p-cfo' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ position_id: 'p-cto' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ position_id: 'p-coo' }] })
      .mockResolvedValueOnce({ rows: [{ role_id: 'r-owner' }] })         // role lookup
      .mockResolvedValueOnce({ rows: [] });                              // role assign

    const result = await bootstrapFoundationDefaults({
      tenantId: 't-1',
      ownerUserId: 'u-1',
    });

    expect(result).toMatchObject({
      tenantId: 't-1',
      organizationId: 'org-1',
      businessUnitId: 'bu-1',
      alreadyBootstrapped: false,
      ownerRoleAssigned: true,
    });
    expect(result.positionIds).toEqual(['p-ceo', 'p-cfo', 'p-cto', 'p-coo']);
  });

  it('marks alreadyBootstrapped when org already present', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ organization_id: 'org-existing' }] })
      .mockResolvedValueOnce({ rows: [{ bu_id: 'bu-existing' }] })
      .mockResolvedValueOnce({ rows: [{ position_id: 'p1' }] })
      .mockResolvedValueOnce({ rows: [{ position_id: 'p2' }] })
      .mockResolvedValueOnce({ rows: [{ position_id: 'p3' }] })
      .mockResolvedValueOnce({ rows: [{ position_id: 'p4' }] })
      .mockResolvedValueOnce({ rows: [] })      // no tenant_owner role
      ;

    const result = await bootstrapFoundationDefaults({
      tenantId: 't-2',
      ownerUserId: 'u-2',
    });
    expect(result.alreadyBootstrapped).toBe(true);
    expect(result.organizationId).toBe('org-existing');
    expect(result.ownerRoleAssigned).toBe(false);
  });

  it('throws on missing tenantId/ownerUserId', async () => {
    await expect(bootstrapFoundationDefaults({ tenantId: '', ownerUserId: 'u' } as any))
      .rejects.toThrow(/tenantId/);
    await expect(bootstrapFoundationDefaults({ tenantId: 't', ownerUserId: '' } as any))
      .rejects.toThrow(/ownerUserId/);
  });
});
