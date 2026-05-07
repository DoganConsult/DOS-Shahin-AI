-- =====================================================================
-- v1.1 Operating Runtime Pack — Preflight Blocker B4 (live-schema-adapted)
-- Canonical dos.tenants DDL extension
-- ---------------------------------------------------------------------
-- Doctrine: ZERO STATIC / ZERO LEGACY / ZERO FALLBACK / DB-as-source.
-- This migration is shipped as ready-for-review SQL inside the v1.1
-- contract pack. It MUST NOT be auto-executed by the migrator pipeline.
-- Execution is gated on human review + lockstep CI guard.
--
-- Live state at authoring (audit subagent):
--   dos.tenants exists with 44 rows and 7 FK dependants
--   (tenant_migrations, tenant_kms_config, tenant_kms_keys,
--    tenant_module_entitlements, tenant_product_entitlements,
--    tenant_subscriptions, tenant_trials, trial_audit_log).
--   Live shape:
--     tenant_id   varchar(64)  PK (NOT uuid — keep as-is, dependants
--                              reference this type)
--     tenant_code varchar(50)  NOT NULL
--     tenant_name varchar(255) NULL  (live alias for v1.1 displayName)
--     schema_name varchar(100) NOT NULL
--     status      varchar(20)  NULL DEFAULT 'active'
--     created_at  timestamptz  NULL DEFAULT now()
--     settings    jsonb        NOT NULL DEFAULT '{}'
--
-- Fix mode (live-schema-adapted, additive only):
--   1. DO NOT recreate dos.tenants. The greenfield CREATE TABLE in the
--      original B4 SQL would clash with FK dependants if attempted; the
--      live varchar(64) tenant_id stays.
--   2. ADD COLUMN IF NOT EXISTS for the v1.1 envelope fields that are
--      not yet present:
--        display_name varchar(255)  -- canonical NAME column for envelope
--        parent_tenant_id varchar(64) -- self-FK in matching type
--        primary_domain text
--        custom_domain  text
--        default_locale text NOT NULL DEFAULT 'en'
--        default_rtl    boolean NOT NULL DEFAULT false
--        product_key    text
--        tier           text
--        updated_at     timestamptz NOT NULL DEFAULT now()
--        archived_at    timestamptz
--        metadata       jsonb NOT NULL DEFAULT '{}'::jsonb
--      (settings already exists; metadata is the v1.1 canonical name and
--      is added alongside; resolver may merge metadata + settings.)
--   3. Backfill display_name from tenant_name where display_name is NULL
--      so envelope reads work immediately.
--   4. Add a self-FK on parent_tenant_id pointing at tenants(tenant_id),
--      ON DELETE RESTRICT, idempotently.
--   5. Add the missing indexes (tenant_code unique, custom_domain
--      partial unique, parent FK, status btree).
--   6. Add the missing CHECK constraints (status set, tier set) via
--      pg_constraint guarded DO blocks (constraint may already exist
--      or be defined inline on the column; respect both).
--   7. Add a touch-updated_at trigger so updated_at tracks mutations.
--
-- Idempotent:  yes (IF NOT EXISTS, pg_constraint guards, partial unique)
-- Destructive: no (no DROP, no type change)
-- Review required: yes (canonical schema extension; FK type matched
--                       to live varchar(64) tenant_id for compatibility)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Add the v1.1 envelope columns additively. Order matters so the
--    backfill in step 3 has display_name available.
-- ---------------------------------------------------------------------
ALTER TABLE dos.tenants ADD COLUMN IF NOT EXISTS display_name      varchar(255);
ALTER TABLE dos.tenants ADD COLUMN IF NOT EXISTS parent_tenant_id  varchar(64);
ALTER TABLE dos.tenants ADD COLUMN IF NOT EXISTS primary_domain    text;
ALTER TABLE dos.tenants ADD COLUMN IF NOT EXISTS custom_domain     text;
ALTER TABLE dos.tenants ADD COLUMN IF NOT EXISTS default_locale    text;
ALTER TABLE dos.tenants ADD COLUMN IF NOT EXISTS default_rtl       boolean;
ALTER TABLE dos.tenants ADD COLUMN IF NOT EXISTS product_key       text;
ALTER TABLE dos.tenants ADD COLUMN IF NOT EXISTS tier              text;
ALTER TABLE dos.tenants ADD COLUMN IF NOT EXISTS updated_at        timestamptz;
ALTER TABLE dos.tenants ADD COLUMN IF NOT EXISTS archived_at       timestamptz;
ALTER TABLE dos.tenants ADD COLUMN IF NOT EXISTS metadata          jsonb;

