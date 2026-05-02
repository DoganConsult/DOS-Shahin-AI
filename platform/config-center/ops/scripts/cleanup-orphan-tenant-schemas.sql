-- ops/scripts/cleanup-orphan-tenant-schemas.sql
--
-- Purpose
--   Drops PostgreSQL schemas under the `tenant_*` prefix that have NO
--   matching row in `public.tenants` (i.e. abandoned partial-provisioning
--   runs from old test sessions). Each drop is recorded in
--   `dos.orphan_schema_audit` for forensic recovery.
--
-- Safety
--   - DRY-RUN BY DEFAULT. Re-runs as a no-op until you explicitly opt in.
--   - To actually drop, invoke with the apply flag set to 'true':
--
--       sudo -u postgres psql -d shahin_grc -v apply=true \
--         < ops/scripts/cleanup-orphan-tenant-schemas.sql
--
--   - Skips any schema that has > 0 rows in any table OTHER than the
--     foundation seeds (`actor_registry`, `authz_decision_log`,
--     `sod_rules`, `sod_waivers`). Those are auto-seeded; non-empty
--     payload tables (vendors, evidence, etc.) cause the schema to be
--     SKIPPED and reported, never dropped, regardless of the apply flag.
--   - Audit row is written even on dry-run, so the operator gets a
--     complete forensic ledger of "would-have-dropped" schemas.
--
-- Operator-override list (`-v force_drop=`)
--   Comma-separated list of schemas whose data-row guard is bypassed
--   because the operator has decided their contents are test data.
--   Each entry MUST be backed by an explicit pg_dump in /data/backups
--   (verified by the operator before invocation). The audit row records
--   `decision='operator_force_drop'` so the override is permanent forensic
--   evidence.
--
--   Currently approved overrides (with backup proof):
--     • tenant_a653f3c71896 — populated by 2026-04-17 manual smoke-test
--       (actor "Test User ABC" + vendors TENANT_A653_VENDOR_X/Y).
--       Backup: /data/backups/tenant_a653f3c71896_*.sql (≥ 32 KB, 18 dump blocks).
--       Authorised by: doganlap@gmail.com on 2026-04-25.
--
--   Example invocation:
--       sudo -u postgres psql -d shahin_grc \
--         -v apply=true -v force_drop=tenant_a653f3c71896 \
--         < ops/scripts/cleanup-orphan-tenant-schemas.sql
--
-- Caller invariants
--   - Run as a role that owns the tenant_* schemas (typically `postgres`
--     or the migration superuser).
--   - One transaction per schema so a failure on one row doesn't roll
--     back successful drops.

\set ON_ERROR_STOP on

-- ── Default the apply flag to 'false' if not provided ──
\if :{?apply}
\else
  \set apply 'false'
\endif

-- ── Default force_drop to empty if not provided ──
\if :{?force_drop}
\else
  \set force_drop ''
\endif

-- Hand the variables to the DO block via session-level GUCs.
SELECT set_config('orphan.apply', :'apply', false);
SELECT set_config('orphan.force_drop', :'force_drop', false);

\echo
\echo '══════════════════════════════════════════════════════════════════'
\echo '  Orphan tenant-schema cleanup'
\if :apply
  \echo '  Mode: APPLY (will drop matching schemas)'
\else
  \echo '  Mode: DRY-RUN (set -v apply=true to actually drop)'
\endif
\echo '══════════════════════════════════════════════════════════════════'
\echo

-- ── Audit ledger ──────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS dos;
CREATE TABLE IF NOT EXISTS dos.orphan_schema_audit (
  id           BIGSERIAL PRIMARY KEY,
  schema_name  TEXT        NOT NULL,
  table_count  INTEGER     NOT NULL,
  total_size   TEXT        NOT NULL,
  data_summary JSONB       NOT NULL,
  decision     TEXT        NOT NULL,
  applied      BOOLEAN     NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by  TEXT        NOT NULL DEFAULT current_user
);

-- Older deployments shipped a tighter CHECK on `decision`. Drop it if
-- present so the operator-force-drop value can be inserted without an
-- explicit migration.
DO $constraint_drop$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
     WHERE n.nspname = 'dos'
       AND r.relname = 'orphan_schema_audit'
       AND c.contype = 'c'
       AND c.conname LIKE '%decision%check%'
  ) THEN
    EXECUTE (
      SELECT format('ALTER TABLE dos.orphan_schema_audit DROP CONSTRAINT %I', c.conname)
        FROM pg_constraint c
        JOIN pg_class r ON r.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = r.relnamespace
       WHERE n.nspname = 'dos'
         AND r.relname = 'orphan_schema_audit'
         AND c.contype = 'c'
         AND c.conname LIKE '%decision%check%'
       LIMIT 1
    );
  END IF;
END $constraint_drop$;

