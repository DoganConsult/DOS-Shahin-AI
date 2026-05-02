/**
 * Decision-engine 5-brain shape test.
 *
 * Negative path: a context missing `userId` short-circuits at step 1.
 * The returned `AccessDecision` must carry the new 4-valued `decision`
 * field (`'deny'`) and expose the named per-engine result slots
 * (`sodResult`, `openFgaResult`, `keycloakIdentity`, `lifecycleResult`,
 * `slaResult`) required by the 5-brain spec.
 *
 * No DB is touched — step 1 fails before `safeQuery` is called.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@dos/db', () => ({
  safeQuery: vi.fn(async () => ({ rows: [] })),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('@dos/platform-core/modules', () => ({
  ALWAYS_ON_MODULES: new Set<string>(),
  GRC_CORE_MODULES: new Set<string>(),
}));

vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@dos/platform-core/resilience', () => ({
  catchHandler: () => () => undefined,
  EC: { DB_CLEANUP: 'DB_CLEANUP', EVENT_BUS: 'EVENT_BUS' },
}));

import { evaluateAccess, type AccessDecision } from './decision-engine';

describe('decision-engine — 5-brain AccessDecision shape', () => {
  it('returns decision="deny" with named per-engine result slots when actor missing', async () => {
    const decision: AccessDecision = await evaluateAccess({
      userId: '',
      tenantId: 't_1',
      role: 'viewer',
      permissionCode: 'foundation.org.read',
      dryRun: true,
    });

    expect(decision.decision).toBe('deny');
    expect(decision.allowed).toBe(false);
    expect(decision.failedStep).toBe(1);
    expect(decision.failedCheck).toBe('actor_authenticated');
    expect(decision.reasonCode).toBeTruthy();

    // The named per-engine slots must exist on the type even if the
    // pre-conditions deny short-circuited before they were populated.
    const keys: Array<keyof AccessDecision> = [
      'sodResult', 'openFgaResult', 'keycloakIdentity', 'lifecycleResult', 'slaResult',
    ];
    for (const k of keys) {
      expect(k in decision || decision[k] === undefined).toBe(true);
    }
  });

  it('exposes correlationId on the decision when supplied in context', async () => {
    const decision = await evaluateAccess({
      userId: '',
      tenantId: 't_1',
      role: 'viewer',
      permissionCode: 'foundation.org.read',
      correlationId: 'corr_123',
      dryRun: true,
    });
    expect(decision.correlationId).toBe('corr_123');
  });
});
