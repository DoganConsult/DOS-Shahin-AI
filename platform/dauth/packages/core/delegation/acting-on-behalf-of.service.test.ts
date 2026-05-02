/**
 * Co-located tests for DAuth acting-on-behalf-of.service.
 * Covers: resolveActingContext, evaluateDelegatedAccess.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

const mockEvaluateAccess = vi.fn();
vi.mock('../access/decision-engine', () => ({
  evaluateAccess: (...args: unknown[]) => mockEvaluateAccess(...args),
}));

const mockLogAuthDecision = vi.fn();
vi.mock('../audit/decision-log.service', () => ({
  logAuthDecision: (...args: unknown[]) => mockLogAuthDecision(...args),
}));

const mockPublish = vi.fn();
vi.mock('../../dos/events/event-bus', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockGetActor = vi.fn();
vi.mock('../actor/actor-registry', () => ({
  getActor: (...args: unknown[]) => mockGetActor(...args),
}));

import {
  resolveActingContext,
  evaluateDelegatedAccess,
} from './acting-on-behalf-of.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockLogAuthDecision.mockResolvedValue(undefined);
  mockPublish.mockResolvedValue(undefined);
  mockGetActor.mockResolvedValue({ actorId: 'a1', isActive: true });
});

/* ------------------------------------------------------------------ */
/*  resolveActingContext                                                */
/* ------------------------------------------------------------------ */
describe('resolveActingContext', () => {
  it('returns context when a valid, non-expired grant exists', async () => {
    const expiresAt = new Date('2026-12-31T00:00:00Z');
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        grant_id: 'g1',
        user_id: 'principal-1',
        agent_id: 'delegate-1',
        scopes: ['risk', 'audit'],
        expires_at: expiresAt,
      }],
    });

    const ctx = await resolveActingContext('t1', 'delegate-1', 'g1');

    expect(ctx).not.toBeNull();
    expect(ctx!.delegateId).toBe('delegate-1');
    expect(ctx!.principalId).toBe('principal-1');
    expect(ctx!.grantId).toBe('g1');
    expect(ctx!.scopes).toEqual(['risk', 'audit']);
    expect(ctx!.tenantId).toBe('t1');
  });

  it('returns null when grant not found', async () => {
    const ctx = await resolveActingContext('t1', 'delegate-1', 'nonexistent');
    expect(ctx).toBeNull();
  });

  it('returns null when grant is revoked or expired (DB handles filtering)', async () => {
    // The SQL filters for revoked_at IS NULL AND expires_at > NOW()
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });

    const ctx = await resolveActingContext('t1', 'delegate-1', 'expired-grant');
    expect(ctx).toBeNull();
  });

  it('passes correct SQL parameters', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [] });

    await resolveActingContext('t1', 'del-5', 'grant-7');

    const [sql, params] = mockSafeQuery.mock.calls[0];
    expect(sql).toContain('grant_id = $1');
    expect(sql).toContain('revoked_at IS NULL');
    expect(sql).toContain('expires_at > NOW()');
    expect(params).toEqual(['grant-7', 'del-5']);
  });

  it('handles null scopes gracefully', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{
        grant_id: 'g2', user_id: 'p1', agent_id: 'd1',
        scopes: null, expires_at: null,
      }],
    });

    const ctx = await resolveActingContext('t1', 'd1', 'g2');

    expect(ctx!.scopes).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  evaluateDelegatedAccess                                            */
/* ------------------------------------------------------------------ */
describe('evaluateDelegatedAccess', () => {
  const baseCtx = {
    delegateId: 'delegate-1',
    principalId: 'principal-1',
    tenantId: 't1',
    grantId: 'g1',
    scopes: ['risk'],
    expiresAt: '2026-12-31T00:00:00Z',
  };

  it('allows access when scope matches and principal has permission', async () => {
    mockEvaluateAccess.mockResolvedValueOnce({ allowed: true, reason: 'role_match' });

    const result = await evaluateDelegatedAccess(baseCtx, 'risk.item.read', 'risk');

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('delegated_access_granted');
    expect(mockPublish).toHaveBeenCalledWith(
      'dauth.delegation.action_executed', 't1',
      expect.objectContaining({
        grantId: 'g1',
        delegateId: 'delegate-1',
        principalId: 'principal-1',
        permissionCode: 'risk.item.read',
      }),
    );
  });

  it('denies access when scope does not match', async () => {
    const ctx = { ...baseCtx, scopes: ['audit'] };

    const result = await evaluateDelegatedAccess(ctx, 'risk.item.read', 'risk');

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('delegation_scope_mismatch');
    expect(mockLogAuthDecision).toHaveBeenCalledWith('t1', expect.objectContaining({
      decision: 'deny',
      reason: 'delegation_scope_mismatch',
    }));
    expect(mockEvaluateAccess).not.toHaveBeenCalled();
  });

  it('denies access when principal lacks the permission', async () => {
    mockEvaluateAccess.mockResolvedValueOnce({ allowed: false, reason: 'no_matching_role' });

    const result = await evaluateDelegatedAccess(baseCtx, 'risk.item.delete', 'risk');

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('principal_lacks_permission');
    expect(result.reason).toContain('no_matching_role');
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('allows access when scope is wildcard (*)', async () => {
    const ctx = { ...baseCtx, scopes: ['*'] };
    mockEvaluateAccess.mockResolvedValueOnce({ allowed: true, reason: 'super_admin' });

    const result = await evaluateDelegatedAccess(ctx, 'finance.budget.approve', 'finance');

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('delegated_access_granted');
  });

  it('swallows publish errors without failing', async () => {
    mockEvaluateAccess.mockResolvedValueOnce({ allowed: true, reason: 'ok' });
    mockPublish.mockRejectedValueOnce(new Error('bus down'));

    const result = await evaluateDelegatedAccess(baseCtx, 'risk.item.read', 'risk');

    // Should still return allowed because publish failure is caught
    expect(result.allowed).toBe(true);
  });
});
