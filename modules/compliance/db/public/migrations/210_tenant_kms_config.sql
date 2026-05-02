-- Wave 11 — Customer-Managed Encryption Keys (CMEK / BYOK).
-- Per-tenant CMEK configuration. KEK lives in customer KMS; we store
-- only the reference (e.g., AWS KMS key ARN, Azure Key Vault URL).
-- Wrapped DEKs are stored in dos.tenant_kms_keys (wrapped, never plain).

CREATE TABLE IF NOT EXISTS dos.tenant_kms_config (
  tenant_id TEXT PRIMARY KEY REFERENCES dos.tenants(tenant_id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('aws-kms', 'azure-keyvault', 'gcp-kms', 'hashicorp-vault', 'platform-managed')),
  kek_ref TEXT NOT NULL,
  region TEXT,
  rotation_days INTEGER NOT NULL DEFAULT 365,
  config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rotating', 'disabled', 'crypto-erased')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_kms_config_provider ON dos.tenant_kms_config (provider);
CREATE INDEX IF NOT EXISTS idx_tenant_kms_config_status ON dos.tenant_kms_config (status);

-- Wrapped DEKs (one or more per tenant, e.g., during rotation).
CREATE TABLE IF NOT EXISTS dos.tenant_kms_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES dos.tenants(tenant_id) ON DELETE CASCADE,
  kek_ref TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  wrapped_dek BYTEA NOT NULL,
  scope TEXT NOT NULL DEFAULT 'compliance',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  rotated_from UUID REFERENCES dos.tenant_kms_keys(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tenant_kms_keys_active
  ON dos.tenant_kms_keys (tenant_id, scope)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_tenant_kms_keys_kek_ref
  ON dos.tenant_kms_keys (kek_ref);

COMMENT ON TABLE dos.tenant_kms_config IS
  'Wave 11: per-tenant CMEK/BYOK configuration. KEK lives in customer KMS.';
COMMENT ON TABLE dos.tenant_kms_keys IS
  'Wave 11: wrapped DEKs per tenant. Plaintext DEKs never persisted.';
COMMENT ON COLUMN dos.tenant_kms_keys.wrapped_dek IS
  'DEK wrapped by KEK in customer KMS. AES-256-GCM (iv || tag || ciphertext).';
