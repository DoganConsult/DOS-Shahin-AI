-- =============================================================================
-- Migration: 20260505_2800_role_permissions_sync_guard
-- Purpose:   Add trigger guard to prevent drift between role_permissions
--            and functional_roles.permissions[].
--
-- Issue:     Phase 1B reconciled the two sources, but future updates could
--            cause drift if both are modified independently.
--
-- Fix:       Add trigger to ensure role_permissions is always in sync with
--            functional_roles.permissions[] when functional_roles is updated.
--
-- Idempotent: YES — CREATE TRIGGER IF NOT EXISTS pattern.
-- =============================================================================

BEGIN;

-- ─── 1. Add trigger function to sync role_permissions on functional_roles update ─────────────────────
CREATE OR REPLACE FUNCTION sync_role_permissions_on_functional_roles_update()
RETURNS TRIGGER AS $$
BEGIN
  -- When functional_roles.permissions[] changes, update role_permissions accordingly
  IF OLD.permissions IS DISTINCT FROM NEW.permissions THEN
    -- Delete existing role_permissions for this role
    DELETE FROM platform_dauth.role_permissions
    WHERE role_id = NEW.role_id;
    
    -- Insert new role_permissions from the updated permissions array
    INSERT INTO platform_dauth.role_permissions (role_id, permission_id)
    SELECT NEW.role_id, unnest(NEW.permissions)
    WHERE NEW.permissions IS NOT NULL
      AND array_length(NEW.permissions, 1) > 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 2. Add trigger to functional_roles table ───────────────────────────────
DROP TRIGGER IF EXISTS trg_sync_role_permissions ON platform_dauth.functional_roles;
CREATE TRIGGER trg_sync_role_permissions
  AFTER UPDATE OF permissions ON platform_dauth.functional_roles
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_permissions_on_functional_roles_update();

-- ─── 3. Add trigger for INSERT as well ───────────────────────────────────────
DROP TRIGGER IF EXISTS trg_sync_role_permissions_insert ON platform_dauth.functional_roles;
CREATE TRIGGER trg_sync_role_permissions_insert
  AFTER INSERT ON platform_dauth.functional_roles
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_permissions_on_functional_roles_update();

-- ─── 4. Self-assertion: verify trigger exists ────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_role_permissions'
      AND tgrelid = 'platform_dauth.functional_roles'::regclass
  ) THEN
    RAISE EXCEPTION 'Trigger trg_sync_role_permissions not found on functional_roles';
  END IF;
END $$;

COMMIT;

-- ─── Rollback Procedure (if needed) ────────────────────────────────────────
-- DROP TRIGGER trg_sync_role_permissions ON platform_dauth.functional_roles;
-- DROP TRIGGER trg_sync_role_permissions_insert ON platform_dauth.functional_roles;
-- DROP FUNCTION sync_role_permissions_on_functional_roles_update();