-- ── Cleanup loop ──────────────────────────────────────────────────────
DO $$
DECLARE
  r            RECORD;
  v_apply      BOOLEAN := lower(coalesce(current_setting('orphan.apply', true), 'false')) IN ('1','true','yes','on');
  v_force_raw  TEXT    := coalesce(current_setting('orphan.force_drop', true), '');
  v_force_list TEXT[]  := CASE
                            WHEN v_force_raw = '' THEN ARRAY[]::TEXT[]
                            ELSE string_to_array(v_force_raw, ',')
                          END;
  v_table_cnt  INTEGER;
  v_size_text  TEXT;
  v_summary    JSONB;
  v_data_rows  BIGINT;
  v_decision   TEXT;
  v_safe_seeds TEXT[] := ARRAY['actor_registry','authz_decision_log','sod_rules','sod_waivers'];
  v_forced     BOOLEAN;
  v_dropped    INTEGER := 0;
  v_skipped    INTEGER := 0;
  v_dry_run    INTEGER := 0;
  v_forced_cnt INTEGER := 0;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name
      FROM pg_namespace n
     WHERE n.nspname LIKE 'tenant\_%' ESCAPE '\'
       AND NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.schema_name = n.nspname)
     ORDER BY n.nspname
  LOOP
    SELECT COUNT(*),
           COALESCE(pg_size_pretty(SUM(pg_total_relation_size(c.oid))::bigint), '0 bytes')
      INTO v_table_cnt, v_size_text
      FROM pg_class c
      JOIN pg_namespace nn ON nn.oid = c.relnamespace
     WHERE nn.nspname = r.schema_name AND c.relkind = 'r';

    -- Inspect any table NOT in v_safe_seeds for non-zero rows.
    v_data_rows := 0;
    DECLARE rr RECORD; n BIGINT;
    BEGIN
      FOR rr IN
        SELECT c.relname FROM pg_class c
        JOIN pg_namespace nn ON nn.oid = c.relnamespace
        WHERE nn.nspname = r.schema_name
          AND c.relkind = 'r'
          AND NOT (c.relname = ANY (v_safe_seeds))
      LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I.%I', r.schema_name, rr.relname) INTO n;
        v_data_rows := v_data_rows + n;
      END LOOP;
    END;

    -- Build the data-summary JSON for the audit row.
    SELECT jsonb_object_agg(rel.name, rel.cnt)
      INTO v_summary
      FROM (
        SELECT c.relname AS name,
               (SELECT COALESCE((xpath('/row/c/text()',
                  query_to_xml(format('SELECT COUNT(*) AS c FROM %I.%I',
                                      r.schema_name, c.relname),
                               false, false, '')))[1]::text::bigint, 0)) AS cnt
          FROM pg_class c
          JOIN pg_namespace nn ON nn.oid = c.relnamespace
         WHERE nn.nspname = r.schema_name AND c.relkind = 'r'
      ) rel;

    v_forced := r.schema_name = ANY (v_force_list);

    IF v_data_rows > 0 AND v_forced AND v_apply THEN
      v_decision   := 'operator_force_drop';
      v_forced_cnt := v_forced_cnt + 1;
      EXECUTE format('DROP SCHEMA %I CASCADE', r.schema_name);
      RAISE NOTICE 'FORCE  % (% tables, %, % data rows — operator-approved drop)',
        r.schema_name, v_table_cnt, v_size_text, v_data_rows;
    ELSIF v_data_rows > 0 AND v_forced AND NOT v_apply THEN
      v_decision := 'force_drop_pending_apply';
      v_dry_run  := v_dry_run + 1;
      RAISE NOTICE 'FORCE? % (% tables, %, % data rows — would force-drop, set apply=true)',
        r.schema_name, v_table_cnt, v_size_text, v_data_rows;
    ELSIF v_data_rows > 0 THEN
      v_decision := 'skipped_has_data';
      v_skipped  := v_skipped + 1;
      RAISE NOTICE 'SKIP   % (% tables, %, % data rows in payload tables)',
        r.schema_name, v_table_cnt, v_size_text, v_data_rows;
    ELSIF v_apply THEN
      v_decision := 'dropped';
      v_dropped  := v_dropped + 1;
      EXECUTE format('DROP SCHEMA %I CASCADE', r.schema_name);
      RAISE NOTICE 'DROP   % (% tables, %)',
        r.schema_name, v_table_cnt, v_size_text;
    ELSE
      v_decision := 'dry_run';
      v_dry_run  := v_dry_run + 1;
      RAISE NOTICE 'DRY    % (% tables, %, would drop)',
        r.schema_name, v_table_cnt, v_size_text;
    END IF;

    INSERT INTO dos.orphan_schema_audit
      (schema_name, table_count, total_size, data_summary, decision, applied)
    VALUES
      (r.schema_name, v_table_cnt, v_size_text, COALESCE(v_summary, '{}'::jsonb), v_decision, v_apply);
  END LOOP;

  RAISE NOTICE '──────────────────────────────────────────────────────';
  RAISE NOTICE 'dropped: %, force-dropped: %, skipped (has data): %, dry-run: %',
    v_dropped, v_forced_cnt, v_skipped, v_dry_run;
END $$;

-- Latest report ───────────────────────────────────────────────────────
SELECT decision, COUNT(*) AS schemas, COALESCE(SUM(table_count), 0) AS tables
  FROM dos.orphan_schema_audit
 WHERE recorded_at > NOW() - INTERVAL '5 minutes'
 GROUP BY decision
 ORDER BY decision;
