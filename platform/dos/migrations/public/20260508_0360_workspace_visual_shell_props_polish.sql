-- 20260508_0360_workspace_visual_shell_props_polish.sql
-- Forward-only. Polishes the props bag of the canonical visual shell
-- bindings seeded in 0350. Two deliberate changes:
--
--   1. workspace.shell.empty-state — DROP the `icon='dashboard'` field
--      and DROP `tone='info'`. The DosEmptyStateComponent renders the
--      `icon` input as literal text (glyph slot), so the string
--      'dashboard' was being painted as a giant 2rem text label in the
--      main zone. Removing the prop lets the component fall back to its
--      built-in SVG glyph and the recommended tone token. Title +
--      description preserved unchanged.
--
--   2. workspace.shell.user-menu / workspace.shell.settings-action —
--      Add explicit `ariaLabel` props so the icon-only buttons emit a
--      stable accessible name without depending on the @Input fallback.
--
-- Idempotent.

BEGIN;

-- empty-state — strip the literal-glyph keys, keep title/description/zone.
UPDATE dos.workspace_shell_binding
   SET props = (props - 'icon' - 'tone')
 WHERE component_key = 'workspace.shell.empty-state'
   AND (props ? 'icon' OR props ? 'tone');

-- settings-action — explicit ariaLabel so icon-only emits stable name.
UPDATE dos.workspace_shell_binding
   SET props = jsonb_set(props, '{ariaLabel}', '"Settings"'::jsonb, true)
 WHERE component_key = 'workspace.shell.settings-action'
   AND COALESCE(props->>'ariaLabel','') = '';

-- user-menu — explicit ariaLabel; props.label retained (rendered separately).
UPDATE dos.workspace_shell_binding
   SET props = jsonb_set(props, '{ariaLabel}', '"Account"'::jsonb, true)
 WHERE component_key = 'workspace.shell.user-menu'
   AND COALESCE(props->>'ariaLabel','') = '';

COMMIT;
