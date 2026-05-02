-- Tenant-schema RBAC tables. Each tenant gets these in its own schema.
-- Seed projection from profiles/<p>/registries/{permissions,roles}.registry.json.
BEGIN;
-- Run with: SET search_path = "<tenant_schema>"; \i 03_tenant_rbac.sql
CREATE TABLE IF NOT EXISTS permissions (
  code            TEXT PRIMARY KEY,
  module_code     TEXT NOT NULL,
  verb            TEXT NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS roles (
  code            TEXT PRIMARY KEY,
  module_code     TEXT NOT NULL,
  template        TEXT NOT NULL,                -- executive_owner|module_lead|approver|contributor|viewer
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS role_permissions (
  role_code       TEXT NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_code, permission_code)
);
CREATE INDEX IF NOT EXISTS rp_perm_idx ON role_permissions (permission_code);
COMMIT;
