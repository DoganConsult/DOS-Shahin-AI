-- Owner: dos-platform / DOS Master.
--
-- DOS MASTER PLAN — M4 Day 1.
-- Materialized view that backs the JWE-signed `/api/workspace/bootstrap`
-- response. Keyed on (tenantId, role_set_hash, ui_catalog_version) per
-- Doctrine Article 2.
--
-- Source tables:
--   - dos.ui_route_template_binding         (Carbon route catalog)
--   - dos.workspace_shell_binding           (10 shell surfaces per tenant)
--   - dos.dynamic_ui_component_registry     (component_key → carbon_key)
--
-- The MV is intentionally degenerate at M4 D1: it returns one row per
-- tenant with a JSON aggregate of the route catalog and shell surfaces
-- so the BFF wire contract can ship today. M5 will add per-role
-- materialization keyed on roleSetHash + ui_catalog_version.
--
-- Idempotent.

BEGIN;

CREATE MATERIALIZED VIEW IF NOT EXISTS dos.mv_workspace_bootstrap AS
SELECT
  t.tenant_id::text                                                   AS tenant_id,
  'v1'::text                                                          AS ui_catalog_version,
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'route',     b.route,
      'archetype', b.archetype,
      'titleEn',   b.title_en,
      'titleAr',   b.title_ar
    ) ORDER BY b.route)
    FROM dos.ui_route_template_binding b
  ), '[]'::jsonb)                                                      AS routes,
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'componentKey', s.component_key,
      'enabled',      s.enabled,
      'position',     s.position,
      'permsRequired', s.perms_required
    ) ORDER BY s.component_key)
    FROM dos.workspace_shell_binding s
    WHERE s.tenant_id = t.tenant_id
  ), '[]'::jsonb)                                                      AS shell,
  COALESCE((
    SELECT jsonb_agg(DISTINCT jsonb_build_object(
      'componentKey', r.component_key,
      'carbonKey',    r.carbon_key
    ))
    FROM dos.dynamic_ui_component_registry r
    WHERE r.approval_status = 'approved'
  ), '[]'::jsonb)                                                      AS components,
  now()                                                                AS refreshed_at
FROM (
  SELECT DISTINCT tenant_id FROM dos.workspace_shell_binding
) t;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_workspace_bootstrap_key
  ON dos.mv_workspace_bootstrap (tenant_id, ui_catalog_version);

COMMENT ON MATERIALIZED VIEW dos.mv_workspace_bootstrap IS
  'M4 D1 — backing store for JWE-signed /api/workspace/bootstrap. Refreshed by workspace-bff on permission/module/binding mutations (M5 SSE channel).';

COMMIT;
