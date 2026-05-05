-- 20260508_0330_auth_clean_paths_and_mfa_optin.sql
--
-- Revert the /auth/<page> canonicalization shipped by 20260505_2400.
-- Single canonical paths are clean: /login, /register, /forgot-password,
-- /mfa, /reset-password. No aliasing, no double-binding. The DynamicTemplate
-- resolver, the SPA router, the marketing CTAs, and the password/OIDC
-- callbacks all converge on the same route key.
--
-- Two fixes carried in one forward-only migration:
--
-- (1) RENAME /auth/<page> → /<page> in dos.ui_route_template_binding.
--     Updates eventHandlers redirect targets inside props so the on-error
--     redirect points at /login (not /auth/login).
--     Reverts dos.marketing_nav_items.href to /login + /register.
--
-- (2) MFA OPT-IN. 20260508_0310 turned mfa_required=true on every active
--     tenant. Users have not enrolled an MFA factor yet, no SMTP/Graph
--     credentials are populated, so the post-login redirect to /mfa with
--     a 6-digit prompt breaks end-to-end. Flip the default back to FALSE
--     so login lands at /workspace-home; per-user enrollment + per-tenant
--     override is layered on top later when admin enables it via the
--     security settings UI.

BEGIN;

-- ── (1) Rename routes + clean redirect targets in props ──────────────────
-- The PRIMARY KEY is on `route`; rename via UPDATE. No FK dependents in
-- ui_route_activation_step / ai_insight / ai_recommendation / audit_event
-- carry /auth/<page> rows (verified empty before this migration).

-- 1a. /auth/login → /login (also rewrite onErrorRedirect inside props).
UPDATE dos.ui_route_template_binding
   SET route = '/login',
       props = jsonb_set(
                 jsonb_set(
                   props,
                   '{eventHandlers,auth.login.submitted,onErrorRedirect}',
                   '"/login?error=INVALID_CREDENTIALS"'::jsonb,
                   false
                 ),
                 '{eventHandlers,auth.sso.requested,url}',
                 '"/api/auth/oidc/start?mode=login"'::jsonb,
                 false
               ),
       version = version + 1,
       updated_at = NOW()
 WHERE route = '/auth/login';

-- 1b. /auth/register → /register.
UPDATE dos.ui_route_template_binding
   SET route = '/register',
       props = jsonb_set(
                 props,
                 '{eventHandlers,auth.register.submitted,onErrorRedirect}',
                 '"/register?error=REGISTRATION_FAILED"'::jsonb,
                 false
               ),
       version = version + 1,
       updated_at = NOW()
 WHERE route = '/auth/register';

-- 1c. /auth/forgot-password → /forgot-password.
UPDATE dos.ui_route_template_binding
   SET route = '/forgot-password',
       version = version + 1,
       updated_at = NOW()
 WHERE route = '/auth/forgot-password';

-- 1d. /auth/mfa → /mfa.
UPDATE dos.ui_route_template_binding
   SET route = '/mfa',
       version = version + 1,
       updated_at = NOW()
 WHERE route = '/auth/mfa';

-- 1e. /auth/reset-password → /reset-password.
UPDATE dos.ui_route_template_binding
   SET route = '/reset-password',
       version = version + 1,
       updated_at = NOW()
 WHERE route = '/auth/reset-password';

-- 1f. Marketing CTAs — undo 20260508_0320 which pushed them at /auth/*.
UPDATE dos.marketing_nav_items
   SET href = '/login'
 WHERE href = '/auth/login';

UPDATE dos.marketing_nav_items
   SET href = '/register'
 WHERE href = '/auth/register';

-- ── (2) MFA opt-in ────────────────────────────────────────────────────────
UPDATE dos.tenant_security_policy
   SET mfa_required = false,
       updated_at   = NOW(),
       updated_by   = 'mfa-opt-in-2026-05-08'
 WHERE mfa_required = true;

-- ── Assertions ────────────────────────────────────────────────────────────
DO $$
DECLARE bad INTEGER;
BEGIN
  -- Clean paths must exist.
  SELECT COUNT(*) INTO bad
    FROM (VALUES ('/login'),('/register'),('/forgot-password'),('/mfa'),('/reset-password')) v(r)
   WHERE NOT EXISTS (SELECT 1 FROM dos.ui_route_template_binding b WHERE b.route = v.r);
  IF bad > 0 THEN
    RAISE EXCEPTION 'clean auth route bindings missing on % rows', bad;
  END IF;

  -- /auth/<page> rows must be gone.
  SELECT COUNT(*) INTO bad
    FROM dos.ui_route_template_binding
   WHERE route IN ('/auth/login','/auth/register','/auth/forgot-password','/auth/mfa','/auth/reset-password');
  IF bad > 0 THEN
    RAISE EXCEPTION '/auth/<page> rows still present on % rows', bad;
  END IF;

  -- Marketing CTAs must be clean.
  SELECT COUNT(*) INTO bad
    FROM dos.marketing_nav_items
   WHERE href IN ('/auth/login','/auth/register');
  IF bad > 0 THEN
    RAISE EXCEPTION 'marketing nav still has % /auth/<page> href(s)', bad;
  END IF;

  -- MFA must be opt-in.
  SELECT COUNT(*) INTO bad
    FROM dos.tenant_security_policy WHERE mfa_required = true;
  IF bad > 0 THEN
    RAISE EXCEPTION 'mfa_required still true on % tenants', bad;
  END IF;
END $$;

COMMIT;
