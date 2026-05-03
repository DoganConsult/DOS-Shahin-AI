-- =====================================================================
-- 0060_down — Reverse follow-up template bindings + key alignment.
-- Drops the 3 bindings introduced by 0060.
-- =====================================================================
BEGIN;

DELETE FROM dos.ui_route_template_binding
 WHERE route IN ('/ai-os/overview', '/compliance/controls/:id', '/ops');

COMMIT;
