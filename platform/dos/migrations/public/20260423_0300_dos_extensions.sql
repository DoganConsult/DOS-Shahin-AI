-- 20260423_0300_dos_extensions.sql
-- Completes platform_dos with config, feature flags, provisioning lifecycle,
-- module versioning, bundles, scheduled job runs, permission catalog, secrets refs.

-- migrations_applied: unified ledger across 4 platform schemas
CREATE TABLE IF NOT EXISTS platform_dos.migrations_applied (
  id             BIGSERIAL PRIMARY KEY,
  layer          TEXT NOT NULL CHECK (layer IN ('dos','dauth','dsoc','dnoc','cross')),
  migration_id   TEXT NOT NULL,
  checksum       TEXT NOT NULL,
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by     TEXT NOT NULL DEFAULT CURRENT_USER,
  duration_ms    INTEGER,
  UNIQUE (layer, migration_id)
);
CREATE INDEX IF NOT EXISTS idx_migrations_layer_time
  ON platform_dos.migrations_applied (layer, applied_at DESC);

-- feature_flags: platform/tenant feature toggles
CREATE TABLE IF NOT EXISTS platform_dos.feature_flags (
  flag_code      TEXT PRIMARY KEY,
  description    TEXT,
  default_value  BOOLEAN NOT NULL DEFAULT FALSE,
  scope          TEXT NOT NULL DEFAULT 'tenant'
                   CHECK (scope IN ('platform','product','tenant','user')),
  owner_module   TEXT REFERENCES platform_dos.modules_registry(module_code) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','deprecated','removed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attributes     JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS platform_dos.feature_flag_overrides (
  id             BIGSERIAL PRIMARY KEY,
  flag_code      TEXT NOT NULL REFERENCES platform_dos.feature_flags(flag_code) ON DELETE CASCADE,
  tenant_id      TEXT REFERENCES platform_dos.tenants_registry(tenant_id) ON DELETE CASCADE,
  user_id        TEXT,
  value          BOOLEAN NOT NULL,
  set_by         TEXT NOT NULL,
  set_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ,
  UNIQUE (flag_code, tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_flag_overrides_tenant
  ON platform_dos.feature_flag_overrides (tenant_id, flag_code) WHERE tenant_id IS NOT NULL;

-- tenant_provisioning_jobs: lifecycle state machine
CREATE TABLE IF NOT EXISTS platform_dos.tenant_provisioning_jobs (
  job_id           TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL,
  operation        TEXT NOT NULL
                     CHECK (operation IN ('provision','activate','suspend','resume','decommission','migrate')),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','running','completed','failed','cancelled')),
  current_step     TEXT,
  steps_total      INTEGER,
  steps_completed  INTEGER NOT NULL DEFAULT 0,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  error_message    TEXT,
  attributes       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prov_tenant_status
  ON platform_dos.tenant_provisioning_jobs (tenant_id, status, created_at DESC);

-- scheduled_job_runs: execution history
CREATE TABLE IF NOT EXISTS platform_dos.scheduled_job_runs (
  run_id         BIGSERIAL PRIMARY KEY,
  job_id         TEXT NOT NULL REFERENCES platform_dos.scheduled_jobs(job_id) ON DELETE CASCADE,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  status         TEXT NOT NULL DEFAULT 'running'
                   CHECK (status IN ('running','success','failed','cancelled','timeout')),
  output         JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message  TEXT
);
CREATE INDEX IF NOT EXISTS idx_job_runs_job_time
  ON platform_dos.scheduled_job_runs (job_id, started_at DESC);

-- module_versions: history
CREATE TABLE IF NOT EXISTS platform_dos.module_versions (
  id             BIGSERIAL PRIMARY KEY,
  module_code    TEXT NOT NULL REFERENCES platform_dos.modules_registry(module_code) ON DELETE CASCADE,
  version        TEXT NOT NULL,
  released_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changelog      TEXT,
  checksum       TEXT,
  UNIQUE (module_code, version)
);

-- product_bundles: canonical bundle definitions
CREATE TABLE IF NOT EXISTS platform_dos.product_bundles (
  bundle_code    TEXT PRIMARY KEY,
  product_code   TEXT NOT NULL REFERENCES platform_dos.products_registry(product_code) ON DELETE CASCADE,
  display_name   TEXT NOT NULL,
  version        TEXT NOT NULL DEFAULT '1.0.0',
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','draft','retired')),
  services       TEXT[] NOT NULL DEFAULT '{}',
  modules        TEXT[] NOT NULL DEFAULT '{}',
  attributes     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tenant_config: tenant-level runtime config (locale/timezone/defaults)
CREATE TABLE IF NOT EXISTS platform_dos.tenant_config (
  tenant_id      TEXT NOT NULL REFERENCES platform_dos.tenants_registry(tenant_id) ON DELETE CASCADE,
  key            TEXT NOT NULL,
  value          JSONB NOT NULL,
  set_by         TEXT NOT NULL DEFAULT CURRENT_USER,
  set_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, key)
);

-- module_config: per-(tenant,module) list/detail/form config
-- Storage for the /api/module-config/:moduleCode/:kind/:type contract.
CREATE TABLE IF NOT EXISTS platform_dos.module_config (
  id             BIGSERIAL PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES platform_dos.tenants_registry(tenant_id) ON DELETE CASCADE,
  module_code    TEXT NOT NULL REFERENCES platform_dos.modules_registry(module_code) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('list','detail','form','filters','columns','actions','views')),
  variant        TEXT NOT NULL DEFAULT 'default',
  config         JSONB NOT NULL,
  version        INTEGER NOT NULL DEFAULT 1,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     TEXT,
  UNIQUE (tenant_id, module_code, kind, variant)
);
CREATE INDEX IF NOT EXISTS idx_module_config_lookup
  ON platform_dos.module_config (module_code, kind, tenant_id);

-- module_permissions: declared permission catalog per module
CREATE TABLE IF NOT EXISTS platform_dos.module_permissions (
  permission_code  TEXT PRIMARY KEY,
  module_code      TEXT NOT NULL REFERENCES platform_dos.modules_registry(module_code) ON DELETE CASCADE,
  resource_type    TEXT NOT NULL,
  action_type      TEXT NOT NULL
                     CHECK (action_type IN ('view','create','read','update','delete','approve','export','admin')),
  description      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_code, resource_type, action_type)
);

-- tenant_secrets_ref: KMS-backed secret references (never the value)
CREATE TABLE IF NOT EXISTS platform_dos.tenant_secrets_ref (
  id             BIGSERIAL PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES platform_dos.tenants_registry(tenant_id) ON DELETE CASCADE,
  secret_code    TEXT NOT NULL,
  kms_ref        TEXT NOT NULL,
  kms_provider   TEXT NOT NULL DEFAULT 'aws-kms',
  version        INTEGER NOT NULL DEFAULT 1,
  rotated_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, secret_code)
);
