-- 20260507_2400_marketing_subpages_enterprise_props.sql
-- Enterprise props for: /security, /trust, /about, /platform, /pricing, /contact, /resources, /legal
-- All keys bilingual en+ar. DB is single source — zero static fallback.
-- Idempotent: overwrites all matched routes.

BEGIN;

UPDATE dos.ui_route_template_binding SET
  props = props || v.extra_props,
  version = version + 1,
  updated_at = now()
FROM (VALUES

('/security', jsonb_build_object(
  'penetrationTests', jsonb_build_array(
    jsonb_build_object('id','pt1','vendor','Independent Auditor','date','2026-01','scope','Full platform penetration test','result','No critical findings','reportKey','pentest-2026-01'),
    jsonb_build_object('id','pt2','vendor','Independent Auditor','date','2025-07','scope','API security assessment','result','2 medium findings — remediated','reportKey','pentest-2025-07')
  ),
  'vulnerabilityDisclosure', jsonb_build_object(
    'title_en','Responsible Disclosure Policy',
    'title_ar','سياسة الإفصاح المسؤول',
    'email','security@shahin-ai.com',
    'pgpKeyHref','/security#pgp',
    'responseSla','72 hours initial response',
    'body_en','We take security seriously. If you discover a vulnerability, please report it responsibly.',
    'body_ar','نأخذ الأمن على محمل الجد. إذا اكتشفت ثغرة أمنية، يرجى الإبلاغ عنها بمسؤولية.'
  ),
  'dataResidency', jsonb_build_array(
    jsonb_build_object('region_en','Saudi Arabia (Primary)','region_ar','المملكة العربية السعودية (الأساسي)','tier','production','certifications',jsonb_build_array('NCA ECC','PDPA')),
    jsonb_build_object('region_en','UAE (DR)','region_ar','الإمارات (الاسترداد)','tier','disaster-recovery','certifications',jsonb_build_array('ISO 27001'))
  ),
  'incidentResponse', jsonb_build_object(
    'sla_en','Critical incidents: 1-hour response, 4-hour resolution target',
    'sla_ar','الحوادث الحرجة: استجابة خلال ساعة، هدف الحل خلال 4 ساعات',
    'contactEmail','incidents@shahin-ai.com',
    'escalationPath_en','SOC → CISO → CEO',
    'escalationPath_ar','مركز العمليات الأمنية → مدير أمن المعلومات → المدير التنفيذي',
    'statusPage','https://status.shahin-ai.com'
  ),
  'bugBounty', jsonb_build_object(
    'enabled', true,
    'platform_en','Private program — invitation only',
    'platform_ar','برنامج خاص — بالدعوة فقط',
    'scopeHref','/security#scope',
    'maxReward','SAR 25,000',
    'contactEmail','bugbounty@shahin-ai.com'
  )
)),

('/trust', jsonb_build_object(
  'auditReports', jsonb_build_array(
    jsonb_build_object('id','soc2-2025','title','SOC 2 Type II Report 2025','type','SOC 2','date','2025-12','requestHref','/contact?subject=soc2-report'),
    jsonb_build_object('id','iso27001-2025','title','ISO 27001 Certificate 2025','type','ISO 27001','date','2025-09','downloadHref','/trust#certificates')
  ),
  'subprocessors', jsonb_build_array(
    jsonb_build_object('name','Amazon Web Services (KSA)','purpose','Cloud infrastructure','country','Saudi Arabia','dpa',true),
    jsonb_build_object('name','Keycloak (self-hosted)','purpose','Identity & access management','country','Saudi Arabia','dpa',true),
    jsonb_build_object('name','PostgreSQL (self-hosted)','purpose','Primary database','country','Saudi Arabia','dpa',true)
  ),
  'dataRetention', jsonb_build_object(
    'title_en','Data retention schedule',
    'title_ar','جدول الاحتفاظ بالبيانات',
    'policies', jsonb_build_array(
      jsonb_build_object('category_en','Audit logs','category_ar','سجلات التدقيق','retention','7 years','legalBasis','NCA ECC requirement'),
      jsonb_build_object('category_en','User data','category_ar','بيانات المستخدم','retention','Account lifetime + 90 days','legalBasis','PDPA Article 18'),
      jsonb_build_object('category_en','Evidence artifacts','category_ar','أدلة التدقيق','retention','Per framework requirement (min 5 years)','legalBasis','ISO 27001 A.12.4')
    )
  ),
  'privacyFrameworks', jsonb_build_array(
    jsonb_build_object('id','pdpa','name','Saudi PDPA','status','Compliant','badge','pdpa'),
    jsonb_build_object('id','nca','name','NCA ECC','status','Aligned','badge','nca-ecc'),
    jsonb_build_object('id','gdpr','name','GDPR (EU customers)','status','Compliant','badge','gdpr'),
    jsonb_build_object('id','iso27701','name','ISO 27701','status','In progress','badge','iso27701')
  ),
  'slaMetrics', jsonb_build_object(
    'uptime','99.9%',
    'uptimeLast12Months','99.94%',
    'mttr_en','Mean time to recovery: < 4 hours',
    'mttr_ar','متوسط وقت الاسترداد: أقل من 4 ساعات',
    'statusPageUrl','https://status.shahin-ai.com',
    'lastIncident_en','No P1 incidents in 2026',
    'lastIncident_ar','لا يوجد حوادث من المستوى الأول في 2026'
  )
)),

('/about', jsonb_build_object(
  'pressLinks', jsonb_build_array(
    jsonb_build_object('id','p1','outlet','Arab News','headline','Shahin AI brings agentic GRC to Saudi market','date','2026-03','href','#'),
    jsonb_build_object('id','p2','outlet','GITEX Daily','headline','Dogan Consulting unveils AI-OS for enterprise governance','date','2026-02','href','#')
  ),
  'investors', jsonb_build_array(
    jsonb_build_object('id','inv1','name','Strategic GCC Investor','type','Strategic'),
    jsonb_build_object('id','inv2','name','Saudi Tech Fund','type','Venture')
  ),
  'partners', jsonb_build_array(
    jsonb_build_object('id','p1','name','IBM','tier','Technology'),
    jsonb_build_object('id','p2','name','Microsoft','tier','Cloud'),
    jsonb_build_object('id','p3','name','AWS','tier','Infrastructure')
  ),
  'socialLinks', jsonb_build_array(
    jsonb_build_object('platform','linkedin','url','https://linkedin.com/company/shahin-ai','label','LinkedIn'),
    jsonb_build_object('platform','twitter','url','https://twitter.com/shahinai','label','X (Twitter)')
  ),
  'officeLocations', jsonb_build_array(
    jsonb_build_object(
      'name_en','Headquarters','name_ar','المقر الرئيسي',
      'address_en','Riyadh, Kingdom of Saudi Arabia','address_ar','الرياض، المملكة العربية السعودية',
      'hours_en','Sun–Thu 9:00 AM – 6:00 PM AST','hours_ar','الأحد–الخميس 9:00 ص – 6:00 م'
    )
  )
)),

('/platform', jsonb_build_object(
  'deploymentOptions', jsonb_build_array(
    jsonb_build_object('id','saas','title_en','SaaS (Saudi-hosted)','title_ar','برمجيات كخدمة (استضافة سعودية)','description_en','Fully managed, Saudi-hosted SaaS deployment.','recommended',true),
    jsonb_build_object('id','private','title_en','Private Cloud','title_ar','سحابة خاصة','description_en','Deployed in your private cloud environment.','recommended',false),
    jsonb_build_object('id','hybrid','title_en','Hybrid','title_ar','هجين','description_en','SaaS management plane with on-prem data residency.','recommended',false)
  ),
  'apiCapabilities', jsonb_build_array(
    jsonb_build_object('id','rest','name','REST API','description_en','Full platform API with OpenAPI 3.1 spec','authenticated',true),
    jsonb_build_object('id','webhooks','name','Webhooks','description_en','Real-time event notifications for integrations','authenticated',true),
    jsonb_build_object('id','sdk','name','JavaScript SDK','description_en','Official SDK for custom integration development','authenticated',true)
  ),
  'scalingTiers', jsonb_build_object(
    'starter', jsonb_build_object('users',25,'modules',3,'storage','50GB','agents',3),
    'professional', jsonb_build_object('users',100,'modules',6,'storage','500GB','agents',6),
    'enterprise', jsonb_build_object('users','Unlimited','modules','All','storage','Custom','agents','9+')
  ),
  'roadmapHighlights', jsonb_build_array(
    jsonb_build_object('id','rh1','title_en','SAMA CSF module','title_ar','وحدة SAMA CSF','quarter','Q3 2026','status','planned'),
    jsonb_build_object('id','rh2','title_en','AI-generated policy authoring','title_ar','تأليف السياسات بالذكاء الاصطناعي','quarter','Q3 2026','status','planned'),
    jsonb_build_object('id','rh3','title_en','Mobile app (iOS/Android)','title_ar','تطبيق جوال','quarter','Q4 2026','status','planned')
  )
)),

('/pricing', jsonb_build_object(
  'faq', jsonb_build_array(
    jsonb_build_object('id','pf1','question_en','Can I change plans later?','answer_en','Yes, you can upgrade or downgrade at any time. Changes take effect at your next billing cycle.'),
    jsonb_build_object('id','pf2','question_en','Is there a free trial?','answer_en','Yes — 30-day free trial with full access to all features. No credit card required.'),
    jsonb_build_object('id','pf3','question_en','Do you offer annual billing?','answer_en','Yes — annual billing saves up to 20% compared to monthly.'),
    jsonb_build_object('id','pf4','question_en','What currencies do you accept?','answer_en','SAR (Saudi Riyal) and USD. Invoicing in local currency available for enterprise customers.')
  ),
  'addOns', jsonb_build_array(
    jsonb_build_object('id','addon-ai','title_en','Advanced AI Pack','title_ar','حزمة الذكاء الاصطناعي المتقدمة','price_en','Custom pricing','description_en','Additional AI agents and advanced agentic capabilities.'),
    jsonb_build_object('id','addon-int','title_en','Enterprise Integrations','title_ar','التكاملات المؤسسية','price_en','Custom pricing','description_en','Pre-built connectors for SAMA, banking core systems and ERP.')
  ),
  'enterpriseCta', jsonb_build_object(
    'title_en','Need a custom plan?',
    'title_ar','تحتاج إلى خطة مخصصة؟',
    'body_en','Our enterprise team will design a package around your specific regulatory requirements, user count and module needs.',
    'body_ar','سيصمم فريق المؤسسات لدينا حزمة تناسب متطلباتك التنظيمية وعدد المستخدمين واحتياجات الوحدات.',
    'ctaLabel_en','Talk to sales',
    'ctaLabel_ar','تحدث مع المبيعات',
    'ctaHref','/contact?subject=enterprise'
  ),
  'comparisonTable', jsonb_build_object(
    'columns', jsonb_build_array(
      jsonb_build_object('key','feature','header_en','Feature'),
      jsonb_build_object('key','starter','header_en','Starter'),
      jsonb_build_object('key','professional','header_en','Professional'),
      jsonb_build_object('key','enterprise','header_en','Enterprise')
    ),
    'rows', jsonb_build_array(
      jsonb_build_object('feature_en','AI agents','starter','3','professional','6','enterprise','9+'),
      jsonb_build_object('feature_en','Compliance frameworks','starter','2','professional','5','enterprise','Unlimited'),
      jsonb_build_object('feature_en','Evidence automation','starter','Basic','professional','Full','enterprise','Full + custom'),
      jsonb_build_object('feature_en','Audit management','starter','❌','professional','✅','enterprise','✅'),
      jsonb_build_object('feature_en','Board reporting','starter','❌','professional','✅','enterprise','Custom templates'),
      jsonb_build_object('feature_en','Arabic UI','starter','✅','professional','✅','enterprise','✅'),
      jsonb_build_object('feature_en','SSO / SAML','starter','❌','professional','✅','enterprise','✅'),
      jsonb_build_object('feature_en','SLA','starter','99.5%','professional','99.9%','enterprise','Custom SLA'),
      jsonb_build_object('feature_en','Support','starter','Email','professional','Priority (8h)','enterprise','Dedicated CSM')
    )
  )
)),

('/contact', jsonb_build_object(
  'calendlyEmbed', jsonb_build_object(
    'enabled', true,
    'title_en','Book a product demo',
    'title_ar','احجز عرضاً للمنتج',
    'url','https://calendly.com/shahin-ai/demo',
    'duration_en','30 minutes',
    'duration_ar','30 دقيقة'
  ),
  'chatWidget', jsonb_build_object(
    'enabled', true,
    'provider','intercom',
    'title_en','Chat with us',
    'title_ar','تحدث معنا',
    'offlineMessage_en','We are offline. Leave a message and we will reply within 24 hours.',
    'offlineMessage_ar','نحن غير متاحين الآن. اترك رسالة وسنرد خلال 24 ساعة.'
  ),
  'responseTimeSla', jsonb_build_object(
    'general_en','Within 1 business day',
    'general_ar','خلال يوم عمل واحد',
    'enterprise_en','Within 4 hours (business hours)',
    'enterprise_ar','خلال 4 ساعات (أوقات العمل)',
    'security_en','Within 72 hours',
    'security_ar','خلال 72 ساعة'
  )
)),

('/resources', jsonb_build_object(
  'filters', jsonb_build_array(
    jsonb_build_object('id','all','label_en','All','label_ar','الكل'),
    jsonb_build_object('id','guides','label_en','Guides','label_ar','الأدلة'),
    jsonb_build_object('id','whitepapers','label_en','Whitepapers','label_ar','الأوراق البيضاء'),
    jsonb_build_object('id','checklists','label_en','Checklists','label_ar','قوائم المراجعة'),
    jsonb_build_object('id','webinars','label_en','Webinars','label_ar','الندوات الإلكترونية')
  ),
  'featuredItem', jsonb_build_object(
    'id','featured-kit',
    'title_en','Shahin AI Executive Kit',
    'title_ar','الحزمة التنفيذية لشاهين للذكاء الاصطناعي',
    'body_en','The complete executive overview — architecture, compliance posture, customer evidence and ROI analysis.',
    'body_ar','النظرة العامة التنفيذية الكاملة — الهندسة والوضع الامتثالي وأدلة العملاء وتحليل العائد على الاستثمار.',
    'type','Executive Kit',
    'ctaLabel_en','Download Executive Kit',
    'ctaLabel_ar','تحميل الحزمة التنفيذية',
    'href','/resources/executive-kit'
  ),
  'newsletterSignup', jsonb_build_object(
    'title_en','Stay ahead of GRC trends',
    'title_ar','ابقَ في طليعة اتجاهات الحوكمة والمخاطر والامتثال',
    'body_en','Monthly insights on NCA ECC, PDPA, ISO 27001 and AI-native governance practices.',
    'body_ar','رؤى شهرية حول معايير NCA ECC وPDPA وISO 27001 وممارسات الحوكمة بالذكاء الاصطناعي.',
    'ctaLabel_en','Subscribe',
    'ctaLabel_ar','اشترك',
    'placeholderText_en','Your work email',
    'placeholderText_ar','بريدك الإلكتروني العملي'
  )
)),

('/legal', jsonb_build_object(
  'lastUpdated', '2026-05-01',
  'jurisdictions', jsonb_build_array(
    jsonb_build_object('id','ksa','name_en','Kingdom of Saudi Arabia','name_ar','المملكة العربية السعودية','lawRef','Saudi PDPA 2021'),
    jsonb_build_object('id','eu','name_en','European Union','name_ar','الاتحاد الأوروبي','lawRef','GDPR 2016/679'),
    jsonb_build_object('id','uae','name_en','United Arab Emirates','name_ar','الإمارات العربية المتحدة','lawRef','UAE Federal Decree-Law No. 45/2021')
  )
))

) AS v(route, extra_props)
WHERE dos.ui_route_template_binding.route = v.route;

-- Validation
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT route, (SELECT COUNT(*) FROM jsonb_object_keys(props)) AS key_count
    FROM dos.ui_route_template_binding
    WHERE route IN ('/security','/trust','/about','/platform','/pricing','/contact','/resources','/legal')
    ORDER BY route
  LOOP
    RAISE NOTICE '20260507_2400: % → % keys', r.route, r.key_count;
  END LOOP;
END $$;
COMMIT;
