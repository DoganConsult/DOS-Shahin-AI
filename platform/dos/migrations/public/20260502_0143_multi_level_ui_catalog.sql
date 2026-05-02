-- =====================================================================
-- Multi-level UI-OS catalog (20260502_0143) — Wave W6
--
-- Adds the missing platform / product / module / tenant / user-profile /
-- service catalog tables required by the multi-level UI-OS resolver.
-- Tables already present (dos.dynamic_ui_modules, dos.dynamic_ui_navigation,
-- dos.dynamic_ui_routes, dos.dynamic_ui_widgets, dos.dynamic_ui_kpis,
-- dos.dynamic_ui_actions, dos.dynamic_ui_data_resources,
-- dos.dynamic_ui_theme_tokens, dos.dynamic_ui_user_preferences,
-- dos.dynamic_ui_shells, dos.ui_locales, dos.ui_tenant_branding,
-- dos.ui_command_palette_items, dos.ui_saved_filters, dos.product_registry,
-- dos.module_registry, dos.tenants, dos.tenant_feature_flag_overrides,
-- dos.tenant_memberships, dos.ui_service_registry) are NOT recreated.
--
-- 6NF DISCIPLINE
--   • Every multi-valued attribute lives in a junction child, never a
--     TEXT[] / JSONB-of-refs on the parent row. JSONB is reserved for
--     opaque, single-valued payloads (e.g. theme tokens, accessibility
--     prefs blob) — never used as a covert array of entity refs.
--   • Pre-flight assertion (below) hard-fails if a previously-seeded
--     6NF target reverts to ARRAY columns.
-- =====================================================================
BEGIN;

-- ── 0. 6NF pre-flight assertion ──────────────────────────────────────
DO $$
DECLARE bad TEXT;
BEGIN
  SELECT format('%I.%I.%I', table_schema, table_name, column_name)
    INTO bad
    FROM information_schema.columns
   WHERE table_schema = 'dos'
     AND table_name IN (
       'dynamic_ui_modules', 'dynamic_ui_navigation',
       'platform_admin_module_roles', 'ui_service_registry',
       'ui_service_registry_prefixes'
     )
     AND data_type = 'ARRAY'
   LIMIT 1;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '6NF violation on existing target table: %', bad;
  END IF;
END $$;

-- =====================================================================
-- 1. PLATFORM-LEVEL: missing dynamic-UI catalogs
-- =====================================================================

