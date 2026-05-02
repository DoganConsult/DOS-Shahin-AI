-- dos:draft
-- DOWN — UI-OS — §8 Search — runtime  (20260502_0110)
BEGIN;
DROP TABLE IF EXISTS dos.ui_command_execution_log CASCADE;
DROP TABLE IF EXISTS dos.ui_search_saved_queries CASCADE;
DROP TABLE IF EXISTS dos.ui_search_history CASCADE;
COMMIT;
