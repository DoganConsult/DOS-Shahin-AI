-- =====================================================================
-- Platform inventory seed (20260502_0144) — Wave W7
--
-- SCOPE: platform/ ONLY. Business modules and product consumers are
-- intentionally NOT touched (deferred to a later wave per operator).
--
-- Inventoried platform layers (under /platform):
--   dauth, ai, dos, dnoc, dsoc, foundation, workflow, ui-system,
--   access, runtime, config-center, core
--
-- Mapped to the 9 DNA module rows already enrolled in 0140:
--   dauth, config-center, tenant-management, multi-tenant-mgmt,
--   foundation-admin, dos-platform, dnoc, dsoc, ai-platform
--
-- Seeds:
--   1. dos.module_manifests             — 1 row per DNA module
--   2. dos.module_manifest_permissions  — required platform-admin perms
--   3. dos.module_capabilities          — capabilities (1 row per cap)
--   4. dos.module_health_endpoints      — DNA module → health URL
--   5. dos.service_health_probes        — derived from ui_service_registry
--   6. dos.service_endpoints            — the 4 W4 platform-admin GETs
--
-- 6NF: every multi-valued attribute lives in a junction child. No
-- TEXT[] / JSONB-of-refs anywhere. Pre-flight assertion enforces it.
-- =====================================================================
BEGIN;

-- ── 0. 6NF pre-flight ───────────────────────────────────────────────
DO $$
DECLARE bad TEXT;
BEGIN
  SELECT format('%I.%I.%I', table_schema, table_name, column_name)
    INTO bad
    FROM information_schema.columns
   WHERE table_schema = 'dos'
     AND table_name IN (
       'module_manifests','module_manifest_permissions','module_capability_flags',
       'module_health_endpoints','service_health_probes','service_endpoints'
     )
     AND data_type = 'ARRAY'
   LIMIT 1;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '6NF violation on W7 target: %', bad;
  END IF;
END $$;

-- =====================================================================
-- 1. module_manifests — one default manifest row per DNA module.
-- =====================================================================
INSERT INTO dos.module_manifests
  (module_code, display_i18n_key, description_i18n_key, default_route,
   icon_glyph, tone, source_path, registry_status)
VALUES
  ('dauth',             'platform.dauth.display',             'platform.dauth.description',
     '/admin/dauth',             'enterprise', 'brand',  'platform/dauth',             'active'),
  ('config-center',     'platform.config-center.display',     'platform.config-center.description',
     '/admin/config-center',     'settings',   'info',   'platform/config-center',     'active'),
  ('tenant-management', 'platform.tenant-management.display', 'platform.tenant-management.description',
     '/admin/tenants',           'enterprise', 'brand',  'services/tenant-service',    'active'),
  ('multi-tenant-mgmt', 'platform.multi-tenant.display',      'platform.multi-tenant.description',
     '/admin/multi-tenant',      'cloud-app',  'info',   'platform/dos',               'active'),
  ('foundation-admin',  'platform.foundation.display',        'platform.foundation.description',
     '/admin/foundation',        'enterprise', 'brand',  'platform/foundation',        'active'),
  ('dos-platform',      'platform.dos.display',               'platform.dos.description',
     '/admin/dos',               'application','accent', 'platform/dos',               'active'),
  ('dnoc',              'platform.dnoc.display',              'platform.dnoc.description',
     '/admin/dnoc',              'data-2',     'info',   'platform/dnoc',              'active'),
  ('dsoc',              'platform.dsoc.display',              'platform.dsoc.description',
     '/admin/dsoc',              'security',   'warning','platform/dsoc',              'active'),
  ('ai-platform',       'platform.ai.display',                'platform.ai.description',
     '/admin/ai',                'flow',       'accent', 'platform/ai',                'active')
ON CONFLICT (module_code) DO UPDATE
   SET display_i18n_key      = EXCLUDED.display_i18n_key,
       description_i18n_key  = EXCLUDED.description_i18n_key,
       default_route         = EXCLUDED.default_route,
       icon_glyph            = EXCLUDED.icon_glyph,
       tone                  = EXCLUDED.tone,
       source_path           = EXCLUDED.source_path,
       registry_status       = EXCLUDED.registry_status,
       updated_at            = NOW();

-- =====================================================================
-- 2. module_manifest_permissions — required perms (one per row).
-- =====================================================================
INSERT INTO dos.module_manifest_permissions (module_code, permission_code)
SELECT m.code, p.perm
  FROM (VALUES
    ('dauth','platform.dauth.read'), ('dauth','platform.dauth.admin'),
    ('config-center','platform.config-center.read'), ('config-center','platform.config-center.admin'),
    ('tenant-management','platform.tenants.read'), ('tenant-management','platform.tenants.admin'),
    ('multi-tenant-mgmt','platform.multi-tenant.read'), ('multi-tenant-mgmt','platform.multi-tenant.admin'),
    ('foundation-admin','platform.foundation.read'), ('foundation-admin','platform.foundation.admin'),
    ('dos-platform','platform.dos.read'), ('dos-platform','platform.dos.admin'),
    ('dnoc','platform.dnoc.read'), ('dnoc','platform.dnoc.admin'),
    ('dsoc','platform.dsoc.read'), ('dsoc','platform.dsoc.admin'),
    ('ai-platform','platform.ai.read'), ('ai-platform','platform.ai.admin')
  ) AS p(code, perm)
  JOIN (SELECT module_code AS code FROM dos.module_manifests) AS m USING (code)
