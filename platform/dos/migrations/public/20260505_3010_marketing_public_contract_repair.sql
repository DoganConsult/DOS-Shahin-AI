BEGIN;

INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status, approved_at)
VALUES
  ('marketing.home.page', 'ibm-carbon', 'grid', 'approved', now()),
  ('marketing.platform.page', 'ibm-carbon', 'tabs', 'approved', now()),
  ('marketing.resources.page', 'ibm-carbon', 'tiles', 'approved', now()),
  ('marketing.executive-kit.page', 'ibm-carbon', 'modal', 'approved', now()),
  ('marketing.pricing.page', 'ibm-carbon', 'tiles', 'approved', now()),
  ('marketing.trust.page', 'ibm-carbon', 'tiles', 'approved', now()),
  ('marketing.security.page', 'ibm-carbon', 'tiles', 'approved', now()),
  ('marketing.contact.page', 'ibm-carbon', 'tiles', 'approved', now()),
  ('marketing.about.page', 'ibm-carbon', 'tiles', 'approved', now()),
  ('marketing.legal.page', 'ibm-carbon', 'structured-list', 'approved', now())
ON CONFLICT (component_key) DO UPDATE
  SET vendor = EXCLUDED.vendor,
      carbon_key = EXCLUDED.carbon_key,
      approval_status = EXCLUDED.approval_status,
      approved_at = now();

INSERT INTO dos.dynamic_ui_routes
  (tenant_id, module_code, path_pattern, component_key, permission_key,
   sort_order, readiness, page_type, layout, kpi_scope, data_scope_mode,
   evidence_required, title_key, subtitle_key, data_resource_key, default_view,
   audit_enabled, realtime_enabled)
VALUES
  (NULL, 'marketing', '/', 'marketing.home.page', NULL, 19, 'active', 'overview', 'full-page', 'none', NULL, FALSE, 'marketing.home.title', 'marketing.home.subtitle', 'marketing.resource.public', 'landing', FALSE, FALSE),
  (NULL, 'marketing', '/platform', 'marketing.platform.page', NULL, 20, 'active', 'overview', 'full-page', 'none', NULL, FALSE, 'marketing.platform.title', 'marketing.platform.subtitle', 'marketing.resource.public', 'cards', FALSE, FALSE),
  (NULL, 'marketing', '/resources', 'marketing.resources.page', NULL, 27, 'active', 'overview', 'full-page', 'none', NULL, FALSE, 'marketing.resources.title', 'marketing.resources.subtitle', 'marketing.resource.public', 'cards', FALSE, FALSE),
  (NULL, 'marketing', '/resources/executive-kit', 'marketing.executive-kit.page', NULL, 28, 'active', 'overview', 'full-page', 'none', NULL, FALSE, 'marketing.executive-kit.title', 'marketing.executive-kit.subtitle', 'marketing.resource.public', 'cards', FALSE, FALSE),
  (NULL, 'marketing', '/pricing', 'marketing.pricing.page', NULL, 21, 'active', 'overview', 'full-page', 'none', NULL, FALSE, 'marketing.pricing.title', 'marketing.pricing.subtitle', 'marketing.resource.public', 'cards', FALSE, FALSE),
  (NULL, 'marketing', '/trust', 'marketing.trust.page', NULL, 22, 'active', 'overview', 'full-page', 'none', NULL, FALSE, 'marketing.trust.title', 'marketing.trust.subtitle', 'marketing.resource.public', 'cards', FALSE, FALSE),
  (NULL, 'marketing', '/security', 'marketing.security.page', NULL, 23, 'active', 'overview', 'full-page', 'none', NULL, FALSE, 'marketing.security.title', 'marketing.security.subtitle', 'marketing.resource.public', 'cards', FALSE, FALSE),
  (NULL, 'marketing', '/contact', 'marketing.contact.page', NULL, 24, 'active', 'overview', 'full-page', 'none', NULL, FALSE, 'marketing.contact.title', 'marketing.contact.subtitle', 'marketing.resource.public', 'cards', FALSE, FALSE),
  (NULL, 'marketing', '/about', 'marketing.about.page', NULL, 25, 'active', 'overview', 'full-page', 'none', NULL, FALSE, 'marketing.about.title', 'marketing.about.subtitle', 'marketing.resource.public', 'cards', FALSE, FALSE),
  (NULL, 'marketing', '/legal', 'marketing.legal.page', NULL, 26, 'active', 'overview', 'full-page', 'none', NULL, FALSE, 'marketing.legal.title', 'marketing.legal.subtitle', 'marketing.resource.public', 'cards', FALSE, FALSE)
