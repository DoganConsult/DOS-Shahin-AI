-- dos:draft
-- =====================================================================
-- UI-OS — §8 Search — history, saved queries, command execution log  (20260502_0110)
--
-- Tables (3) — DKNF via dos.ui_command_surface_t.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_search_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  user_id       VARCHAR(64) NOT NULL,
  scope_id      UUID,
  query_text    TEXT NOT NULL,
  query_hash    VARCHAR(64) NOT NULL,
  result_count  INTEGER NOT NULL DEFAULT 0,
  duration_ms   INTEGER,
  searched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_search_history_scope_fk
    FOREIGN KEY (scope_id) REFERENCES dos.ui_search_scopes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_ui_search_history_user_time
  ON dos.ui_search_history (tenant_id, user_id, searched_at DESC);

CREATE INDEX IF NOT EXISTS ix_ui_search_history_query_hash
  ON dos.ui_search_history (tenant_id, query_hash);

CREATE TABLE IF NOT EXISTS dos.ui_search_saved_queries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  user_id       VARCHAR(64) NOT NULL,
  scope_id      UUID,
  query_key     VARCHAR(150) NOT NULL,
  name_key      VARCHAR(150),
  query_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_search_saved_queries_scope_fk
    FOREIGN KEY (scope_id) REFERENCES dos.ui_search_scopes(id) ON DELETE SET NULL,
  CONSTRAINT ui_search_saved_queries_uk
    UNIQUE (tenant_id, user_id, query_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_search_saved_queries_user
  ON dos.ui_search_saved_queries (tenant_id, user_id);

CREATE TABLE IF NOT EXISTS dos.ui_command_execution_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    VARCHAR(64) NOT NULL,
  user_id      VARCHAR(64) NOT NULL,
  command_key  VARCHAR(150) NOT NULL,
  surface      dos.ui_command_surface_t NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  result       VARCHAR(40),
  duration_ms  INTEGER,
  error_code   VARCHAR(100),
  executed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_command_execution_log_user_time
  ON dos.ui_command_execution_log (tenant_id, user_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS ix_ui_command_execution_log_command
  ON dos.ui_command_execution_log (tenant_id, command_key, executed_at DESC);

COMMIT;
