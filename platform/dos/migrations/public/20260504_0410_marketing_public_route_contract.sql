-- Phase M3.2 — Public marketing route contract.
-- Goal: remove hardcoded page copy from the Angular public-page components
-- and drive all public marketing routes from dos.ui_route_template_binding.

BEGIN;

INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, carbon_key, approval_status)
VALUES
  ('marketing.resources.page', 'ibm-carbon', 'tiles', 'approved'),
  ('marketing.executive-kit.page', 'ibm-carbon', 'modal', 'approved')
ON CONFLICT (component_key) DO UPDATE
  SET vendor = EXCLUDED.vendor,
      carbon_key = EXCLUDED.carbon_key,
      approval_status = EXCLUDED.approval_status,
      approved_at = now();

DO $$
DECLARE
  rows TEXT[][] := ARRAY[
    ARRAY['/platform', 'marketing.platform.page', '26'],
    ARRAY['/resources', 'marketing.resources.page', '27'],
    ARRAY['/resources/executive-kit', 'marketing.executive-kit.page', '28']
  ];
  r TEXT[];
BEGIN
  FOREACH r SLICE 1 IN ARRAY rows
  LOOP
    IF NOT EXISTS (
      SELECT 1
        FROM dos.dynamic_ui_routes
       WHERE tenant_id IS NULL
         AND path_pattern = r[1]
         AND module_code = 'marketing'
    ) THEN
      INSERT INTO dos.dynamic_ui_routes
        (tenant_id, module_code, path_pattern, component_key, permission_key,
         sort_order, readiness, page_type, layout, kpi_scope, user_intent,
         data_scope_mode, evidence_required, title_key, subtitle_key,
         data_resource_key, default_view, audit_enabled, realtime_enabled)
      VALUES
        (NULL, 'marketing', r[1], r[2], NULL,
         r[3]::int, 'active', 'overview', 'full-page', 'none', NULL, NULL,
         FALSE,
         replace(r[2], '.page', '.title'),
         replace(r[2], '.page', '.subtitle'),
         'marketing.resource.public', 'cards',
         FALSE, FALSE);
    END IF;
  END LOOP;
END $$;

