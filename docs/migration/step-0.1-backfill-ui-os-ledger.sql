-- =============================================================================
--  UI-OS Gap Closure — Step 0.1
--  Backfill migration ledger for the 7 already-applied migrations
--  whose tables exist in shahin_grc.dos.* but were never recorded.
--
--  Source plan: docs/migration/ui-os-gap-closure-plan.md
--
--  Targets BOTH ledgers (idempotent, ON CONFLICT DO NOTHING):
--    * dos.platform_migrations  — canonical (used by platform/config-center/migration/migration-runner.ts)
--    * dos.schema_migrations    — legacy (used by older bootstrap runner; trial-lifecycle row is here)
--
--  Checksums are SHA-256 hex of the file contents at HEAD on 2026-05-01.
--  If a file is edited after this script is committed, its checksum here will
--  drift — re-run sha256sum and update before applying. Otherwise the canonical
--  runner will (correctly) flag drift on the next status check.
--
--  Acceptance check after running:
--    SELECT count(*) FROM dos.platform_migrations
--      WHERE filename LIKE '20260501_03%';            -- expect 7
--    SELECT count(*) FROM dos.schema_migrations
--      WHERE filename LIKE '20260501_03%';            -- expect 7
--
--  How to run on each DB that has the 31 ui_* tables:
--    PGPASSWORD=*** psql -h <host> -U dos_migrator -d <dbname> \
--      -f docs/migration/step-0.1-backfill-ui-os-ledger.sql
--
--  DBs to run against (verify each first with the precondition query below):
--    shahin_grc                    [confirmed has tables 2026-05-01]
--    shahin_fresh_full             [check]
--    shahin_grc_m1_cert            [check]
--    shahin_grc_m2_cert            [check]
--    shahin_grc_m3_cert            [check]
--    dos_compliance_e2e            [check]
--
--  Precondition query (run before backfilling each DB):
--    SELECT count(*) FROM information_schema.tables
--      WHERE table_schema='dos' AND table_name LIKE 'ui_%';
--    -- expect 31; if 0, DO NOT run this script (no tables to backfill)
-- =============================================================================

BEGIN;

-- Defensive: ensure both ledgers exist (no-op if already there).
CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.platform_migrations (
  filename    TEXT        NOT NULL PRIMARY KEY,
  checksum    TEXT        NOT NULL,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER     NOT NULL
);

CREATE TABLE IF NOT EXISTS dos.schema_migrations (
  id          SERIAL      PRIMARY KEY,
  filename    TEXT        NOT NULL UNIQUE,
  checksum    TEXT        NOT NULL,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by  TEXT        NOT NULL DEFAULT CURRENT_USER,
  duration_ms INTEGER
);

-- -----------------------------------------------------------------------------
-- Canonical ledger (dos.platform_migrations)
-- -----------------------------------------------------------------------------
INSERT INTO dos.platform_migrations (filename, checksum, applied_at, duration_ms) VALUES
  ('20260501_0300_dynamic_ui_catalog.sql',
   '4ce76c396d4facc0055ba0afa35035f1a1db33d393b30752669b8032cc5865c8',
   '2026-05-01 00:00:00+00', 0),
  ('20260501_0301_langgraph_checkpoints.sql',
   '5c54325423ba9299fc2a8dbf375078e17268f8df9af83500f22279d260afdfbb',
   '2026-05-01 00:00:00+00', 0),
  ('20260501_0302_ui_os_runtime_personalization.sql',
   '7aa2b30379e3f1a3ea4ce17cae562b09dcbc27a934733a6aa229276a769c6977',
   '2026-05-01 00:00:00+00', 0),
  ('20260501_0303_ui_os_workspace_productivity.sql',
   '3301e3c5b2c20670849dd5dd1d5e2a66b18bcf363b0eb57f2df359ed463e337b',
   '2026-05-01 00:00:00+00', 0),
  ('20260501_0304_ui_os_productivity_tail.sql',
   'abb691b74ab46a804fa487b9b0a1cc0f68e47ff853d8666147554c2dff13dbc7',
   '2026-05-01 00:00:00+00', 0),
  ('20260501_0305_ui_os_layout_composition.sql',
   '1d0b4bc898957aa723c454f864b5930ac51bc627c3fdd3fae5cf5730c559ce77',
   '2026-05-01 00:00:00+00', 0),
  ('20260501_0306_ui_os_workspace_snapshots.sql',
   '1974760cb742eb0ab5f14aa29f8a24804297faa51a23cd4b522e0dc24c8e1b53',
   '2026-05-01 00:00:00+00', 0)
ON CONFLICT (filename) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Legacy ledger (dos.schema_migrations) — same checksums for cross-runner truth
-- -----------------------------------------------------------------------------
INSERT INTO dos.schema_migrations (filename, checksum, applied_at, applied_by, duration_ms) VALUES
  ('20260501_0300_dynamic_ui_catalog.sql',
   '4ce76c396d4facc0055ba0afa35035f1a1db33d393b30752669b8032cc5865c8',
   '2026-05-01 00:00:00+00', 'gap-closure-step-0.1', 0),
  ('20260501_0301_langgraph_checkpoints.sql',
   '5c54325423ba9299fc2a8dbf375078e17268f8df9af83500f22279d260afdfbb',
   '2026-05-01 00:00:00+00', 'gap-closure-step-0.1', 0),
  ('20260501_0302_ui_os_runtime_personalization.sql',
   '7aa2b30379e3f1a3ea4ce17cae562b09dcbc27a934733a6aa229276a769c6977',
   '2026-05-01 00:00:00+00', 'gap-closure-step-0.1', 0),
  ('20260501_0303_ui_os_workspace_productivity.sql',
   '3301e3c5b2c20670849dd5dd1d5e2a66b18bcf363b0eb57f2df359ed463e337b',
   '2026-05-01 00:00:00+00', 'gap-closure-step-0.1', 0),
  ('20260501_0304_ui_os_productivity_tail.sql',
   'abb691b74ab46a804fa487b9b0a1cc0f68e47ff853d8666147554c2dff13dbc7',
   '2026-05-01 00:00:00+00', 'gap-closure-step-0.1', 0),
  ('20260501_0305_ui_os_layout_composition.sql',
   '1d0b4bc898957aa723c454f864b5930ac51bc627c3fdd3fae5cf5730c559ce77',
   '2026-05-01 00:00:00+00', 'gap-closure-step-0.1', 0),
  ('20260501_0306_ui_os_workspace_snapshots.sql',
   '1974760cb742eb0ab5f14aa29f8a24804297faa51a23cd4b522e0dc24c8e1b53',
   '2026-05-01 00:00:00+00', 'gap-closure-step-0.1', 0)
ON CONFLICT (filename) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Inline acceptance assertions (script aborts on mismatch, transaction rolled back)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  pm_count INTEGER;
  sm_count INTEGER;
BEGIN
  SELECT count(*) INTO pm_count
    FROM dos.platform_migrations
    WHERE filename LIKE '20260501_03%';
  IF pm_count <> 7 THEN
    RAISE EXCEPTION 'dos.platform_migrations: expected 7 ui-os rows, got %', pm_count;
  END IF;

  SELECT count(*) INTO sm_count
    FROM dos.schema_migrations
    WHERE filename LIKE '20260501_03%';
  IF sm_count <> 7 THEN
    RAISE EXCEPTION 'dos.schema_migrations: expected 7 ui-os rows, got %', sm_count;
  END IF;

  RAISE NOTICE 'OK: platform_migrations=% schema_migrations=%', pm_count, sm_count;
END $$;

COMMIT;
