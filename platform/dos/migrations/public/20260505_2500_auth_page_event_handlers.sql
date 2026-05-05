-- Phase P3 — DB-driven event-handler dispatch for auth pages.
--
-- The auth-page templates (auth.{login,register,forgot-password,mfa,
-- reset-password}.page) are pure-UI emitters: every interaction surfaces
-- as an AuthEvent on the (event) @Output. To keep the FE 100 % dynamic
-- (no hardcoded auth-service URLs in the SPA) we declare the dispatch
-- map as `props.eventHandlers` on each binding row. The
-- DynamicTemplatePageComponent reads it and performs the matching action
-- (currently `method: "redirect"`).
--
-- Schema for each handler:
--   { "method": "redirect", "url": "<absolute or root-relative>" }
--
-- For login + register, both the form submit AND any SSO provider button
-- hand off to Keycloak's authorization endpoint via the auth-service BFF
-- (`/api/auth/oidc/start?mode={login,register}`). No client-side
-- credential capture.

BEGIN;

UPDATE dos.ui_route_template_binding
   SET props = jsonb_set(
         COALESCE(props, '{}'::jsonb),
         '{eventHandlers}',
         '{
            "auth.login.submitted": { "method": "redirect", "url": "/api/auth/oidc/start?mode=login" },
            "auth.sso.requested":   { "method": "redirect", "url": "/api/auth/oidc/start?mode=login" }
          }'::jsonb,
         true
       ),
       version = version + 1,
       updated_at = NOW()
 WHERE route = '/auth/login';

UPDATE dos.ui_route_template_binding
   SET props = jsonb_set(
         COALESCE(props, '{}'::jsonb),
         '{eventHandlers}',
         '{
            "auth.register.submitted": { "method": "redirect", "url": "/api/auth/oidc/start?mode=register" },
            "auth.sso.requested":      { "method": "redirect", "url": "/api/auth/oidc/start?mode=register" }
          }'::jsonb,
         true
       ),
       version = version + 1,
       updated_at = NOW()
 WHERE route = '/auth/register';

-- forgot-password / mfa / reset-password — these flows complete inside
-- Keycloak's hosted forms (recovery email, OTP, reset). The DB binding
-- declares no submit handler; the user reaches them via Keycloak chrome.
-- Locale toggle is locale-only; FE does not need a BE round-trip.

DO $$
DECLARE
  bad INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad
    FROM dos.ui_route_template_binding
   WHERE route IN ('/auth/login', '/auth/register')
     AND (props->'eventHandlers') IS NULL;
  IF bad > 0 THEN
    RAISE EXCEPTION 'auth login/register binding missing eventHandlers (% rows)', bad;
  END IF;
END $$;

COMMIT;
