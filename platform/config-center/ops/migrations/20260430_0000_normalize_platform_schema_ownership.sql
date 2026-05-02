-- ============================================================================
-- Foundation Reconciliation — normalize platform schema ownership
-- File: 20260430_0000_normalize_platform_schema_ownership.sql
--
-- INTENT
--   Reassign every platform_* schema and every relation inside it to the
--   `dos_migrator` role so subsequent ALTER TABLE / ALTER SCHEMA migrations
--   can run as the migrator role without superuser. Idempotent.
--
-- WHY
--   `platform_dos.tenants_registry` (and other relations created during
--   early bootstrap as `postgres`) cannot be ALTERed by `dos_migrator`,
--   producing SQLSTATE 42501. Every future migration that touches those
--   objects fails the same way until ownership is normalized.
--
-- SAFETY CONTRACT
--   - Runs only the OWNER reassignment statements; no schema/data change.
--   - Uses DO-blocks so a missing schema, missing role, or insufficient
--     privilege is caught and logged as NOTICE (not a hard failure) — the
--     migration is then idempotent across environments where the role
--     already owns the object or where the object does not yet exist.
--   - Requires the connecting role to be a member of the current owner
--     (typically `postgres`) OR to be superuser. The migration runner
--     should connect as a role with that membership at least for the
--     wave-0 bootstrap; thereafter `dos_migrator` is sufficient.
-- ============================================================================

-- 1. Ensure target role exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_migrator') THEN
    RAISE NOTICE 'dos_migrator role not present; skipping ownership normalization';
    RETURN;
  END IF;

  -- 2. Reassign every platform_* schema owner
  PERFORM 1
  FROM pg_namespace n
  WHERE n.nspname LIKE 'platform\_%' ESCAPE '\'
    AND pg_get_userbyid(n.nspowner) <> 'dos_migrator';

  IF FOUND THEN
    DECLARE r record;
    BEGIN
      FOR r IN
        SELECT n.nspname
        FROM pg_namespace n
        WHERE n.nspname LIKE 'platform\_%' ESCAPE '\'
          AND pg_get_userbyid(n.nspowner) <> 'dos_migrator'
      LOOP
        BEGIN
          EXECUTE format('ALTER SCHEMA %I OWNER TO dos_migrator', r.nspname);
          RAISE NOTICE 'normalized owner: schema %', r.nspname;
        EXCEPTION
          WHEN insufficient_privilege THEN
            RAISE NOTICE 'skip schema % (insufficient_privilege; run as superuser to fix)', r.nspname;
        END;
      END LOOP;
    END;
  END IF;

  -- 3. Reassign every relation inside platform_* schemas
  DECLARE r record;
  BEGIN
    FOR r IN
      SELECT n.nspname AS schema, c.relname AS name, c.relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname LIKE 'platform\_%' ESCAPE '\'
        AND pg_get_userbyid(c.relowner) <> 'dos_migrator'
        AND c.relkind IN ('r','p','v','m','f')   -- table, partitioned, view, matview, foreign
        -- NOTE: sequences (relkind='S') intentionally excluded: identity/serial
        -- sequences are linked to their owning table (pg_depend deptype='a')
        -- and PG refuses ALTER SEQUENCE OWNER TO on them (SQLSTATE 0A000).
        -- They follow the table owner automatically via ALTER TABLE OWNER.
    LOOP
      BEGIN
        EXECUTE format(
          CASE r.relkind
            WHEN 'S' THEN 'ALTER SEQUENCE %I.%I OWNER TO dos_migrator'
            WHEN 'v' THEN 'ALTER VIEW %I.%I OWNER TO dos_migrator'
            WHEN 'm' THEN 'ALTER MATERIALIZED VIEW %I.%I OWNER TO dos_migrator'
            WHEN 'f' THEN 'ALTER FOREIGN TABLE %I.%I OWNER TO dos_migrator'
            ELSE 'ALTER TABLE %I.%I OWNER TO dos_migrator'
          END,
          r.schema, r.name
        );
        RAISE NOTICE 'normalized owner: %.%', r.schema, r.name;
      EXCEPTION
        WHEN insufficient_privilege THEN
          RAISE NOTICE 'skip %.% (insufficient_privilege; run wave-0 as a role member of the current owner)', r.schema, r.name;
      END;
    END LOOP;
  END;
END
$$;
