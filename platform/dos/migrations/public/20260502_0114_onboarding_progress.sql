-- dos:draft
-- =====================================================================
-- UI-OS — §10 Onboarding — empty states, checklists, progress, release notes  (20260502_0114)
--
-- Tables (6) — DKNF via dos.ui_checklist_step_status_t.
-- 1NF: ui_checklist_steps replaces former `steps JSONB` array on checklists
-- (steps are first-class entities — they have status per user).
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_empty_state_content (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  surface_key     VARCHAR(200) NOT NULL,
  title_key       VARCHAR(150),
  body_key        VARCHAR(200),
  cta_action_code VARCHAR(150),
  illustration_key VARCHAR(150),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_empty_state_content_uk
    UNIQUE (tenant_id, surface_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_empty_state_content_tenant
  ON dos.ui_empty_state_content (tenant_id);

CREATE TABLE IF NOT EXISTS dos.ui_checklists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  checklist_key VARCHAR(150) NOT NULL,
  audience      VARCHAR(80) NOT NULL,
  title_key     VARCHAR(150),
  description_key VARCHAR(200),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_checklists_uk
    UNIQUE (tenant_id, checklist_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_checklists_tenant
  ON dos.ui_checklists (tenant_id);

-- 1NF child: explodes the prior `steps JSONB` array
CREATE TABLE IF NOT EXISTS dos.ui_checklist_steps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  checklist_id    UUID NOT NULL,
  step_key        VARCHAR(150) NOT NULL,
  display_order   INTEGER NOT NULL DEFAULT 0,
  title_key       VARCHAR(150),
  description_key VARCHAR(200),
  cta_action_code VARCHAR(150),
  is_required     BOOLEAN NOT NULL DEFAULT TRUE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_checklist_steps_checklist_fk
    FOREIGN KEY (checklist_id) REFERENCES dos.ui_checklists(id) ON DELETE CASCADE,
  CONSTRAINT ui_checklist_steps_uk
    UNIQUE (checklist_id, step_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_checklist_steps_checklist
  ON dos.ui_checklist_steps (checklist_id);

CREATE TABLE IF NOT EXISTS dos.ui_user_checklist_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  checklist_id    UUID NOT NULL,
  user_id         VARCHAR(64) NOT NULL,
  step_id         UUID NOT NULL,
  status          dos.ui_checklist_step_status_t NOT NULL DEFAULT 'not_started',
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_user_checklist_progress_step_fk
    FOREIGN KEY (step_id) REFERENCES dos.ui_checklist_steps(id) ON DELETE CASCADE,
  CONSTRAINT ui_user_checklist_progress_checklist_fk
    FOREIGN KEY (checklist_id) REFERENCES dos.ui_checklists(id) ON DELETE CASCADE,
  CONSTRAINT ui_user_checklist_progress_uk
    UNIQUE (user_id, step_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_user_checklist_progress_user
  ON dos.ui_user_checklist_progress (tenant_id, user_id);

CREATE TABLE IF NOT EXISTS dos.ui_release_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  version       VARCHAR(40) NOT NULL,
  locale        VARCHAR(20) NOT NULL DEFAULT 'en',
  published_at  TIMESTAMPTZ NOT NULL,
  title_key     VARCHAR(150),
  body_md       TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_release_notes_uk
    UNIQUE (tenant_id, version, locale)
);

CREATE INDEX IF NOT EXISTS ix_ui_release_notes_tenant_published
  ON dos.ui_release_notes (tenant_id, published_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_user_release_notes_read (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  release_note_id UUID NOT NULL,
  user_id         VARCHAR(64) NOT NULL,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_user_release_notes_read_note_fk
    FOREIGN KEY (release_note_id) REFERENCES dos.ui_release_notes(id) ON DELETE CASCADE,
  CONSTRAINT ui_user_release_notes_read_uk
    UNIQUE (release_note_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_user_release_notes_read_user
  ON dos.ui_user_release_notes_read (tenant_id, user_id);

COMMIT;
