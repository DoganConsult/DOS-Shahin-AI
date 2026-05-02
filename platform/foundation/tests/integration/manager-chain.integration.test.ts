/**
 * H-1.2 — manager-chain integration test against a live DB.
 *
 * Verifies GET /api/foundation/manager-chain/:userId returns the seeded
 * reports_to chain in correct depth-ascending order, and GET /api/foundation/manager-chain
 * (no userId) returns the caller's own chain.
 *
 * Skips the suite cleanly when DATABASE_URL is unset or the DB is unreachable
 * so unit-only CI passes without a Postgres dependency.
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
    console.warn('[H-1] DATABASE_URL not reachable — skipping manager-chain integration tests');
    return;
  }
  await seedFoundationFixture();
});

afterAll(async () => {
  if (dbAvailable) await cleanupFoundationFixture();
});

describe('GET /api/foundation/manager-chain', () => {
  it.runIf(true)('returns the chain for an explicit userId, ordered by ascending depth', async () => {
    if (!dbAvailable) return;
    const app = await getTestApp();
    const res = await request(app)
      .get(`/api/foundation/manager-chain/${SEED_IDS.testUserId}`)
      .set('x-test-tenant-id', TEST_TENANT_ID)
      .set('x-test-user-id', SEED_IDS.testUserId);

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    const chain = res.body.data as Array<Record<string, unknown>>;
    expect(Array.isArray(chain)).toBe(true);
    // testUser is Senior Engineer → CTO → CEO. Depth: 0, 1, 2
    expect(chain).toHaveLength(3);
    expect(chain[0].position_id).toBe(SEED_IDS.seniorEngPositionId);
    expect(chain[1].position_id).toBe(SEED_IDS.ctoPositionId);
    expect(chain[2].position_id).toBe(SEED_IDS.ceoPositionId);
    chain.forEach((entry, i) => {
      expect(entry.depth).toBe(i);
      expect(typeof entry.title_en).toBe('string');
    });
    // Holders: SeniorEng = testUser; CTO = testManager; CEO = testCeo
    expect(chain[0].holder_user_id).toBe(SEED_IDS.testUserId);
    expect(chain[1].holder_user_id).toBe(SEED_IDS.testManagerId);
    expect(chain[2].holder_user_id).toBe(SEED_IDS.testCeoId);
  });

  it('returns the caller\'s own chain when no userId is passed', async () => {
    if (!dbAvailable) return;
    const app = await getTestApp();
    const res = await request(app)
      .get('/api/foundation/manager-chain')
      .set('x-test-tenant-id', TEST_TENANT_ID)
      .set('x-test-user-id', SEED_IDS.testUserId);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0].position_id).toBe(SEED_IDS.seniorEngPositionId);
  });

  it('returns an empty chain for a user with no active assignment', async () => {
    if (!dbAvailable) return;
    const app = await getTestApp();
    const res = await request(app)
      .get('/api/foundation/manager-chain/u-no-position')
      .set('x-test-tenant-id', TEST_TENANT_ID)
      .set('x-test-user-id', 'u-no-position');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('isolates by tenant — chain is empty for a different tenant', async () => {
    if (!dbAvailable) return;
    const app = await getTestApp();
    const res = await request(app)
      .get(`/api/foundation/manager-chain/${SEED_IDS.testUserId}`)
      .set('x-test-tenant-id', 'other-tenant-not-seeded')
      .set('x-test-user-id', SEED_IDS.testUserId);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
