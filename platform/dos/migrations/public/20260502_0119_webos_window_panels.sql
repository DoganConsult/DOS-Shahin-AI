-- dos:draft
-- =====================================================================
-- UI-OS — §14 WebOS — sessions, windows, panels, tabs  (20260502_0119)
--
-- Tables (4) — 4NF: tabs are children of windows, not arrays on windows.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_workspace_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64) NOT NULL,
  user_id        VARCHAR(64) NOT NULL,
  client_id      VARCHAR(120),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at       TIMESTAMPTZ,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ix_ui_workspace_sessions_user
  ON dos.ui_workspace_sessions (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS ix_ui_workspace_sessions_active
  ON dos.ui_workspace_sessions (tenant_id, last_active_at DESC) WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS dos.ui_window_states (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             VARCHAR(64) NOT NULL,
  workspace_session_id  UUID NOT NULL,
  window_key            VARCHAR(150) NOT NULL,
  route_key             VARCHAR(200),
  position              JSONB NOT NULL DEFAULT '{}'::jsonb,
  z_index               INTEGER NOT NULL DEFAULT 0,
  is_minimized          BOOLEAN NOT NULL DEFAULT FALSE,
  is_maximized          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_window_states_session_fk
    FOREIGN KEY (workspace_session_id) REFERENCES dos.ui_workspace_sessions(id) ON DELETE CASCADE,
  CONSTRAINT ui_window_states_uk
    UNIQUE (workspace_session_id, window_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_window_states_session
  ON dos.ui_window_states (workspace_session_id);

CREATE TABLE IF NOT EXISTS dos.ui_panel_states (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             VARCHAR(64) NOT NULL,
  workspace_session_id  UUID NOT NULL,
  panel_key             VARCHAR(150) NOT NULL,
  is_pinned             BOOLEAN NOT NULL DEFAULT FALSE,
  is_collapsed          BOOLEAN NOT NULL DEFAULT FALSE,
  width_px              INTEGER,
  position              VARCHAR(20),
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_panel_states_session_fk
    FOREIGN KEY (workspace_session_id) REFERENCES dos.ui_workspace_sessions(id) ON DELETE CASCADE,
  CONSTRAINT ui_panel_states_uk
    UNIQUE (workspace_session_id, panel_key)
);

CREATE TABLE IF NOT EXISTS dos.ui_tab_states (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  window_state_id   UUID NOT NULL,
  tab_key           VARCHAR(150) NOT NULL,
  tab_order         INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned         BOOLEAN NOT NULL DEFAULT FALSE,
  route_key         VARCHAR(200),
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_tab_states_window_fk
    FOREIGN KEY (window_state_id) REFERENCES dos.ui_window_states(id) ON DELETE CASCADE,
  CONSTRAINT ui_tab_states_uk
    UNIQUE (window_state_id, tab_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_tab_states_window
  ON dos.ui_tab_states (window_state_id);

COMMIT;
