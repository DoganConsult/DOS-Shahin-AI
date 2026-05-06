-- 20260506_0510_tenant_module_entitlements_lite.sql
-- Recreate dos.tenant_module_entitlements (Phase G remnant) without the
-- FK chain to dos.tenant_trials / dos.tenant_subscriptions which were
-- never applied to this DB. The tenant-service /permissions handler
-- UNIONs this table with dos.tenant_product_activation, so its absence
-- causes /api/access/my-permissions to 500 and the workspace-shell
-- guard to redirect every authenticated user to /login?reason=no-tenant.
--
-- Idempotent. Empty by design: real entitlements are seeded by the
-- trial/subscription lifecycle later. tenant_id FK to dos.tenants is
-- preserved so cascades remain correct.

BEGIN;

CREATE TABLE IF NOT EXISTS dos.tenant_module_entitlements (
  entitlement_id        VARCHAR(32) PRIMARY KEY,
  tenant_id             VARCHAR(16) NOT NULL REFERENCES dos.tenants(tenant_id) ON DELETE CASCADE,
  product_code          VARCHAR(64) NOT NULL,
  module_code           VARCHAR(64) NOT NULL,
  entitlement_status    VARCHAR(32) NOT NULL DEFAULT 'active',
  source                VARCHAR(32) NOT NULL DEFAULT 'paid',
  trial_id              VARCHAR(32),
  subscription_id       VARCHAR(32),
  limits_json           JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at               TIMESTAMPTZ,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_tenant_module_entitlements_status CHECK (entitlement_status IN (
    'active','expired','suspended','cancelled','pending','not_entitled'
  )),
  CONSTRAINT chk_tenant_module_entitlements_source CHECK (source IN (
    'trial','paid','internal','admin','manual','platform_dna'
  ))
);

CREATE INDEX IF NOT EXISTS idx_tenant_module_entitlements_tenant
  ON dos.tenant_module_entitlements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_module_entitlements_module
  ON dos.tenant_module_entitlements(tenant_id, module_code);
CREATE INDEX IF NOT EXISTS idx_tenant_module_entitlements_status
  ON dos.tenant_module_entitlements(entitlement_status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_module_entitlements_active
  ON dos.tenant_module_entitlements(tenant_id, product_code, module_code)
  WHERE entitlement_status = 'active';

COMMIT;
