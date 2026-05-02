-- 20260423_0200_platform_hierarchy.sql
-- Enforces the real enterprise layer hierarchy on top of platform_dos:
--   platform → product → module(per product) → tenant(per product per module) → service
-- All tables are additive. No legacy data destroyed.

-- ── product_modules ────────────────────────────────────────────────
-- Canonical mapping: which modules belong to which product.
CREATE TABLE IF NOT EXISTS platform_dos.product_modules (
  product_code   TEXT NOT NULL
                   REFERENCES platform_dos.products_registry(product_code) ON DELETE CASCADE,
  module_code    TEXT NOT NULL
                   REFERENCES platform_dos.modules_registry(module_code)  ON DELETE CASCADE,
  is_headline    BOOLEAN NOT NULL DEFAULT FALSE,
  bound_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attributes     JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (product_code, module_code)
);
CREATE INDEX IF NOT EXISTS idx_product_modules_module
  ON platform_dos.product_modules (module_code);

-- ── tenant_products ────────────────────────────────────────────────
-- Which products are activated for which tenant.
CREATE TABLE IF NOT EXISTS platform_dos.tenant_products (
  tenant_id       TEXT NOT NULL
                    REFERENCES platform_dos.tenants_registry(tenant_id) ON DELETE CASCADE,
  product_code    TEXT NOT NULL
                    REFERENCES platform_dos.products_registry(product_code) ON DELETE RESTRICT,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','provisioning','decommissioned')),
  activated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at  TIMESTAMPTZ,
  attributes      JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, product_code)
);
CREATE INDEX IF NOT EXISTS idx_tenant_products_product_status
  ON platform_dos.tenant_products (product_code, status);

-- ── tenant_product_modules ─────────────────────────────────────────
-- Activation per (tenant,product,module). Enforces that the module
-- is valid for the product via FK to product_modules.
CREATE TABLE IF NOT EXISTS platform_dos.tenant_product_modules (
  tenant_id       TEXT NOT NULL,
  product_code    TEXT NOT NULL,
  module_code     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','disabled','provisioning')),
  activated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at  TIMESTAMPTZ,
  attributes      JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, product_code, module_code),
  FOREIGN KEY (tenant_id, product_code)
    REFERENCES platform_dos.tenant_products(tenant_id, product_code) ON DELETE CASCADE,
  FOREIGN KEY (product_code, module_code)
    REFERENCES platform_dos.product_modules(product_code, module_code) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_tenant_product_modules_module
  ON platform_dos.tenant_product_modules (module_code, status);
CREATE INDEX IF NOT EXISTS idx_tenant_product_modules_tenant_status
  ON platform_dos.tenant_product_modules (tenant_id, status);

-- ── services_registry ──────────────────────────────────────────────
-- Canonical list of runtime services that can be provisioned.
CREATE TABLE IF NOT EXISTS platform_dos.services_registry (
  service_code     TEXT PRIMARY KEY,
  version          TEXT NOT NULL DEFAULT '1.0.0',
  layer            TEXT NOT NULL DEFAULT 'product'
                     CHECK (layer IN ('platform','product','shared')),
  owner_team       TEXT NOT NULL DEFAULT 'unknown',
  status           TEXT NOT NULL DEFAULT 'registered'
                     CHECK (status IN ('registered','deregistered')),
  registered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attributes       JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ── product_services ───────────────────────────────────────────────
-- Canonical mapping: which services a product consumes.
CREATE TABLE IF NOT EXISTS platform_dos.product_services (
  product_code   TEXT NOT NULL
                   REFERENCES platform_dos.products_registry(product_code) ON DELETE CASCADE,
  service_code   TEXT NOT NULL
                   REFERENCES platform_dos.services_registry(service_code) ON DELETE CASCADE,
  bound_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_code, service_code)
);
CREATE INDEX IF NOT EXISTS idx_product_services_service
  ON platform_dos.product_services (service_code);

-- ── tenant_services ────────────────────────────────────────────────
-- Which services are provisioned for which tenant (scoped by product).
CREATE TABLE IF NOT EXISTS platform_dos.tenant_services (
  tenant_id       TEXT NOT NULL,
  product_code    TEXT NOT NULL,
  service_code    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','provisioning','decommissioned')),
  provisioned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deprovisioned_at TIMESTAMPTZ,
  attributes      JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, product_code, service_code),
  FOREIGN KEY (tenant_id, product_code)
    REFERENCES platform_dos.tenant_products(tenant_id, product_code) ON DELETE CASCADE,
  FOREIGN KEY (product_code, service_code)
    REFERENCES platform_dos.product_services(product_code, service_code) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_tenant_services_service
  ON platform_dos.tenant_services (service_code, status);

COMMENT ON TABLE platform_dos.product_modules          IS 'Which modules belong to which product (from product.manifest.json module_codes).';
COMMENT ON TABLE platform_dos.tenant_products          IS 'Product activation per tenant.';
COMMENT ON TABLE platform_dos.tenant_product_modules   IS 'Per-(tenant,product) module activation. Guarded by product_modules FK.';
COMMENT ON TABLE platform_dos.services_registry        IS 'Canonical registry of runtime services.';
COMMENT ON TABLE platform_dos.product_services         IS 'Which services a product consumes (from bundles/default.bundle.json).';
COMMENT ON TABLE platform_dos.tenant_services          IS 'Per-(tenant,product) service provisioning state.';