-- 1a. Notification / toast / banner / email templates
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_notification_templates (
  template_code     VARCHAR(120) PRIMARY KEY,
  channel           VARCHAR(40)  NOT NULL
                    CHECK (channel IN ('toast','banner','email','sms','push','inbox')),
  severity          VARCHAR(20)  NOT NULL DEFAULT 'info'
                    CHECK (severity IN ('info','success','warning','error','critical')),
  title_i18n_key    VARCHAR(200) NOT NULL,
  body_i18n_key     VARCHAR(200) NOT NULL,
  cta_i18n_key      VARCHAR(200),
  cta_route         VARCHAR(300),
  module_code       VARCHAR(100) REFERENCES dos.dynamic_ui_modules(module_code) ON DELETE SET NULL,
  is_dismissible    BOOLEAN      NOT NULL DEFAULT TRUE,
  ttl_seconds       INTEGER,
  registry_status   VARCHAR(40)  NOT NULL DEFAULT 'active'
                    CHECK (registry_status IN ('active','draft','deprecated')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_dyn_notif_tpl_module ON dos.dynamic_ui_notification_templates(module_code);

-- 1b. Search scopes (what surfaces ⌘K can search)
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_search_scopes (
  scope_code        VARCHAR(120) PRIMARY KEY,
  label_i18n_key    VARCHAR(200) NOT NULL,
  module_code       VARCHAR(100) REFERENCES dos.dynamic_ui_modules(module_code) ON DELETE CASCADE,
  resource_key      VARCHAR(120),                -- soft ref to dos.dynamic_ui_data_resources(resource_key)
  result_route      VARCHAR(300),
  required_role     VARCHAR(80),
  sort_order        INTEGER      NOT NULL DEFAULT 100,
  registry_status   VARCHAR(40)  NOT NULL DEFAULT 'active'
                    CHECK (registry_status IN ('active','draft','deprecated')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_dyn_search_scopes_module ON dos.dynamic_ui_search_scopes(module_code);

-- 1c. Command-palette actions (distinct from ui_command_palette_items, which
--     stores per-tenant pinned items; this one is the platform catalog).
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_command_palette_actions (
  action_code       VARCHAR(120) PRIMARY KEY,
  label_i18n_key    VARCHAR(200) NOT NULL,
  shortcut          VARCHAR(40),
  module_code       VARCHAR(100) REFERENCES dos.dynamic_ui_modules(module_code) ON DELETE CASCADE,
  route             VARCHAR(300),
  intent_code       VARCHAR(120),
  required_role     VARCHAR(80),
  sort_order        INTEGER      NOT NULL DEFAULT 100,
  registry_status   VARCHAR(40)  NOT NULL DEFAULT 'active'
                    CHECK (registry_status IN ('active','draft','deprecated')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_dyn_cp_actions_module ON dos.dynamic_ui_command_palette_actions(module_code);

-- 1d. Inline help articles per route
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_help_articles (
  article_code      VARCHAR(120) PRIMARY KEY,
  route_pattern     VARCHAR(300) NOT NULL,
  title_i18n_key    VARCHAR(200) NOT NULL,
  body_i18n_key     VARCHAR(200) NOT NULL,
  module_code       VARCHAR(100) REFERENCES dos.dynamic_ui_modules(module_code) ON DELETE SET NULL,
  ext_url           VARCHAR(500),
  sort_order        INTEGER      NOT NULL DEFAULT 100,
  registry_status   VARCHAR(40)  NOT NULL DEFAULT 'active'
                    CHECK (registry_status IN ('active','draft','deprecated')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_dyn_help_route ON dos.dynamic_ui_help_articles(route_pattern);

-- 1e. Breadcrumb resolvers (segment label resolution)
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_breadcrumb_resolvers (
  resolver_code     VARCHAR(120) PRIMARY KEY,
  segment_pattern   VARCHAR(200) NOT NULL,
  label_i18n_key    VARCHAR(200) NOT NULL,
  resource_key      VARCHAR(120),                -- soft ref to dos.dynamic_ui_data_resources(resource_key)
  module_code       VARCHAR(100) REFERENCES dos.dynamic_ui_modules(module_code) ON DELETE SET NULL,
  registry_status   VARCHAR(40)  NOT NULL DEFAULT 'active'
                    CHECK (registry_status IN ('active','draft','deprecated')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 1f. Reusable filter chips per grid scope (platform default; tenants override)
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_filters (
  filter_code       VARCHAR(120) PRIMARY KEY,
  scope_code        VARCHAR(120) NOT NULL,    -- e.g. grid resource_code
  label_i18n_key    VARCHAR(200) NOT NULL,
  field_path        VARCHAR(200) NOT NULL,
  operator          VARCHAR(20)  NOT NULL
                    CHECK (operator IN ('eq','neq','in','nin','gt','gte','lt','lte','like','between','exists')),
  value_kind        VARCHAR(20)  NOT NULL
                    CHECK (value_kind IN ('string','number','boolean','date','enum','ref')),
  module_code       VARCHAR(100) REFERENCES dos.dynamic_ui_modules(module_code) ON DELETE CASCADE,
  sort_order        INTEGER      NOT NULL DEFAULT 100,
  is_default        BOOLEAN      NOT NULL DEFAULT FALSE,
  registry_status   VARCHAR(40)  NOT NULL DEFAULT 'active'
                    CHECK (registry_status IN ('active','draft','deprecated')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_dyn_filters_scope ON dos.dynamic_ui_filters(scope_code);
-- 6NF child: enum allowed values (one per row)
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_filter_enum_values (
  filter_code       VARCHAR(120) NOT NULL REFERENCES dos.dynamic_ui_filters(filter_code) ON DELETE CASCADE,
  enum_value        VARCHAR(200) NOT NULL,
  label_i18n_key    VARCHAR(200) NOT NULL,
  sort_order        INTEGER      NOT NULL DEFAULT 100,
  PRIMARY KEY (filter_code, enum_value)
);

-- 1g. Workflow templates surfaceable in UI
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_workflow_templates (
  template_code     VARCHAR(120) PRIMARY KEY,
  display_i18n_key  VARCHAR(200) NOT NULL,
  module_code       VARCHAR(100) REFERENCES dos.dynamic_ui_modules(module_code) ON DELETE SET NULL,
  trigger_code      VARCHAR(120),
  default_route     VARCHAR(300),
  required_role     VARCHAR(80),
  registry_status   VARCHAR(40)  NOT NULL DEFAULT 'active'
                    CHECK (registry_status IN ('active','draft','deprecated')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 2. PRODUCT-LEVEL: brand tokens, locales, enabled modules, overrides
--    Parent = dos.product_registry(product_key). All children are 6NF.
-- =====================================================================

-- 2a. Brand tokens — one scalar token value per row (no JSONB blob).
CREATE TABLE IF NOT EXISTS dos.product_brand_tokens (
  product_key       VARCHAR(80)  NOT NULL,
  token_key         VARCHAR(120) NOT NULL,    -- e.g. 'gradient.primary', 'logo.url'
  token_value       TEXT         NOT NULL,
  PRIMARY KEY (product_key, token_key)
);

-- 2b. Product → supported locale (junction)
CREATE TABLE IF NOT EXISTS dos.product_locales (
  product_key       VARCHAR(80)  NOT NULL,
  locale_code       VARCHAR(20)  NOT NULL,
  is_default        BOOLEAN      NOT NULL DEFAULT FALSE,
  PRIMARY KEY (product_key, locale_code)
);

-- 2c. Product → enabled module (junction; replaces product.manifest.json
--     enabledModules[]).
CREATE TABLE IF NOT EXISTS dos.product_enabled_modules (
  product_key       VARCHAR(80)  NOT NULL,
  module_code       VARCHAR(100) NOT NULL,
  enrollment_status VARCHAR(40)  NOT NULL DEFAULT 'active'
                    CHECK (enrollment_status IN ('not_enrolled','enrolled','active','blocked','unavailable','deprecated')),
  sort_order        INTEGER      NOT NULL DEFAULT 100,
  PRIMARY KEY (product_key, module_code)
);

-- 2d. Product-specific re-tone of a module's UI surface
CREATE TABLE IF NOT EXISTS dos.product_module_overrides (
  product_key       VARCHAR(80)  NOT NULL,
  module_code       VARCHAR(100) NOT NULL,
  attribute_key     VARCHAR(80)  NOT NULL,    -- 'display_name_i18n_key' | 'icon_glyph' | 'default_route' | 'tone'
  attribute_value   TEXT         NOT NULL,
  PRIMARY KEY (product_key, module_code, attribute_key)
);

-- 2e. Product navigation overrides (per nav row, per product)
CREATE TABLE IF NOT EXISTS dos.product_navigation_overrides (
  product_key       VARCHAR(80)  NOT NULL,
  navigation_id     UUID         NOT NULL,
  attribute_key     VARCHAR(80)  NOT NULL,    -- 'label_i18n_key' | 'sort_order' | 'route' | 'hidden'
  attribute_value   TEXT         NOT NULL,
  PRIMARY KEY (product_key, navigation_id, attribute_key)
);

-- =====================================================================
-- 3. MODULE-LEVEL: manifests, capabilities, tenant overrides, health
-- =====================================================================

-- 3a. Module manifests — one default row per module
CREATE TABLE IF NOT EXISTS dos.module_manifests (
  module_code       VARCHAR(100) PRIMARY KEY,
  display_i18n_key  VARCHAR(200) NOT NULL,
  description_i18n_key VARCHAR(200),
  default_route     VARCHAR(300),
  icon_glyph        VARCHAR(80),
  tone              VARCHAR(40),
  manifest_version  INTEGER      NOT NULL DEFAULT 1,
  source_path       VARCHAR(300),                -- modules/<x>/manifest.ts (fallback)
  registry_status   VARCHAR(40)  NOT NULL DEFAULT 'active'
                    CHECK (registry_status IN ('active','draft','deprecated','blocked')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3b. Module → permission code (6NF replacement for permissions TEXT[])
CREATE TABLE IF NOT EXISTS dos.module_manifest_permissions (
  module_code       VARCHAR(100) NOT NULL REFERENCES dos.module_manifests(module_code) ON DELETE CASCADE,
  permission_code   VARCHAR(160) NOT NULL,
  PRIMARY KEY (module_code, permission_code)
);

-- 3c. Module capabilities (one capability per row)
CREATE TABLE IF NOT EXISTS dos.module_capabilities (
  module_code       VARCHAR(100) NOT NULL,
  capability_key    VARCHAR(120) NOT NULL,    -- 'supports_kanban' | 'has_calendar' | ...
  capability_value  TEXT         NOT NULL DEFAULT 'true',
  PRIMARY KEY (module_code, capability_key)
);

-- 3d. Tenant override of a module attribute
CREATE TABLE IF NOT EXISTS dos.module_tenant_overrides (
  tenant_id         VARCHAR(80)  NOT NULL,
  module_code       VARCHAR(100) NOT NULL,
  attribute_key     VARCHAR(80)  NOT NULL,
  attribute_value   TEXT         NOT NULL,
  PRIMARY KEY (tenant_id, module_code, attribute_key)
);

-- 3e. Per-module health endpoints (one path per row)
CREATE TABLE IF NOT EXISTS dos.module_health_endpoints (
  module_code       VARCHAR(100) NOT NULL,
  probe_code        VARCHAR(120) NOT NULL,
  probe_url         VARCHAR(500) NOT NULL,
  probe_kind        VARCHAR(40)  NOT NULL DEFAULT 'http'
                    CHECK (probe_kind IN ('http','tcp','db','redis','queue','custom')),
  expected_status   INTEGER      NOT NULL DEFAULT 200,
  PRIMARY KEY (module_code, probe_code)
);

-- =====================================================================
-- 4. TENANT-LEVEL: brand tokens, locales, workflow overrides
--    (tenant_feature_flag_overrides already exists — not duplicated.)
-- =====================================================================

-- 4a. Tenant brand tokens (scalar overrides on top of ui_tenant_branding)
CREATE TABLE IF NOT EXISTS dos.tenant_brand_tokens (
  tenant_id         VARCHAR(80)  NOT NULL,
  token_key         VARCHAR(120) NOT NULL,
  token_value       TEXT         NOT NULL,
  PRIMARY KEY (tenant_id, token_key)
);

-- 4b. Tenant locales (junction; restricts product_locales further)
CREATE TABLE IF NOT EXISTS dos.tenant_locales (
  tenant_id         VARCHAR(80)  NOT NULL,
  locale_code       VARCHAR(20)  NOT NULL,
  is_default        BOOLEAN      NOT NULL DEFAULT FALSE,
  PRIMARY KEY (tenant_id, locale_code)
);

-- 4c. Tenant workflow overrides (per template, per attribute)
CREATE TABLE IF NOT EXISTS dos.tenant_workflow_overrides (
  tenant_id         VARCHAR(80)  NOT NULL,
  template_code     VARCHAR(120) NOT NULL,
  attribute_key     VARCHAR(80)  NOT NULL,
  attribute_value   TEXT         NOT NULL,
  PRIMARY KEY (tenant_id, template_code, attribute_key)
);

-- =====================================================================
-- 5. USER-PROFILE-LEVEL: explode existing dynamic_ui_user_preferences
--    multi-valued attributes into 6NF children. Parent table is left
--    intact (its scalar columns remain valid).
-- =====================================================================

-- 5a. User pinned actions (one action per row; replaces pinned_actions TEXT[])
CREATE TABLE IF NOT EXISTS dos.ui_user_pinned_actions (
  tenant_id         VARCHAR(80)  NOT NULL,
  user_id           VARCHAR(80)  NOT NULL,
  action_code       VARCHAR(120) NOT NULL,
  pinned_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  sort_order        INTEGER      NOT NULL DEFAULT 100,
  PRIMARY KEY (tenant_id, user_id, action_code)
);

-- 5b. User accessibility prefs (one flag per row, scalar value)
CREATE TABLE IF NOT EXISTS dos.ui_user_accessibility_prefs (
  tenant_id         VARCHAR(80)  NOT NULL,
  user_id           VARCHAR(80)  NOT NULL,
  pref_key          VARCHAR(80)  NOT NULL,    -- 'reduced_motion' | 'font_scale' | 'high_contrast'
  pref_value        TEXT         NOT NULL,
  PRIMARY KEY (tenant_id, user_id, pref_key)
);

-- 5c. Misc user setting flags (nav_collapsed, ai_assist_enabled, ...)
CREATE TABLE IF NOT EXISTS dos.ui_user_setting_flags (
  tenant_id         VARCHAR(80)  NOT NULL,
  user_id           VARCHAR(80)  NOT NULL,
  flag_key          VARCHAR(80)  NOT NULL,
  flag_value        BOOLEAN      NOT NULL,
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, user_id, flag_key)
);

-- =====================================================================
-- 6. SERVICE-LEVEL: endpoints, event topics, data contracts, health probes
--    Parent = dos.ui_service_registry(service_code) (W3).
-- =====================================================================

-- 6a. Service endpoints — one HTTP route per row
CREATE TABLE IF NOT EXISTS dos.service_endpoints (
  service_code      VARCHAR(80)  NOT NULL REFERENCES dos.ui_service_registry(service_code) ON DELETE CASCADE,
  http_method       VARCHAR(10)  NOT NULL
                    CHECK (http_method IN ('GET','POST','PUT','PATCH','DELETE','OPTIONS','HEAD')),
  path_pattern      VARCHAR(300) NOT NULL,
  permission_code   VARCHAR(160),
  is_public         BOOLEAN      NOT NULL DEFAULT FALSE,
  PRIMARY KEY (service_code, http_method, path_pattern)
);

-- 6b. Service event topics (one topic per row, with direction)
CREATE TABLE IF NOT EXISTS dos.service_event_topics (
  service_code      VARCHAR(80)  NOT NULL REFERENCES dos.ui_service_registry(service_code) ON DELETE CASCADE,
  topic_code        VARCHAR(160) NOT NULL,
  direction         VARCHAR(10)  NOT NULL CHECK (direction IN ('emit','consume')),
  PRIMARY KEY (service_code, topic_code, direction)
);

-- 6c. Service data contracts (Zod schema registrations; one schema per row)
CREATE TABLE IF NOT EXISTS dos.service_data_contracts (
  service_code      VARCHAR(80)  NOT NULL REFERENCES dos.ui_service_registry(service_code) ON DELETE CASCADE,
  contract_code     VARCHAR(160) NOT NULL,
  contract_kind     VARCHAR(20)  NOT NULL CHECK (contract_kind IN ('request','response','event','config')),
  schema_ref        VARCHAR(300),
  PRIMARY KEY (service_code, contract_code, contract_kind)
);

-- 6d. Per-service health probes (one probe per row, scalar attributes)
CREATE TABLE IF NOT EXISTS dos.service_health_probes (
  service_code      VARCHAR(80)  NOT NULL REFERENCES dos.ui_service_registry(service_code) ON DELETE CASCADE,
  probe_code        VARCHAR(120) NOT NULL,
  probe_kind        VARCHAR(40)  NOT NULL DEFAULT 'http'
                    CHECK (probe_kind IN ('http','tcp','db','redis','queue','custom')),
  probe_url         VARCHAR(500),
  expected_status   INTEGER      NOT NULL DEFAULT 200,
  timeout_ms        INTEGER      NOT NULL DEFAULT 2000,
  PRIMARY KEY (service_code, probe_code)
);

-- =====================================================================
-- 7. Post-flight: ensure none of the tables we just created shipped
--    with an ARRAY column.
-- =====================================================================
DO $$
DECLARE bad TEXT;
BEGIN
  SELECT format('%I.%I.%I', table_schema, table_name, column_name)
    INTO bad
    FROM information_schema.columns
   WHERE table_schema = 'dos'
     AND table_name IN (
       'dynamic_ui_notification_templates','dynamic_ui_search_scopes',
       'dynamic_ui_command_palette_actions','dynamic_ui_help_articles',
       'dynamic_ui_breadcrumb_resolvers','dynamic_ui_filters',
       'dynamic_ui_filter_enum_values','dynamic_ui_workflow_templates',
       'product_brand_tokens','product_locales','product_enabled_modules',
       'product_module_overrides','product_navigation_overrides',
       'module_manifests','module_manifest_permissions','module_capabilities',
       'module_tenant_overrides','module_health_endpoints',
       'tenant_brand_tokens','tenant_locales','tenant_workflow_overrides',
       'ui_user_pinned_actions','ui_user_accessibility_prefs','ui_user_setting_flags',
       'service_endpoints','service_event_topics','service_data_contracts',
       'service_health_probes'
     )
     AND data_type = 'ARRAY'
   LIMIT 1;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '6NF violation in W6 catalog: %', bad;
  END IF;
END $$;

-- Grants for runtime users on only the tables created by this migration.
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'dynamic_ui_notification_templates','dynamic_ui_search_scopes',
    'dynamic_ui_command_palette_actions','dynamic_ui_help_articles',
    'dynamic_ui_breadcrumb_resolvers','dynamic_ui_filters',
    'dynamic_ui_filter_enum_values','dynamic_ui_workflow_templates',
    'product_brand_tokens','product_locales','product_enabled_modules',
    'product_module_overrides','product_navigation_overrides',
    'module_manifests','module_manifest_permissions','module_capabilities',
    'module_tenant_overrides','module_health_endpoints',
    'tenant_brand_tokens','tenant_locales','tenant_workflow_overrides',
    'ui_user_pinned_actions','ui_user_accessibility_prefs','ui_user_setting_flags',
    'service_endpoints','service_event_topics','service_data_contracts',
    'service_health_probes'
  ])
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON dos.%I TO dos_app, dos_auth', t);
  END LOOP;
END $$;

COMMIT;
