-- Migration: 20260504_0300_marketing_missing_routes.sql
-- Wave 4 — register /platform in dos.ui_route_template_binding.
-- Uses MarketingPricingTemplateComponent as a placeholder loader until a
-- dedicated MarketingPlatformTemplateComponent is built.
-- /trial, /docs, /blog, /whitepapers are Angular redirects — no DB rows needed.

BEGIN;

INSERT INTO dos.ui_route_template_binding
  (route, archetype, template_export, title_en, title_ar, subtitle_en, subtitle_ar, props)
VALUES
  ('/platform', 'marketing-landing', 'MarketingPricingTemplateComponent',
   'Platform', 'المنصة',
   'The operating system for agentic enterprises.', 'نظام التشغيل للمؤسسات الوكيلة.',
   '{}'::jsonb)
ON CONFLICT (route) DO UPDATE
  SET archetype       = EXCLUDED.archetype,
      template_export = EXCLUDED.template_export,
      title_en        = EXCLUDED.title_en,
      title_ar        = EXCLUDED.title_ar,
      subtitle_en     = EXCLUDED.subtitle_en,
      subtitle_ar     = EXCLUDED.subtitle_ar,
      updated_at      = now();

COMMIT;
