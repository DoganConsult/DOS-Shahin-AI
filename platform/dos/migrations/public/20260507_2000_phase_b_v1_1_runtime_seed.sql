-- =====================================================================
-- v1.1 Operating Runtime Pack — Phase B (lean) seed migration
-- ---------------------------------------------------------------------
-- Doctrine: ZERO STATIC / ZERO LEGACY / ZERO FALLBACK / DB-as-source.
-- Idempotent. Non-destructive. No rows are deleted; all inserts use
-- ON CONFLICT DO NOTHING / DO UPDATE.
--
-- Scope (lean): only the genuinely missing tables required to power
--   Phase C resolver emission of v1.1 envelopes for breakpoints,
--   touch targets, and integration catalog. Everything else
--   (workspace_shell_binding, ui_workspace_chrome, ui_workspace_policy,
--   ui_workspace_banner, ui_workspace_shortcut, ui_module_nav_*,
--   brand_config, mobile_breakpoint_config, mobile_component_variants,
--   mobile_touch_gestures, tenants, tenant_module_entitlements,
--   tenant_product_activation, tenant_feature_flag_overrides,
--   product_registry, module_registry, integrations) already has
--   live rows; the resolver normalizes them into the v1.1 envelope
--   shapes inside its boundary.
--
-- Adds:
--   1. dos.ui_touch_target_config       — typed touch target config
--   2. dos.integration_connector_catalog — declarative connector list
--   3. seeds for the global defaults
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. ui_touch_target_config — typed source for shell.touchTargets
--    envelope field (minSizePx, minSpacingPx, hapticFeedbackEnabled).
--    tenant_id NULL = global default; per-tenant rows override.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.ui_touch_target_config (
  id                       bigserial   PRIMARY KEY,
  tenant_id                varchar(64) NULL,
  min_size_px              integer     NOT NULL DEFAULT 44,
  min_spacing_px           integer     NOT NULL DEFAULT 8,
  haptic_feedback_enabled  boolean     NOT NULL DEFAULT false,
  enabled                  boolean     NOT NULL DEFAULT true,
  version                  integer     NOT NULL DEFAULT 1,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_ui_touch_target_min_size_px    CHECK (min_size_px    >= 16 AND min_size_px    <= 96),
  CONSTRAINT chk_ui_touch_target_min_spacing_px CHECK (min_spacing_px >= 0  AND min_spacing_px <= 64)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ui_touch_target_config_scope
  ON dos.ui_touch_target_config (coalesce(tenant_id, '__global__'))
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS ix_ui_touch_target_config_tenant
  ON dos.ui_touch_target_config (tenant_id);

INSERT INTO dos.ui_touch_target_config
  (tenant_id, min_size_px, min_spacing_px, haptic_feedback_enabled, enabled, version)
VALUES
  (NULL, 44, 8, false, true, 1)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. integration_connector_catalog — declarative connector list driving
--    integrationRuntime.connectorCatalog. Pure catalog rows; no
--    credentials, no tokens.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.integration_connector_catalog (
  connector_key      text        PRIMARY KEY,
  vendor             text        NOT NULL,
  display_name       text        NOT NULL,
  description        text        NULL,
  category           text        NOT NULL,
  icon_ref           text        NULL,
  auth_kinds         text[]      NOT NULL DEFAULT '{}'::text[],
  capability_keys    text[]      NOT NULL DEFAULT '{}'::text[],
  evidence_kinds     text[]      NOT NULL DEFAULT '{}'::text[],
  doc_url            text        NULL,
  enabled            boolean     NOT NULL DEFAULT true,
  version            integer     NOT NULL DEFAULT 1,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_integration_connector_vendor   CHECK (vendor   <> ''),
  CONSTRAINT chk_integration_connector_category CHECK (category IN (
    'productivity','identity','collaboration','storage','calendar','crm',
    'service_desk','project_tracking','soar','siem','grc','custom'
  ))
);

CREATE INDEX IF NOT EXISTS ix_integration_connector_catalog_vendor
  ON dos.integration_connector_catalog (vendor);

CREATE INDEX IF NOT EXISTS ix_integration_connector_catalog_category
  ON dos.integration_connector_catalog (category);

INSERT INTO dos.integration_connector_catalog
  (connector_key, vendor, display_name, description, category, icon_ref,
   auth_kinds, capability_keys, evidence_kinds, doc_url, enabled)
VALUES
  ('microsoft.m365',         'microsoft', 'Microsoft 365',         'Microsoft 365 productivity suite',                           'productivity',     'LogoMicrosoft',  ARRAY['oauth2_authcode','client_credentials'], ARRAY['user_directory','group_directory','calendar','mail','document_library'], ARRAY['m365.audit_log','m365.signins'], 'https://learn.microsoft.com/microsoft-365/', true),
  ('microsoft.sharepoint',   'microsoft', 'Microsoft SharePoint',  'SharePoint document libraries',                              'storage',          'LogoMicrosoft',  ARRAY['oauth2_authcode','client_credentials'], ARRAY['document_library','permissions','sites'], ARRAY['sharepoint.document_library','sharepoint.audit_log'], 'https://learn.microsoft.com/sharepoint/', true),
  ('microsoft.teams',        'microsoft', 'Microsoft Teams',       'Teams collaboration channels and chats',                     'collaboration',    'LogoMicrosoft',  ARRAY['oauth2_authcode','client_credentials'], ARRAY['channels','messages','meetings'], ARRAY['teams.audit_log'], 'https://learn.microsoft.com/microsoftteams/', true),
  ('microsoft.azure_ad',     'microsoft', 'Microsoft Entra ID',    'Microsoft Entra ID (Azure AD) directory and access',         'identity',         'LogoMicrosoft',  ARRAY['oauth2_authcode','client_credentials'], ARRAY['user_directory','group_directory','app_registrations','conditional_access'], ARRAY['azure.activity_log','azure.signins'], 'https://learn.microsoft.com/entra/', true),
  ('microsoft.onedrive',     'microsoft', 'Microsoft OneDrive',    'OneDrive personal and business storage',                     'storage',          'LogoMicrosoft',  ARRAY['oauth2_authcode'],                       ARRAY['files','permissions'], ARRAY['onedrive.audit_log'], 'https://learn.microsoft.com/onedrive/', true),
  ('microsoft.outlook',      'microsoft', 'Microsoft Outlook',     'Outlook mail and calendar',                                  'productivity',     'LogoMicrosoft',  ARRAY['oauth2_authcode'],                       ARRAY['mail','calendar'], ARRAY['outlook.audit_log'], 'https://learn.microsoft.com/outlook/', true),
  ('google.workspace',       'google',    'Google Workspace',      'Google Workspace productivity and collaboration',            'productivity',     'LogoGoogle',     ARRAY['oauth2_authcode','service_account'],     ARRAY['user_directory','group_directory','drive','calendar','mail'], ARRAY['gworkspace.audit_log'], 'https://workspace.google.com/', true),
  ('slack.workspace',        'slack',     'Slack',                 'Slack messaging and channels',                               'collaboration',    'LogoSlack',      ARRAY['oauth2_authcode','bot_token'],           ARRAY['channels','messages','users'], ARRAY['slack.audit_log'], 'https://api.slack.com/', true),
  ('atlassian.jira',         'atlassian', 'Atlassian Jira',        'Jira issue and project tracking',                            'project_tracking', 'LogoJira',       ARRAY['oauth2_authcode','api_token'],           ARRAY['issues','projects','workflows'], ARRAY['jira.audit_log'], 'https://developer.atlassian.com/cloud/jira/', true),
  ('servicenow.itsm',        'servicenow','ServiceNow ITSM',       'ServiceNow incident, change, and request tracking',          'service_desk',     'LogoServicenow', ARRAY['oauth2_authcode','basic_auth'],          ARRAY['incidents','changes','requests'], ARRAY['servicenow.audit_log'], 'https://developer.servicenow.com/', true),
  ('aws.cloudtrail',         'aws',       'AWS CloudTrail',        'AWS account-level audit trail',                              'siem',             'LogoAws',        ARRAY['iam_role','access_key'],                 ARRAY['account_events','iam_events'], ARRAY['aws.cloudtrail'], 'https://docs.aws.amazon.com/cloudtrail/', true),
  ('okta.workforce',         'okta',      'Okta Workforce Identity','Okta identity provider',                                    'identity',         'LogoOkta',       ARRAY['oauth2_authcode','api_token'],           ARRAY['user_directory','group_directory','sso'], ARRAY['okta.system_log'], 'https://developer.okta.com/', true)
ON CONFLICT (connector_key) DO UPDATE
  SET display_name    = EXCLUDED.display_name,
      description     = EXCLUDED.description,
      category        = EXCLUDED.category,
      icon_ref        = EXCLUDED.icon_ref,
      auth_kinds      = EXCLUDED.auth_kinds,
      capability_keys = EXCLUDED.capability_keys,
      evidence_kinds  = EXCLUDED.evidence_kinds,
      doc_url         = EXCLUDED.doc_url,
      enabled         = EXCLUDED.enabled,
      updated_at      = now();

-- ---------------------------------------------------------------------
-- 3. Post-condition assertions.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  has_touch_target boolean;
  has_connector    boolean;
  global_touch_row INT;
  connector_count  INT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='dos' AND table_name='ui_touch_target_config'
  ) INTO has_touch_target;
  IF NOT has_touch_target THEN
    RAISE EXCEPTION 'Phase B post-condition failed: dos.ui_touch_target_config must exist';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema='dos' AND table_name='integration_connector_catalog'
  ) INTO has_connector;
  IF NOT has_connector THEN
    RAISE EXCEPTION 'Phase B post-condition failed: dos.integration_connector_catalog must exist';
  END IF;

  SELECT count(*) INTO global_touch_row
    FROM dos.ui_touch_target_config
   WHERE tenant_id IS NULL AND enabled = true;
  IF global_touch_row <> 1 THEN
    RAISE EXCEPTION 'Phase B post-condition failed: exactly one global ui_touch_target_config row must exist (got %)', global_touch_row;
  END IF;

  SELECT count(*) INTO connector_count
    FROM dos.integration_connector_catalog
   WHERE enabled = true;
  IF connector_count < 12 THEN
    RAISE EXCEPTION 'Phase B post-condition failed: at least 12 connector catalog rows expected (got %)', connector_count;
  END IF;

  RAISE NOTICE 'Phase B OK: ui_touch_target_config (% global) + integration_connector_catalog (% rows) live.', global_touch_row, connector_count;
END $$;

COMMIT;
