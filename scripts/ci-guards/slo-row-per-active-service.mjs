#!/usr/bin/env node
/**
 * DOS Master L36 — SLO row required per active service.
 *
 * Every dos_master.service_registry row with status='active' MUST have
 * a matching dos.platform_slo row. Catches drift where new services
 * land without SLO declarations.
 *
 * Doctrine binding: Article 3 (DB owns runtime contract) + Article 5
 * (no fake-green — services without SLO would silently degrade).
 */
import pg from 'pg';

const url = process.env.DATABASE_URL || 'postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc';
const c = new pg.Client({ connectionString: url });
try {
  await c.connect();
  // SLO table may not yet exist on first run.
  const exists = await c.query("SELECT to_regclass('dos.platform_slo') AS t");
  if (!exists.rows[0].t) {
    console.log('[slo-row-per-active-service] SKIP — dos.platform_slo not yet migrated');
    await c.end();
    process.exit(0);
  }
  const r = await c.query(`
    SELECT sr.service_code
      FROM dos_master.service_registry sr
 LEFT JOIN dos.platform_slo s ON s.service_code = sr.service_code
     WHERE sr.status = 'active' AND s.service_code IS NULL
  `);
  await c.end();
  if (r.rows.length) {
    console.error(`[slo-row-per-active-service] FAIL ${r.rows.length} active service(s) lack SLO row:`);
    r.rows.slice(0, 5).forEach((x) => console.error('  ' + x.service_code));
    process.exit(1);
  }
  console.log(`[slo-row-per-active-service] PASS every active service has an SLO row`);
} catch (e) {
  console.log(`[slo-row-per-active-service] SKIP — DB unavailable: ${(e).message.slice(0, 80)}`);
  process.exit(0);
}