INSERT INTO dos.ui_route_template_binding (
  route, archetype, template_export, props,
  title_en, title_ar,
  subtitle_en, subtitle_ar,
  eyebrow_en, eyebrow_ar
) VALUES
  (
    '/pricing',
    'marketing-landing',
    'MarketingPricingTemplateComponent',
    $$
    {
      "brandCode": "shahin-ai",
      "brandLabel": { "en": "Shahin-AI", "ar": "شاهين-AI" },
      "breadcrumb": [
        { "label": { "en": "Home", "ar": "الرئيسية" }, "href": "/" },
        { "label": { "en": "Pricing", "ar": "التسعير" }, "current": true }
      ],
      "tiles": [
        {
          "id": "trial",
          "title": { "en": "Trial", "ar": "تجريبي" },
          "body": { "en": "Free trial with the public marketing flow and guided product review.", "ar": "تجربة مجانية مع التدفق التسويقي العام ومراجعة المنتج الموجهة." }
        },
        {
          "id": "standard",
          "title": { "en": "Standard", "ar": "قياسي" },
          "body": { "en": "Tenant subscription with workflow, evidence, and governed AI operations.", "ar": "اشتراك مستأجر مع سير العمل والأدلة وعمليات الذكاء الاصطناعي المنضبطة." }
        },
        {
          "id": "enterprise",
          "title": { "en": "Enterprise", "ar": "مؤسسي" },
          "body": { "en": "On-prem and advanced operating controls for regulated enterprise rollouts.", "ar": "نشر داخلي وضوابط تشغيل متقدمة لإطلاقات المؤسسات الخاضعة للتنظيم." }
        }
      ],
      "actions": [
        {
          "id": "start-trial",
          "label": { "en": "Start free trial", "ar": "ابدأ التجربة المجانية" },
          "href": "/register",
          "kind": "primary"
        },
        {
          "id": "contact",
          "label": { "en": "Talk to the team", "ar": "تحدث إلى الفريق" },
          "href": "/contact",
          "kind": "tertiary"
        }
      ]
    }
    $$::jsonb,
    'Pricing built for governance teams', 'تسعير مصمم لفرق الحوكمة',
    'Transparent commercial framing for regulated AI operations.', 'صياغة تجارية واضحة لعمليات الذكاء الاصطناعي المنظمة.',
    'Pricing', 'التسعير'
  ),
  (
    '/trust',
    'marketing-landing',
    'MarketingTrustTemplateComponent',
    $$
    {
      "brandCode": "shahin-ai",
      "brandLabel": { "en": "Shahin-AI", "ar": "شاهين-AI" },
      "breadcrumb": [
        { "label": { "en": "Home", "ar": "الرئيسية" }, "href": "/" },
        { "label": { "en": "Trust", "ar": "الثقة" }, "current": true }
      ],
      "tiles": [
        {
          "id": "tenant-isolation",
          "title": { "en": "Tenant isolation", "ar": "عزل المستأجر" },
          "body": { "en": "Tenant context, schema isolation, and policy enforcement stay in the runtime path.", "ar": "يبقى سياق المستأجر وعزل المخطط وفرض السياسات في مسار التشغيل." }
        },
        {
          "id": "audit-ledger",
          "title": { "en": "Audit ledger", "ar": "سجل التدقيق" },
          "body": { "en": "Every approved action keeps provenance and evidence for downstream review.", "ar": "كل إجراء معتمد يحتفظ بالمصدر والدليل للمراجعة اللاحقة." }
        },
        {
          "id": "sod",
          "title": { "en": "Separation of duties", "ar": "الفصل بين الواجبات" },
          "body": { "en": "Authorisation remains enforced in AccessStore and service policy layers.", "ar": "يبقى التفويض مفروضاً في AccessStore وطبقات سياسة الخدمة." }
        }
      ],
      "actions": [
        {
          "id": "security",
          "label": { "en": "Security details", "ar": "تفاصيل الأمن" },
          "href": "/security",
          "kind": "primary"
        }
      ]
    }
    $$::jsonb,
    'Trust', 'الثقة',
    'Runtime proof for tenant isolation, audit, and controlled operations.', 'إثبات تشغيلي لعزل المستأجر والتدقيق والعمليات المنضبطة.',
    'Trust', 'الثقة'
  ),
  (
    '/security',
    'marketing-landing',
    'MarketingSecurityTemplateComponent',
    $$
    {
      "brandCode": "shahin-ai",
      "brandLabel": { "en": "Shahin-AI", "ar": "شاهين-AI" },
      "breadcrumb": [
        { "label": { "en": "Home", "ar": "الرئيسية" }, "href": "/" },
        { "label": { "en": "Security", "ar": "الأمن" }, "current": true }
      ],
      "tiles": [
        {
          "id": "gateway",
          "title": { "en": "Gateway controls", "ar": "ضوابط البوابة" },
          "body": { "en": "Public and workspace traffic resolve through the platform gateway and service boundaries.", "ar": "يتدفق المرور العام ومرور مساحة العمل عبر بوابة المنصة وحدود الخدمات." }
        },
        {
          "id": "policy",
          "title": { "en": "Policy enforcement", "ar": "فرض السياسات" },
          "body": { "en": "Authorisation and SoD checks stay in the canonical access and policy stack.", "ar": "تبقى فحوصات التفويض والفصل بين الواجبات في مكدس الوصول والسياسات المعتمد." }
        },
        {
          "id": "observability",
          "title": { "en": "Operational visibility", "ar": "الرؤية التشغيلية" },
          "body": { "en": "Security review stays tied to the same telemetry and audit evidence path.", "ar": "تبقى المراجعة الأمنية مرتبطة بمسار القياس عن بُعد وأدلة التدقيق نفسها." }
        }
      ],
      "actions": [
        {
          "id": "contact",
          "label": { "en": "Report a concern", "ar": "أبلغ عن ملاحظة" },
          "href": "/contact",
          "kind": "primary"
        }
      ]
    }
    $$::jsonb,
    'Security', 'الأمن',
    'How the public product surface stays governed and observable.', 'كيف يبقى السطح العام للمنتج منضبطاً وقابلاً للمراقبة.',
    'Security', 'الأمن'
  ),
  (
    '/contact',
    'marketing-landing',
    'MarketingContactTemplateComponent',
    $$
    {
      "brandCode": "shahin-ai",
      "brandLabel": { "en": "Shahin-AI", "ar": "شاهين-AI" },
      "breadcrumb": [
        { "label": { "en": "Home", "ar": "الرئيسية" }, "href": "/" },
        { "label": { "en": "Contact", "ar": "اتصل بنا" }, "current": true }
      ],
      "tiles": [
        {
          "id": "sales",
          "title": { "en": "Commercial review", "ar": "مراجعة تجارية" },
          "body": { "en": "Use this route to align pricing, rollout scope, and the next working session.", "ar": "استخدم هذا المسار لمواءمة التسعير ونطاق الإطلاق وجلسة العمل التالية." }
        },
        {
          "id": "security",
          "title": { "en": "Trust review", "ar": "مراجعة الثقة" },
          "body": { "en": "Security and architecture questions stay tied to the same public evidence flow.", "ar": "تبقى الأسئلة الأمنية والمعمارية مرتبطة بتدفق الدليل العام نفسه." }
        },
        {
          "id": "demo",
          "title": { "en": "Live walkthrough", "ar": "عرض مباشر" },
          "body": { "en": "Move from public material to a guided product demonstration.", "ar": "انتقل من المادة العامة إلى عرض منتج موجه." }
        }
      ],
      "actions": [
        {
          "id": "register",
          "label": { "en": "Start free trial", "ar": "ابدأ التجربة المجانية" },
          "href": "/register",
          "kind": "primary"
        }
      ]
    }
    $$::jsonb,
    'Contact', 'اتصل بنا',
    'Reach the team for a guided commercial or technical review.', 'تواصل مع الفريق لمراجعة تجارية أو تقنية موجهة.',
    'Contact', 'اتصل بنا'
  ),
  (
    '/about',
    'marketing-landing',
    'MarketingAboutTemplateComponent',
    $$
    {
      "brandCode": "shahin-ai",
      "brandLabel": { "en": "Shahin-AI", "ar": "شاهين-AI" },
      "breadcrumb": [
        { "label": { "en": "Home", "ar": "الرئيسية" }, "href": "/" },
        { "label": { "en": "About", "ar": "من نحن" }, "current": true }
      ],
      "tiles": [
        {
          "id": "mission",
          "title": { "en": "Mission", "ar": "المهمة" },
          "body": { "en": "Make governed AI operations practical for regulated teams.", "ar": "جعل عمليات الذكاء الاصطناعي المنضبطة عملية للفرق المنظمة." }
        },
        {
          "id": "platform",
          "title": { "en": "Platform DNA", "ar": "حمض المنصة" },
          "body": { "en": "Products compose on top of shared platform DNA, services, and modules.", "ar": "تتكون المنتجات فوق حمض المنصة المشترك والخدمات والوحدات." }
        },
        {
          "id": "execution",
          "title": { "en": "Operating model", "ar": "نموذج التشغيل" },
          "body": { "en": "Public routes, workspace shell, and service boundaries stay contract-driven.", "ar": "تبقى المسارات العامة وواجهة مساحة العمل وحدود الخدمات مدفوعة بالعقود." }
        }
      ],
      "actions": [
        {
          "id": "platform",
          "label": { "en": "See platform DNA", "ar": "اعرض بنية المنصة" },
          "href": "/platform",
          "kind": "primary"
        }
      ]
    }
    $$::jsonb,
    'About', 'من نحن',
    'The public platform story behind Shahin-AI.', 'القصة العامة للمنصة وراء شاهين-AI.',
    'About', 'من نحن'
  ),
  (
    '/legal',
    'marketing-landing',
    'MarketingLegalTemplateComponent',
    $$
    {
      "brandCode": "shahin-ai",
      "brandLabel": { "en": "Shahin-AI", "ar": "شاهين-AI" },
      "breadcrumb": [
        { "label": { "en": "Home", "ar": "الرئيسية" }, "href": "/" },
        { "label": { "en": "Legal", "ar": "القانوني" }, "current": true }
      ],
      "tiles": [
        {
          "id": "privacy",
          "title": { "en": "Privacy", "ar": "الخصوصية" },
          "body": { "en": "The public surface stays limited, with gated workflows handling sensitive follow-up.", "ar": "يبقى السطح العام محدوداً بينما تتولى التدفقات المحمية المتابعة الحساسة." }
        },
        {
          "id": "terms",
          "title": { "en": "Terms", "ar": "الشروط" },
          "body": { "en": "Commercial and service terms are handled through the governed sales and onboarding path.", "ar": "تتم معالجة الشروط التجارية والخدمية عبر مسار المبيعات والتهيئة المنضبط." }
        },
        {
          "id": "acceptable-use",
          "title": { "en": "Acceptable use", "ar": "الاستخدام المقبول" },
          "body": { "en": "Public access does not bypass access control, service policy, or audit expectations.", "ar": "لا يتجاوز الوصول العام ضوابط الوصول أو سياسات الخدمة أو متطلبات التدقيق." }
        }
      ],
      "actions": [
        {
          "id": "contact",
          "label": { "en": "Contact the team", "ar": "تواصل مع الفريق" },
          "href": "/contact",
          "kind": "primary"
        }
      ]
    }
    $$::jsonb,
    'Legal', 'القانوني',
    'Public commercial and trust routing stays aligned to the governed product flow.', 'يبقى التوجيه التجاري والثقة العام متوافقاً مع تدفق المنتج المنضبط.',
    'Legal', 'القانوني'
  ),
  (
    '/platform',
    'marketing-landing',
    'MarketingPlatformTemplateComponent',
    $$
    {
      "brandCode": "shahin-ai",
      "brandLabel": { "en": "Shahin-AI", "ar": "شاهين-AI" },
      "breadcrumb": [
        { "label": { "en": "Home", "ar": "الرئيسية" }, "href": "/" },
        { "label": { "en": "Platform", "ar": "المنصة" }, "current": true }
      ],
      "tiles": [
        {
          "id": "dna",
          "title": { "en": "Platform DNA", "ar": "حمض المنصة" },
          "body": { "en": "Foundation, identity, workflow, audit, and UI contracts stay in the shared platform layer.", "ar": "تبقى Foundation والهوية وسير العمل والتدقيق وعقود الواجهة في طبقة المنصة المشتركة." }
        },
        {
          "id": "services",
          "title": { "en": "Operational services", "ar": "الخدمات التشغيلية" },
          "body": { "en": "The public site stays backed by real services and contract-resolved UI bindings.", "ar": "يبقى الموقع العام مدعوماً بخدمات حقيقية وروابط واجهة محلولة بالعقود." }
        },
        {
          "id": "modules",
          "title": { "en": "Tenant-safe modules", "ar": "وحدات آمنة للمستأجر" },
          "body": { "en": "Business capabilities stay entitled by module, not hardcoded into the product shell.", "ar": "تبقى القدرات التجارية مخولة بحسب الوحدة لا مضمّنة بشكل صلب في واجهة المنتج." }
        },
        {
          "id": "evidence",
          "title": { "en": "Evidence path", "ar": "مسار الدليل" },
          "body": { "en": "Approvals, workflow actions, and AI activity stay tied to the same evidence ledger.", "ar": "تبقى الموافقات وإجراءات سير العمل ونشاط الذكاء مرتبطة بسجل الأدلة نفسه." }
        }
      ],
      "actions": [
        {
          "id": "pricing",
          "label": { "en": "See pricing", "ar": "استعرض التسعير" },
          "href": "/pricing",
          "kind": "primary"
        },
        {
          "id": "trust",
          "label": { "en": "Trust center", "ar": "مركز الثقة" },
          "href": "/trust",
          "kind": "tertiary"
        }
      ]
    }
    $$::jsonb,
    'Platform DNA for governed AI operations', 'بنية منصة لعمليات ذكاء اصطناعي منضبطة',
    'The public product story sits on top of shared platform services and contracts.', 'تقف قصة المنتج العامة فوق خدمات وعقود منصة مشتركة.',
    'Platform', 'المنصة'
  ),
  (
    '/resources',
    'marketing-landing',
    'MarketingResourcesTemplateComponent',
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
    'MarketingExecutiveKitTemplateComponent',
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

COMMIT;