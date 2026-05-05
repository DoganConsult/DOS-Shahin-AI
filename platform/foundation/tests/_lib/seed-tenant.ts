/**
 * H-1 shared test fixture — seeds a deterministic enterprise hierarchy
 * into dos.* tables for the Foundation route integration tests.
 *
 * Uses dos_user privileges only (no migrator role required). Idempotent:
 * cleanup runs by tenant_id at the start so prior failures do not leave
 * dangling rows. All ids are stable so each test can assert against them.
 *
 * Plan: docs/plans/need-to-clean-the-swift-trinket.md (Phase H-1)
 */
import { query as safeQuery, getPool } from '@dos/db';

export const TEST_TENANT_ID = 'test-tenant';

export const SEED_IDS = {
  parentOrgId: '11111111-1111-1111-1111-000000000001',
  childOrgId:  '11111111-1111-1111-1111-000000000002',
  hqBuId:      '22222222-2222-2222-2222-000000000001',
  techBuId:    '22222222-2222-2222-2222-000000000002',
  opsBuId:     '22222222-2222-2222-2222-000000000003',
  // positions: ceo (top) → cto → senior-eng → junior-eng (chain depth 4)
  ceoPositionId:        '33333333-3333-3333-3333-000000000001',
  ctoPositionId:        '33333333-3333-3333-3333-000000000002',
  seniorEngPositionId:  '33333333-3333-3333-3333-000000000003',
  juniorEngPositionId:  '33333333-3333-3333-3333-000000000004',
  // operations side
  cooPositionId:        '33333333-3333-3333-3333-000000000005',
  opsLeadPositionId:    '33333333-3333-3333-3333-000000000006',
  // assigned user
  testUserId:    'u-test-1',
  testManagerId: 'u-test-mgr-1',
  testCeoId:     'u-test-ceo-1',
} as const;

/** Returns true when a Postgres pool is available; tests skip otherwise. */
export async function isDbReachable(): Promise<boolean> {
  try {
    await safeQuery('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/** Idempotent cleanup. Runs before seeding and at the end of each suite. */
export async function cleanupFoundationFixture(tenantId: string = TEST_TENANT_ID): Promise<void> {
  // Order matters: position_assignments → positions → business_units → organizations
  await safeQuery(`DELETE FROM dos.position_assignments WHERE tenant_id = $1`, [tenantId]);
  await safeQuery(`DELETE FROM dos.positions             WHERE tenant_id = $1`, [tenantId]);
  await safeQuery(`DELETE FROM dos.business_units       WHERE tenant_id = $1`, [tenantId]);
  await safeQuery(`DELETE FROM dos.organizations       WHERE tenant_id = $1`, [tenantId]);
}

/**
 * Seeds:
 *   parent org + child org (parent → child)
 *   3 BUs under parent org (HQ, Tech, Ops); HQ is root, Tech + Ops are children of HQ
 *   6 positions:
 *     CEO         (HQ, no reports_to)             — held by testCeoId
 *     CTO         (Tech, reports_to CEO)          — held by testManagerId
 *     SeniorEng   (Tech, reports_to CTO)          — held by testUserId (PRIMARY)
 *     JuniorEng   (Tech, reports_to SeniorEng)    — unassigned
 *     COO         (Ops, reports_to CEO)           — unassigned
 *     OpsLead     (Ops, reports_to COO)           — unassigned
 *
 * Manager chain for testUserId: SeniorEng (depth 0) → CTO (1) → CEO (2)
 */
export async function seedFoundationFixture(tenantId: string = TEST_TENANT_ID): Promise<typeof SEED_IDS> {
  await cleanupFoundationFixture(tenantId);

  // 1) Organizations (parent + child)
  await safeQuery(
    `INSERT INTO dos.organizations
       (organization_id, tenant_id, name_en, code, parent_id, org_type, status)
     VALUES
       ($1, $2, 'H1 Parent Corp', 'H1_PARENT', NULL, 'standard', 'active'),
       ($3, $2, 'H1 Subsidiary',  'H1_CHILD',  $1,  'standard', 'active')`,
    [SEED_IDS.parentOrgId, tenantId, SEED_IDS.childOrgId],
  );

  // 2) Business units — HQ (root), Tech (under HQ), Ops (under HQ)
  await safeQuery(
    `INSERT INTO dos.business_units
       (bu_id, tenant_id, name_en, code, organization_id, parent_bu_id, bu_type, status)
     VALUES
       ($1, $2, 'Headquarters', 'HQ',   $5, NULL, 'hq',       'active'),
       ($3, $2, 'Technology',   'TECH', $5, $1,  'function', 'active'),
       ($4, $2, 'Operations',   'OPS',  $5, $1,  'function', 'active')`,
    [SEED_IDS.hqBuId, tenantId, SEED_IDS.techBuId, SEED_IDS.opsBuId, SEED_IDS.parentOrgId],
  );

  // 3) Positions with reports_to chain
  await safeQuery(
    `INSERT INTO dos.positions
       (position_id, tenant_id, title_en, code, bu_id, level, reports_to, status)
     VALUES
       ($1, $2, 'Chief Executive Officer', 'CEO',         $7, 1, NULL, 'active'),
       ($3, $2, 'Chief Technology Officer','CTO',         $8, 2, $1,  'active'),
       ($4, $2, 'Senior Engineer',         'SR_ENG',      $8, 3, $3,  'active'),
       ($5, $2, 'Junior Engineer',         'JR_ENG',      $8, 4, $4,  'active'),
       ($6, $2, 'Chief Operating Officer', 'COO',         $9, 2, $1,  'active'),
       ($10,$2, 'Operations Lead',         'OPS_LEAD',    $9, 3, $6,  'active')`,
    [
      SEED_IDS.ceoPositionId, tenantId,
      SEED_IDS.ctoPositionId, SEED_IDS.seniorEngPositionId, SEED_IDS.juniorEngPositionId,
      SEED_IDS.cooPositionId,
      SEED_IDS.hqBuId, SEED_IDS.techBuId, SEED_IDS.opsBuId,
      SEED_IDS.opsLeadPositionId,
    ],
  );

  // 4) Active position assignments
  //    testUserId    → Senior Engineer (PRIMARY)
  //    testManagerId → CTO
  //    testCeoId     → CEO
  await safeQuery(
    `INSERT INTO dos.position_assignments
       (assignment_id, position_id, user_id, tenant_id, is_primary)
     VALUES
       ('44444444-4444-4444-4444-000000000001', $1, $4, $5, TRUE),
       ('44444444-4444-4444-4444-000000000002', $2, $6, $5, TRUE),
       ('44444444-4444-4444-4444-000000000003', $3, $7, $5, TRUE)`,
    [
      SEED_IDS.seniorEngPositionId, SEED_IDS.ctoPositionId, SEED_IDS.ceoPositionId,
      SEED_IDS.testUserId, tenantId, SEED_IDS.testManagerId, SEED_IDS.testCeoId,
    ],
  );

  return SEED_IDS;
}

/**
 * Close the shared @dos/db pool. Only call this from a single
 * suite-of-suites teardown — closing it from per-file `afterAll` breaks
 * subsequent test files that share the same pool.
 *
 * Vitest exits the process cleanly without an explicit close, so most
 * callers should NOT use this and instead rely on process exit.
 */
export async function closeFoundationPool(): Promise<void> {
  try {
    const pool = getPool();
    await pool?.end?.();
  } catch {
    // ignore — pool may already be closed
  }
}
