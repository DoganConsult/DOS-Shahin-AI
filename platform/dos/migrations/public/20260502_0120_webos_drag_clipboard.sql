-- dos:draft
-- =====================================================================
-- UI-OS — §14 WebOS — split panes, drag/drop audit, clipboard, restore points  (20260502_0120)
--
-- Tables (4) — DKNF via dos.ui_split_orientation_t.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_split_view_states (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  window_state_id     UUID NOT NULL,
  orientation         dos.ui_split_orientation_t NOT NULL,
  split_ratio         NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  pane_a_route_key    VARCHAR(200),
  pane_b_route_key    VARCHAR(200),
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_split_view_states_window_fk
    FOREIGN KEY (window_state_id) REFERENCES dos.ui_window_states(id) ON DELETE CASCADE,
  CONSTRAINT ui_split_view_states_ratio_chk
    CHECK (split_ratio > 0 AND split_ratio < 1)
);

CREATE INDEX IF NOT EXISTS ix_ui_split_view_states_window
  ON dos.ui_split_view_states (window_state_id);

CREATE TABLE IF NOT EXISTS dos.ui_drag_drop_layout_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  user_id       VARCHAR(64) NOT NULL,
  source_kind   VARCHAR(40) NOT NULL,
  source_id     VARCHAR(150),
  target_kind   VARCHAR(40) NOT NULL,
  target_id     VARCHAR(150),
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  accepted      BOOLEAN NOT NULL,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_drag_drop_layout_events_user_time
  ON dos.ui_drag_drop_layout_events (tenant_id, user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_clipboard_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  user_id       VARCHAR(64) NOT NULL,
  item_kind     VARCHAR(40) NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_clipboard_items_user
  ON dos.ui_clipboard_items (tenant_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_ui_clipboard_items_expires
  ON dos.ui_clipboard_items (expires_at);

CREATE TABLE IF NOT EXISTS dos.ui_workspace_restore_points (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  user_id       VARCHAR(64) NOT NULL,
  point_kind    VARCHAR(40) NOT NULL,
  state_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_workspace_restore_points_user
  ON dos.ui_workspace_restore_points (tenant_id, user_id, created_at DESC);

COMMIT;
