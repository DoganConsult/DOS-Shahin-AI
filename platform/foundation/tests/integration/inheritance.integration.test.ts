/**
 * H-1.4 — inheritance integration test against a live DB.
 *
 * Verifies GET /api/foundation/inheritance/:scopeType/:scopeId returns
 * the ancestor chain from the seeded scope upward, plus shape of
 * `inheritedItems[]` (currently empty until governance fetchers register).
 *
 * Plan: /root/.claude/plans/need-to-clean-the-swift-trinket.md (Phase H-1)
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
    console.warn('[H-1] DATABASE_URL not reachable — skipping inheritance integration tests');
    return;
  }
  await seedFoundationFixture();
});

afterAll(async () => {
  if (dbAvailable) await cleanupFoundationFixture();
});

describe('GET /api/foundation/inheritance/:scopeType/:scopeId', () => {
  it('walks the organization parent chain (child → parent)', async () => {
    if (!dbAvailable) return;
    const app = await getTestApp();
    const res = await request(app)
      .get(`/api/foundation/inheritance/organization/${SEED_IDS.childOrgId}`)
      .set('x-test-tenant-id', TEST_TENANT_ID)
      .set('x-test-user-id', SEED_IDS.testUserId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.scopeType).toBe('organization');
    expect(data.scopeId).toBe(SEED_IDS.childOrgId);
    expect(Array.isArray(data.chain)).toBe(true);
    expect(data.chain.length).toBe(2);
    expect(data.chain[0].id).toBe(SEED_IDS.childOrgId);
    expect(data.chain[0].level).toBe(0);
    expect(data.chain[1].id).toBe(SEED_IDS.parentOrgId);
    expect(data.chain[1].level).toBe(1);
    // No itemized fetchers registered yet — empty array is the contract.
    expect(Array.isArray(data.inheritedItems)).toBe(true);
    expect(data.inheritedItems).toEqual([]);
  });

  it('returns the single-node chain at the root organization', async () => {
    if (!dbAvailable) return;
    const app = await getTestApp();
    const res = await request(app)
      .get(`/api/foundation/inheritance/organization/${SEED_IDS.parentOrgId}`)
      .set('x-test-tenant-id', TEST_TENANT_ID)
      .set('x-test-user-id', SEED_IDS.testUserId);

    expect(res.status).toBe(200);
    expect(res.body.data.chain).toHaveLength(1);
    expect(res.body.data.chain[0].id).toBe(SEED_IDS.parentOrgId);
    expect(res.body.data.chain[0].level).toBe(0);
  });

  it('walks the business_unit parent chain (Tech → HQ)', async () => {
    if (!dbAvailable) return;
    const app = await getTestApp();
    const res = await request(app)
      .get(`/api/foundation/inheritance/business_unit/${SEED_IDS.techBuId}`)
      .set('x-test-tenant-id', TEST_TENANT_ID)
      .set('x-test-user-id', SEED_IDS.testUserId);

    expect(res.status).toBe(200);
    expect(res.body.data.chain).toHaveLength(2);
    expect(res.body.data.chain[0].id).toBe(SEED_IDS.techBuId);
    expect(res.body.data.chain[1].id).toBe(SEED_IDS.hqBuId);
  });

  it('rejects unknown scopeType with 400', async () => {
    if (!dbAvailable) return;
    const app = await getTestApp();
    const res = await request(app)
      .get('/api/foundation/inheritance/totally-bogus/abc')
      .set('x-test-tenant-id', TEST_TENANT_ID)
      .set('x-test-user-id', SEED_IDS.testUserId);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
