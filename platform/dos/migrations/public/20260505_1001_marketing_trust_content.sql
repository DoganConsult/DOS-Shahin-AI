-- Phase 1: DB-Driven Marketing Page Content
-- Migration: 20260505_1001_marketing_trust_content.sql
-- Purpose: Add advanced content props for trust page
--
-- This migration adds comprehensive trust content to the /trust route,
-- including certifications, compliance badges, security metrics, and trust indicators.

UPDATE dos.ui_route_template_binding
SET props = COALESCE(props, '{}'::jsonb) || jsonb_build_object(
  'brandCode', 'shahin-ai',
  'eyebrow_en', 'Trust & Compliance',
  'eyebrow_ar', 'الثقة والامتثال',
  'title_en', 'Built on trust, secured by compliance',
  'title_ar', 'مبني على الثقة، مؤمّن بالامتثال',
  'sub_en', 'Your data is protected by industry-leading security and compliance standards.',
  'sub_ar', 'بياناتك محمية بمعايير الأمان والامتثال الرائدة في الصناعة.',
  'certifications', jsonb_build_array(
    jsonb_build_object(
      'id', 'iso27001',
      'name_en', 'ISO 27001',
      'name_ar', 'ISO 27001',
      'description_en', 'Information Security Management',
      'description_ar', 'إدارة أمن المعلومات',
      'status', 'active',
      'year', '2024'
    ),
    jsonb_build_object(
      'id', 'soc2',
      'name_en', 'SOC 2 Type II',
      'name_ar', 'SOC 2 Type II',
      'description_en', 'Security, Availability, Processing Integrity',
      'description_ar', 'الأمان، التوفر، سلامة المعالجة',
      'status', 'active',
      'year', '2024'
    ),
    jsonb_build_object(
      'id', 'gdpr',
      'name_en', 'GDPR Compliant',
      'name_ar', 'متوافق مع GDPR',
      'description_en', 'EU General Data Protection Regulation',
      'description_ar', 'اللائحة العامة لحماية البيانات للاتحاد الأوروبي',
      'status', 'active',
      'year', '2024'
    )
  ),
  'securityMetrics', jsonb_build_array(
    jsonb_build_object('label_en', '99.9%', 'label_ar', '99.9%', 'description_en', 'Uptime SLA', 'description_ar', 'وقت التشغيل SLA'),
    jsonb_build_object('label_en', '256-bit', 'label_ar', '256-bit', 'description_en', 'Encryption', 'description_ar', 'التشفير'),
    jsonb_build_object('label_en', '24/7', 'label_ar', '24/7', 'description_en', 'Monitoring', 'description_ar', 'المراقبة'),
    jsonb_build_object('label_en', '0', 'label_ar', '0', 'description_en', 'Data Breaches', 'description_ar', 'اختراقات البيانات')
  ),
  'trustIndicators', jsonb_build_array(
    jsonb_build_object('icon', 'shield', 'title_en', 'Bank-level Security', 'title_ar', 'أمان على مستوى البنوك', 'body_en', 'Enterprise-grade encryption and security protocols.', 'body_ar', 'تشفير وبروتوكولات أمان على مستوى المؤسسات.'),
    jsonb_build_object('icon', 'lock', 'title_en', 'Data Privacy', 'title_ar', 'خصوصية البيانات', 'body_en', 'Your data never leaves our secure infrastructure.', 'body_ar', 'بياناتك لا تغادر بنيتنا التحتية الآمنة أبداً.'),
    jsonb_build_object('icon', 'checkmark', 'title_en', 'Compliance Ready', 'title_ar', 'جاهز للامتثال', 'body_en', 'Pre-configured for KSA regulatory compliance.', 'body_ar', 'مجهز مسبقاً للامتثال التنظيمي في المملكة العربية السعودية.')
  ),
  'ctaLabel_en', 'Request Security Audit',
  'ctaLabel_ar', 'طلب تدقيق أمني',
  'ctaHref', '/contact'
)
WHERE route = '/trust' AND archetype = 'marketing-landing';

-- Add comment
COMMENT ON COLUMN dos.ui_route_template_binding.props IS 'JSONB props bag for marketing page configuration. For trust: {brandCode, eyebrow, title, sub, certifications, securityMetrics, trustIndicators, ctaLabel, ctaHref}';
