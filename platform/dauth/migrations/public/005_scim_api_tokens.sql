BEGIN;
-- Migration 005: SCIM API tokens for Azure AD / Okta provisioning integration.
-- Each tenant gets a dedicated bearer token for their IdP to call SCIM endpoints.

CREATE TABLE IF NOT EXISTS public.scim_api_tokens (
  token_id    VARCHAR(64)   PRIMARY KEY,
  tenant_id   VARCHAR(16)   NOT NULL,
  token_hash  VARCHAR(256)  NOT NULL,
  label       VARCHAR(128)  DEFAULT 'SCIM Token',
  created_by  VARCHAR(64),
  created_at  TIMESTAMPTZ   DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  last_used   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scim_token_tenant
  ON public.scim_api_tokens (tenant_id)
  WHERE revoked_at IS NULL;

COMMIT;
