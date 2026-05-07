-- =====================================================================
-- 20260513_0100_ui_route_event_handler_role_policy.sql
-- Wave 2 — UI-OS resolver upgrades.
--
-- Adds typed tables for two payload pieces previously buried in
-- ui_route_template_binding.props JSONB:
--   - dos.ui_route_event_handler  -> typed event-name -> handler config
--   - dos.ui_route_role_policy    -> per-route writeRoles/readRoles policy
--
-- These tables let UI-OS emit `eventHandlers` and `writeRoles` from rows
-- instead of inline JSON, matching the doctrine: DB stores, resolver
-- normalizes, frontend renders. Backwards-compatible: when no row
-- exists, the existing inline `props.eventHandlers` / `props.writeRoles`
-- continue to win.
--
-- Idempotent.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dos.ui_route_event_handler (
  handler_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route        TEXT NOT NULL,
  event_name   TEXT NOT NULL,
  -- Typed handler shape: { method: 'redirect'|'emit'|'noop', url?, eventName?, payload? }.
  handler      JSONB NOT NULL,
  permission   TEXT,
  enabled      BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ui_route_event_handler UNIQUE (route, event_name)
);

CREATE INDEX IF NOT EXISTS ix_ui_route_event_handler_route
  ON dos.ui_route_event_handler (route, enabled);

CREATE TABLE IF NOT EXISTS dos.ui_route_role_policy (
  policy_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route        TEXT NOT NULL,
  -- Roles that can write/edit on this route (granted via AccessStore).
  write_roles  TEXT[] NOT NULL DEFAULT '{}'::text[],
  -- Roles that can read; empty = inherit from permission_key.
  read_roles   TEXT[] NOT NULL DEFAULT '{}'::text[],
  -- Default current_role to use when AccessStore exposes none.
  default_role TEXT,
  enabled      BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ui_route_role_policy UNIQUE (route)
);

DO $grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_auth') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON dos.ui_route_event_handler TO dos_auth';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON dos.ui_route_role_policy   TO dos_auth';
  END IF;
END
$grants$;

-- ─── Backfill from existing /foundation/sod inline JSON ──────────────────
-- Keeps the inline JSON in place (caller-side wins until inline blob is
-- removed) but surfaces the same data as typed rows so other routes can
-- adopt the same surface immediately.
INSERT INTO dos.ui_route_role_policy (route, write_roles, default_role, enabled)
SELECT b.route,
       ARRAY(SELECT jsonb_array_elements_text(b.props->'writeRoles')) AS write_roles,
       NULL,
       true
  FROM dos.ui_route_template_binding b
 WHERE b.route = '/foundation/sod'
   AND jsonb_typeof(b.props->'writeRoles') = 'array'
ON CONFLICT (route) DO UPDATE SET
  write_roles = EXCLUDED.write_roles,
  enabled     = EXCLUDED.enabled,
  updated_at  = now();

INSERT INTO dos.ui_route_event_handler (route, event_name, handler, enabled, sort_order)
SELECT '/foundation/sod', 'settings.save',
       jsonb_build_object('method','redirect','url','/foundation/sod?saved=1'),
       true, 0
WHERE EXISTS (
  SELECT 1 FROM dos.ui_route_template_binding
   WHERE route='/foundation/sod' AND props ? 'eventHandlers'
)
ON CONFLICT (route, event_name) DO UPDATE SET
  handler = EXCLUDED.handler, updated_at = now();

INSERT INTO dos.ui_route_event_handler (route, event_name, handler, enabled, sort_order)
SELECT '/foundation/sod', 'settings.discard',
       jsonb_build_object('method','redirect','url','/foundation/sod?discarded=1'),
       true, 1
WHERE EXISTS (
  SELECT 1 FROM dos.ui_route_template_binding
   WHERE route='/foundation/sod' AND props ? 'eventHandlers'
)
ON CONFLICT (route, event_name) DO UPDATE SET
  handler = EXCLUDED.handler, updated_at = now();

