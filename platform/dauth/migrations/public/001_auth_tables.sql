-- auth-service owned tables
-- Aligned with ops/migrations/000_create_dos_schema.sql (canonical schema)

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- TOKEN_BLACKLIST — JTI revocation registry
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.token_blacklist (
  jti                 VARCHAR(128) PRIMARY KEY,
  user_id             VARCHAR(64),
  expires_at          TIMESTAMPTZ NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_user ON public.token_blacklist (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON public.token_blacklist (expires_at);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_active_user ON public.token_blacklist (user_id, is_active) WHERE is_active = TRUE;

-- ═══════════════════════════════════════════════════════════════
-- SESSIONS — DAuth session persistence
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.sessions (
  session_id          VARCHAR(64) PRIMARY KEY,
  user_id             VARCHAR(64) NOT NULL,
  tenant_id           VARCHAR(16) NOT NULL,
  jti                 VARCHAR(128) NOT NULL,
  refresh_jti         VARCHAR(128),
  ip_address          INET,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at      TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_tenant ON public.sessions (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_jti ON public.sessions (jti);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_jti ON public.sessions (refresh_jti) WHERE refresh_jti IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.sessions (user_id, revoked_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.sessions (expires_at);

CREATE TABLE IF NOT EXISTS public.actors (
  actor_id      VARCHAR(64) PRIMARY KEY,
  user_id       VARCHAR(64) NOT NULL,
  actor_type    VARCHAR(30) DEFAULT 'user',
  display_name  VARCHAR(255),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.access_profiles (
  profile_id    VARCHAR(64) PRIMARY KEY,
  profile_code  VARCHAR(100) NOT NULL UNIQUE,
  display_name  VARCHAR(255) NOT NULL,
  description   TEXT,
  permissions   TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_access_profiles (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR(64) NOT NULL,
  profile_id    VARCHAR(64) NOT NULL,
  tenant_id     VARCHAR(16),
  granted_at    TIMESTAMPTZ DEFAULT NOW(),
  granted_by    VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS public.access_snapshots (
  snapshot_id   VARCHAR(64) PRIMARY KEY,
  user_id       VARCHAR(64) NOT NULL,
  tenant_id     VARCHAR(16),
  snapshot_data JSONB NOT NULL,
  captured_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.authorization_audit_log (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR(64),
  tenant_id     VARCHAR(16),
  action        VARCHAR(100),
  resource      VARCHAR(255),
  decision      VARCHAR(20),
  reason        TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos.login_attempts (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR(64),
  email         VARCHAR(255),
  ip_address    VARCHAR(45),
  success       BOOLEAN DEFAULT FALSE,
  failure_reason VARCHAR(100),
  attempted_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos.user_mfa (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR(64) NOT NULL,
  mfa_type      VARCHAR(30) DEFAULT 'totp',
  secret        VARCHAR(255),
  is_enabled    BOOLEAN DEFAULT FALSE,
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos.sessions (
  session_id          VARCHAR(64) PRIMARY KEY,
  user_id             VARCHAR(64) NOT NULL,
  tenant_id           VARCHAR(16) NOT NULL,
  jti                 VARCHAR(128) NOT NULL,
  refresh_jti         VARCHAR(128),
  ip_address          INET,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at      TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dos.access_profiles (
  profile_id    VARCHAR(64) PRIMARY KEY,
  profile_code  VARCHAR(100) NOT NULL,
  display_name  VARCHAR(255) NOT NULL,
  description   TEXT,
  permissions   TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos.user_access_profiles (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR(64) NOT NULL,
  profile_id    VARCHAR(64) NOT NULL,
  tenant_id     VARCHAR(16),
  granted_at    TIMESTAMPTZ DEFAULT NOW(),
  granted_by    VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS dos.functional_roles (
  role_id       VARCHAR(64) PRIMARY KEY,
  role_code     VARCHAR(100) NOT NULL,
  display_name  VARCHAR(255),
  description   TEXT,
  permissions   TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos.permissions (
  permission_id VARCHAR(64) PRIMARY KEY,
  permission_code VARCHAR(200) NOT NULL,
  module_code   VARCHAR(50),
  resource_type VARCHAR(50),
  action_type   VARCHAR(50),
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos.role_permissions (
  id            SERIAL PRIMARY KEY,
  role_id       VARCHAR(64) NOT NULL,
  permission_id VARCHAR(64) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos.delegations (
  delegation_id VARCHAR(64) PRIMARY KEY,
  from_user_id  VARCHAR(64) NOT NULL,
  to_user_id    VARCHAR(64) NOT NULL,
  tenant_id     VARCHAR(16) NOT NULL,
  scope         JSONB DEFAULT '{}',
  valid_from    TIMESTAMPTZ DEFAULT NOW(),
  valid_until   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos.sod_rules (
  rule_id       VARCHAR(64) PRIMARY KEY,
  rule_code     VARCHAR(100) NOT NULL,
  module_code   VARCHAR(50),
  conflicting_permissions TEXT[] DEFAULT '{}',
  severity      VARCHAR(20) DEFAULT 'warning',
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos.user_role_assignments (
  id            SERIAL PRIMARY KEY,
  user_id       VARCHAR(64) NOT NULL,
  role_id       VARCHAR(64) NOT NULL,
  tenant_id     VARCHAR(16),
  assigned_at   TIMESTAMPTZ DEFAULT NOW(),
  assigned_by   VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS dos.approval_matrix_rules_template (
  id            SERIAL PRIMARY KEY,
  module_code   VARCHAR(50),
  entity_type   VARCHAR(50),
  action        VARCHAR(50),
  required_authority VARCHAR(50),
  min_approvers INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos.sign_off_authorities_template (
  id            SERIAL PRIMARY KEY,
  authority_code VARCHAR(100),
  module_code   VARCHAR(50),
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos.lifecycle_auth_log_template (
  id            SERIAL PRIMARY KEY,
  tenant_id     VARCHAR(16),
  module_code   VARCHAR(50),
  entity_type   VARCHAR(50),
  entity_id     VARCHAR(64),
  from_state    VARCHAR(50),
  to_state      VARCHAR(50),
  user_id       VARCHAR(64),
  decision      VARCHAR(20),
  reason        TEXT,
  checks        JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dos.sod_conflict_audit_template (
  id            SERIAL PRIMARY KEY,
  tenant_id     VARCHAR(16),
  user_id       VARCHAR(64),
  rule_id       VARCHAR(64),
  conflicting_action VARCHAR(100),
  decision      VARCHAR(20),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