ON CONFLICT (module_code, path_pattern) WHERE tenant_id IS NULL DO UPDATE
  SET component_key = EXCLUDED.component_key,
      permission_key = EXCLUDED.permission_key,
      sort_order = EXCLUDED.sort_order,
      readiness = EXCLUDED.readiness,
      page_type = EXCLUDED.page_type,
      layout = EXCLUDED.layout,
      kpi_scope = EXCLUDED.kpi_scope,
      data_scope_mode = EXCLUDED.data_scope_mode,
      evidence_required = EXCLUDED.evidence_required,
      title_key = EXCLUDED.title_key,
      subtitle_key = EXCLUDED.subtitle_key,
      data_resource_key = EXCLUDED.data_resource_key,
      default_view = EXCLUDED.default_view,
      audit_enabled = EXCLUDED.audit_enabled,
      realtime_enabled = EXCLUDED.realtime_enabled;

UPDATE dos.ui_route_template_binding
SET template_export = 'marketing.platform.page',
    version = version + 1,
    updated_at = now()
WHERE route = '/platform'
  AND template_export <> 'marketing.platform.page';

INSERT INTO dos.ui_route_template_binding (
  route, archetype, template_export, props,
  title_en, title_ar,
  subtitle_en, subtitle_ar,
  eyebrow_en, eyebrow_ar
) VALUES
  (
    '/resources',
    'marketing-landing',
    'marketing.resources.page',
    $$
    {
      "brandCode": "shahin-ai",
      "brandLabel": { "en": "Shahin-AI", "ar": "شاهين-AI" },
      "breadcrumb": [
        { "label": { "en": "Home", "ar": "الرئيسية" }, "href": "/" },
        { "label": { "en": "Resources", "ar": "الموارد" }, "current": true }
      ],
      "tiles": [
        {
          "id": "executive-kit",
          "title": { "en": "Executive kit", "ar": "الحزمة التنفيذية" },
          "body": { "en": "A sponsor-facing package for the commercial and operating story.", "ar": "حزمة موجهة للراعي تعرض القصة التجارية والتشغيلية." }
        },
        {
          "id": "trust-surface",
          "title": { "en": "Trust surface", "ar": "سطح الثقة" },
          "body": { "en": "Use the public trust and security routes for architecture and control review.", "ar": "استخدم مسارات الثقة والأمن العامة لمراجعة المعمارية والضوابط." }
        },
        {
          "id": "live-demo",
          "title": { "en": "Live walkthrough", "ar": "عرض مباشر" },
          "body": { "en": "Move from public material to a guided product session when the team is ready.", "ar": "انتقل من المادة العامة إلى جلسة منتج موجهة عندما يكون الفريق مستعداً." }
        }
      ],
      "actions": [
        {
          "id": "kit",
          "label": { "en": "Open executive kit", "ar": "افتح الحزمة التنفيذية" },
          "href": "/resources/executive-kit",
          "kind": "primary"
        },
        {
          "id": "trust",
          "label": { "en": "Review trust proof", "ar": "راجع إثبات الثقة" },
          "href": "/trust",
          "kind": "tertiary"
        },
        {
          "id": "contact",
          "label": { "en": "Book a live demo", "ar": "احجز عرضاً مباشراً" },
          "href": "/contact",
          "kind": "ghost"
        }
      ]
    }
    $$::jsonb,
    'Resources for evaluation teams', 'موارد فرق التقييم',
    'Public material for sponsors, reviewers, and technical stakeholders.', 'مواد عامة للجهات الراعية والمراجعين وأصحاب المصلحة التقنيين.',
    'Resources', 'الموارد'
  ),
  (
    '/resources/executive-kit',
    'marketing-landing',
    'marketing.executive-kit.page',
    $$
    {
      "brandCode": "shahin-ai",
      "brandLabel": { "en": "Shahin-AI", "ar": "شاهين-AI" },
      "breadcrumb": [
        { "label": { "en": "Home", "ar": "الرئيسية" }, "href": "/" },
        { "label": { "en": "Resources", "ar": "الموارد" }, "href": "/resources" },
        { "label": { "en": "Executive kit", "ar": "الحزمة التنفيذية" }, "current": true }
      ],
      "actions": [
        {
          "id": "pricing",
          "label": { "en": "See pricing", "ar": "استعرض التسعير" },
          "href": "/pricing",
          "kind": "primary"
        },
        {
          "id": "contact",
          "label": { "en": "Talk to the team", "ar": "تحدث إلى الفريق" },
          "href": "/contact",
          "kind": "tertiary"
        }
      ],
      "notice": {
        "kind": "info",
        "title": { "en": "Public page, gated asset.", "ar": "صفحة عامة، أصل محمي." },
        "body": { "en": "The route is public; the asset request captures the reviewer context before unlock.", "ar": "المسار عام؛ يلتقط طلب الأصل سياق المراجع قبل الفتح." }
      },
      "featuredAssetKey": "shahin-executive-overview",
      "loadingCopy": { "en": "Loading the current executive asset…", "ar": "جارٍ تحميل الأصل التنفيذي الحالي…" },
      "downloadCtaLabel": { "en": "Request executive kit", "ar": "اطلب الحزمة التنفيذية" },
      "gatedLabel": { "en": "Request required", "ar": "يتطلب طلباً" },
      "openLabel": { "en": "Open download", "ar": "تنزيل مباشر" },
      "modalTitle": { "en": "Request your download", "ar": "اطلب التنزيل" },
      "labelName": { "en": "Full name", "ar": "الاسم الكامل" },
      "labelEmail": { "en": "Work email", "ar": "البريد المهني" },
      "labelCompany": { "en": "Company", "ar": "الشركة" },
      "labelJobTitle": { "en": "Job title", "ar": "المسمى الوظيفي" },
      "labelCountry": { "en": "Country", "ar": "الدولة" },
      "labelInterest": { "en": "Interest area", "ar": "مجال الاهتمام" },
      "labelConsent": { "en": "I agree to be contacted about this download.", "ar": "أوافق على التواصل معي بخصوص هذا التنزيل." },
      "submitLabel": { "en": "Get download", "ar": "احصل على التنزيل" },
      "cancelLabel": { "en": "Cancel", "ar": "إلغاء" },
      "submittingLabel": { "en": "Submitting…", "ar": "جارٍ الإرسال…" },
      "countries": [
        { "en": "Saudi Arabia", "ar": "السعودية" },
        { "en": "United Arab Emirates", "ar": "الإمارات" },
        { "en": "Qatar", "ar": "قطر" },
        { "en": "Kuwait", "ar": "الكويت" },
        { "en": "Bahrain", "ar": "البحرين" },
        { "en": "Oman", "ar": "عُمان" },
        { "en": "Other", "ar": "أخرى" }
      ],
      "interestAreas": [
        { "en": "GRC", "ar": "الحوكمة والمخاطر والامتثال" },
        { "en": "Risk", "ar": "المخاطر" },
        { "en": "Audit", "ar": "التدقيق" },
        { "en": "Security", "ar": "الأمن" },
        { "en": "Privacy", "ar": "الخصوصية" },
        { "en": "Other", "ar": "أخرى" }
      ],
      "reasons": [
        {
          "id": "inside",
          "title": { "en": "What is inside the kit?", "ar": "ماذا يوجد داخل الحزمة؟" },
          "body": { "en": "Commercial framing, operating model, and the public platform story in one package.", "ar": "صياغة تجارية ونموذج تشغيل وقصة المنصة العامة في حزمة واحدة." }
        },
        {
          "id": "when",
          "title": { "en": "When should you use it?", "ar": "متى تستخدمها؟" },
          "body": { "en": "When the sponsor needs the concise version before a deeper working session.", "ar": "عندما يحتاج الراعي إلى النسخة المختصرة قبل جلسة عمل أعمق." }
        },
        {
          "id": "next",
          "title": { "en": "What happens next?", "ar": "ما الخطوة التالية؟" },
          "body": { "en": "Move into pricing, trust, or a guided walkthrough after the request is complete.", "ar": "انتقل إلى التسعير أو الثقة أو عرض موجه بعد اكتمال الطلب." }
        }
      ],
      "successHeading": { "en": "Your kit is ready.", "ar": "حزمتك جاهزة." },
      "successBody": { "en": "You can now access", "ar": "يمكنك الآن الوصول إلى" },
      "downloadNowLabel": { "en": "Download now", "ar": "نزّل الآن" },
      "emailLabel": { "en": "Email me a link", "ar": "أرسل لي رابطاً" },
      "bookDemoLabel": { "en": "Book a demo", "ar": "احجز عرضاً" },
      "bookDemoHref": "/contact",
      "exploreLabel": { "en": "Explore the platform", "ar": "استكشف المنصة" },
      "exploreHref": "/platform",
      "followupBody": { "en": "The executive kit is unlocked and ready for the next review step.", "ar": "الحزمة التنفيذية مفتوحة وجاهزة لخطوة المراجعة التالية." },
      "failureMessage": { "en": "Unable to submit the executive kit request.", "ar": "تعذر إرسال طلب الحزمة التنفيذية." }
    }
    $$::jsonb,
    'Executive kit', 'الحزمة التنفيذية',
    'A gated package for sponsor-facing commercial and operating review.', 'حزمة محمية لمراجعة تجارية وتشغيلية موجهة للراعي.',
    'Executive kit', 'الحزمة التنفيذية'
  )
