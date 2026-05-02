-- dos:draft
-- =====================================================================
-- F.1b — Enum & role label catalog (20260502_0136)
--
-- Every status pill, role chip, lifecycle badge in the UI must resolve
-- through these tables — never hardcode `status === 'active' ? 'Active'`
-- mappings in Angular templates.
--
-- Tables:
--   1. dos.entity_status_labels — for tenant.status, trial.status,
--                                 subscription.status, employee.status,
--                                 policy.state, risk.state, etc.
--                                 Each row pairs a status_code with an
--                                 i18n key + tone + icon.
--   2. dos.role_labels          — for membership.role_code, openfga
--                                 roles, RBAC role display names.
--
-- The i18n key value is resolved via dos.i18n_translations at render
-- time. The tone/icon decide the visual variant of the status pill
-- (`<dos-widget-frame tone="...">` or status-pill component).
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── 1. entity status labels ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.entity_status_labels (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     VARCHAR(80)  NOT NULL,              -- 'tenant', 'trial', 'subscription', 'employee', ...
  status_code     VARCHAR(80)  NOT NULL,              -- 'active', 'trial_expired', 'suspended', ...
  label_key       VARCHAR(300) NOT NULL,              -- i18n key e.g. 'status.tenant.active'
  description_key VARCHAR(300),
  tone            VARCHAR(20)  NOT NULL DEFAULT 'neutral'
                  CHECK (tone IN ('neutral','brand','accent','success','warning','danger','info')),
  icon            VARCHAR(80),                         -- e.g. 'check-circle', 'alert-triangle'
  sort_order      INTEGER      NOT NULL DEFAULT 0,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT entity_status_labels_uk UNIQUE (entity_type, status_code)
);

CREATE INDEX IF NOT EXISTS ix_entity_status_labels_type
  ON dos.entity_status_labels (entity_type, is_active);

-- ── 2. role labels ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.role_labels (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code       VARCHAR(80)  NOT NULL,              -- 'owner', 'tenant_admin', 'auditor', ...
  scope           VARCHAR(40)  NOT NULL DEFAULT 'tenant'
                  CHECK (scope IN ('platform','tenant','module','project')),
  label_key       VARCHAR(300) NOT NULL,
  description_key VARCHAR(300),
  rank            INTEGER      NOT NULL DEFAULT 100,  -- lower number = higher in hierarchy
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT role_labels_uk UNIQUE (role_code, scope)
);

CREATE INDEX IF NOT EXISTS ix_role_labels_scope
  ON dos.role_labels (scope, is_active);

COMMIT;