ON CONFLICT (module_code, permission_code) DO NOTHING;

-- =====================================================================
-- 3. module_capability_flags — one flag per row, scalar value.
--    Note: pre-existing dos.module_capabilities (capability registry,
--    a different shape) is owned by an earlier migration. We add a
--    dedicated 6NF flags child here for per-DNA-module capability
--    declarations to avoid conflicting with that registry.
-- =====================================================================
CREATE TABLE IF NOT EXISTS dos.module_capability_flags (
  module_code      VARCHAR(100) NOT NULL REFERENCES dos.module_manifests(module_code) ON DELETE CASCADE,
  capability_key   VARCHAR(120) NOT NULL,
  capability_value TEXT         NOT NULL DEFAULT 'true',
  PRIMARY KEY (module_code, capability_key)
);

INSERT INTO dos.module_capability_flags (module_code, capability_key, capability_value)
VALUES
  ('dauth','supports_mfa','true'),
  ('dauth','supports_sod','true'),
  ('dauth','supports_delegation','true'),
  ('dauth','supports_session_audit','true'),
  ('config-center','supports_dynamic_ui','true'),
  ('config-center','supports_tenant_overrides','true'),
  ('config-center','supports_publish_versioning','true'),
  ('tenant-management','supports_self_registration','true'),
  ('tenant-management','supports_membership','true'),
  ('tenant-management','supports_branding','true'),
  ('multi-tenant-mgmt','supports_rls','true'),
  ('multi-tenant-mgmt','supports_search_path','true'),
  ('foundation-admin','supports_org_lifecycle','true'),
  ('foundation-admin','supports_identity_directory','true'),
  ('dos-platform','supports_module_registry','true'),
  ('dos-platform','supports_event_bus','true'),
  ('dos-platform','supports_observability','true'),
  ('dnoc','supports_job_monitor','true'),
  ('dnoc','supports_network_telemetry','true'),
  ('dsoc','supports_security_jobs','true'),
  ('dsoc','supports_threat_telemetry','true'),
  ('ai-platform','supports_agents','true'),
  ('ai-platform','supports_governance','true'),
  ('ai-platform','supports_squads','true'),
  ('ai-platform','supports_workflow_agents','true')
ON CONFLICT (module_code, capability_key) DO UPDATE
   SET capability_value = EXCLUDED.capability_value;

GRANT SELECT, INSERT, UPDATE, DELETE ON dos.module_capability_flags TO dos_app, dos_auth;

-- =====================================================================
-- 4. module_health_endpoints — derive from ui_service_registry rows
--    that map to a DNA module. One probe per (module, service).
-- =====================================================================
INSERT INTO dos.module_health_endpoints
  (module_code, probe_code, probe_url, probe_kind, expected_status)
SELECT s.module_code,
       s.service_code,
       format('http://127.0.0.1:%s%s', s.port, s.health_path),
       'http',
       200
  FROM dos.ui_service_registry s
 WHERE s.module_code IS NOT NULL
ON CONFLICT (module_code, probe_code) DO UPDATE
   SET probe_url       = EXCLUDED.probe_url,
       probe_kind      = EXCLUDED.probe_kind,
       expected_status = EXCLUDED.expected_status;

-- =====================================================================
-- 5. service_health_probes — per-service probe row (one per service).
-- =====================================================================
INSERT INTO dos.service_health_probes
  (service_code, probe_code, probe_kind, probe_url, expected_status, timeout_ms)
SELECT s.service_code,
       'liveness',
       'http',
       format('http://127.0.0.1:%s%s', s.port, s.health_path),
       200,
       2000
  FROM dos.ui_service_registry s
 WHERE s.registry_status = 'active'
ON CONFLICT (service_code, probe_code) DO UPDATE
   SET probe_url       = EXCLUDED.probe_url,
       probe_kind      = EXCLUDED.probe_kind,
       expected_status = EXCLUDED.expected_status,
       timeout_ms      = EXCLUDED.timeout_ms;

-- =====================================================================
-- 6. service_endpoints — register the 4 W4 platform-admin GETs.
-- =====================================================================
INSERT INTO dos.service_endpoints
  (service_code, http_method, path_pattern, permission_code, is_public)
VALUES
  ('ui-os-service','GET','/api/ui-os/platform-admin/services',     'platform.config-center.read', FALSE),
  ('ui-os-service','GET','/api/ui-os/platform-admin/modules',      'platform.config-center.read', FALSE),
  ('ui-os-service','GET','/api/ui-os/platform-admin/navigation',   'platform.config-center.read', FALSE),
  ('ui-os-service','GET','/api/ui-os/platform-admin/module-roles', 'platform.config-center.read', FALSE)
ON CONFLICT (service_code, http_method, path_pattern) DO UPDATE
   SET permission_code = EXCLUDED.permission_code,
       is_public       = EXCLUDED.is_public;

-- =====================================================================
-- 7. Post-flight 6NF re-check.
-- =====================================================================
DO $$
DECLARE bad TEXT;
BEGIN
  SELECT format('%I.%I.%I', table_schema, table_name, column_name)
    INTO bad
    FROM information_schema.columns
   WHERE table_schema = 'dos'
     AND table_name IN (
       'module_manifests','module_manifest_permissions','module_capability_flags',
       'module_health_endpoints','service_health_probes','service_endpoints'
     )
     AND data_type = 'ARRAY'
   LIMIT 1;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '6NF violation post-seed: %', bad;
  END IF;
END $$;

COMMIT;
