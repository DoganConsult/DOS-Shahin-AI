-- Phase 1: DB-Driven Marketing Page Content
-- Migration: 20260505_1006_marketing_platform_content.sql
-- Purpose: Add advanced content props for platform page
--
-- This migration adds comprehensive platform content to the /platform route,
-- including platform overview, architecture, features, and technical specifications.

UPDATE dos.ui_route_template_binding
SET props = COALESCE(props, '{}'::jsonb) || jsonb_build_object(
  'brandCode', 'shahin-ai',
  'eyebrow_en', 'Platform',
  'eyebrow_ar', 'المنصة',
  'title_en', 'Built for the future of governance',
  'title_ar', 'مبني لمستقبل الحوكمة',
  'sub_en', 'Modern architecture powered by AI and automation.',
  'sub_ar': 'بنية حديثة مدعومة بالذكاء الاصطناعي والأتمتة.',
  'overview', jsonb_build_object(
    'title_en', 'Platform Overview',
    'title_ar': 'نظرة عامة على المنصة',
    'body_en', 'Shahin-AI is a next-generation governance platform that combines AI, automation, and deep domain expertise to transform how organizations manage compliance and risk.',
    'body_ar': 'Shahin-AI هي منصة حوكمة من الجيل التالي التي تجمع بين الذكاء الاصطناعي والأتمتة والخبرة العميقة في المجال لتحويل كيفية إدارة المؤسسات للامتثال والمخاطر.'
  ),
  'architecture', jsonb_build_object(
    'title_en', 'Technical Architecture',
    'title_ar', 'البنية التقنية',
    'body_en', 'Built on modern microservices architecture with enterprise-grade security and scalability.',
    'body_ar', 'مبني على بنية الخدمات المصغرة الحديثة مع أمان وقابلية توسع على مستوى المؤسسات.',
    'components', jsonb_build_array(
      jsonb_build_object('name_en', 'AI Engine', 'name_ar', 'محرك الذكاء الاصطناعي', 'description_en', 'Intelligent automation and insights', 'description_ar', 'أتمتة ورؤى ذكية'),
      jsonb_build_object('name_en', 'Data Layer', 'name_ar', 'طبقة البيانات', 'description_en', 'Secure, scalable data storage', 'description_ar', 'تخزين بيانات آمن وقابل للتوسع'),
      jsonb_build_object('name_en', 'Integration Layer', 'name_ar', 'طبقة التكامل', 'description_en', 'Seamless system connections', 'description_ar', 'اتصالات نظام سلسة'),
      jsonb_build_object('name_en', 'UI Layer', 'name_ar', 'طبقة واجهة المستخدم', 'description_en', 'Modern, responsive interface', 'description_ar', 'واجهة حديثة ومتجاوبة')
    )
  ),
  'features', jsonb_build_array(
    jsonb_build_object('title_en', 'AI-Powered Insights', 'title_ar', 'رؤى مدعومة بالذكاء الاصطناعي', 'body_en', 'Get intelligent recommendations and predictions.', 'body_ar', 'احصل على توصيات وتوقعات ذكية.'),
    jsonb_build_object('title_en', 'Real-Time Monitoring', 'title_ar', 'المراقبة في الوقت الفعلي', 'body_en', 'Track compliance status continuously.', 'body_ar', 'تتبع حالة الامتثال بشكل مستمر.'),
    jsonb_build_object('title_en', 'Automated Workflows', 'title_ar', 'سير العمل الآلي', 'body_en', 'Streamline governance processes.', 'body_ar', 'تبسيط عمليات الحوكمة.'),
    jsonb_build_object('title_en', 'Multi-Tenant Architecture', 'title_ar', 'بنية متعددة المستأجرين', 'body_en', 'Secure isolation for each organization.', 'body_ar', 'عزل آمن لكل مؤسسة.')
  ),
  'integrations', jsonb_build_array(
    jsonb_build_object('name_en', 'ERP Systems', 'name_ar', 'أنظمة تخطيط الموارد', 'icon', 'database'),
    jsonb_build_object('name_en', 'Cloud Providers', 'name_ar', 'مزودو السحابة', 'icon', 'cloud'),
    jsonb_build_object('name_en', 'Identity Providers', 'name_ar', 'موفرو الهوية', 'icon', 'user'),
    jsonb_build_object('name_en', 'Compliance Frameworks', 'name_ar', 'أطر الامتثال', 'icon', 'checkmark')
  ),
  'ctaLabel_en', 'Request Demo',
  'ctaLabel_ar', 'طلب تجريبي',
  'ctaHref', '/contact'
)
WHERE route = '/platform' AND archetype = 'marketing-landing';

-- Add comment
COMMENT ON COLUMN dos.ui_route_template_binding.props IS 'JSONB props bag for marketing page configuration. For platform: {brandCode, eyebrow, title, sub, overview, architecture, features, integrations, ctaLabel, ctaHref}';
