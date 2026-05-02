/**
 * 5-Brain decision-shape contract test.
 *
 * Verifies that the auth-service `FullAccessSnapshot` carries the named
 * per-brain sub-objects required by the 5-brain spec (Foundation =
 * organization, DAuth = authority, DOS = lifecycle/SLA). Identity
 * (Keycloak) and relationship (OpenFGA) results are surfaced on the
 * `AccessDecision` type, validated by the dauth-core unit suite.
 *
 * This test enforces structural assignability — a fully-populated
 * snapshot including the new sub-objects must satisfy the published
 * type without casts. Positive end-to-end coverage of the decision
 * pipeline lives in the dauth-core package's own test suite where the
 * full set of `@dos/platform-core/*` subpath aliases are available.
 */
import { describe, it, expect } from 'vitest';
import type { FullAccessSnapshot } from '../../services/auth-service/src/domain/contracts/access-snapshot.contract';

describe('5-brain — FullAccessSnapshot contract', () => {
  it('accepts foundation + authority + lifecycle sub-objects', () => {
    const snap: FullAccessSnapshot = {
      actor: { userId: 'u', email: '', displayName: '', actorType: 'human', identityPosture: 'password', mfaVerified: false },
      tenant: { tenantId: 't', tenantStatus: 'active', plan: 'standard', membershipStatus: 'active', membershipType: 'member', joinedAt: '' },
      accessProfiles: [],
      functionalRoles: [],
      effectivePermissions: [],
      scopeBindings: [],
      decisionAuthorities: [],
      allowedModules: [],
      allowedProducts: [],
      allowedDashboards: [],
      landingHint: { landingPage: '/', fallbackPage: '/' },
      audit: { snapshotGeneratedAt: '', correlationId: '', cacheHit: false, evaluationDurationMs: 0 },
      foundation: {
        primaryPositionId: 'pos_1',
        primaryPositionTitle: 'AP Clerk',
        managerChain: [{ positionId: 'pos_2', userId: 'u_mgr', title: 'Controller' }],
        inheritedPolicies: ['policy.security.baseline'],
      },
      authority: {
        pendingApprovals: [{
          taskId: 'task_1',
          permissionCode: 'invoice.approve',
          requestedAt: new Date().toISOString(),
        }],
        recentDenials: [{
          permissionCode: 'invoice.approve',
          reasonCode: 'SOD_VIOLATION',
          occurredAt: new Date().toISOString(),
        }],
      },
      lifecycle: {
        slaBreaches: [{
          policyCode: 'invoice.review.sla',
          entityType: 'invoice',
          entityId: 'inv_1',
          dueAt: new Date().toISOString(),
          status: 'breach',
        }],
        escalations: [],
      },
    };
    expect(snap.foundation?.primaryPositionId).toBe('pos_1');
    expect(snap.authority?.pendingApprovals.length).toBe(1);
    expect(snap.lifecycle?.slaBreaches[0]?.status).toBe('breach');
  });
});
