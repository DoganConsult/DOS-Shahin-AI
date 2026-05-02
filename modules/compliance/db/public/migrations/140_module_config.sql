-- compliance_module_config — runtime config (list/detail/form/filters/columns/actions/views)
-- One row per (tenant_id, kind, type, version). tenant_id NULL = platform template.
CREATE TABLE IF NOT EXISTS compliance_module_config (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     TEXT,
  kind          TEXT NOT NULL CHECK (kind IN ('list','detail','form','filters','columns','actions','views')),
  type          TEXT NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  payload       JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    TEXT,
  UNIQUE (tenant_id, kind, type, version)
);

CREATE INDEX IF NOT EXISTS ix_compliance_module_config_lookup
  ON compliance_module_config (kind, type, tenant_id);

-- compliance_user_view_preferences — per-user saved views/presets
CREATE TABLE IF NOT EXISTS compliance_user_view_preferences (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  view_key      TEXT NOT NULL,
  scope_type    TEXT NOT NULL,                          -- e.g. 'obligations','controls','findings'
  payload       JSONB NOT NULL,
  is_shared     BOOLEAN NOT NULL DEFAULT FALSE,
  shared_with   TEXT[],                                  -- explicit user ids when not org-wide
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, scope_type, view_key)
);

CREATE INDEX IF NOT EXISTS ix_compliance_user_views_scope
  ON compliance_user_view_preferences (tenant_id, scope_type);
