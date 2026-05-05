-- 20260508_0320 — canonicalize marketing-nav CTA hrefs to /auth/* paths.
--
-- Phase WS-Auth: the public marketing landing renders a Sign-in / Register
-- CTA pair from `dos.marketing_nav_items`. Two rows still pointed at the
-- legacy /login and /register short paths; product-shell 301-redirected
-- them to /auth/login and /auth/register, which works but causes a
-- visible jump in the URL bar and (more importantly) caches the legacy
-- path in any external link/share. Canonicalize to /auth/* directly so
-- the marketing CTA lands on the SPA route in one hop.

BEGIN;

UPDATE dos.marketing_nav_items
   SET href = '/auth/login'
 WHERE href = '/login';

UPDATE dos.marketing_nav_items
   SET href = '/auth/register'
 WHERE href = '/register';

DO $$
DECLARE bad INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad
    FROM dos.marketing_nav_items
   WHERE href IN ('/login', '/register');
  IF bad > 0 THEN
    RAISE EXCEPTION 'marketing nav still has % legacy auth href(s)', bad;
  END IF;
END $$;

COMMIT;
