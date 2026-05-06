-- =====================================================================
-- Wave 16 — Workspace shell registry tables
--
-- Resolver `workspace-shell.routes.ts` queries 4 tables for tenant-scoped
-- shell chrome / shortcuts / banners / policies. None existed in DB, so
-- the resolver returned empty objects/arrays for all tenants. Doctrine
-- forbids inventing chrome in the frontend, so we create the canonical
-- registry tables here and seed minimal platform-DNA rows.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dos.ui_workspace_chrome (
  tenant_id     varchar(64)  NOT NULL,
  chrome_key    varchar(128) NOT NULL,
  value_json    jsonb        NOT NULL DEFAULT '{}'::jsonb,
  enabled       boolean      NOT NULL DEFAULT true,
  version       integer      NOT NULL DEFAULT 1,
  created_at    timestamptz  NOT NULL DEFAULT NOW(),
  updated_at    timestamptz  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, chrome_key)
);

CREATE TABLE IF NOT EXISTS dos.ui_workspace_policy (
  tenant_id     varchar(64)  NOT NULL,
  policy_key    varchar(128) NOT NULL,
  value_json    jsonb        NOT NULL DEFAULT '{}'::jsonb,
  enabled       boolean      NOT NULL DEFAULT true,
  version       integer      NOT NULL DEFAULT 1,
  created_at    timestamptz  NOT NULL DEFAULT NOW(),
  updated_at    timestamptz  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, policy_key)
);

CREATE TABLE IF NOT EXISTS dos.ui_workspace_shortcut (
  tenant_id     varchar(64)  NOT NULL,
  shortcut_id   varchar(128) NOT NULL,
  combo         varchar(128) NOT NULL,
  action_json   jsonb        NOT NULL,
  when_clause   text,
  sort_order    integer      NOT NULL DEFAULT 0,
  enabled       boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT NOW(),
  updated_at    timestamptz  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, shortcut_id)
);

CREATE TABLE IF NOT EXISTS dos.ui_workspace_banner (
  tenant_id        varchar(64)  NOT NULL,
  banner_id        varchar(128) NOT NULL,
  gate             varchar(64)  NOT NULL,
  kind             varchar(32)  NOT NULL,
  title_key        varchar(256),
  title_fallback   text,
  message_key      varchar(256),
  message_fallback text,
  action_label_key varchar(256),
  action_json      jsonb,
  dismissible      boolean      NOT NULL DEFAULT true,
  sort_order       integer      NOT NULL DEFAULT 0,
  version          integer      NOT NULL DEFAULT 1,
  enabled          boolean      NOT NULL DEFAULT true,
  created_at       timestamptz  NOT NULL DEFAULT NOW(),
  updated_at       timestamptz  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, banner_id)
);

-- Runtime grants.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dos_auth') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON dos.ui_workspace_chrome TO dos_auth';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON dos.ui_workspace_policy TO dos_auth';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON dos.ui_workspace_shortcut TO dos_auth';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON dos.ui_workspace_banner TO dos_auth';
  END IF;
END$$;

-- Platform-DNA chrome seed for every existing tenant ---------------------
INSERT INTO dos.ui_workspace_chrome (tenant_id, chrome_key, value_json)
SELECT t.tenant_id::text, c.chrome_key, c.value_json::jsonb
  FROM dos.tenants t
  CROSS JOIN (VALUES
    ('product.name',      '{"i18nKey":"chrome.product.name","fallback":"Shahin AI"}'),
    ('product.tagline',   '{"i18nKey":"chrome.product.tagline","fallback":"Enterprise GRC, AI-native"}'),
    ('header.brand',      '{"i18nKey":"chrome.header.brand","fallback":"Shahin AI"}'),
    ('footer.copyright',  '{"i18nKey":"chrome.footer.copyright","fallback":"\u00a9 Dogan Consulting"}'),
    ('locale.default',    '{"primary":"en","supported":["en","ar"],"rtl":["ar"]}'),
    ('theme.default',     '{"name":"carbon-g100","mode":"dark"}')
  ) AS c(chrome_key, value_json)
ON CONFLICT (tenant_id, chrome_key) DO NOTHING;

-- Default workspace policies --------------------------------------------
INSERT INTO dos.ui_workspace_policy (tenant_id, policy_key, value_json)
SELECT t.tenant_id::text, p.policy_key, p.value_json::jsonb
  FROM dos.tenants t
  CROSS JOIN (VALUES
    ('session.idle_timeout_seconds', '{"value":1800}'),
    ('session.warning_seconds',      '{"value":300}'),
    ('autosave.interval_ms',         '{"value":15000}'),
    ('rtl.enabled',                  '{"value":true}')
  ) AS p(policy_key, value_json)
