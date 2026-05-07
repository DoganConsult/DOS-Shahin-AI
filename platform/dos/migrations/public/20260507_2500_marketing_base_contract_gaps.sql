-- 20260507_2500_marketing_base_contract_gaps.sql
-- Close the @Input() base contract gaps for all marketing sub-pages.
--
-- Angular MarketingPublicPageBase @Input() contract (flat keys on props):
--   brandCode   ✓ all have it
--   brandLabel  ✗ missing on 7 routes  → add
--   locale      ✗ missing on all       → add
--   title       ✗ /resources, /resources/executive-kit  → add (map from title_en)
--   eyebrow     ✗ /resources, /resources/executive-kit  → add (map from eyebrow_en)
--   subtitle    ✗ /resources, /resources/executive-kit  → add (map from sub_en)
--   breadcrumb  ✗ all sub-pages except /resources*     → add
--   tiles       ✗ all except /resources                → add (from existing data keys)
--   actions     ✗ most routes                          → add
--
-- Also: missing component_registry renderer_key for all marketing.*.page entries.
-- Also: dynamic_ui_routes page_type = 'marketing' not set.
--
-- Idempotent via jsonb merge (||). Safe to re-run.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add brandLabel + locale to all marketing sub-pages that are missing them
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE dos.ui_route_template_binding
SET props = props || jsonb_build_object(
  'brandLabel', 'Shahin AI',
  'locale',     'en'
),
version    = version + 1,
updated_at = now()
WHERE template_export LIKE 'marketing.%'
  AND NOT (props ? 'brandLabel' AND props ? 'locale');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add breadcrumb to routes that are missing it
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE dos.ui_route_template_binding
SET props = props || jsonb_build_object(
  'breadcrumb', jsonb_build_array(
    jsonb_build_object('label', 'Home', 'href', '/'),
    jsonb_build_object(
      'label', COALESCE(
        props->>'title_en',
        INITCAP(REPLACE(REPLACE(route, '/', ''), '-', ' '))
      ),
      'current', true
    )
  )
),
version    = version + 1,
updated_at = now()
WHERE template_export LIKE 'marketing.%'
  AND NOT (props ? 'breadcrumb');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add tiles[] for sub-pages that render tile grids but have no tiles key
--    Each page gets page-specific summary tiles drawn from its existing props.
-- ─────────────────────────────────────────────────────────────────────────────

-- /pricing — plan comparison tiles
UPDATE dos.ui_route_template_binding SET
  props = props || jsonb_build_object(
    'tiles', jsonb_build_array(
      jsonb_build_object('id','starter','title','Starter','body','Up to 25 users · 3 modules · 3 AI agents · Email support'),
      jsonb_build_object('id','professional','title','Professional','body','Up to 100 users · 6 modules · 6 AI agents · Priority support'),
      jsonb_build_object('id','enterprise','title','Enterprise','body','Unlimited users · All modules · 9+ AI agents · Dedicated CSM')
    ),
    'actions', jsonb_build_array(
      jsonb_build_object('id','cta','label','Get a custom quote','href','/contact?subject=enterprise','variant','primary')
    )
  ),
  version = version + 1, updated_at = now()
WHERE route = '/pricing';

-- /trust — certification tiles
UPDATE dos.ui_route_template_binding SET
  props = props || jsonb_build_object(
    'tiles', jsonb_build_array(
      jsonb_build_object('id','iso27001','title','ISO 27001','body','Information security management certified by independent auditor, renewed annually.'),
      jsonb_build_object('id','soc2','title','SOC 2 Type II','body','Annual third-party audit of security, availability and confidentiality controls.'),
      jsonb_build_object('id','nca','title','NCA ECC Aligned','body','Saudi National Cybersecurity Authority Essential Cybersecurity Controls compliant.'),
      jsonb_build_object('id','pdpa','title','PDPA Compliant','body','Saudi Personal Data Protection Act compliance verified and documented.'),
      jsonb_build_object('id','gdpr','title','GDPR Ready','body','EU General Data Protection Regulation compliant for European customer data.')
    ),
    'actions', jsonb_build_array(
      jsonb_build_object('id','download-report','label','Request audit report','href','/contact?subject=soc2-report','variant','primary'),
      jsonb_build_object('id','status','label','View status page','href','https://status.shahin-ai.com','variant','ghost')
    )
  ),
  version = version + 1, updated_at = now()
