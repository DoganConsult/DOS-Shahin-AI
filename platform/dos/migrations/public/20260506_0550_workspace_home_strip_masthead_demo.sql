-- 20260506_0550_workspace_home_strip_masthead_demo.sql
-- Forward-only. Strips ALL non-canonical demo content still attached
-- to the live /workspace-home template-binding row:
--
--   title_en/ar       — "Welcome back" / "مرحبًا بعودتك"
--   subtitle_en/ar    — "Your workspace command center" / "مركز قيادة مساحة عملك"
--   eyebrow_en/ar     — "Workspace" / "مساحة العمل"
--   ai_headline_en/ar — "AI has prioritized 3 actions for you today" /
--                       "رتّب الذكاء الاصطناعي 3 إجراءات لك اليوم"
--   status_tags       — [{Live}, {AI assisted}]
--   primary_action    — {Open AI assistant / افتح مساعد الذكاء الاصطناعي}
--
-- These were carried over from the demo seed
-- (20260505_0300_workspace_home_command_home.sql) and the prior
-- 20260506_0530 migration only blanked `props`, leaving the masthead
-- scalar columns intact — which is why the floating masthead, AI
-- assisted/Live badges, and the "Open AI assistant" CTA were still
-- rendering even after the props purge.
--
-- The Dynamic-UI doctrine forbids any non-canonical / starter strings
-- in the live runtime payload. Until a real workspace-home contract is
-- approved + published by the contract publisher, the binding row must
-- emit no template (template_export=NULL, archetype=NULL) so the SPA
-- DynamicTemplatePageComponent renders its controlled empty state via
-- DosEmptyStateComponent (no masthead, no KPIs, no badges, no CTA).
--
-- Idempotent.

BEGIN;

-- archetype is NOT NULL — the cleanest dynamic-UI-correct way to emit
-- "no template" is to delete the binding row entirely. The ui-os
-- resolver returns 404 (TEMPLATE_BINDING_NOT_FOUND) which the SPA
-- TemplateBindingService maps to NULL_BINDING; DynamicTemplatePageComponent
-- then renders the controlled empty state via DosEmptyStateComponent
-- (no masthead, no badges, no CTA, no metrics).
DELETE FROM dos.ui_route_template_binding
 WHERE route = '/workspace-home';

-- Strip the same demo masthead tags/branding from any tenant-level
-- override patch that carries them. The "AI assisted" / "Live" status
-- tags + the "Sandbox tenant" branding pill were seeded as a starter
-- experience but are non-canonical and have leaked into production
-- tenants. Idempotent: jsonb minus operators no-op when the key is
-- already absent.
UPDATE dos.ui_override_tenant
   SET patch   = (patch - 'masthead') - 'tenantBranding',
       version = version + 1
 WHERE patch::text ~ 'AI assisted'
    OR patch::text ~ 'Sandbox tenant';

-- Drop now-empty patch rows so they don't sit as dead metadata.
DELETE FROM dos.ui_override_tenant
 WHERE patch = '{}'::jsonb;

COMMIT;