ON CONFLICT (tenant_id, policy_key) DO NOTHING;

-- Default global shortcuts ----------------------------------------------
INSERT INTO dos.ui_workspace_shortcut (tenant_id, shortcut_id, combo, action_json, sort_order)
SELECT t.tenant_id::text, s.shortcut_id, s.combo, s.action_json::jsonb, s.sort_order
  FROM dos.tenants t
  CROSS JOIN (VALUES
    ('command.open',  'mod+k',     '{"kind":"open_command"}', 10),
    ('lang.toggle',   'mod+shift+l','{"kind":"toggle_language"}', 20),
    ('theme.toggle',  'mod+shift+t','{"kind":"toggle_theme"}', 30),
    ('overlay.close', 'escape',    '{"kind":"close_overlay"}', 40)
  ) AS s(shortcut_id, combo, action_json, sort_order)
ON CONFLICT (tenant_id, shortcut_id) DO NOTHING;

-- Trigger: future tenants get DNA seeds automatically -------------------
CREATE OR REPLACE FUNCTION dos.fn_workspace_chrome_dna_on_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO dos.ui_workspace_chrome (tenant_id, chrome_key, value_json)
    SELECT NEW.tenant_id::text, c.chrome_key, c.value_json::jsonb
      FROM (VALUES
        ('product.name',     '{"i18nKey":"chrome.product.name","fallback":"Shahin AI"}'),
        ('product.tagline',  '{"i18nKey":"chrome.product.tagline","fallback":"Enterprise GRC, AI-native"}'),
        ('header.brand',     '{"i18nKey":"chrome.header.brand","fallback":"Shahin AI"}'),
        ('footer.copyright', '{"i18nKey":"chrome.footer.copyright","fallback":"\u00a9 Dogan Consulting"}'),
        ('locale.default',   '{"primary":"en","supported":["en","ar"],"rtl":["ar"]}'),
        ('theme.default',    '{"name":"carbon-g100","mode":"dark"}')
      ) AS c(chrome_key, value_json)
  ON CONFLICT DO NOTHING;
  INSERT INTO dos.ui_workspace_policy (tenant_id, policy_key, value_json)
    SELECT NEW.tenant_id::text, p.policy_key, p.value_json::jsonb
      FROM (VALUES
        ('session.idle_timeout_seconds', '{"value":1800}'),
        ('session.warning_seconds',      '{"value":300}'),
        ('autosave.interval_ms',         '{"value":15000}'),
        ('rtl.enabled',                  '{"value":true}')
      ) AS p(policy_key, value_json)
  ON CONFLICT DO NOTHING;
  INSERT INTO dos.ui_workspace_shortcut (tenant_id, shortcut_id, combo, action_json, sort_order)
    SELECT NEW.tenant_id::text, s.shortcut_id, s.combo, s.action_json::jsonb, s.sort_order
      FROM (VALUES
        ('command.open',  'mod+k',      '{"kind":"open_command"}', 10),
        ('lang.toggle',   'mod+shift+l','{"kind":"toggle_language"}', 20),
        ('theme.toggle',  'mod+shift+t','{"kind":"toggle_theme"}', 30),
        ('overlay.close', 'escape',     '{"kind":"close_overlay"}', 40)
      ) AS s(shortcut_id, combo, action_json, sort_order)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workspace_chrome_dna_on_tenant ON dos.tenants;
CREATE TRIGGER trg_workspace_chrome_dna_on_tenant
  AFTER INSERT ON dos.tenants
  FOR EACH ROW EXECUTE FUNCTION dos.fn_workspace_chrome_dna_on_tenant();

DO $$
DECLARE c INT; p INT; s INT;
BEGIN
  SELECT count(*) INTO c FROM dos.ui_workspace_chrome;
  SELECT count(*) INTO p FROM dos.ui_workspace_policy;
  SELECT count(*) INTO s FROM dos.ui_workspace_shortcut;
  RAISE NOTICE 'wave16 proof: chrome=% policy=% shortcut=%', c, p, s;
  IF c=0 OR p=0 OR s=0 THEN RAISE EXCEPTION 'wave16: empty registries after seed'; END IF;
END$$;

COMMIT;