ON CONFLICT (route) DO UPDATE
  SET archetype = EXCLUDED.archetype,
      template_export = EXCLUDED.template_export,
      props = EXCLUDED.props,
      title_en = EXCLUDED.title_en,
      title_ar = EXCLUDED.title_ar,
      subtitle_en = EXCLUDED.subtitle_en,
      subtitle_ar = EXCLUDED.subtitle_ar,
      eyebrow_en = EXCLUDED.eyebrow_en,
      eyebrow_ar = EXCLUDED.eyebrow_ar,
      version = dos.ui_route_template_binding.version + 1,
      updated_at = now();

DO $$
DECLARE
  mismatch_count integer;
BEGIN
  WITH expected(route, component_key) AS (
    VALUES
      ('/', 'marketing.home.page'),
      ('/platform', 'marketing.platform.page'),
      ('/resources', 'marketing.resources.page'),
      ('/resources/executive-kit', 'marketing.executive-kit.page'),
      ('/pricing', 'marketing.pricing.page'),
      ('/trust', 'marketing.trust.page'),
      ('/security', 'marketing.security.page'),
      ('/contact', 'marketing.contact.page'),
      ('/about', 'marketing.about.page'),
      ('/legal', 'marketing.legal.page')
  )
  SELECT count(*)
    INTO mismatch_count
    FROM expected e
    LEFT JOIN dos.dynamic_ui_component_registry r
      ON r.component_key = e.component_key
     AND r.vendor = 'ibm-carbon'
     AND r.approval_status = 'approved'
    LEFT JOIN dos.dynamic_ui_routes d
      ON d.tenant_id IS NULL
     AND d.module_code = 'marketing'
     AND d.path_pattern = e.route
     AND d.component_key = e.component_key
    LEFT JOIN dos.ui_route_template_binding b
      ON b.route = e.route
     AND b.archetype = 'marketing-landing'
     AND b.template_export = e.component_key
   WHERE r.component_key IS NULL
      OR d.path_pattern IS NULL
      OR b.route IS NULL;

  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION 'marketing public contract repair left % mismatches', mismatch_count;
  END IF;
END $$;

COMMIT;
