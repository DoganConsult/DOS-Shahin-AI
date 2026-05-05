/**
 * Phase G unit tests for the authz-evaluator port + LegacyClaimAuthzEvaluator
 * + globalThis registry. These pin the contract that dauth-shared middleware
 * relies on — the registry MUST honor the registered evaluator and fall back
 * to the legacy claim impl only when nothing is registered.
 *
 * Plan: docs/plans/need-to-clean-the-swift-trinket.md (Phase G-1)
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  LegacyClaimAuthzEvaluator,
  setAuthzEvaluator,
  getAuthzEvaluator,
  resetAuthzEvaluator,
  type AuthzEvaluationContext,
} from '../dauth-ports/authz-evaluator.port';

const baseCtx = (overrides: Partial<AuthzEvaluationContext> = {}): AuthzEvaluationContext => ({
  userId: 'u1',
  tenantId: 't1',
  role: 'member',
  permissionCode: 'risk.record.read',
  ...overrides,
});

describe('LegacyClaimAuthzEvaluator', () => {
  const evaluator = new LegacyClaimAuthzEvaluator();

  it('allows super-admins regardless of claims', async () => {
    const v = await evaluator.evaluate(baseCtx({ isSuperAdmin: true }));
    expect(v.decision).toBe('allow');
    expect(v.reasonCode).toBe('LEGACY_SUPER_ADMIN');
    expect(v.source).toBe('legacy-claim');
  });

  it('allows when the exact permission is in claimed roles', async () => {
    const v = await evaluator.evaluate(baseCtx({ roles: ['risk.record.read'] }));
    expect(v.decision).toBe('allow');
    expect(v.reasonCode).toBe('LEGACY_CLAIM_MATCH');
    expect(v.matchedRoles).toContain('risk.record.read');
  });

  it('allows on wildcard prefix match', async () => {
    const v = await evaluator.evaluate(baseCtx({ roles: ['risk.*'] }));
    expect(v.decision).toBe('allow');
    expect(v.reasonCode).toBe('LEGACY_CLAIM_WILDCARD');
    expect(v.matchedRoles).toEqual(['risk.*']);
  });

  it('allows on global wildcard *', async () => {
    const v = await evaluator.evaluate(baseCtx({ roles: ['*'] }));
    expect(v.decision).toBe('allow');
    expect(v.reasonCode).toBe('LEGACY_CLAIM_MATCH');
  });

  it('denies when no claim covers the permission', async () => {
    const v = await evaluator.evaluate(baseCtx({ roles: ['policy.record.read'] }));
    expect(v.decision).toBe('deny');
    expect(v.reasonCode).toBe('LEGACY_NO_MATCH');
  });

  it('preserves the correlationId on every verdict', async () => {
    const cid = 'corr-abc';
    const verdicts = await Promise.all([
      evaluator.evaluate(baseCtx({ correlationId: cid, isSuperAdmin: true })),
      evaluator.evaluate(baseCtx({ correlationId: cid, roles: ['risk.*'] })),
      evaluator.evaluate(baseCtx({ correlationId: cid, roles: [] })),
    ]);
    for (const v of verdicts) {
      expect(v.correlationId).toBe(cid);
    }
  });
});

describe('authz-evaluator registry', () => {
  beforeEach(() => {
    resetAuthzEvaluator();
  });

  it('returns the LegacyClaimAuthzEvaluator by default', () => {
    const e = getAuthzEvaluator();
    expect(e.name).toBe('legacy-claim');
  });

  it('honors a registered custom evaluator', async () => {
    const custom = {
      name: 'custom' as const,
      async evaluate() {
        return {
          decision: 'allow' as const,
          reasonCode: 'CUSTOM_PASS',
          source: 'custom' as const,
        };
      },
    };
    setAuthzEvaluator(custom);
    const e = getAuthzEvaluator();
    expect(e.name).toBe('custom');
    const v = await e.evaluate(baseCtx());
    expect(v.reasonCode).toBe('CUSTOM_PASS');
  });

  it('reset returns to default after a custom evaluator', () => {
    setAuthzEvaluator({ name: 'custom', async evaluate() { return { decision: 'deny', reasonCode: 'X', source: 'custom' }; } });
    expect(getAuthzEvaluator().name).toBe('custom');
    resetAuthzEvaluator();
    expect(getAuthzEvaluator().name).toBe('legacy-claim');
  });
});
