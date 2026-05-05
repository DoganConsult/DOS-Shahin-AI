-- 2026-05-08 — Inject /auth/mfa eventHandlers map.
--
-- Mirrors 20260505_2500 (login/register) but uses the new fetch dispatch
-- mode supported by DynamicTemplatePageComponent.dispatchEvent. The
-- DB binding declares:
--   * auth.mfa.requested  → POST /api/auth/mfa/send   (resend code)
--   * auth.mfa.submitted  → POST /api/auth/mfa/verify (consume + redirect)
--
-- Handler shape:
--   { method:"fetch", url, http?, payloadFromEvent?, onSuccessRedirect? }

BEGIN;

UPDATE dos.ui_route_template_binding
   SET props = jsonb_set(
         COALESCE(props, '{}'::jsonb),
         '{eventHandlers}',
         '{
            "auth.mfa.requested": {
              "method": "fetch",
              "url": "/api/auth/mfa/send",
              "http": "POST",
              "payloadFromEvent": true
            },
            "auth.mfa.submitted": {
              "method": "fetch",
              "url": "/api/auth/mfa/verify",
              "http": "POST",
              "payloadFromEvent": true,
              "onSuccessRedirect": "/workspace-home"
            }
          }'::jsonb,
         true
       ),
       version = version + 1,
       updated_at = NOW()
 WHERE route = '/auth/mfa';

DO $$
DECLARE
  bad INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad
    FROM dos.ui_route_template_binding
   WHERE route = '/auth/mfa'
     AND (props->'eventHandlers') IS NULL;
  IF bad > 0 THEN
    RAISE EXCEPTION '/auth/mfa binding missing eventHandlers (% rows)', bad;
  END IF;
END $$;

COMMIT;
