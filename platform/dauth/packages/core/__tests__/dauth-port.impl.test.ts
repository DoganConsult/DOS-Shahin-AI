import { describe, expect, it, vi } from 'vitest';
import { createDAuthPort } from '../dauth-port.impl';
import type {
  DAuthAccessRequest,
  DAuthAccessResult,
  DAuthAuthorityCheck,
  DAuthDelegationContext,
  DAuthPrincipal,
  DAuthSession,
  DAuthSoDResult,
} from '@dos/ports/dauth';

const principal: DAuthPrincipal = {
  userId: 'u-1',
  tenantId: 't-1',
  roles: ['admin'],
  scopes: [],
};

const accessAllow: DAuthAccessResult = {
  decision: 'allow',
  decisionId: 'd-1',
  reasonCodes: ['ROLE_ADMIN'],
  evaluatedAt: '2026-04-22T00:00:00Z',
};

const sodClean: DAuthSoDResult = { conflict: false, ruleCodes: [] };

describe('createDAuthPort — DAuthPort binding', () => {
  it('forwards every call to the corresponding dependency', async () => {
    const validateSession = vi.fn(async (token: string): Promise<DAuthSession | null> =>
      token === 'good'
        ? {
            sessionId: 's-1',
            principal,
            mfaSatisfied: true,
            issuedAt: '2026-04-22T00:00:00Z',
            expiresAt: '2026-04-22T01:00:00Z',
          }
        : null,
    );
    const checkAccess = vi.fn(async (_: DAuthAccessRequest) => accessAllow);
    const checkAuthority = vi.fn(async (_: DAuthAuthorityCheck) => true);
    const getActiveDelegations = vi.fn(
      async (_: DAuthPrincipal): Promise<readonly DAuthDelegationContext[]> => [],
    );
    const evaluateSoD = vi.fn(async () => sodClean);
    const revokeSession = vi.fn(async () => true);

    const port = createDAuthPort({
      validateSession,
      checkAccess,
      checkAuthority,
      getActiveDelegations,
      evaluateSoD,
      revokeSession,
    });

    expect(await port.validateSession('good')).not.toBeNull();
    expect(await port.validateSession('bad')).toBeNull();
    expect(await port.checkAccess({ principal, action: 'read', resource: { type: 'doc' } }))
      .toEqual(accessAllow);
    expect(await port.checkAuthority({ principal, authorityCode: 'APPROVE' })).toBe(true);
    expect(await port.getActiveDelegations(principal)).toEqual([]);
    expect(await port.evaluateSoD(principal, [{ roleCode: 'maker' }])).toEqual(sodClean);
    expect(await port.revokeSession('s-1', 'logout')).toBe(true);

    expect(validateSession).toHaveBeenCalledTimes(2);
    expect(checkAccess).toHaveBeenCalledOnce();
    expect(checkAuthority).toHaveBeenCalledOnce();
    expect(getActiveDelegations).toHaveBeenCalledOnce();
    expect(evaluateSoD).toHaveBeenCalledOnce();
    expect(revokeSession).toHaveBeenCalledOnce();
  });

  it('exposes exactly the surface declared by DAuthPort', () => {
    const port = createDAuthPort({
      validateSession: async () => null,
      checkAccess: async () => accessAllow,
      checkAuthority: async () => false,
      getActiveDelegations: async () => [],
      evaluateSoD: async () => sodClean,
      revokeSession: async () => false,
    });

    expect(Object.keys(port).sort()).toEqual([
      'checkAccess',
      'checkAuthority',
      'evaluateSoD',
      'getActiveDelegations',
      'revokeSession',
      'validateSession',
    ]);
  });
});
