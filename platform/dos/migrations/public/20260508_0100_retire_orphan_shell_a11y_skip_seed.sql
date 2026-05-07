--
-- Retire orphan i18n seed: shell.a11y.skip_to_main (ns='shell').
--
-- Context:
--   20260505_0815_workspace_i18n_seed.sql inserted key 'shell.a11y.skip_to_main'
--   under ns='shell'. The UI-OS resolver (workspace-shell.routes.ts:loadShellTplStrings)
--   queries ns IN ('shell.tpl', 'shell.tpl.dph') only — ns='shell' is never read.
--   The canonical skip-link key 'shell.tpl.skip_to_main' (ns='shell.tpl') was
--   seeded by 20260511_0200_shell_tpl_skip_and_aria_landmarks.sql and IS read.
--   These two rows are unreachable dead data. This migration removes them.
--
-- Idempotent: DELETE WHERE key = ... is safe to re-run.
--
BEGIN;

SET LOCAL dos.publisher_session = 'contract-publisher@v1';

DELETE FROM dos.workspace_shell_i18n
 WHERE key = 'shell.a11y.skip_to_main'
   AND ns  = 'shell';

DO $$
DECLARE
  c INT;
BEGIN
  SELECT COUNT(*) INTO c
    FROM dos.workspace_shell_i18n
   WHERE key = 'shell.a11y.skip_to_main'
     AND ns  = 'shell';
  IF c <> 0 THEN
    RAISE EXCEPTION 'orphan shell.a11y.skip_to_main rows not removed: % remaining', c;
  END IF;
END$$;

COMMIT;
