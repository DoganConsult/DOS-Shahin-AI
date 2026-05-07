-- Workspace frame renderer keys split.
-- Replace generic shell.frame with explicit per-component renderer keys
-- so the frontend COMPONENT_MAP can resolve each Carbon UIShell primitive
-- to a real Angular Carbon component (no null mapping, no raw HTML wrappers).
--
-- Idempotent: safe re-run; uses UPDATE-by-key with explicit mapping.
-- Source of truth: dos.dynamic_ui_component_registry.

BEGIN;

UPDATE dos.dynamic_ui_component_registry
   SET renderer_key = m.renderer_key
  FROM (VALUES
    ('workspace.frame.ui-shell',             'shell.frame.ui-shell'),
    ('workspace.frame.header',               'shell.frame.header'),
    ('workspace.frame.header-name',          'shell.frame.header-name'),
    ('workspace.frame.header-navigation',    'shell.frame.header-navigation'),
    ('workspace.frame.header-menu',          'shell.frame.header-menu'),
    ('workspace.frame.header-menu-item',     'shell.frame.header-menu-item'),
    ('workspace.frame.header-global-bar',    'shell.frame.header-global-bar'),
    ('workspace.frame.header-global-action', 'shell.frame.header-global-action'),
    ('workspace.frame.side-nav',             'shell.frame.side-nav'),
    ('workspace.frame.side-nav-items',       'shell.frame.side-nav-items'),
    ('workspace.frame.side-nav-menu',        'shell.frame.side-nav-menu'),
    ('workspace.frame.side-nav-menu-item',   'shell.frame.side-nav-menu-item'),
    ('workspace.frame.side-nav-link',        'shell.frame.side-nav-link'),
    ('workspace.frame.content',              'shell.frame.content')
  ) AS m(component_key, renderer_key)
 WHERE dos.dynamic_ui_component_registry.component_key = m.component_key;

DO $$
DECLARE
  bad_count int;
BEGIN
  SELECT count(*) INTO bad_count
    FROM dos.dynamic_ui_component_registry
   WHERE component_key LIKE 'workspace.frame.%'
     AND renderer_key   = 'shell.frame';
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'workspace.frame.* still has generic shell.frame renderer_key in % rows', bad_count;
  END IF;
END$$;

COMMIT;
