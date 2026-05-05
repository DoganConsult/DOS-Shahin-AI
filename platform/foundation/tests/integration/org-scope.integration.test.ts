/**
 * H-1.3 — org-scope integration test against a live DB.
 *
 * Verifies GET /api/foundation/org-scope returns the user's primary
 * position, BU ancestor chain, and organization ancestor chain — all
 * derived from dos.* (Foundation's source of truth).
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
    console.warn('[H-1] DATABASE_URL not reachable — skipping org-scope integration tests');
    return;
  }
  await seedFoundationFixture();
});

afterAll(async () => {
  if (dbAvailable) await cleanupFoundationFixture();
});

describe('GET /api/foundation/org-scope', () => {
  it('returns the caller\'s scope with primary position + BU + org ancestor chains', async () => {
    if (!dbAvailable) return;
    const app = await getTestApp();
    const res = await request(app)
      .get('/api/foundation/org-scope')
      .set('x-test-tenant-id', TEST_TENANT_ID)
      .set('x-test-user-id', SEED_IDS.testUserId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const scope = res.body.data;

    // Primary position is Senior Engineer
    expect(scope.primaryPosition).toBeTruthy();
    expect(scope.primaryPosition.position_id).toBe(SEED_IDS.seniorEngPositionId);
    expect(scope.primaryPosition.code).toBe('SR_ENG');

    // BU chain: Tech (depth 0) → HQ (depth 1)
    expect(Array.isArray(scope.businessUnits)).toBe(true);
    expect(scope.businessUnits.length).toBe(2);
    expect(scope.businessUnits[0].bu_id).toBe(SEED_IDS.techBuId);
    expect(scope.businessUnits[0].depth).toBe(0);
    expect(scope.businessUnits[1].bu_id).toBe(SEED_IDS.hqBuId);
    expect(scope.businessUnits[1].depth).toBe(1);

    // Org chain: Parent Corp only (no parent_id), depth 0
    expect(Array.isArray(scope.organizations)).toBe(true);
    expect(scope.organizations.length).toBeGreaterThanOrEqual(1);
    expect(scope.organizations[0].organization_id).toBe(SEED_IDS.parentOrgId);

    // user holds exactly the senior-eng position
    expect(scope.allPositionIds).toEqual([SEED_IDS.seniorEngPositionId]);
  });

  it('returns the explicit userId\'s scope when provided', async () => {
    if (!dbAvailable) return;
    const app = await getTestApp();
    const res = await request(app)
      .get(`/api/foundation/org-scope/${SEED_IDS.testCeoId}`)
      .set('x-test-tenant-id', TEST_TENANT_ID)
      .set('x-test-user-id', SEED_IDS.testCeoId);

    expect(res.status).toBe(200);
    const scope = res.body.data;
    expect(scope.primaryPosition.position_id).toBe(SEED_IDS.ceoPositionId);
    // CEO is at HQ — single BU node (HQ has no parent)
    expect(scope.businessUnits.length).toBe(1);
    expect(scope.businessUnits[0].bu_id).toBe(SEED_IDS.hqBuId);
  });

  it('returns an empty scope for a user with no assignment', async () => {
    if (!dbAvailable) return;
    const app = await getTestApp();
    const res = await request(app)
      .get('/api/foundation/org-scope/u-unassigned')
      .set('x-test-tenant-id', TEST_TENANT_ID)
      .set('x-test-user-id', 'u-unassigned');

    expect(res.status).toBe(200);
    const scope = res.body.data;
    expect(scope.primaryPosition).toBeNull();
    expect(scope.businessUnits).toEqual([]);
    expect(scope.organizations).toEqual([]);
    expect(scope.allPositionIds).toEqual([]);
  });
});
