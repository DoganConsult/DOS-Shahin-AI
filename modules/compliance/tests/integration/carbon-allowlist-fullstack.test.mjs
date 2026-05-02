/**
 * Full-stack contract test for the Carbon-only enforcement stack as it
 * applies to the compliance module:
 *
 *   1. dos.dynamic_ui_component_registry contains the 63 compliance
 *      component_keys, all linked to a real Carbon catalog row.
 *   2. The Layer 2 allowlist SQL (the same one served by
 *      /api/foundation/dynamic-ui/allowlist) returns each compliance row
 *      with runtime_status in (active, wrapper-required) and vendor
 *      'ibm-carbon'.
 *   3. The Layer 1 trigger rejects every banned mutation pattern:
 *        - vendor='custom'
 *        - pointing at runtime_status='blocked-react-only'
 *        - approval_status='unapproved'
 *        - carbon_key=NULL
 *   4. The Layer 7 invariants all return zero on the live DB.
 *
 * Runs against the real database (no mocks). Skipped when PG is not
 * reachable (CI without DB).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const PG_URL =
  process.env.DOS_TEST_PG_URL ??
  'postgresql://dos_migrator:dos_migrator_pass_2026@localhost:5432/shahin_grc';

const COMPLIANCE_PAGES = [
  'ComplianceHome', 'ComplianceCatchAll', 'ComplianceOverviewPage',
  'CompliancePosturePage', 'ComplianceWorkQueuePage', 'ComplianceCalendarPage',
  'ComplianceHeatmapPage', 'ComplianceRoadmapPage', 'ComplianceTemplatesPage',
  'ComplianceFrameworksPage', 'ComplianceObligationsPage', 'ObligationDetailPage',
  'ObligationWorkspacePage', 'ComplianceRegulatoryChangesPage',
  'ComplianceAssessmentsPage', 'ComplianceAttestationsPage', 'ComplianceFindingsPage',
  'ComplianceGapsPage', 'ComplianceExceptionsPage', 'ComplianceEvidenceOpsPage',
  'ComplianceReportsPage', 'GenericModuleLifecycle', 'ComplianceAdminPage',
];

let pool;

async function getPool() {
  if (!pool) {
    pool = new pg.Pool({ connectionString: PG_URL, max: 2, connectionTimeoutMillis: 2000 });
  }
  return pool;
}

async function pgAvailable() {
  try {
    const p = await getPool();
    await p.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

test('Compliance Carbon-only stack — full DB contract', { concurrency: false }, async (t) => {
  if (!(await pgAvailable())) {
    t.skip('Postgres not reachable; skipping full-stack DB test');
    return;
  }
  const p = await getPool();

  await t.test('1) all 63 compliance pages registered', async () => {
    const r = await p.query(
      `SELECT COUNT(*)::int AS n
         FROM dos.dynamic_ui_component_registry
        WHERE metadata->>'module' = 'compliance'`,
    );
    assert.equal(r.rows[0].n, 63, 'expected 63 compliance rows');
  });

  await t.test('2) every compliance row points at an IBM Carbon catalog row', async () => {
    const r = await p.query(`
      SELECT COUNT(*)::int AS bad
        FROM dos.dynamic_ui_component_registry r
        LEFT JOIN dos.ui_carbon_components c USING (carbon_key)
       WHERE r.metadata->>'module' = 'compliance'
         AND (c.vendor IS NULL OR c.vendor <> 'ibm-carbon'
              OR c.runtime_status IN ('blocked-react-only','catalog-only','missing-upstream-angular-binding'))
    `);
    assert.equal(r.rows[0].bad, 0, 'no compliance row may link to non-IBM or blocked catalog');
  });

  await t.test('3) Layer 2 allowlist SQL returns at least the well-known compliance pages', async () => {
    const r = await p.query(`
      SELECT r.component_key
        FROM dos.dynamic_ui_component_registry r
        JOIN dos.ui_carbon_components c USING (carbon_key)
       WHERE r.vendor = 'ibm-carbon' AND r.approval_status='approved'
         AND c.vendor = 'ibm-carbon'
         AND c.runtime_status IN ('active','wrapper-required')
    `);
    const set = new Set(r.rows.map((x) => x.component_key));
    for (const key of COMPLIANCE_PAGES) {
      assert.ok(set.has(key), `allowlist missing ${key}`);
    }
  });

  await t.test('4a) Layer 1 trigger blocks vendor="custom"', async () => {
    await assert.rejects(
      p.query(`INSERT INTO dos.dynamic_ui_component_registry
                 (component_key, vendor, approval_status, carbon_key)
               VALUES ('__test_custom_vendor__', 'custom', 'approved', 'tiles')`),
      /CARBON-ONLY/,
    );
  });

  await t.test('4b) Layer 1 trigger blocks carbon_key NULL', async () => {
    await assert.rejects(
      p.query(`INSERT INTO dos.dynamic_ui_component_registry
                 (component_key, vendor, approval_status, carbon_key)
               VALUES ('__test_null_carbon_key__', 'ibm-carbon', 'approved', NULL)`),
      /CARBON-ONLY/,
    );
  });

  await t.test('4c) Layer 1 trigger blocks pointing at blocked-react-only catalog row', async () => {
    await assert.rejects(
      p.query(`INSERT INTO dos.dynamic_ui_component_registry
                 (component_key, vendor, approval_status, carbon_key)
               VALUES ('__test_react_blocked__', 'ibm-carbon', 'approved', 'product.PageHeader')`),
      /CARBON-ONLY/,
    );
  });

  await t.test('4d) Layer 1 trigger blocks approval_status<>"approved"', async () => {
    await assert.rejects(
      p.query(`INSERT INTO dos.dynamic_ui_component_registry
                 (component_key, vendor, approval_status, carbon_key)
               VALUES ('__test_unapproved__', 'ibm-carbon', 'unapproved', 'tiles')`),
      /CARBON-ONLY/,
    );
  });

  await t.test('4e) Layer 1 trigger blocks non-Carbon catalog package_name', async () => {
    await assert.rejects(
      p.query(`INSERT INTO dos.ui_carbon_components
                 (carbon_key, package_name, source_component_name, integration_mode, runtime_status)
               VALUES ('__test_primeng_pkg__', 'primeng', 'Button', 'native-angular', 'active')`),
      /CARBON-ONLY/,
    );
  });

  await t.test('5) Layer 7 invariants — all four return zero', async () => {
    const r = await p.query(`
      SELECT
        (SELECT COUNT(*)::int FROM dos.ui_carbon_components WHERE vendor<>'ibm-carbon') AS non_ibm_catalog,
        (SELECT COUNT(*)::int FROM dos.dynamic_ui_component_registry WHERE approval_status<>'approved') AS unapproved,
        (SELECT COUNT(*)::int FROM dos.dynamic_ui_component_registry r2
                JOIN dos.ui_carbon_components c2 USING (carbon_key)
          WHERE r2.approval_status='approved' AND c2.vendor<>'ibm-carbon') AS pointing_to_blocked,
        (SELECT COUNT(*)::int FROM dos.ui_carbon_components
          WHERE runtime_status IN ('blocked-react-only','catalog-only','missing-upstream-angular-binding')
            AND dynamic_ui_allowed=true) AS blocked_with_allowed
    `);
    const row = r.rows[0];
    assert.equal(row.non_ibm_catalog, 0);
    assert.equal(row.unapproved, 0);
    assert.equal(row.pointing_to_blocked, 0);
    assert.equal(row.blocked_with_allowed, 0);
  });

  await pool.end();
  pool = undefined;
});
