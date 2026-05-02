-- Down — drop alias-sync triggers + functions added in the up migration.
-- Seeded rows and reconciled columns are NOT removed; data must not be
-- destroyed by an automated rollback.

BEGIN;

DROP TRIGGER IF EXISTS trg_product_registry_alias_sync ON dos.product_registry;
DROP TRIGGER IF EXISTS trg_module_registry_alias_sync  ON dos.module_registry;
DROP TRIGGER IF EXISTS trg_tpa_alias_sync              ON dos.tenant_product_activation;

DROP FUNCTION IF EXISTS dos.product_registry_alias_sync();
DROP FUNCTION IF EXISTS dos.module_registry_alias_sync();
DROP FUNCTION IF EXISTS dos.tpa_alias_sync();

COMMIT;
