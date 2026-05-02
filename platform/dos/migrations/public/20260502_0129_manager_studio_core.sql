-- dos:draft
-- =====================================================================
-- UI-OS — §20 UI Manager Studio — projects, drafts, locks, comments  (20260502_0129)
--
-- Tables (4) — DKNF via dos.ui_target_kind_t.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_manager_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  project_key     VARCHAR(150) NOT NULL,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  owner_user_id   VARCHAR(64) NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_manager_projects_uk
    UNIQUE (tenant_id, project_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_manager_projects_owner
  ON dos.ui_manager_projects (tenant_id, owner_user_id);

CREATE TABLE IF NOT EXISTS dos.ui_manager_drafts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  project_id    UUID NOT NULL,
  target_kind   dos.ui_target_kind_t NOT NULL,
  target_id     VARCHAR(150) NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  state         dos.ui_manager_draft_state_t NOT NULL DEFAULT 'draft',
  author_id     VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_manager_drafts_project_fk
    FOREIGN KEY (project_id) REFERENCES dos.ui_manager_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_ui_manager_drafts_project
  ON dos.ui_manager_drafts (project_id);

CREATE INDEX IF NOT EXISTS ix_ui_manager_drafts_target
  ON dos.ui_manager_drafts (tenant_id, target_kind, target_id);

CREATE TABLE IF NOT EXISTS dos.ui_manager_locks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            VARCHAR(64) NOT NULL,
  target_kind          dos.ui_target_kind_t NOT NULL,
  target_id            VARCHAR(150) NOT NULL,
  locked_by_user_id    VARCHAR(64) NOT NULL,
  locked_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at           TIMESTAMPTZ NOT NULL,
  released_at          TIMESTAMPTZ,
  CONSTRAINT ui_manager_locks_uk
    UNIQUE (target_kind, target_id, released_at)
);

CREATE INDEX IF NOT EXISTS ix_ui_manager_locks_active
  ON dos.ui_manager_locks (target_kind, target_id) WHERE released_at IS NULL;

CREATE TABLE IF NOT EXISTS dos.ui_manager_review_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  draft_id      UUID NOT NULL,
  author_id     VARCHAR(64) NOT NULL,
  body          TEXT NOT NULL,
  resolved      BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by   VARCHAR(64),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_manager_review_comments_draft_fk
    FOREIGN KEY (draft_id) REFERENCES dos.ui_manager_drafts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_ui_manager_review_comments_draft
  ON dos.ui_manager_review_comments (draft_id, created_at DESC);

COMMIT;