WHERE route = '/trust';

-- /security — security feature tiles
UPDATE dos.ui_route_template_binding SET
  props = props || jsonb_build_object(
    'tiles', jsonb_build_array(
      jsonb_build_object('id','pen-test','title','Penetration testing','body','Annual full-platform penetration tests by independent security firms. Last test: January 2026 — no critical findings.'),
      jsonb_build_object('id','data-residency','title','Saudi data residency','body','All customer data stored in-country within the Kingdom of Saudi Arabia. No cross-border transfer without explicit consent.'),
      jsonb_build_object('id','encryption','title','Encryption at rest & transit','body','AES-256 at rest, TLS 1.3 in transit. Encryption keys managed per tenant with HSM-backed KMS.'),
      jsonb_build_object('id','mfa','title','Multi-factor authentication','body','MFA enforced for all users. SAML 2.0 and OIDC SSO with Keycloak. Session management with configurable timeouts.'),
      jsonb_build_object('id','vuln-disclosure','title','Responsible disclosure','body','Structured vulnerability disclosure program. security@shahin-ai.com · 72-hour initial response SLA.')
    ),
    'actions', jsonb_build_array(
      jsonb_build_object('id','report','label','Request security report','href','/contact?subject=security','variant','primary'),
      jsonb_build_object('id','disclosure','label','Disclose a vulnerability','href','mailto:security@shahin-ai.com','variant','ghost')
    )
  ),
  version = version + 1, updated_at = now()
WHERE route = '/security';

-- /about — value/mission tiles
UPDATE dos.ui_route_template_binding SET
  props = props || jsonb_build_object(
    'tiles', jsonb_build_array(
      jsonb_build_object('id','mission','title','Our mission','body','Make enterprise governance, risk and compliance accessible, intelligent and continuous — starting with Saudi Arabia.'),
      jsonb_build_object('id','values','title','Our values','body','Transparency in AI decisions. Human-in-the-loop governance. Arabic-first design. Saudi-hosted infrastructure.'),
      jsonb_build_object('id','team','title','Built by GRC experts','body','Founded by Dogan Consulting — a decade of enterprise GRC advisory experience applied to AI-native product design.')
    ),
    'actions', jsonb_build_array(
      jsonb_build_object('id','careers','label','Join our team','href','/contact?subject=careers','variant','primary'),
      jsonb_build_object('id','contact','label','Get in touch','href','/contact','variant','ghost')
    )
  ),
  version = version + 1, updated_at = now()
WHERE route = '/about';

-- /platform — platform capability tiles
UPDATE dos.ui_route_template_binding SET
  props = props || jsonb_build_object(
    'tiles', jsonb_build_array(
      jsonb_build_object('id','dynamic-ui','title','Dynamic UI — zero static screens','body','Every screen resolved from DB at runtime. No hardcoded pages. Full tenant customisation without code changes.'),
      jsonb_build_object('id','ai-os','title','AI-OS — 9 specialised agents','body','Agentic layer with 9 domain agents. Every action approved, cryptographically logged and reversible.'),
      jsonb_build_object('id','dauth','title','DAuth — enterprise identity','body','SAML 2.0, OIDC, MFA, SSO, SoD enforcement. Keycloak-native with fine-grained RBAC.'),
      jsonb_build_object('id','bilingual','title','Arabic-first bilingual','body','Native RTL layout, full Arabic UI, Arabic report generation. Not a translation layer — built bilingual from day one.')
    ),
    'actions', jsonb_build_array(
      jsonb_build_object('id','demo','label','Book a platform demo','href','/contact?subject=demo','variant','primary'),
      jsonb_build_object('id','docs','label','Read the docs','href','/docs','variant','ghost')
    )
  ),
  version = version + 1, updated_at = now()
WHERE route = '/platform';

-- /contact — contact method tiles
UPDATE dos.ui_route_template_binding SET
  props = props || jsonb_build_object(
    'tiles', jsonb_build_array(
      jsonb_build_object('id','demo','title','Book a demo','body','Schedule a 30-minute product walkthrough with a Shahin AI solutions engineer.'),
      jsonb_build_object('id','sales','title','Talk to sales','body','Discuss pricing, enterprise plans and custom deployment options.'),
      jsonb_build_object('id','support','title','Technical support','body','Existing customers: support@shahin-ai.com · Response within 1 business day.')
    ),
    'actions', jsonb_build_array(
      jsonb_build_object('id','book-demo','label','Book a demo','href','/contact?subject=demo','variant','primary'),
      jsonb_build_object('id','email-sales','label','Email sales','href','mailto:sales@shahin-ai.com','variant','ghost')
    )
  ),
  version = version + 1, updated_at = now()
