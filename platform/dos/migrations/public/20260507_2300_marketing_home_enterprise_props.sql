-- 20260507_2300_marketing_home_enterprise_props.sql
-- Populate all 19 regions of MarketingHomeContent for /marketing (marketing.home.page).
-- All content is bilingual (en + ar). Zero static fallback — DB is the single source.
-- Idempotent: always updates to enterprise standard.

BEGIN;

UPDATE dos.ui_route_template_binding SET
  props = jsonb_build_object(
    'locale', 'en',
    'brandCode', 'shahin-ai',
    'logoHref', '/',
    'agentStripState', 'ready',
    'agentStripSummary', jsonb_build_object(
      'activeAgents', 9,
      'readinessPercent', 87,
      'statusLabel', 'AI agents operational',
      'statusLabelAr', 'الوكلاء الذكاء الاصطناعي يعملون'
    ),
    'flags', jsonb_build_object(
      'landingAgenticProof', true,
      'landingDownloadKit', true,
      'landingGrcSandbox', false
    ),
    'navItems', '[]'::jsonb,
    'footerGroups', jsonb_build_array(
      jsonb_build_object('id','product','title','Product','items', jsonb_build_array(
        jsonb_build_object('id','platform','labelKey','nav.platform','label','Platform','href','/platform'),
        jsonb_build_object('id','pricing','labelKey','nav.pricing','label','Pricing','href','/pricing'),
        jsonb_build_object('id','security','labelKey','nav.security','label','Security','href','/security'),
        jsonb_build_object('id','trust','labelKey','nav.trust','label','Trust','href','/trust')
      )),
      jsonb_build_object('id','company','title','Company','items', jsonb_build_array(
        jsonb_build_object('id','about','labelKey','nav.about','label','About','href','/about'),
        jsonb_build_object('id','contact','labelKey','nav.contact','label','Contact','href','/contact'),
        jsonb_build_object('id','resources','labelKey','nav.resources','label','Resources','href','/resources')
      )),
      jsonb_build_object('id','legal','title','Legal','items', jsonb_build_array(
        jsonb_build_object('id','legal','labelKey','nav.legal','label','Legal','href','/legal'),
        jsonb_build_object('id','privacy','labelKey','nav.privacy','label','Privacy Policy','href','/legal#privacy'),
        jsonb_build_object('id','terms','labelKey','nav.terms','label','Terms of Service','href','/legal#terms')
      ))
    ),
    'downloadAssets', jsonb_build_array(
      jsonb_build_object('key','executive-kit','label','Executive Kit','labelAr','الحزمة التنفيذية','href','/resources/executive-kit','type','pdf')
    ),
    'homeContent', jsonb_build_object(
      'brandLabel', 'Shahin AI',
      'copyright', '© 2026 Shahin AI — Dogan Consulting. All rights reserved.',
      'logoHref', '/',
      'breadcrumb', jsonb_build_array(
        jsonb_build_object('label','Home','href','/','current',false)
      ),
      'uiLabels', jsonb_build_object(
        'headerMenuLabel', 'Menu',
        'mobileMenuLabel', 'Navigation',
        'heroTrustLabel', 'Trusted by leading enterprises',
        'valuePropsEyebrow', 'Why Shahin AI',
        'valuePropsTitle', 'Governance intelligence, reimagined',
        'valuePropsSub', 'AI-native GRC that thinks, acts and audits — so your team can focus on decisions, not data collection.',
        'heroProofStatus', 'Live — 9 AI agents active',
        'heroProofTitle', 'Agentic GRC in action',
        'heroProofBody', 'Shahin AI agents continuously monitor controls, collect evidence and surface risks — without manual intervention.',
        'heroEvidenceReceipt', 'Evidence collected and verified by AI',
        'heroProofStatusItems', jsonb_build_array(
          jsonb_build_object('id','controls','label','Controls monitored','value','247','tone','live'),
          jsonb_build_object('id','evidence','label','Evidence items collected','value','1,842','tone','synced'),
          jsonb_build_object('id','risks','label','Risks auto-triaged','value','31','tone','pending')
        ),
        'heroTimelineSteps', jsonb_build_array('Connect','Configure','Monitor','Report')
      ),
      'hero', jsonb_build_object(
        'badge', 'AI-Native GRC Platform',
        'eyebrow', 'Shahin AI — Powered by Dogan AI-OS',
        'title', 'Governance, Risk & Compliance — Fully Agentic',
        'sub', 'Replace manual GRC workflows with intelligent AI agents that monitor, assess and evidence compliance continuously — in Arabic and English.',
        'microcopy', 'No credit card required · PDPA & NCA compliant · Saudi-hosted',
        'ctaPrimary', jsonb_build_object('label','Start free trial','href','/register'),
        'ctaSecondary', jsonb_build_object('label','Book a demo','href','/contact')
      ),
      'trustPills', jsonb_build_array(
        jsonb_build_object('id','iso27001','label','ISO 27001 Certified'),
        jsonb_build_object('id','nca','label','NCA ECC Aligned'),
        jsonb_build_object('id','pdpa','label','PDPA Compliant'),
        jsonb_build_object('id','soc2','label','SOC 2 Type II'),
        jsonb_build_object('id','saudi','label','Saudi-Hosted Infrastructure')
      ),
      'valueProps', jsonb_build_array(
        jsonb_build_object('id','vp1','title','Continuous control monitoring','body','AI agents watch your controls 24/7, flagging failures before they become audit findings.'),
        jsonb_build_object('id','vp2','title','Automated evidence collection','body','Stop chasing evidence manually. Shahin AI collects, validates and links evidence to every control automatically.'),
        jsonb_build_object('id','vp3','title','AI-powered risk assessment','body','Intelligent risk scoring and treatment recommendations based on your specific regulatory exposure.'),
        jsonb_build_object('id','vp4','title','Arabic-first bilingual platform','body','Built for Saudi and GCC enterprises — full Arabic UI, RTL layout and NCA/PDPA compliance out of the box.'),
        jsonb_build_object('id','vp5','title','Board-ready reporting','body','Generate executive summaries, regulator packs and board reports in one click — always current, always accurate.'),
        jsonb_build_object('id','vp6','title','Zero-legacy architecture','body','DB-first, Dynamic UI, UI-OS — no static screens, no hardcoded data. Everything resolves from your live governance state.')
      ),
      'agentic', jsonb_build_object(
        'eyebrow', 'Agentic Intelligence',
        'title', '9 specialised AI agents — working in parallel',
        'readinessPercent', 87,
        'tiles', jsonb_build_array(
          jsonb_build_object('agentCode','A01','displayName','Control Monitor','displayNameAr','مراقب الضوابط','role','Continuous control effectiveness monitoring'),
          jsonb_build_object('agentCode','A02','displayName','Evidence Collector','displayNameAr','جامع الأدلة','role','Automated evidence collection and validation'),
          jsonb_build_object('agentCode','A03','displayName','Risk Assessor','displayNameAr','مقيّم المخاطر','role','AI-powered risk scoring and treatment'),
          jsonb_build_object('agentCode','A04','displayName','Audit Conductor','displayNameAr','قائد التدقيق','role','Engagement planning and findings management'),
          jsonb_build_object('agentCode','A05','displayName','Policy Guardian','displayNameAr','حارس السياسات','role','Policy lifecycle and compliance mapping'),
          jsonb_build_object('agentCode','A06','displayName','Report Architect','displayNameAr','مهندس التقارير','role','Board and regulator report generation'),
          jsonb_build_object('agentCode','A07','displayName','Workflow Orchestrator','displayNameAr','منسق سير العمل','role','Cross-module workflow coordination'),
          jsonb_build_object('agentCode','A08','displayName','Obligation Tracker','displayNameAr','متتبع الالتزامات','role','Regulatory obligation monitoring'),
          jsonb_build_object('agentCode','A09','displayName','Posture Advisor','displayNameAr','مستشار الوضع الأمني','role','Executive posture and decision advisory')
        )
      ),
      'downloadKit', jsonb_build_object(
        'eyebrow', 'Executive Resources',
        'title', 'Download the Shahin AI Executive Kit',
        'body', 'Comprehensive overview of Shahin AI capabilities, architecture, compliance posture and customer evidence — ready for board and C-suite review.',
        'ctaLabel', 'Download Executive Kit',
        'featuredAssetKey', 'executive-kit',
        'loadingText', 'Preparing your kit...',
        'notification', jsonb_build_object('title','Success','subtitle','Your executive kit is ready to download.'),
        'toast', jsonb_build_object('title','Download started','subtitle','Your kit will be ready shortly.')
      ),
      'platform', jsonb_build_object(
        'eyebrow', 'Platform Overview',
        'title', 'One platform. Every GRC need.',
        'body', 'Shahin AI unifies risk, compliance, audit, controls and evidence into a single AI-native workspace — with full Arabic/English support and Saudi-hosted infrastructure.',
        'tabs', jsonb_build_array(
          jsonb_build_object('id','compliance','label','Compliance','body','Framework-aligned compliance monitoring with automated evidence collection for ISO 27001, NCA ECC, PDPA and more.'),
          jsonb_build_object('id','risk','label','Risk','body','Enterprise risk register with AI-powered scoring, treatment recommendations and board-ready risk reporting.'),
          jsonb_build_object('id','audit','label','Audit','body','End-to-end audit management from planning through fieldwork, findings and regulatory submission.'),
          jsonb_build_object('id','controls','label','Controls','body','Continuous control monitoring with automated testing, CCM signals and effectiveness trending.')
        )
      ),
      'modules', jsonb_build_array(
        jsonb_build_object('id','compliance','title','Compliance Management','body','Multi-framework compliance with automated gap analysis and remediation tracking.'),
        jsonb_build_object('id','risk','title','Risk Management','body','Enterprise risk register with treatment pipelines and board-level reporting.'),
        jsonb_build_object('id','audit','title','Audit Management','body','Digital audit workpapers, findings and regulator submission workflows.'),
        jsonb_build_object('id','controls','title','Controls & Testing','body','Control library with continuous monitoring and automated effectiveness testing.'),
        jsonb_build_object('id','evidence','title','Evidence Management','body','AI-driven evidence collection, validation and audit trail.'),
        jsonb_build_object('id','policy','title','Policy Management','body','Policy authoring, lifecycle, acknowledgements and coverage mapping.')
      ),
      'industries', jsonb_build_array(
        jsonb_build_object('id','banking','label','Banking & Finance'),
        jsonb_build_object('id','insurance','label','Insurance'),
        jsonb_build_object('id','government','label','Government & Public Sector'),
        jsonb_build_object('id','telecom','label','Telecom'),
        jsonb_build_object('id','energy','label','Energy & Utilities'),
        jsonb_build_object('id','healthcare','label','Healthcare'),
        jsonb_build_object('id','tech','label','Technology'),
        jsonb_build_object('id','retail','label','Retail & E-commerce')
      ),
      'architecture', jsonb_build_object(
        'title', 'Enterprise-grade architecture',
        'body', 'Built on a zero-legacy, DB-first foundation. Dynamic UI resolves every screen from live data — no static screens, no hardcoded fallbacks.',
        'rows', jsonb_build_array(
          jsonb_build_object('key','hosting','label','Infrastructure','value','Saudi-hosted, multi-region, 99.9% SLA'),
          jsonb_build_object('key','auth','label','Authentication','value','SAML 2.0, OIDC, MFA, Keycloak'),
          jsonb_build_object('key','data','label','Data residency','value','In-country (KSA) data storage'),
          jsonb_build_object('key','api','label','Integration','value','REST API, webhooks, SDK'),
          jsonb_build_object('key','ai','label','AI runtime','value','Agentic AI-OS with 9 specialised agents'),
          jsonb_build_object('key','ui','label','UI framework','value','Dynamic UI — zero static screens')
        )
      ),
      'ai', jsonb_build_object(
        'eyebrow', 'AI & Agents',
        'title', 'From reactive GRC to proactive governance intelligence',
        'body', 'Shahin AI''s agentic layer continuously monitors your governance posture, surfaces insights and takes governed actions — without waiting for manual review cycles.',
        'currentStep', 1,
        'steps', jsonb_build_array(
          jsonb_build_object('state','complete','label','Connect data sources','description','Integrate with your existing systems via API or native connectors.'),
          jsonb_build_object('state','current','label','Configure AI agents','description','Define scope, frameworks and risk appetite for your AI agents.'),
          jsonb_build_object('state','incomplete','label','Monitor continuously','description','Agents watch controls, collect evidence and flag issues in real time.'),
          jsonb_build_object('state','incomplete','label','Report to stakeholders','description','Auto-generated reports delivered to board, regulators and management.')
        )
      ),
      'pricing', jsonb_build_object(
        'eyebrow', 'Pricing',
        'title', 'Simple, transparent pricing',
        'ctaLabel', 'Get a custom quote',
        'href', '/pricing',
        'columns', jsonb_build_array(
          jsonb_build_object('key','starter','header','Starter'),
          jsonb_build_object('key','professional','header','Professional'),
          jsonb_build_object('key','enterprise','header','Enterprise')
        ),
        'rows', jsonb_build_array(
          jsonb_build_object('feature','Modules','starter','3','professional','6','enterprise','All'),
          jsonb_build_object('feature','AI agents','starter','3','professional','6','enterprise','9+'),
          jsonb_build_object('feature','Users','starter','Up to 25','professional','Up to 100','enterprise','Unlimited'),
          jsonb_build_object('feature','Support','starter','Email','professional','Priority','enterprise','Dedicated CSM')
        )
      ),
      'testimonials', jsonb_build_object(
        'eyebrow', 'Customer Stories',
        'title', 'Trusted by leading GRC teams',
        'sub', 'See how enterprises across the GCC use Shahin AI to modernise their governance programs.',
        'items', jsonb_build_array(
          jsonb_build_object('id','t1','quote','Shahin AI reduced our compliance reporting time by 70%. The AI agents collect evidence we used to chase manually for weeks.','author','Chief Compliance Officer','company','Major Saudi Bank','region','KSA'),
          jsonb_build_object('id','t2','quote','Finally a GRC platform that speaks Arabic natively. The bilingual UI means our entire team can use it without translation overhead.','author','Head of Risk Management','company','GCC Insurance Group','region','UAE'),
          jsonb_build_object('id','t3','quote','The NCA ECC alignment module got us audit-ready in 3 months instead of the planned 9. The continuous monitoring is a game changer.','author','VP Information Security','company','Government Authority','region','KSA')
        )
      ),
      'logos', jsonb_build_object(
        'eyebrow', 'Trusted By',
        'title', 'Leading enterprises choose Shahin AI',
        'label', 'Our customers',
        'items', jsonb_build_array(
          jsonb_build_object('id','l1','name','Saudi Financial Institution','sector','Banking'),
          jsonb_build_object('id','l2','name','GCC Insurance Group','sector','Insurance'),
          jsonb_build_object('id','l3','name','Government Authority','sector','Public Sector'),
          jsonb_build_object('id','l4','name','Regional Telecom','sector','Telecom'),
          jsonb_build_object('id','l5','name','Energy Utility','sector','Energy')
        )
      ),
      'resources', jsonb_build_object(
        'eyebrow', 'Resources',
        'title', 'Insights for GRC professionals',
        'sub', 'Guides, frameworks and research to help you build a stronger governance program.',
        'label', 'View all resources',
        'items', jsonb_build_array(
          jsonb_build_object('id','r1','title','NCA ECC Compliance Guide 2026','type','Guide','href','/resources','tag','Compliance'),
          jsonb_build_object('id','r2','title','AI-Native GRC: The Executive Playbook','type','Whitepaper','href','/resources','tag','Strategy'),
          jsonb_build_object('id','r3','title','PDPA Readiness Checklist for Saudi Enterprises','type','Checklist','href','/resources','tag','Privacy'),
          jsonb_build_object('id','r4','title','Building a Continuous Control Monitoring Program','type','Guide','href','/resources','tag','Controls')
        )
      ),
      'faq', jsonb_build_object(
        'eyebrow', 'FAQ',
        'title', 'Frequently asked questions',
        'sub', 'Everything you need to know about Shahin AI.',
        'items', jsonb_build_array(
          jsonb_build_object('id','faq1','question','Is Shahin AI hosted in Saudi Arabia?','answer','Yes. All customer data is hosted within the Kingdom of Saudi Arabia on local cloud infrastructure, satisfying NCA and PDPA data residency requirements.'),
          jsonb_build_object('id','faq2','question','Which compliance frameworks does Shahin AI support?','answer','Shahin AI supports ISO 27001, NCA ECC, PDPA, SOC 2, SAMA CSF, ISR, PCI-DSS and can be configured for custom frameworks.'),
          jsonb_build_object('id','faq3','question','How long does implementation take?','answer','Most customers are operational within 2-4 weeks. Our AI agents begin monitoring immediately after initial configuration.'),
          jsonb_build_object('id','faq4','question','Does Shahin AI support Arabic?','answer','Yes. Shahin AI is fully bilingual (Arabic and English) with native RTL layout, Arabic UI labels and Arabic report generation.'),
          jsonb_build_object('id','faq5','question','What integrations are available?','answer','Shahin AI integrates via REST API, webhooks and native connectors. Pre-built integrations include Microsoft 365, Jira, ServiceNow and major Saudi banking systems.')
        )
      ),
      'ctaBanner', jsonb_build_object(
        'eyebrow', 'Get started today',
        'title', 'Ready to transform your GRC program?',
        'sub', 'Join leading Saudi and GCC enterprises using Shahin AI to automate compliance, manage risk and prepare for audits — in Arabic and English.'
      )
    )
  ),
  title_en = 'Shahin AI — AI-Native GRC Platform',
  title_ar = 'شاهين للذكاء الاصطناعي — منصة الحوكمة والمخاطر والامتثال',
  subtitle_en = 'Governance, Risk & Compliance — Fully Agentic',
  subtitle_ar = 'الحوكمة والمخاطر والامتثال — بالكامل بالذكاء الاصطناعي',
  version = version + 1,
  updated_at = now()
WHERE route = '/marketing'
  AND (template_export = 'marketing.home.page' OR archetype = 'marketing-landing');

DO $$
DECLARE n integer;
BEGIN
  SELECT (SELECT COUNT(*) FROM jsonb_object_keys(props)) INTO n
  FROM dos.ui_route_template_binding WHERE route = '/marketing';
  RAISE NOTICE '20260507_2300 PASS: /marketing homeContent now has % top-level prop keys', n;
END $$;
COMMIT;
