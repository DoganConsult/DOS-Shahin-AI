-- Platform-managed dynamic secret store.
--
-- Owns Azure / Microsoft Graph / MFA pepper / sender identity / generic
-- third-party tokens that previously sat in static .env files. Values
-- are AES-256-GCM encrypted at-rest with the platform-wide
-- SECRETS_ENCRYPTION_KEY and revealed only to:
--   * runtime services (auth-service /admin/secrets reader)
--   * platform admins via the dynamic admin UI (/admin/integrations/secrets)
--
-- A row identifies one secret_key in one scope:
--   scope='platform' (tenant_id IS NULL) — global default
--   scope='tenant'   (tenant_id NOT NULL) — per-tenant override
--
-- Tenant overrides win over the platform default at resolve time.
-- value_ciphertext / value_iv / value_tag are nullable so a key can be
-- declared (catalog row) without a value yet.

BEGIN;

CREATE TABLE IF NOT EXISTS dos.platform_secret_definition (
  secret_key      varchar(128) PRIMARY KEY,
  category        varchar(64)  NOT NULL DEFAULT 'general',
  display_label   varchar(160) NOT NULL,
  description     text,
  is_sensitive    boolean      NOT NULL DEFAULT true,
  consumer_service varchar(128),
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dos.platform_secret (
  secret_id        bigserial PRIMARY KEY,
  secret_key       varchar(128) NOT NULL REFERENCES dos.platform_secret_definition(secret_key) ON UPDATE CASCADE,
  scope            varchar(16)  NOT NULL DEFAULT 'platform',
  tenant_id        varchar(64),
  value_ciphertext bytea,
  value_iv         bytea,
  value_tag        bytea,
  version          integer      NOT NULL DEFAULT 1,
  is_active        boolean      NOT NULL DEFAULT true,
  updated_at       timestamptz  NOT NULL DEFAULT now(),
  updated_by       varchar(128),
  CONSTRAINT chk_platform_secret_scope CHECK (scope IN ('platform','tenant')),
  CONSTRAINT chk_platform_secret_scope_tenant CHECK (
    (scope = 'platform' AND tenant_id IS NULL) OR
    (scope = 'tenant'   AND tenant_id IS NOT NULL)
  )
);

-- Unique (secret_key, scope, tenant_id) where tenant_id is treated as
-- the empty string '' for the platform scope, so the partial-unique
-- collapses naturally without NULL-distinct gymnastics.
CREATE UNIQUE INDEX IF NOT EXISTS ux_platform_secret_key_scope
  ON dos.platform_secret (secret_key, scope, COALESCE(tenant_id, ''));

CREATE INDEX IF NOT EXISTS ix_platform_secret_tenant
  ON dos.platform_secret (tenant_id) WHERE tenant_id IS NOT NULL;

-- Seed the canonical catalog (idempotent). The mfa-by-email + Microsoft
-- Graph integration owns 7 keys; the dynamic admin UI lets platform
-- admins fill them in without redeploying or editing env files.
INSERT INTO dos.platform_secret_definition
  (secret_key, category, display_label, description, is_sensitive, consumer_service)
VALUES
  ('azure.tenantId',     'integration.azure',  'Azure Tenant ID',     'Microsoft Entra directory ID for Graph OAuth2 client credentials.', true,  'auth-service'),
  ('azure.clientId',     'integration.azure',  'Azure Client ID',     'App registration (client) ID with Mail.Send permission.',           true,  'auth-service'),
  ('azure.clientSecret', 'integration.azure',  'Azure Client Secret', 'App registration secret value (one of the rotating secrets).',     true,  'auth-service'),
  ('graph.apiEndpoint',  'integration.azure',  'Graph API Endpoint',  'Microsoft Graph base URL — defaults to https://graph.microsoft.com/v1.0.', false, 'auth-service'),
  ('mfa.sender',         'mfa.email',          'MFA Sender Address',  'Mailbox the OTP email is sent from (must be a licensed user in the Azure tenant).', false, 'auth-service'),
  ('mfa.fromLabel',      'mfa.email',          'MFA From Display',    'Display name shown to recipients (e.g. "Shahin-AI").',              false, 'auth-service'),
  ('mfa.otpPepper',      'mfa.crypto',         'MFA OTP Pepper',      'HMAC pepper used to hash OTP codes and sign the dos_mfa_passed cookie.', true,  'auth-service')
ON CONFLICT (secret_key) DO UPDATE
   SET display_label    = EXCLUDED.display_label,
       description      = EXCLUDED.description,
       is_sensitive     = EXCLUDED.is_sensitive,
       consumer_service = EXCLUDED.consumer_service;

COMMIT;