-- ─── Default writeRoles policy for foundation org-structure routes ──────
-- Wave 2 publishes a baseline write policy for foundation/* so the SPA
-- shows save/edit affordances to the right roles without per-page JSON.
INSERT INTO dos.ui_route_role_policy (route, write_roles, enabled)
VALUES
  ('/foundation/overview',     ARRAY['platform_super_admin','tenant_admin','foundation_admin']::text[], true),
  ('/foundation/organization', ARRAY['platform_super_admin','tenant_admin','foundation_admin','org_admin']::text[], true),
  ('/foundation/business-units', ARRAY['platform_super_admin','tenant_admin','foundation_admin','org_admin']::text[], true),
  ('/foundation/departments',  ARRAY['platform_super_admin','tenant_admin','foundation_admin','hr_manager']::text[], true),
  ('/foundation/teams',        ARRAY['platform_super_admin','tenant_admin','foundation_admin','team_lead']::text[], true),
  ('/foundation/positions',    ARRAY['platform_super_admin','tenant_admin','foundation_admin','hr_manager']::text[], true),
  ('/foundation/locations',    ARRAY['platform_super_admin','tenant_admin','foundation_admin']::text[], true),
  ('/foundation/users',        ARRAY['platform_super_admin','tenant_admin','foundation_admin','user_admin']::text[], true),
  ('/foundation/roles',        ARRAY['platform_super_admin','tenant_admin','foundation_admin','access_admin']::text[], true),
  ('/foundation/policies',     ARRAY['platform_super_admin','tenant_admin','foundation_admin','compliance_admin']::text[], true),
  ('/foundation/committees',   ARRAY['platform_super_admin','tenant_admin','foundation_admin','governance_admin']::text[], true),
  ('/foundation/delegations',  ARRAY['platform_super_admin','tenant_admin','foundation_admin','access_admin']::text[], true),
  ('/foundation/ownership',    ARRAY['platform_super_admin','tenant_admin','foundation_admin','org_admin']::text[], true),
  ('/foundation/permissions',  ARRAY['platform_super_admin','tenant_admin','foundation_admin','access_admin']::text[], true),
  ('/foundation/audit',        ARRAY['platform_super_admin','tenant_admin','auditor']::text[], true),
  ('/foundation/reports',      ARRAY['platform_super_admin','tenant_admin','auditor','compliance_admin']::text[], true),
  ('/foundation/settings',     ARRAY['platform_super_admin','tenant_admin','foundation_admin']::text[], true),
  ('/foundation/diagnostics',  ARRAY['platform_super_admin','tenant_admin']::text[], true),
  ('/foundation/access-review',ARRAY['platform_super_admin','tenant_admin','foundation_admin','access_review_admin']::text[], true),
  ('/foundation/sod',          ARRAY['platform_super_admin','tenant_admin','foundation_admin','sod_admin']::text[], true),
  ('/foundation/governance/sod-rules', ARRAY['platform_super_admin','tenant_admin','foundation_admin','sod_admin']::text[], true),
  ('/foundation/governance/sod-violations', ARRAY['platform_super_admin','tenant_admin','foundation_admin','sod_admin','auditor']::text[], true),
  ('/foundation/governance/authority-matrix', ARRAY['platform_super_admin','tenant_admin','foundation_admin']::text[], true),
  ('/foundation/governance/coi', ARRAY['platform_super_admin','tenant_admin','foundation_admin','compliance_admin']::text[], true),
  ('/foundation/governance/policy-acks', ARRAY['platform_super_admin','tenant_admin','foundation_admin','compliance_admin']::text[], true),
  ('/foundation/governance/training', ARRAY['platform_super_admin','tenant_admin','foundation_admin','hr_manager']::text[], true)
ON CONFLICT (route) DO UPDATE SET
  write_roles = EXCLUDED.write_roles,
  enabled     = EXCLUDED.enabled,
  updated_at  = now();

DO $verify$
DECLARE
  policy_count INT;
  handler_count INT;
BEGIN
  SELECT COUNT(*) FROM dos.ui_route_role_policy WHERE route LIKE '/foundation/%' INTO policy_count;
  SELECT COUNT(*) FROM dos.ui_route_event_handler WHERE route LIKE '/foundation/%' INTO handler_count;
  IF policy_count < 20 THEN
    RAISE EXCEPTION 'role policy seed insufficient (%)', policy_count;
  END IF;
  RAISE NOTICE 'ui_route_role_policy=% ui_route_event_handler=%', policy_count, handler_count;
END
$verify$;

COMMIT;
