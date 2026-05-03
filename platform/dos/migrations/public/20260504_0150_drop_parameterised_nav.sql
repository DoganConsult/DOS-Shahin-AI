-- =====================================================================
-- 0150 — Drop parameterised-route navigation rows.
--
-- Phase F-F7-5 — sidebar nav rows whose `route` contains a route param
-- (`:id`, `:rest`, etc.) are unusable: clicking them sends the user to
-- the literal URL with the placeholder text. Detail routes are reached
-- by drilling down from the parent list page; they belong in the
-- routing table and template binding, not in the navigation menu.
--
-- Live audit reports 2 such rows: /foundation/roles/:id and
-- /compliance/controls/:id (both seeded by migration 0110).
-- =====================================================================
BEGIN;

DELETE FROM dos.dynamic_ui_navigation
 WHERE route LIKE '%:%';

COMMIT;
