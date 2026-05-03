-- Down for 20260504_0200_workspace_shell_carbon_catalog.sql
-- Reverses workspace.mobile-nav binding, then deletes the 20 catalog rows.
-- Safe because no other registry row references these keys (FK ON DELETE
-- SET NULL would handle stragglers).

BEGIN;

UPDATE dos.dynamic_ui_component_registry
   SET carbon_key = 'tiles',
       metadata   = COALESCE(metadata, '{}'::jsonb)
                    || jsonb_build_object('carbon_primitive','Tile')
 WHERE component_key = 'workspace.mobile-nav'
   AND carbon_key    = 'side-nav';

DELETE FROM dos.ui_carbon_components
 WHERE carbon_key IN (
   'header','header-navigation','header-menu',
   'side-nav','side-nav-menu',
   'column','skeleton-text','skeleton-placeholder',
   'inline-notification','toast-notification',
   'header-name','header-menu-item','header-global-bar','header-global-action',
   'side-nav-items','side-nav-menu-item','side-nav-link',
   'content','overflow-menu','overflow-menu-option'
 );

COMMIT;
