-- dos:draft
-- =====================================================================
-- UI-OS — <SECTION> — <SHORT_DESCRIPTION>  (20260502_<NNNN>)
--
-- Master checklist §<N> "<section_name>" coverage (subset).
--
-- Plan: docs/migration/ui-os-tables-0100-0130-plan.md
-- Conventions:
--   - id UUID PK gen_random_uuid()
--   - tenant_id VARCHAR(64) NOT NULL (indexed)  — except platform-global tables
--   - audit cols: created_by, updated_by, created_at, updated_at
--   - is_active BOOLEAN NOT NULL DEFAULT true
--   - i18n via *_key columns, never raw strings
--   - JSONB for free-form structured payloads
--   - FKs ON DELETE CASCADE for owned children, ON DELETE SET NULL for soft refs
--
-- DOUBLE-LOCKED FROM AUTO-APPLY:
--   1. `-- dos:draft` header  → migration-runner.ts draftSkipReason()
--   2. `_drafts/` directory   → migration-runner.ts path-based skip
--
-- Promote-to-apply path (in this order):
--   a) Wave gate green per ui-os-gap-closure-plan.md
--   b) Move file from _drafts/ to public/
--   c) Remove `-- dos:draft` header
--   d) Add entry to migrations-index.json
--   e) Register paired _down.sql (also moved to public/)
--   f) Run migration-runner up
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- Example pattern — replace <table> and columns with the real schema
-- from docs/migration/ui-os-tables-0100-0130-plan.md
--
-- CREATE TABLE IF NOT EXISTS dos.<table> (
--   id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   tenant_id     VARCHAR(64) NOT NULL,
--   <natural_key> VARCHAR(150) NOT NULL,
--   <business_columns ...>,
--   metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
--   is_active     BOOLEAN NOT NULL DEFAULT TRUE,
--   created_by    VARCHAR(64),
--   updated_by    VARCHAR(64),
--   created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   CONSTRAINT <table>_tenant_natural_uk UNIQUE (tenant_id, <natural_key>)
-- );
--
-- CREATE INDEX IF NOT EXISTS ix_<table>_tenant
--   ON dos.<table> (tenant_id);
--
-- CREATE INDEX IF NOT EXISTS ix_<table>_tenant_active
--   ON dos.<table> (tenant_id) WHERE is_active = TRUE;

COMMIT;