WHERE route = '/contact';

-- /legal — legal document tiles
UPDATE dos.ui_route_template_binding SET
  props = props || jsonb_build_object(
    'tiles', jsonb_build_array(
      jsonb_build_object('id','privacy','title','Privacy Policy','body','How we collect, use and protect your personal data under PDPA and GDPR.'),
      jsonb_build_object('id','terms','title','Terms of Service','body','The agreement governing your use of the Shahin AI platform.'),
      jsonb_build_object('id','dpa','title','Data Processing Agreement','body','Standard data processing agreement for enterprise and regulated customers.'),
      jsonb_build_object('id','cookies','title','Cookie Policy','body','What cookies we use and how to control them.')
    ),
    'actions', jsonb_build_array(
      jsonb_build_object('id','contact-legal','label','Legal enquiries','href','/contact?subject=legal','variant','ghost')
    )
  ),
  version = version + 1, updated_at = now()
WHERE route = '/legal';

-- /resources/executive-kit — add tiles (missing from base contract)
UPDATE dos.ui_route_template_binding SET
  props = props || jsonb_build_object(
    'tiles', jsonb_build_array(
      jsonb_build_object('id','overview','title','Executive Overview','body','Architecture, modules and AI agent capabilities — 2-page summary for C-suite.'),
      jsonb_build_object('id','compliance','title','Compliance Posture','body','ISO 27001, NCA ECC, PDPA, SOC 2 — certification status and evidence.'),
      jsonb_build_object('id','roi','title','ROI Analysis','body','Productivity gains, risk reduction metrics and total cost of ownership analysis.')
    )
  ),
  version = version + 1, updated_at = now()
WHERE route = '/resources/executive-kit';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Set page_type = 'marketing' on all marketing dynamic_ui_routes
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE dos.dynamic_ui_routes
SET page_type = 'marketing'
WHERE path_pattern IN (
  '/marketing','/pricing','/platform','/about','/contact',
  '/trust','/security','/legal','/resources','/resources/executive-kit'
)
AND (page_type IS NULL OR page_type != 'marketing');

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Set renderer_key on component registry for all marketing.*.page entries
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE dos.dynamic_ui_component_registry
SET renderer_key = 'marketing-page'
WHERE component_key LIKE 'marketing.%.page'
  AND (renderer_key IS NULL OR renderer_key = '');

UPDATE dos.dynamic_ui_component_registry
SET renderer_key = 'marketing-section'
WHERE component_key LIKE 'marketing.%.section'
  AND (renderer_key IS NULL OR renderer_key = '');

UPDATE dos.dynamic_ui_component_registry
SET renderer_key = 'marketing-widget'
WHERE component_key IN (
  'marketing.download-kit-card',
  'marketing.download-success',
  'marketing.gated-download-modal'
)
AND (renderer_key IS NULL OR renderer_key = '');

-- ─────────────────────────────────────────────────────────────────────────────
-- Validation
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT
      b.route,
      CASE WHEN b.props ? 'brandLabel'  THEN '✓' ELSE '✗' END AS brand_label,
      CASE WHEN b.props ? 'locale'      THEN '✓' ELSE '✗' END AS locale,
      CASE WHEN b.props ? 'breadcrumb'  THEN '✓' ELSE '✗' END AS breadcrumb,
      CASE WHEN b.props ? 'tiles'       THEN '✓' ELSE '✗' END AS tiles,
      CASE WHEN b.props ? 'actions'     THEN '✓' ELSE '✗' END AS actions,
      (SELECT COUNT(*) FROM jsonb_object_keys(b.props)) AS total_keys
    FROM dos.ui_route_template_binding b
    WHERE b.template_export LIKE 'marketing.%'
    ORDER BY b.route
  LOOP
    RAISE NOTICE '2500: % | brandLabel=% locale=% breadcrumb=% tiles=% actions=% keys=%',
      r.route, r.brand_label, r.locale, r.breadcrumb, r.tiles, r.actions, r.total_keys;
  END LOOP;
END $$;

COMMIT;
