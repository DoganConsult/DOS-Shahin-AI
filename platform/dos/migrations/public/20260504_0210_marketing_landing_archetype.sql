-- 20260504_0210_marketing_landing_archetype.sql
-- Owner: ui-os-service.
--
-- Phase M3.1 — DB-driven UI enrolment for the public marketing surface.
--
-- The 17-section `marketing.home.page` and the 6 sibling public pages
-- (pricing, trust, security, contact, about, legal) were previously
-- present only in `dos.dynamic_ui_component_registry` (all naively
-- carrying carbon_key='tiles'), with no row in
-- `dos.ui_route_template_binding` and no marketing archetype permitted
-- by `chk_archetype`. That left them invisible to the Phase F
-- vertical-slice DoD harness and to props-coverage.
--
-- This migration:
--   ① extends `chk_archetype` to permit a single new archetype
--      `'marketing-landing'`,
--   ② re-maps each of the 7 marketing component_registry rows from
--      placeholder carbon_key='tiles' to the dominant Carbon primitive
--      that actually backs the page (preserving the
--      trg_carbon_only_runtime contract — every target carbon_key is an
--      `ibm-carbon`, runtime_status='active' row in
--      dos.ui_carbon_components),
--   ③ inserts 7 binding rows in `dos.ui_route_template_binding`
--      (`/`, `/pricing`, `/trust`, `/security`, `/contact`, `/about`,
--      `/legal`) so the customer-gate and DoD harness can resolve them
--      via the Dynamic-UI resolver. `props='{}'::jsonb` is intentional —
--      content for these routes already streams live from
--      `services/ui-os-service/src/routes/brand.routes.ts ::
--      buildMarketingHomeContent()` via `/api/ui-os/marketing/config`,
--      so no per-section seed table is required in this slice.
--
-- Forward-only and idempotent.

BEGIN;

-- =====================================================================
-- ① Extend chk_archetype with the marketing-landing archetype.
-- =====================================================================
ALTER TABLE dos.ui_route_template_binding
  DROP CONSTRAINT IF EXISTS chk_archetype;

ALTER TABLE dos.ui_route_template_binding
  ADD CONSTRAINT chk_archetype CHECK (archetype IN (
    'command-home',
    'decision-dashboard',
    'command-dashboard',
    'posture-overview',
    'trend-intelligence',
    'intelligent-register',
    'risk-landscape',
    'record-story',
    'guided-create',
    'action-queue',
    'workflow-control',
    'workflow-timeline',
    'follow-up-center',
    'evidence-reports',
    'export-center',
    'audit-trail',
    'audit-trail-ledger',
    'audit-trail-evidence',
    'calendar-timeline',
    'compliance-calendar',
    'remediation-roadmap',
    'org-chart',
    'ownership-map',
    'delegation-center',
    'ai-advisor',
    'agent-flow',
    'agent-registry',
    'user-agent-workbench',
    'module-settings',
    'activation-journey',
    'incident-response',
    'case-finalization',
    'marketing-landing'
  ));

-- =====================================================================
-- ② Re-map placeholder carbon_key='tiles' on the 7 marketing rows to a
-- representative dominant Carbon primitive. All targets exist in
-- dos.ui_carbon_components (ibm-carbon, runtime_status='active') so
-- trg_carbon_only_runtime stays satisfied.
--
-- Mapping rationale:
--   marketing.home.page    → 'grid'              (cdsGrid composes the page)
--   marketing.pricing.page → 'tiles'             (kept; dominated by tile cards)
--   marketing.trust.page   → 'tiles'             (kept)
--   marketing.security.page→ 'tiles'             (kept)
--   marketing.contact.page → 'tiles'             (kept)
--   marketing.about.page   → 'tiles'             (kept)
--   marketing.legal.page   → 'structured-list'   (long-form legal copy)
-- =====================================================================
UPDATE dos.dynamic_ui_component_registry
   SET carbon_key = 'grid'
 WHERE component_key = 'marketing.home.page';

UPDATE dos.dynamic_ui_component_registry
   SET carbon_key = 'structured-list'
 WHERE component_key = 'marketing.legal.page';

-- =====================================================================
-- ③ Insert binding rows for all 7 public marketing routes.
-- template_export values are aliases registered in
-- platform/core/platform/shell/template-binding.registry.ts (LOADERS map),
-- each thinly importing the corresponding `Dos*PageComponent` from
-- `@dos/ui-system`. The alias names satisfy the
-- `template-only-routing.mjs` naming contract (`*TemplateComponent`).
-- =====================================================================
INSERT INTO dos.ui_route_template_binding (
  route, archetype, template_export, props,
  title_en,                                  title_ar,
  subtitle_en,                               subtitle_ar
) VALUES
  ('/',         'marketing-landing', 'MarketingHomeTemplateComponent',
   '{}'::jsonb,
   'Shahin-AI by Dogan Consult',             'شاهين-AI من دوغان للاستشارات',
   'The KSA GRC painkiller',                 'مسكّن آلام الحوكمة في المملكة'),
  ('/pricing',  'marketing-landing', 'MarketingPricingTemplateComponent',
   '{}'::jsonb,
   'Pricing built for governance teams',     'تسعير مصمم لفرق الحوكمة',
   'Transparent pricing. Trial available.',  'تسعير شفاف. تجربة مجانية متاحة.'),
  ('/trust',    'marketing-landing', 'MarketingTrustTemplateComponent',
   '{}'::jsonb,
   'Trust',                                  'الثقة',
   'Compliance, certifications, posture.',   'الامتثال والشهادات والوضع الأمني.'),
  ('/security', 'marketing-landing', 'MarketingSecurityTemplateComponent',
   '{}'::jsonb,
   'Security',                               'الأمن',
   'How we protect your data.',              'كيف نحمي بياناتك.'),
  ('/contact',  'marketing-landing', 'MarketingContactTemplateComponent',
   '{}'::jsonb,
   'Contact',                                'اتصل بنا',
   'Reach the team.',                        'تواصل مع الفريق.'),
  ('/about',    'marketing-landing', 'MarketingAboutTemplateComponent',
   '{}'::jsonb,
   'About',                                  'من نحن',
   'Dogan Consult — KSA-first GRC.',         'دوغان للاستشارات — حوكمة المملكة أولاً.'),
  ('/legal',    'marketing-landing', 'MarketingLegalTemplateComponent',
   '{}'::jsonb,
   'Legal',                                  'القانوني',
   'Terms, privacy, DPAs.',                  'الشروط والخصوصية واتفاقيات معالجة البيانات.')
ON CONFLICT (route) DO UPDATE
  SET archetype       = EXCLUDED.archetype,
      template_export = EXCLUDED.template_export,
      props           = EXCLUDED.props,
      title_en        = EXCLUDED.title_en,
      title_ar        = EXCLUDED.title_ar,
      subtitle_en     = EXCLUDED.subtitle_en,
      subtitle_ar     = EXCLUDED.subtitle_ar,
      version         = dos.ui_route_template_binding.version + 1,
      updated_at      = now();

COMMIT;
