/**
 * H-1.5 — access-snapshot integration test against a live DB.
 *
 * Verifies GET /api/foundation/access-snapshot composes Foundation
 * hierarchy data (org-scope, manager-chain, current position) into the
 * unified shape the FE consumes. The 9 required keys must be present.
 *
 * Plan: docs/plans/need-to-clean-the-swift-trinket.md (Phase H-1)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import {
  isDbReachable,
  seedFoundationFixture,
  cleanupFoundationFixture,
  TEST_TENANT_ID,
  SEED_IDS,
} from '../_lib/seed-tenant';
import { getTestApp } from '../_lib/test-app';

let dbAvailable = false;

beforeAll(async () => {
  dbAvailable = await isDbReachable();
  if (!dbAvailable) {
    console.warn('[H-1] DATABASE_URL not reachable — skipping access-snapshot integration tests');
    return;
  }
  await seedFoundationFixture();
});

afterAll(async () => {
  if (dbAvailable) await cleanupFoundationFixture();
});

const REQUIRED_KEYS = [
  'actor',
  'currentPosition',
  'currentRoleProfile',
  'orgScope',
  'managerChain',
  'pendingApprovals',
  'deniedActions',
  'inheritedPolicies',
  'audit',
];

describe('GET /api/foundation/access-snapshot', () => {
  it('returns the unified snapshot with all 9 required keys', async () => {
    if (!dbAvailable) return;
    const app = await getTestApp();
    const res = await request(app)
      .get('/api/foundation/access-snapshot')
      .set('x-test-tenant-id', TEST_TENANT_ID)
      .set('x-test-user-id', SEED_IDS.testUserId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const snap = res.body.data;
    for (const key of REQUIRED_KEYS) {
      expect(snap, `missing key: ${key}`).toHaveProperty(key);
    }

    // Actor block
    expect(snap.actor.userId).toBe(SEED_IDS.testUserId);
    expect(snap.actor.tenantId).toBe(TEST_TENANT_ID);

    // Current position is the seeded primary
    expect(snap.currentPosition.position_id).toBe(SEED_IDS.seniorEngPositionId);
    expect(snap.currentPosition.code).toBe('SR_ENG');

    // Org scope picked up Tech BU + HQ ancestor
    expect(snap.orgScope.businessUnits.length).toBe(2);
    expect(snap.orgScope.organizations.length).toBeGreaterThanOrEqual(1);

    // Manager chain depth 3 (Senior Eng → CTO → CEO)
    expect(snap.managerChain.length).toBe(3);

    // Audit metadata
    expect(typeof snap.audit.snapshotGeneratedAt).toBe('string');
    expect(typeof snap.audit.correlationId).toBe('string');
    expect(snap.audit.correlationId.length).toBeGreaterThan(0);
  });

  it('echoes the caller correlation id when supplied', async () => {
    if (!dbAvailable) return;
    const app = await getTestApp();
    const corrId = 'corr-test-h1-5';
    const res = await request(app)
      .get('/api/foundation/access-snapshot')
      .set('x-test-tenant-id', TEST_TENANT_ID)
      .set('x-test-user-id', SEED_IDS.testUserId)
      .set('x-correlation-id', corrId);

    expect(res.status).toBe(200);
    expect(res.body.data.audit.correlationId).toBe(corrId);
  });

  it('admin-route /:userId returns another user\'s snapshot when scoped', async () => {
    if (!dbAvailable) return;
    const app = await getTestApp();
    const res = await request(app)
      .get(`/api/foundation/access-snapshot/${SEED_IDS.testManagerId}`)
      .set('x-test-tenant-id', TEST_TENANT_ID)
      .set('x-test-user-id', SEED_IDS.testCeoId)
      .set('x-test-is-super-admin', 'true');

    expect(res.status).toBe(200);
    const snap = res.body.data;
    // Subject is the manager (CTO holder), regardless of caller.
    expect(snap.actor.userId).toBe(SEED_IDS.testManagerId);
    expect(snap.currentPosition.position_id).toBe(SEED_IDS.ctoPositionId);
    // Manager chain for testManager (CTO) is CTO → CEO. Depth 2.
    expect(snap.managerChain).toHaveLength(2);
  });

  it('returns null currentPosition for a user with no assignment', async () => {
    if (!dbAvailable) return;
    const app = await getTestApp();
    const res = await request(app)
      .get('/api/foundation/access-snapshot/u-no-assignment')
      .set('x-test-tenant-id', TEST_TENANT_ID)
      .set('x-test-user-id', SEED_IDS.testCeoId)
      .set('x-test-is-super-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.data.currentPosition).toBeNull();
    expect(res.body.data.managerChain).toEqual([]);
  });
});
