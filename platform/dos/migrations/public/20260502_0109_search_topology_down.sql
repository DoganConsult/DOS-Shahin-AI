-- dos:draft
-- DOWN — UI-OS — §8 Search — providers/indexes/scopes/scope_indexes  (20260502_0109)
BEGIN;
DROP TABLE IF EXISTS dos.ui_search_scope_indexes CASCADE;
DROP TABLE IF EXISTS dos.ui_search_scopes CASCADE;
DROP TABLE IF EXISTS dos.ui_search_indexes CASCADE;
DROP TABLE IF EXISTS dos.ui_search_providers CASCADE;
COMMIT;
