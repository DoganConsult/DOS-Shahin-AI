-- 2026-05-08 — MFA-by-email OTP store.
--
-- Backs the auth-service /api/auth/mfa/{send,verify} flow. One row per
-- code issued; constant-time compare verifies the SHA-256(otp || pepper)
-- digest. Plain code never persisted. Idempotent re-runs.

BEGIN;

CREATE TABLE IF NOT EXISTS dos.auth_mfa_otp (
  otp_id         varchar(48) PRIMARY KEY,
  user_sub       varchar(255) NOT NULL,
  email          varchar(320) NOT NULL,
  code_hash      varchar(128) NOT NULL,
  channel        varchar(16)  NOT NULL DEFAULT 'email',
  sent_at        timestamptz  NOT NULL DEFAULT now(),
  expires_at     timestamptz  NOT NULL,
  consumed_at    timestamptz,
  attempts       integer      NOT NULL DEFAULT 0,
  ip             varchar(64),
  user_agent     varchar(512),
  metadata       jsonb        NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ix_auth_mfa_otp_user_sent
  ON dos.auth_mfa_otp (user_sub, sent_at DESC);
CREATE INDEX IF NOT EXISTS ix_auth_mfa_otp_active
  ON dos.auth_mfa_otp (user_sub, expires_at)
  WHERE consumed_at IS NULL;

-- Dynamic per-tenant policy. mfa_required=true → login flow redirects
-- to /auth/mfa after Keycloak callback. Read-only from FE; toggled by
-- platform admins via tenant-service.
CREATE TABLE IF NOT EXISTS dos.tenant_security_policy (
  tenant_id        varchar(64) PRIMARY KEY,
  mfa_required     boolean NOT NULL DEFAULT false,
  mfa_channel      varchar(16) NOT NULL DEFAULT 'email',
  mfa_otp_ttl_sec  integer NOT NULL DEFAULT 300,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       varchar(128)
);

COMMIT;
