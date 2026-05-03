-- =====================================================================
-- 0160 DOWN — revert default_route to '/<module_code>' (0100 default).
-- =====================================================================
BEGIN;

UPDATE dos.dynamic_ui_modules
   SET default_route = '/' || module_code
 WHERE default_route IS DISTINCT FROM ('/' || module_code);

COMMIT;