-- Defaults applied via UPDATE so existing 44 rows are populated, then
-- columns marked NOT NULL where appropriate. Splitting ADD/UPDATE/SET
-- keeps the migration safe across PG versions and avoids long table
-- rewrites in cases where the column already had partial data.
UPDATE dos.tenants SET default_locale = COALESCE(default_locale, 'en')          WHERE default_locale IS NULL;
UPDATE dos.tenants SET default_rtl    = COALESCE(default_rtl,    false)         WHERE default_rtl    IS NULL;
UPDATE dos.tenants SET updated_at     = COALESCE(updated_at,     now())         WHERE updated_at     IS NULL;
UPDATE dos.tenants SET metadata       = COALESCE(metadata,       '{}'::jsonb)   WHERE metadata       IS NULL;

ALTER TABLE dos.tenants ALTER COLUMN default_locale SET DEFAULT 'en';
ALTER TABLE dos.tenants ALTER COLUMN default_rtl    SET DEFAULT false;
ALTER TABLE dos.tenants ALTER COLUMN updated_at     SET DEFAULT now();
ALTER TABLE dos.tenants ALTER COLUMN metadata       SET DEFAULT '{}'::jsonb;

DO $$
BEGIN
  -- Set NOT NULL on columns that now have safe defaults and are
  -- backfilled. Wrapped per-column so a partial existing instance
  -- doesn't fail the whole migration.
  PERFORM 1 FROM dos.tenants WHERE default_locale IS NULL LIMIT 1;
  IF NOT FOUND THEN
    EXECUTE 'ALTER TABLE dos.tenants ALTER COLUMN default_locale SET NOT NULL';
  END IF;

  PERFORM 1 FROM dos.tenants WHERE default_rtl IS NULL LIMIT 1;
  IF NOT FOUND THEN
    EXECUTE 'ALTER TABLE dos.tenants ALTER COLUMN default_rtl SET NOT NULL';
  END IF;

  PERFORM 1 FROM dos.tenants WHERE updated_at IS NULL LIMIT 1;
  IF NOT FOUND THEN
    EXECUTE 'ALTER TABLE dos.tenants ALTER COLUMN updated_at SET NOT NULL';
  END IF;

  PERFORM 1 FROM dos.tenants WHERE metadata IS NULL LIMIT 1;
  IF NOT FOUND THEN
    EXECUTE 'ALTER TABLE dos.tenants ALTER COLUMN metadata SET NOT NULL';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. Self-FK for parent_tenant_id. Matching live varchar(64) type.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname  = 'fk_dos_tenants_parent'
       AND conrelid = 'dos.tenants'::regclass
  ) THEN
    ALTER TABLE dos.tenants
      ADD CONSTRAINT fk_dos_tenants_parent
      FOREIGN KEY (parent_tenant_id) REFERENCES dos.tenants(tenant_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3. Backfill display_name from tenant_name (live alias) so envelope
--    reads work immediately. Idempotent: only fills NULLs.
-- ---------------------------------------------------------------------
UPDATE dos.tenants
   SET display_name = tenant_name
 WHERE display_name IS NULL
   AND tenant_name  IS NOT NULL;

-- ---------------------------------------------------------------------
-- 4. Indexes. tenant_id remains the canonical unique key (PK).
--    tenant_code is a human-readable slug that collides on test data
--    (10 of 44 rows share derived email-domain codes). schema_name
--    is implicitly unique. We add a non-unique btree on tenant_code
--    for query speed; a future B4b cleanup may de-duplicate the
--    test rows and promote this to a unique index. Custom_domain
--    gets a partial unique index (NULL is allowed for any number of
--    tenants). Parent and status btree for resolver filters.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_dos_tenants_tenant_code
  ON dos.tenants (tenant_code);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dos_tenants_custom_domain
  ON dos.tenants (custom_domain)
  WHERE custom_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_dos_tenants_parent
  ON dos.tenants (parent_tenant_id)
  WHERE parent_tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_dos_tenants_status
  ON dos.tenants (status);

-- ---------------------------------------------------------------------
-- 5. CHECK constraints. Live status column is varchar(20) without an
--    explicit named constraint; we add one (idempotent guard).
-- ---------------------------------------------------------------------
DO $$
BEGIN
  -- Status set includes 'inactive' to match live data (4 of 44 rows
  -- carry this state; doctrine: data is reality, contract follows).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname  = 'dos_tenants_status_chk'
       AND conrelid = 'dos.tenants'::regclass
  ) THEN
    ALTER TABLE dos.tenants
      ADD CONSTRAINT dos_tenants_status_chk
      CHECK (status IS NULL OR status IN ('active','inactive','suspended','archived','pending','trial'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname  = 'dos_tenants_tier_chk'
       AND conrelid = 'dos.tenants'::regclass
  ) THEN
    ALTER TABLE dos.tenants
      ADD CONSTRAINT dos_tenants_tier_chk
      CHECK (tier IS NULL OR tier IN ('free','starter','professional','enterprise','custom'));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 6. updated_at touch trigger. Idempotent CREATE OR REPLACE; the
--    BEFORE UPDATE trigger only fires if updated_at not explicitly set.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION dos.fn_dos_tenants_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'trg_dos_tenants_touch_updated_at'
       AND tgrelid = 'dos.tenants'::regclass
  ) THEN
    EXECUTE
      'CREATE TRIGGER trg_dos_tenants_touch_updated_at
         BEFORE UPDATE ON dos.tenants
         FOR EACH ROW
         EXECUTE FUNCTION dos.fn_dos_tenants_touch_updated_at()';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 7. Post-condition assertions.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  has_table        boolean;
  has_pk           boolean;
  has_unique_code  boolean;
  has_status_chk   boolean;
  has_tier_chk     boolean;
  has_parent_fk    boolean;
  missing_columns  TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'dos' AND table_name = 'tenants'
  ) INTO has_table;
  IF NOT has_table THEN
    RAISE EXCEPTION 'B4 post-condition failed: dos.tenants table must exist';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
     WHERE t.relname = 'tenants'
       AND t.relnamespace = 'dos'::regnamespace
       AND c.contype = 'p'
  ) INTO has_pk;
  IF NOT has_pk THEN
    RAISE EXCEPTION 'B4 post-condition failed: dos.tenants must have a primary key';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'dos' AND tablename = 'tenants'
       AND indexname  = 'ix_dos_tenants_tenant_code'
  ) INTO has_unique_code;
  IF NOT has_unique_code THEN
    RAISE EXCEPTION 'B4 post-condition failed: ix_dos_tenants_tenant_code must exist';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dos_tenants_status_chk') INTO has_status_chk;
  IF NOT has_status_chk THEN
    RAISE EXCEPTION 'B4 post-condition failed: dos_tenants_status_chk must exist';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dos_tenants_tier_chk') INTO has_tier_chk;
  IF NOT has_tier_chk THEN
    RAISE EXCEPTION 'B4 post-condition failed: dos_tenants_tier_chk must exist';
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_dos_tenants_parent') INTO has_parent_fk;
  IF NOT has_parent_fk THEN
    RAISE EXCEPTION 'B4 post-condition failed: fk_dos_tenants_parent must exist';
  END IF;

  SELECT string_agg(c, ', ') INTO missing_columns
    FROM unnest(ARRAY[
      'display_name','parent_tenant_id','primary_domain','custom_domain',
      'default_locale','default_rtl','product_key','tier',
      'updated_at','archived_at','metadata'
    ]) AS x(c)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'dos' AND table_name = 'tenants'
        AND column_name = x.c
   );
  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'B4 post-condition failed: missing columns %', missing_columns;
  END IF;

  RAISE NOTICE 'B4 OK: dos.tenants extended with v1.1 envelope columns (additive, FK to live varchar(64) tenant_id).';
END $$;

COMMIT;
