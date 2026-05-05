-- =============================================================================
-- Migration: 20260505_2600_cleanup_orphan_user_assignments
-- Purpose:   Clean up orphaned user_role_assignments for users not in dos.users.
--
-- Issue:     Found 2 user_ids in user_role_assignments that don't exist in dos.users:
--            - 32bff411-cd35-4b74-9dd9-caf0a18e4f58
--            - ceca9da4-3e34-4e6e-a57c-5aff1d4e6352
--            This is a data integrity issue.
--
-- Fix:       Remove orphaned user_role_assignments for users not in dos.users.
--
-- Idempotent: YES — DELETE pattern with self-assertion guard.
-- =============================================================================

BEGIN;

-- ─── 1. Remove orphaned user_role_assignments ───────────────────────────────
DELETE FROM dos.user_role_assignments
WHERE user_id NOT IN (SELECT user_id FROM dos.users);

-- ─── 2. Self-assertion: verify cleanup success ────────────────────────────────
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM dos.user_role_assignments ura
  WHERE ura.user_id NOT IN (SELECT user_id FROM dos.users);
  
  IF orphan_count <> 0 THEN
    RAISE EXCEPTION 'Orphan user_role_assignments cleanup left % orphaned rows', orphan_count;
  END IF;
END $$;

COMMIT;

-- ─── Rollback Procedure (if needed) ────────────────────────────────────────
-- Cannot rollback - deleted rows are lost.
-- Restore from full DB backup if needed.
