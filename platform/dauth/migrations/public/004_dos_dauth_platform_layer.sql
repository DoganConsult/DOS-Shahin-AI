-- Migration 004: DOS + DAuth Platform Layer tables
-- Config Registry, Runtime Config, Tenant Settings, DAuth enforcement tables

-- ── Config Registry (from config_registry_implementation_pack.md) ────────────

CREATE TABLE IF NOT EXISTS dos.config_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  owner_domain TEXT NOT NULL,
  category TEXT NOT NULL,
  value_type TEXT NOT NULL,
  allowed_scopes TEXT[] NOT NULL,
  default_value JSONB,
  validation_schema JSONB,
  enum_values TEXT[] DEFAULT '{}',
  is_secret BOOLEAN NOT NULL DEFAULT FALSE,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_overridable BOOLEAN NOT NULL DEFAULT TRUE,
  is_lockable BOOLEAN NOT NULL DEFAULT TRUE,
  requires_restart BOOLEAN NOT NULL DEFAULT FALSE,
  deployment_only BOOLEAN NOT NULL DEFAULT FALSE,
  sdk_exposable BOOLEAN NOT NULL DEFAULT FALSE,
  ui_exposable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_config_definitions_owner ON dos.config_definitions(owner_domain);
CREATE INDEX IF NOT EXISTS idx_config_definitions_category ON dos.config_definitions(category);

CREATE TABLE IF NOT EXISTS dos.config_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID NOT NULL REFERENCES dos.config_definitions(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  value JSONB NOT NULL,
  value_hash TEXT,
  is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  UNIQUE (definition_id, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_config_values_scope ON dos.config_values(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_config_values_def ON dos.config_values(definition_id);

CREATE TABLE IF NOT EXISTS dos.config_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID NOT NULL REFERENCES dos.config_definitions(id) ON DELETE CASCADE,
  locked_at_scope_type TEXT NOT NULL,
  locked_at_scope_id TEXT NOT NULL,
  lock_behavior TEXT NOT NULL DEFAULT 'no_override_below',
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  UNIQUE (definition_id, locked_at_scope_type, locked_at_scope_id)
);

CREATE INDEX IF NOT EXISTS idx_config_locks_scope ON dos.config_locks(locked_at_scope_type, locked_at_scope_id);

CREATE TABLE IF NOT EXISTS dos.config_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID REFERENCES dos.config_definitions(id) ON DELETE SET NULL,
  config_key TEXT NOT NULL,
  action TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  actor_user_id UUID,
  actor_role_code TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_audit_key ON dos.config_audit_logs(config_key);
CREATE INDEX IF NOT EXISTS idx_config_audit_scope ON dos.config_audit_logs(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_config_audit_created ON dos.config_audit_logs(created_at DESC);

-- ── Runtime Config ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.runtime_config (
  config_key TEXT PRIMARY KEY,
  config_value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string',
  description TEXT,
  set_by TEXT NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dos.runtime_config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_type TEXT NOT NULL DEFAULT 'set'
);

CREATE INDEX IF NOT EXISTS idx_runtime_config_history_key ON dos.runtime_config_history(config_key);

-- ── Config Runtime Overrides ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.config_runtime_overrides (
  config_key TEXT PRIMARY KEY,
  config_value TEXT NOT NULL,
  set_by TEXT NOT NULL DEFAULT 'system',
  set_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Platform Operation Config ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.platform_operation_config (
  config_key TEXT PRIMARY KEY,
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Platform Audit Logs ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  actor_id UUID,
  actor_email TEXT,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON dos.platform_audit_logs(created_at DESC);

-- ── System Events ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT,
  severity TEXT DEFAULT 'info',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_events_occurred ON dos.system_events(occurred_at DESC);

-- ── Product Registry ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.product_registry (
  code TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'enabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Module Registry ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.module_registry (
  code TEXT PRIMARY KEY,
  product_code TEXT,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  tier TEXT DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'enabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Feature Flags ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.feature_flags (
  flag_code TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  module_code TEXT,
  default_value BOOLEAN NOT NULL DEFAULT FALSE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  owner_layer TEXT DEFAULT 'DOS',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tenant Product Activation ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.tenant_product_activation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  product_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, product_code)
);

-- ── AI Registries ────────────────────────────────────────────────────────────
-- Tables dos.ai_model_registry, dos.ai_agent_registry, dos.ai_prompt_registry
-- are created in 003b_platform_admin_tables.sql. Previously duplicated here with
-- divergent column schemas (display_name/description vs. name_en/name_ar) — the
-- duplicates were silent no-ops because 003b runs first and IF NOT EXISTS
-- blocked the second CREATE. Duplicates removed per W1.5 of the AI Remediation
-- Plan. Any schema reconciliation (adding display_name/description columns that
-- gateway queries expect) belongs in a new additive ALTER migration, not here.

-- ── DAuth: Approval Matrix Rules (tenant-scoped) ────────────────────────────

CREATE TABLE IF NOT EXISTS dos.approval_matrix_rules_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code TEXT NOT NULL,
  transition_to TEXT NOT NULL,
  required_authority_level TEXT NOT NULL DEFAULT 'module_admin',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DAuth: Sign-Off Authorities Template ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.sign_off_authorities_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code TEXT NOT NULL,
  authority_level TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DAuth: Lifecycle Auth Log Template ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.lifecycle_auth_log_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  module_code TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT,
  allowed BOOLEAN NOT NULL,
  evaluated_by UUID,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DAuth: SoD Conflict Audit Template ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.sod_conflict_audit_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  user_id UUID,
  role_codes TEXT[],
  conflicting_rules JSONB,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Login Attempts ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reason TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_at ON dos.login_attempts(attempted_at DESC);

-- ── User MFA ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.user_mfa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  method TEXT NOT NULL,
  secret TEXT,
  phone_number TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, method)
);

-- ── Sessions ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dos.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_hash TEXT,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON dos.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON dos.sessions(is_active) WHERE is_active = TRUE;

