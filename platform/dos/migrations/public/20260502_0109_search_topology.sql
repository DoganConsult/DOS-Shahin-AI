-- dos:draft
-- =====================================================================
-- UI-OS — §8 Search — providers, indexes, scopes  (20260502_0109)
--
-- Tables created (4) — 1NF: index_codes promoted to scope_indexes child table.
--   1. dos.ui_search_providers
--   2. dos.ui_search_indexes
--   3. dos.ui_search_scopes
--   4. dos.ui_search_scope_indexes  (1NF child for scope→index many-to-many)
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_search_providers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  provider_code     VARCHAR(100) NOT NULL,
  display_name_key  VARCHAR(150),
  endpoint_url      TEXT,
  auth_secret_ref   VARCHAR(150),
  config            JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        VARCHAR(64),
  updated_by        VARCHAR(64),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_search_providers_uk
    UNIQUE (tenant_id, provider_code)
);

CREATE INDEX IF NOT EXISTS ix_ui_search_providers_tenant
  ON dos.ui_search_providers (tenant_id);

CREATE TABLE IF NOT EXISTS dos.ui_search_indexes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  provider_id     UUID NOT NULL,
  index_code      VARCHAR(150) NOT NULL,
  module_code     VARCHAR(100),
  schema_payload  JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_built_at   TIMESTAMPTZ,
  document_count  INTEGER,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_search_indexes_provider_fk
    FOREIGN KEY (provider_id) REFERENCES dos.ui_search_providers(id) ON DELETE CASCADE,
  CONSTRAINT ui_search_indexes_uk
    UNIQUE (tenant_id, index_code)
);

CREATE INDEX IF NOT EXISTS ix_ui_search_indexes_tenant
  ON dos.ui_search_indexes (tenant_id);

CREATE TABLE IF NOT EXISTS dos.ui_search_scopes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  scope_code        VARCHAR(150) NOT NULL,
  display_name_key  VARCHAR(150),
  default_filters   JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_search_scopes_uk
    UNIQUE (tenant_id, scope_code)
);

CREATE INDEX IF NOT EXISTS ix_ui_search_scopes_tenant
  ON dos.ui_search_scopes (tenant_id);

-- 1NF child: explodes the prior `index_codes TEXT[]` into a real m2m
CREATE TABLE IF NOT EXISTS dos.ui_search_scope_indexes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  scope_id        UUID NOT NULL,
  index_id        UUID NOT NULL,
  weight          INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_search_scope_indexes_scope_fk
    FOREIGN KEY (scope_id) REFERENCES dos.ui_search_scopes(id) ON DELETE CASCADE,
  CONSTRAINT ui_search_scope_indexes_index_fk
    FOREIGN KEY (index_id) REFERENCES dos.ui_search_indexes(id) ON DELETE CASCADE,
  CONSTRAINT ui_search_scope_indexes_uk
    UNIQUE (scope_id, index_id),
  CONSTRAINT ui_search_scope_indexes_weight_chk
    CHECK (weight > 0)
);

CREATE INDEX IF NOT EXISTS ix_ui_search_scope_indexes_tenant
  ON dos.ui_search_scope_indexes (tenant_id);

COMMIT;
