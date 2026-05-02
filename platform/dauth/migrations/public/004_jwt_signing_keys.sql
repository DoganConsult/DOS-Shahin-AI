BEGIN;
-- Migration 004: JWT signing key store for key rotation without downtime.
-- Multiple keys can exist: one 'active' for signing, 'retired' keys still verify.

CREATE TABLE IF NOT EXISTS public.jwt_signing_keys (
  kid         VARCHAR(64)   PRIMARY KEY,
  secret      TEXT          NOT NULL,
  algorithm   VARCHAR(10)   DEFAULT 'HS256',
  status      VARCHAR(20)   DEFAULT 'active',
  created_at  TIMESTAMPTZ   DEFAULT NOW(),
  retired_at  TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jsk_status
  ON public.jwt_signing_keys (status);

COMMIT;
