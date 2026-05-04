-- Phase 1: DB-Driven Marketing Page Content
-- Migration: 20260505_1002_marketing_security_content.sql
-- Purpose: Add advanced content props for security page
--
-- This migration adds comprehensive security content to the /security route,
-- including security features, compliance standards, and security architecture details.

UPDATE dos.ui_route_template_binding
SET props = COALESCE(props, '{}'::jsonb) || jsonb_build_object(
  'brandCode', 'shahin-ai',
  'eyebrow_en', 'Security',
  'eyebrow_ar', 'الأمن',
  'title_en', 'Enterprise-grade security for your governance data',
  'title_ar', 'أمان على مستوى المؤسسات لبيانات الحوكمة الخاصة بك',
  'sub_en', 'Multi-layered protection with end-to-end encryption and real-time threat detection.',
  'sub_ar', 'حماية متعددة الطبقات مع تشفير من طرف إلى طرف وكشف التهديدات في الوقت الفعلي.',
  'features', jsonb_build_array(
    jsonb_build_object(
      'id', 'encryption',
      'title_en', 'End-to-End Encryption',
      'title_ar', 'التشفير من طرف إلى طرف',
      'body_en', 'All data encrypted at rest and in transit using AES-256.',
      'body_ar', 'جميع البيانات مشفرة أثناء الراحة وأثناء النقل باستخدام AES-256.',
      'icon', 'lock'
    ),
    jsonb_build_object(
      'id', 'mfa',
      'title_en', 'Multi-Factor Authentication',
      'title_ar', 'المصادقة متعددة العوامل',
      'body_en', 'Required for all users with SSO integration support.',
      'body_ar', 'مطلوبة لجميع المستخدمين مع دعم تكامل SSO.',
      'icon', 'user'
    ),
    jsonb_build_object(
      'id', 'audit',
      'title_en', 'Comprehensive Audit Logs',
      'title_ar', 'سجلات تدقيق شاملة',
      'body_en', 'Track all user actions with immutable audit trails.',
      'body_ar', 'تتبع جميع إجراءات المستخدم مع مسارات تدقيق ثابتة.',
      'icon', 'document'
    ),
    jsonb_build_object(
      'id', 'backup',
      'title_en', 'Automated Backups',
      'title_ar', 'نسخ احتياطية آلية',
      'body_en', 'Daily backups with 30-day retention and disaster recovery.',
      'body_ar', 'نسخ احتياطية يومية مع الاحتفاظ لمدة 30 يومًا والتعافي من الكوارث.',
      'icon', 'database'
    )
  ),
  'complianceStandards', jsonb_build_array(
    jsonb_build_object('name_en', 'NESA', 'name_ar', 'NESA', 'description_en', 'National Cybersecurity Authority (Saudi Arabia)', 'description_ar', 'السلطة الوطنية للأمن السيبراني (المملكة العربية السعودية)'),
    jsonb_build_object('name_en', 'ISO 27001', 'name_ar', 'ISO 27001', 'description_en', 'International Information Security Standard', 'description_ar', 'معيار أمن المعلومات الدولي'),
    jsonb_build_object('name_en', 'SOC 2', 'name_ar', 'SOC 2', 'description_en', 'Service Organization Control 2', 'description_ar', 'التحكم في منظمة الخدمات 2')
  ),
  'architecture', jsonb_build_object(
    'title_en', 'Security Architecture',
    'title_ar', 'بنية الأمان',
    'body_en', 'Our security follows defense-in-depth principles with multiple layers of protection.',
    'body_ar', 'يتبع أماننا مبادئ الدفاع في العمق مع طبقات متعددة من الحماية.'
  ),
  'ctaLabel_en', 'Contact Security Team',
  'ctaLabel_ar', 'اتصل بفريق الأمان',
  'ctaHref', '/contact'
)
WHERE route = '/security' AND archetype = 'marketing-landing';

-- Add comment
COMMENT ON COLUMN dos.ui_route_template_binding.props IS 'JSONB props bag for marketing page configuration. For security: {brandCode, eyebrow, title, sub, features, complianceStandards, architecture, ctaLabel, ctaHref}';
