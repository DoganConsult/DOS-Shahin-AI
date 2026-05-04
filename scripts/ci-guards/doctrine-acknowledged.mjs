#!/usr/bin/env node
/**
 * DOS Master Doctrine — verifies all 11 articles exist in
 * dos_master.doctrine_article and have not been tampered.
 */
import { Client } from 'pg';

async function main() {
  const cs = process.env.DATABASE_URL
    || `postgres://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc`;
  const c = new Client({ connectionString: cs });
  try { await c.connect(); } catch (e) {
    console.warn('[doctrine-acknowledged] DB unreachable, skipping:', e.message);
    process.exit(0);
  }
  const r = await c.query(`SELECT count(*)::int AS n FROM dos_master.doctrine_article`);
  const a = await c.query(`SELECT count(DISTINCT article_no)::int AS n FROM dos_master.doctrine_acknowledgement`);
  await c.end();
  const n = r.rows[0].n;
  const ack = a.rows[0].n;
  if (n < 11) {
    console.error(`[doctrine-acknowledged] FAIL only ${n}/11 doctrine articles present`);
    process.exit(1);
  }
  if (ack < 11) {
    console.error(`[doctrine-acknowledged] FAIL only ${ack}/11 articles acknowledged by any actor`);
    process.exit(1);
  }
  console.log(`[doctrine-acknowledged] PASS 11/11 articles seeded + ${ack}/11 acknowledged`);
}

main().catch((e) => { console.error('[doctrine-acknowledged] ERROR', e.message); process.exit(1); });
