-- =====================================================================
-- 0152 — Realign carbon-ai-chat catalog rows to the actually-installed
-- npm package @carbon/ai-chat-components.
--
-- The published package `carbon-ai-chat` (single package name) is not in
-- the public npm registry. The framework-agnostic distribution shipped by
-- IBM is `@carbon/ai-chat-components` (web-components). Keep the catalog
-- in sync with installed packages so DNA only references real, installable
-- IBM Carbon packages.
-- =====================================================================
BEGIN;

UPDATE dos.ui_carbon_components
   SET package_name    = '@carbon/ai-chat-components',
       package_version = '0.0.0',
       notes           = COALESCE(notes,'') || ' (realigned 0152: package_name → @carbon/ai-chat-components, the framework-agnostic IBM Carbon AI chat WC distribution)'
 WHERE package_name = 'carbon-ai-chat';

INSERT INTO dos.schema_migrations (filename, checksum, applied_by)
SELECT '20260502_0152_realign_carbon_ai_chat_package.sql', 'inline-0152', 'system'
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.schema_migrations
    WHERE filename = '20260502_0152_realign_carbon_ai_chat_package.sql'
 );

COMMIT;
