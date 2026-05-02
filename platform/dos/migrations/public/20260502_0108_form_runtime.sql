-- dos:draft
-- =====================================================================
-- UI-OS — §7 Forms — submissions, drafts, attachments, approval links  (20260502_0108)
--
-- Tables created (4) — DKNF via dos.ui_form_submission_status_t / dos.ui_form_decision_t.
-- 4NF: attachments and approval_links live in their own tables instead of
-- arrays on submissions.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_form_submissions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            VARCHAR(64) NOT NULL,
  form_definition_id   UUID NOT NULL,
  submitter_user_id    VARCHAR(64) NOT NULL,
  entity_kind          VARCHAR(100),
  entity_id            UUID,
  payload              JSONB NOT NULL DEFAULT '{}'::jsonb,
  status               dos.ui_form_submission_status_t NOT NULL DEFAULT 'draft',
  submitted_at         TIMESTAMPTZ,
  approved_at          TIMESTAMPTZ,
  rejected_at          TIMESTAMPTZ,
  withdrawn_at         TIMESTAMPTZ,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_form_submissions_form_fk
    FOREIGN KEY (form_definition_id) REFERENCES dos.ui_form_definitions(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_ui_form_submissions_tenant_form
  ON dos.ui_form_submissions (tenant_id, form_definition_id);

CREATE INDEX IF NOT EXISTS ix_ui_form_submissions_submitter
  ON dos.ui_form_submissions (tenant_id, submitter_user_id);

CREATE INDEX IF NOT EXISTS ix_ui_form_submissions_entity
  ON dos.ui_form_submissions (tenant_id, entity_kind, entity_id) WHERE entity_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS dos.ui_form_drafts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            VARCHAR(64) NOT NULL,
  form_definition_id   UUID NOT NULL,
  user_id              VARCHAR(64) NOT NULL,
  entity_kind          VARCHAR(100),
  entity_id            UUID,
  payload              JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_autosave_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_form_drafts_form_fk
    FOREIGN KEY (form_definition_id) REFERENCES dos.ui_form_definitions(id) ON DELETE CASCADE,
  CONSTRAINT ui_form_drafts_uk
    UNIQUE NULLS NOT DISTINCT (tenant_id, form_definition_id, user_id, entity_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_form_drafts_user
  ON dos.ui_form_drafts (tenant_id, user_id);

CREATE TABLE IF NOT EXISTS dos.ui_form_attachments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  form_submission_id  UUID,
  form_draft_id       UUID,
  file_name           VARCHAR(255) NOT NULL,
  mime_type           VARCHAR(150) NOT NULL,
  size_bytes          BIGINT NOT NULL,
  storage_url         TEXT NOT NULL,
  checksum            VARCHAR(128),
  uploaded_by         VARCHAR(64),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_form_attachments_owner_chk
    CHECK ((form_submission_id IS NOT NULL)::int + (form_draft_id IS NOT NULL)::int = 1),
  CONSTRAINT ui_form_attachments_size_chk
    CHECK (size_bytes >= 0),
  CONSTRAINT ui_form_attachments_submission_fk
    FOREIGN KEY (form_submission_id) REFERENCES dos.ui_form_submissions(id) ON DELETE CASCADE,
  CONSTRAINT ui_form_attachments_draft_fk
    FOREIGN KEY (form_draft_id) REFERENCES dos.ui_form_drafts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_ui_form_attachments_tenant
  ON dos.ui_form_attachments (tenant_id);

CREATE INDEX IF NOT EXISTS ix_ui_form_attachments_submission
  ON dos.ui_form_attachments (form_submission_id) WHERE form_submission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ui_form_attachments_draft
  ON dos.ui_form_attachments (form_draft_id) WHERE form_draft_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS dos.ui_form_approval_links (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            VARCHAR(64) NOT NULL,
  form_submission_id   UUID NOT NULL,
  workflow_run_id      UUID,
  approval_step_code   VARCHAR(150) NOT NULL,
  decision             dos.ui_form_decision_t NOT NULL DEFAULT 'pending',
  decided_by           VARCHAR(64),
  decided_at           TIMESTAMPTZ,
  comments             TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_form_approval_links_submission_fk
    FOREIGN KEY (form_submission_id) REFERENCES dos.ui_form_submissions(id) ON DELETE CASCADE,
  CONSTRAINT ui_form_approval_links_uk
    UNIQUE (form_submission_id, approval_step_code)
);

CREATE INDEX IF NOT EXISTS ix_ui_form_approval_links_tenant
  ON dos.ui_form_approval_links (tenant_id);

COMMIT;
