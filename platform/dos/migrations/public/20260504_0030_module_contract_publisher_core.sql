-- 20260504_0030_module_contract_publisher_core.sql
-- Owner: platform / module-contract-publisher.
--
-- Creates the four tables the Module Contract Publisher needs to operate:
--   1. dos.module_contract_errors       — validate/dry-run/publish error ledger
--   2. dos.module_contract_publish_log  — provenance of every successful apply
--   3. dos.workspace_shell_i18n         — DB-driven i18n catalog for shell
--   4. dos.workspace_shell_status_label — DB-driven status pill catalog
--
-- Plus trigger trg_published_by_only on the four publisher-owned tables that
-- forbids manual SQL inserts (rows must declare metadata.published_by =
-- 'contract-publisher@v1' or include a session GUC override the publisher
-- sets at the start of every transaction:
--   SET LOCAL dos.publisher_session = 'contract-publisher@v1';
--
-- Forward-only and idempotent.

BEGIN;

-- ─── 1. error ledger ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.module_contract_errors (
  id               BIGSERIAL PRIMARY KEY,
  module_code      TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  phase            TEXT NOT NULL CHECK (phase IN ('validate','dry-run','publish','activate','verify')),
  error_type       TEXT NOT NULL,
  error_path       TEXT,
  message          TEXT NOT NULL,
  severity         TEXT NOT NULL CHECK (severity IN ('BLOCKER','WARNING','INFO')),
  context          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_mce_module_phase
  ON dos.module_contract_errors(module_code, phase, created_at DESC);

-- ─── 2. publish log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.module_contract_publish_log (
  id                BIGSERIAL PRIMARY KEY,
  module_code       TEXT NOT NULL,
  contract_version  TEXT NOT NULL,
  schema_version    INTEGER NOT NULL,
  contract_sha256   TEXT NOT NULL,
  sql_sha256        TEXT NOT NULL,
  rows_emitted      JSONB NOT NULL DEFAULT '{}'::jsonb,  -- per-table counts
  applied_by        TEXT NOT NULL DEFAULT 'contract-publisher@v1',
  applied_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  summary           TEXT
);
CREATE INDEX IF NOT EXISTS ix_mcpl_module_applied
  ON dos.module_contract_publish_log(module_code, applied_at DESC);

-- ─── 3. workspace-shell i18n catalog ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.workspace_shell_i18n (
  id          BIGSERIAL PRIMARY KEY,
  ns          TEXT NOT NULL,                 -- e.g. 'shell', 'status'
  key         TEXT NOT NULL,                 -- full i18n key (e.g. 'shell.header.brand')
  locale      TEXT NOT NULL CHECK (locale IN ('en','ar')),
  value       TEXT NOT NULL,
  module_code TEXT NOT NULL DEFAULT 'workspace-shell',
  version     INTEGER NOT NULL DEFAULT 1,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(key, locale)
);
CREATE INDEX IF NOT EXISTS ix_wsi_ns_locale
  ON dos.workspace_shell_i18n(ns, locale);

-- ─── 4. workspace-shell status pill catalog ─────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.workspace_shell_status_label (
  id          BIGSERIAL PRIMARY KEY,
  catalog     TEXT NOT NULL CHECK (catalog IN ('tenant','health','sync')),
  code        TEXT NOT NULL,                 -- e.g. 'active', 'degraded'
  label_key   TEXT NOT NULL,                 -- FK-by-convention to dos.workspace_shell_i18n.key
  tone        TEXT NOT NULL CHECK (tone IN ('ok','info','warn','error','critical','neutral')),
  icon        TEXT,
  module_code TEXT NOT NULL DEFAULT 'workspace-shell',
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(catalog, code)
);

-- ─── 5. publisher-only write guard ──────────────────────────────────────────
-- Reject manual INSERT/UPDATE unless the session declares the publisher GUC.
-- The publisher executes `SET LOCAL dos.publisher_session = 'contract-publisher@v1'`
-- inside every emitted transaction. Manual psql sessions cannot satisfy the
-- check without explicit override, which is itself audited.
CREATE OR REPLACE FUNCTION dos.assert_published_by_only() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  publisher TEXT;
BEGIN
  publisher := current_setting('dos.publisher_session', true);
  IF publisher IS NULL OR publisher = '' THEN
    RAISE EXCEPTION
      '[contract-publisher] table %.% is publisher-owned; manual writes forbidden. '
      'Run via `pnpm module:publish <code>`.',
      TG_TABLE_SCHEMA, TG_TABLE_NAME;
  END IF;
  IF publisher <> 'contract-publisher@v1' THEN
    RAISE EXCEPTION
      '[contract-publisher] unknown publisher signature %', publisher;
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workspace_shell_i18n',
    'workspace_shell_status_label',
    'module_contract_publish_log'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_published_by_only ON dos.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_published_by_only '
      'BEFORE INSERT OR UPDATE ON dos.%I '
      'FOR EACH ROW EXECUTE FUNCTION dos.assert_published_by_only()', t);
  END LOOP;
END $$;

-- module_contract_errors is intentionally NOT guarded — validate/dry-run must
-- be able to write errors before any publisher session exists.

-- ─── 6. sanity ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  PERFORM 1 FROM information_schema.tables
   WHERE table_schema='dos' AND table_name='module_contract_errors';
  IF NOT FOUND THEN
    RAISE EXCEPTION '[publisher-core] module_contract_errors not created';
  END IF;
END $$;

COMMIT;
