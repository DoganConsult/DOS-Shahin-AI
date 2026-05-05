-- /admin/integrations/secrets — platform-admin UI surface that lists and
-- edits dos.platform_secret rows via the dynamic admin gateway. Re-uses
-- the intelligent-register archetype (module.records.page template) so
-- the page renders inside the existing admin chrome with row-level
-- inline editing wired through props.eventHandlers (method:"fetch").

BEGIN;

INSERT INTO dos.ui_route_template_binding
  (route, archetype, template_export, props,
   title_en, title_ar, subtitle_en, subtitle_ar)
VALUES (
  '/admin/integrations/secrets',
  'intelligent-register',
  'module.records.page',
  jsonb_build_object(
    'eventHandlers', jsonb_build_object(
      'admin.secrets.list', jsonb_build_object(
        'method', 'fetch',
        'url',    '/api/auth/admin/secrets',
        'http',   'GET'
      ),
      'admin.secrets.upsert', jsonb_build_object(
        'method',           'fetch',
        'url',              '/api/auth/admin/secrets/:secretKey',
        'http',             'PUT',
        'payloadFromEvent', true
      )
    ),
    'permsRequired', jsonb_build_array('platform.admin.access')
  ),
  'Integrations & Secrets',
  'التكاملات والأسرار',
  'Manage Azure / Microsoft Graph / MFA credentials without redeploying.',
  'إدارة بيانات اعتماد Azure / Microsoft Graph / MFA دون إعادة النشر.'
)
ON CONFLICT (route) DO UPDATE
   SET archetype       = EXCLUDED.archetype,
       template_export = EXCLUDED.template_export,
       props           = EXCLUDED.props,
       title_en        = EXCLUDED.title_en,
       title_ar        = EXCLUDED.title_ar,
       subtitle_en     = EXCLUDED.subtitle_en,
       subtitle_ar     = EXCLUDED.subtitle_ar,
       updated_at      = now();

DO $$
DECLARE bad INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad
    FROM dos.ui_route_template_binding
   WHERE route = '/admin/integrations/secrets'
     AND (props->'eventHandlers') IS NULL;
  IF bad > 0 THEN
    RAISE EXCEPTION '/admin/integrations/secrets binding missing eventHandlers';
  END IF;
END $$;

COMMIT;
