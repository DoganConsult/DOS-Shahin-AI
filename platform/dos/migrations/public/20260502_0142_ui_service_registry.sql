-- =====================================================================
-- UI service registry (20260502_0142) — Wave W3
--
-- Single source of truth for the platform-admin "Service Registry" page.
-- Mirrors platform/config-center/ops/ports.allocation.json so admin pages
-- read from DB rather than importing the JSON.
--
-- 6NF: every column is scalar single-valued. Multi-valued attributes
-- (additional_prefixes, audience_roles) live in junction children below.
-- =====================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS dos.ui_service_registry (
  service_code      VARCHAR(80)  PRIMARY KEY,
  display_name      VARCHAR(200) NOT NULL,
  module_code       VARCHAR(100) REFERENCES dos.dynamic_ui_modules(module_code) ON DELETE SET NULL,
  port              INTEGER      NOT NULL,
  gateway_prefix    VARCHAR(120),
  cwd               VARCHAR(300) NOT NULL,
  wave              INTEGER,
  registry_status   VARCHAR(40)  NOT NULL DEFAULT 'active'
                    CHECK (registry_status IN ('active','blocked','deprecated','draft')),
  health_path       VARCHAR(120) NOT NULL DEFAULT '/health',
  manifest_path     VARCHAR(120) NOT NULL DEFAULT '/manifest',
  admin_route       VARCHAR(300),
  notes             TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_ui_service_registry_module
  ON dos.ui_service_registry (module_code);
CREATE INDEX IF NOT EXISTS ix_ui_service_registry_status
  ON dos.ui_service_registry (registry_status);

-- 6NF child: additional gateway prefixes (one prefix per row).
CREATE TABLE IF NOT EXISTS dos.ui_service_registry_prefixes (
  service_code  VARCHAR(80) NOT NULL REFERENCES dos.ui_service_registry(service_code) ON DELETE CASCADE,
  prefix        VARCHAR(120) NOT NULL,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (service_code, prefix)
);

COMMIT;
