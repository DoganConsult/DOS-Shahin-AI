-- 0154 DOWN — Remove the two @carbon/ai-chat web component rows.
BEGIN;
DELETE FROM dos.ui_carbon_components WHERE package_name = '@carbon/ai-chat';
DELETE FROM dos.schema_migrations WHERE filename = '20260502_0154_carbon_ai_chat_wc.sql';
COMMIT;
