-- 20260508_0300 — switch /auth/login + /auth/register from KC redirect to
-- direct-grant fetch so the Carbon Auth Pages Pack collects credentials
-- once and never bounces the user to Keycloak's legacy login form. The
-- BE endpoints (/api/auth/password/login, /api/auth/password/register)
-- exchange directly with Keycloak server-side and return a dynamic
-- `redirect` field in the JSON body — DynamicTemplatePageComponent's
-- fetch dispatcher honors body.redirect and falls back to the static
-- onSuccessRedirect/onErrorRedirect when the body is absent.
--
-- SSO (auth.sso.requested) keeps the redirect-to-KC pattern because the
-- SSO button explicitly opts into the Keycloak-mediated flow.

BEGIN;

UPDATE dos.ui_route_template_binding
   SET props = jsonb_set(
         COALESCE(props, '{}'::jsonb),
         '{eventHandlers}',
         '{
            "auth.login.submitted": {
              "method": "fetch",
              "url": "/api/auth/password/login",
              "http": "POST",
              "payloadFromEvent": true,
              "onSuccessRedirect": "/workspace-home",
              "onErrorRedirect": "/auth/login?error=INVALID_CREDENTIALS"
            },
            "auth.sso.requested": {
              "method": "redirect",
              "url": "/api/auth/oidc/start?mode=login"
            }
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
            "auth.register.submitted": {
              "method": "fetch",
              "url": "/api/auth/password/register",
              "http": "POST",
              "payloadFromEvent": true,
              "onSuccessRedirect": "/workspace-home",
              "onErrorRedirect": "/auth/register?error=REGISTRATION_FAILED"
            },
            "auth.sso.requested": {
              "method": "redirect",
              "url": "/api/auth/oidc/start?mode=register"
            }
          }'::jsonb,
         true
       ),
       version = version + 1,
       updated_at = NOW()
 WHERE route = '/auth/register';

DO $$
DECLARE bad INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad
    FROM dos.ui_route_template_binding
   WHERE route IN ('/auth/login','/auth/register')
     AND (props->'eventHandlers'->'auth.login.submitted'->>'method' IS NULL
       OR props->'eventHandlers'->'auth.register.submitted'->>'method' IS NULL)
     AND route = '/auth/login' OR (
         route = '/auth/register' AND
         props->'eventHandlers'->'auth.register.submitted'->>'method' IS NULL
     );
  -- Loose check: ensure each route has at least one fetch handler.
  SELECT COUNT(*) INTO bad
    FROM dos.ui_route_template_binding b
   WHERE b.route IN ('/auth/login','/auth/register')
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_each(b.props->'eventHandlers') h
        WHERE h.value->>'method' = 'fetch'
     );
  IF bad > 0 THEN
    RAISE EXCEPTION 'auth direct-grant handlers missing on % rows', bad;
  END IF;
END $$;

COMMIT;
