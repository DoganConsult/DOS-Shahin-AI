-- =====================================================================
-- Wave 32 — Global Activation of IBM Carbon Structural Components
-- 
-- Root Cause: IBM Carbon components (workspace.data.data-table, etc.)
-- were seeded as 'enabled = false' for many tenants, causing the 
-- UI-OS resolver to filter them out even if correctly tagged.
--
-- This migration ensures all structural Carbon components are enabled 
-- globally across all tenants to satisfy the Zero Legacy runtime.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Part 1 — Enable all approved IBM Carbon shell components
-- ---------------------------------------------------------------------
UPDATE dos.workspace_shell_binding b
   SET enabled = TRUE,
       updated_at = NOW(),
       version = b.version + 1
  FROM dos.dynamic_ui_component_registry r
 WHERE r.component_key = b.component_key
   AND r.vendor = 'ibm-carbon'
   AND r.carbon_key IS NOT NULL
   AND b.enabled = FALSE;

-- ---------------------------------------------------------------------
-- Part 2 — Fix trigger default for new tenants
-- ---------------------------------------------------------------------
-- Ensure the seeding function uses 'enabled = true' by default.
CREATE OR REPLACE FUNCTION dos.seed_workspace_shell_binding_for_tenant()
RETURNS TRIGGER AS $$
BEGIN
   INSERT INTO dos.workspace_shell_binding 
     (tenant_id, component_key, position, perms_required, props, enabled)
   SELECT 
     NEW.tenant_id, 
     r.component_key, 
     COALESCE(NULLIF(r.metadata->>'position','')::int, row_number() OVER (ORDER BY r.component_key)::int),
     ARRAY[]::text[],
     '{}'::jsonb,
     TRUE -- Force enabled for structural components
     FROM dos.dynamic_ui_component_registry r
    WHERE r.component_key LIKE 'workspace.%'
      AND r.approval_status = 'approved'
    ON CONFLICT (tenant_id, component_key) DO UPDATE
    SET enabled = TRUE;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
