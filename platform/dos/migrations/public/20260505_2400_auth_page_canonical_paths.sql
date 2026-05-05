-- Phase P2 — Relocate auth-page bindings to canonical /auth/* paths.
--
-- The SPA serves auth flows under /auth/login, /auth/register,
-- /auth/forgot-password, /auth/mfa, /auth/reset-password (the canonical
-- contract). Prior P1 (20260505_2308) bound the 5 auth pages at the bare
-- /login etc. paths. This migration relocates each row to its /auth/*
-- canonical path without leaving a mirror or alias behind.
--
-- Strategy:
--   * UPDATE the existing 5 rows in dos.ui_route_template_binding so the
--     PRIMARY KEY (route) flips from '/login' -> '/auth/login', etc.
--   * No INSERT alongside the old row (no mirror). No FE alias map.
--   * If the canonical row already exists (re-run), do nothing for that
--     row; if the bare row already vanished, the UPDATE simply matches
--     zero rows. Idempotent.
--
-- Note: archetype 'auth-page' was added by 20260505_2308; not re-asserted
-- here.

BEGIN;

DO $$
DECLARE
  v RECORD;
  bare TEXT;
  canonical TEXT;
BEGIN
  FOR v IN SELECT * FROM (VALUES
    ('/login',           '/auth/login'),
    ('/register',        '/auth/register'),
    ('/forgot-password', '/auth/forgot-password'),
    ('/mfa',             '/auth/mfa'),
    ('/reset-password',  '/auth/reset-password')
  ) AS t(bare, canonical)
  LOOP
    bare := v.bare;
    canonical := v.canonical;

    -- If the canonical row is already present, drop the bare row so we
    -- never end up with both (no mirror).
    IF EXISTS (SELECT 1 FROM dos.ui_route_template_binding WHERE route = canonical) THEN
      DELETE FROM dos.ui_route_template_binding WHERE route = bare;
    ELSE
      -- Otherwise relocate the bare row to the canonical path.
      UPDATE dos.ui_route_template_binding
         SET route = canonical
       WHERE route = bare;
    END IF;
  END LOOP;
END $$;

-- Self-assertion: every auth-page row now lives under /auth/*.
DO $$
DECLARE
  bad INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad
    FROM dos.ui_route_template_binding
   WHERE archetype = 'auth-page'
     AND route NOT LIKE '/auth/%';
  IF bad > 0 THEN
    RAISE EXCEPTION 'auth-page rows still bound to non-/auth/* paths: %', bad;
  END IF;
END $$;

COMMIT;
