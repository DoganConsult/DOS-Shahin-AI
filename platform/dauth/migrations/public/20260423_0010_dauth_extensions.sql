-- 20260423_0010_dauth_extensions.sql
-- Completes platform_dauth with password policy, lockout, API keys, OAuth, MFA recovery.

CREATE TABLE IF NOT EXISTS platform_dauth.password_policies (
  tenant_id            TEXT PRIMARY KEY,
  min_length           INTEGER NOT NULL DEFAULT 12,
  require_upper        BOOLEAN NOT NULL DEFAULT TRUE,
  require_lower        BOOLEAN NOT NULL DEFAULT TRUE,
  require_digit        BOOLEAN NOT NULL DEFAULT TRUE,
  require_symbol       BOOLEAN NOT NULL DEFAULT TRUE,
  max_age_days         INTEGER NOT NULL DEFAULT 90,
  history_size         INTEGER NOT NULL DEFAULT 5,
  max_failed_attempts  INTEGER NOT NULL DEFAULT 5,
  lockout_seconds      INTEGER NOT NULL DEFAULT 900,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_dauth.lockout_state (
  id              BIGSERIAL PRIMARY KEY,
  user_id         VARCHAR(64) NOT NULL,
  tenant_id       VARCHAR(16) NOT NULL,
  failed_count    INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_lockout_locked
  ON platform_dauth.lockout_state (locked_until) WHERE locked_until IS NOT NULL;

CREATE TABLE IF NOT EXISTS platform_dauth.api_keys (
  key_id         VARCHAR(64) PRIMARY KEY,
  tenant_id      VARCHAR(16) NOT NULL,
  user_id        VARCHAR(64),
  display_name   TEXT NOT NULL,
  key_hash       TEXT NOT NULL,
  scopes         TEXT[] NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','revoked','expired')),
  last_used_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_status
  ON platform_dauth.api_keys (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON platform_dauth.api_keys (key_hash);

CREATE TABLE IF NOT EXISTS platform_dauth.oauth_clients (
  client_id      VARCHAR(64) PRIMARY KEY,
  tenant_id      VARCHAR(16) NOT NULL,
  client_name    TEXT NOT NULL,
  client_secret_hash TEXT NOT NULL,
  redirect_uris  TEXT[] NOT NULL DEFAULT '{}',
  allowed_grants TEXT[] NOT NULL DEFAULT '{authorization_code,refresh_token}',
  allowed_scopes TEXT[] NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','suspended','revoked')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_dauth.oauth_grants (
  grant_id       VARCHAR(64) PRIMARY KEY,
  client_id      VARCHAR(64) NOT NULL REFERENCES platform_dauth.oauth_clients(client_id) ON DELETE CASCADE,
  user_id        VARCHAR(64) NOT NULL,
  tenant_id      VARCHAR(16) NOT NULL,
  grant_type     TEXT NOT NULL,
  code           TEXT,
  code_hash      TEXT,
  scopes         TEXT[] NOT NULL DEFAULT '{}',
  redirect_uri   TEXT,
  issued_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,
  consumed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_oauth_grants_user
  ON platform_dauth.oauth_grants (user_id, tenant_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_oauth_grants_code_hash
  ON platform_dauth.oauth_grants (code_hash) WHERE code_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS platform_dauth.mfa_recovery_codes (
  id             BIGSERIAL PRIMARY KEY,
  user_id        VARCHAR(64) NOT NULL,
  tenant_id      VARCHAR(16) NOT NULL,
  code_hash      TEXT NOT NULL,
  used_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, code_hash)
);
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_user
  ON platform_dauth.mfa_recovery_codes (user_id, tenant_id) WHERE used_at IS NULL;
