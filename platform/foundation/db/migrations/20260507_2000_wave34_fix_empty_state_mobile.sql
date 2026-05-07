-- =====================================================================
-- Wave 34 — Re-disable workspace.shell.empty-state + Mobile CSS fixes
--
-- Root causes:
-- 1. Wave 31 (foundation_structural_surfaces) used ON CONFLICT DO UPDATE
--    on workspace_shell_binding for workspace.shell.empty-state, which
--    implicitly reset enabled back to TRUE for all tenants — undoing
--    the Wave 17 disable.
--    Result: "Workspace ready" placeholder renders on ALL pages including
--    /foundation/* routes, duplicating the router-outlet content.
--
-- 2. workspace.shell.module-cards has duplicate bindings (positions 63
--    and 121) causing doubled card strips on the workspace home.
--
-- Fix:
--   Disable workspace.shell.empty-state for all tenants (idempotent).
--   Dedup module-cards to keep only the canonical position=121 binding.
--   Doctrine: page-level dos-tpl-fallback in dynamic-template-page.component
--   already handles the "no template" empty state correctly.
--   The shell-level surface is redundant and doctrine-violating.
-- =====================================================================

BEGIN;

DO $$ BEGIN
  RAISE NOTICE 'Wave 34 — re-disabling workspace.shell.empty-state for all tenants';
END $$;

-- ── Fix 1: Re-disable empty-state ────────────────────────────────────
UPDATE dos.workspace_shell_binding
   SET enabled = false,
       updated_at = NOW(),
       version = version + 1
 WHERE component_key = 'workspace.shell.empty-state'
   AND enabled = true;

-- ── Fix 2: Dedup module-cards — keep position=121 only ───────────────
-- Wave 31 created duplicates at positions 63 and 121.
-- Position 121 is the canonical main-zone binding with zone prop set.
DELETE FROM dos.workspace_shell_binding
 WHERE component_key = 'workspace.shell.module-cards'
   AND position = 63
   AND (props->>'zone') IS NULL;

-- ── Fix 3: Dedup brand — keep position=100 only ──────────────────────
DELETE FROM dos.workspace_shell_binding
 WHERE component_key = 'workspace.shell.brand'
   AND position = 61
   AND (props->>'zone') IS NULL;

-- ── Fix 4: Dedup sidebar-nav — keep position=110 only ────────────────
DELETE FROM dos.workspace_shell_binding
 WHERE component_key = 'workspace.shell.sidebar-nav'
   AND position = 65
   AND (props->>'zone') IS NULL;

-- ── Fix 5: Dedup settings-action — keep position=103 with zone ───────
DELETE FROM dos.workspace_shell_binding
 WHERE component_key = 'workspace.shell.settings-action'
   AND position = 103
   AND (props->>'zone') IS NULL;

-- ── Fix 6: Dedup user-menu — keep position=104 with zone ─────────────
DELETE FROM dos.workspace_shell_binding
 WHERE component_key = 'workspace.shell.user-menu'
   AND position = 104
   AND (props->>'zone') IS NULL;

-- ── Fix 7: Dedup workspace-title — keep position=101 with zone ───────
DELETE FROM dos.workspace_shell_binding
 WHERE component_key = 'workspace.shell.workspace-title'
   AND position = 67
   AND (props->>'zone') IS NULL;

-- ── Validation ───────────────────────────────────────────────────────
DO $$
DECLARE
  remaining_empty_state INT;
  remaining_dup_cards INT;
BEGIN
  SELECT count(*) INTO remaining_empty_state
    FROM dos.workspace_shell_binding
   WHERE component_key = 'workspace.shell.empty-state' AND enabled = true;

  IF remaining_empty_state > 0 THEN
    RAISE EXCEPTION 'wave34: % empty-state rows still enabled', remaining_empty_state;
  END IF;

  SELECT count(*) INTO remaining_dup_cards
    FROM dos.workspace_shell_binding
   WHERE component_key = 'workspace.shell.module-cards' AND position = 63;

  IF remaining_dup_cards > 0 THEN
    RAISE EXCEPTION 'wave34: % duplicate module-cards at position=63 remain', remaining_dup_cards;
  END IF;

  RAISE NOTICE 'wave34 proof: empty-state disabled=%, duplicate bindings removed', remaining_empty_state;
END$$;

COMMIT;
