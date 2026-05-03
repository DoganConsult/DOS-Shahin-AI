-- Down-migration for 20260504_0090_marketing_public_pages.sql
BEGIN;

DELETE FROM dos.ui_route_template_binding
 WHERE route IN ('/pricing','/trust','/security','/contact','/about','/legal');

DELETE FROM dos.dynamic_ui_routes
 WHERE tenant_id IS NULL
   AND path_pattern IN ('/pricing','/trust','/security','/contact','/about','/legal');

DELETE FROM dos.dynamic_ui_component_registry
 WHERE component_key IN (
   'marketing.pricing.page','marketing.trust.page','marketing.security.page',
   'marketing.contact.page','marketing.about.page','marketing.legal.page'
 );

COMMIT;
