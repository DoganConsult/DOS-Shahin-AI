-- Phase 1: DB-Driven Marketing Page Content
-- Migration: 20260505_1005_marketing_legal_content.sql
-- Purpose: Add advanced content props for legal page
--
-- This migration adds comprehensive legal content to the /legal route,
-- including terms of service, privacy policy, cookie policy, and other legal documents.

UPDATE dos.ui_route_template_binding
SET props = COALESCE(props, '{}'::jsonb) || jsonb_build_object(
  'brandCode', 'shahin-ai',
  'eyebrow_en', 'Legal',
  'eyebrow_ar', 'القانوني',
  'title_en', 'Terms, Privacy & Policies',
  'title_ar': 'الشروط والخصوصية والسياسات',
  'sub_en', 'Our legal documents ensure transparency and protect your rights.',
  'sub_ar': 'تضمن مستنداتنا القانونية الشفافية وتحمي حقوقك.',
  'documents', jsonb_build_array(
    jsonb_build_object(
      'id', 'terms',
      'title_en', 'Terms of Service',
      'title_ar': 'شروط الخدمة',
      'summary_en', 'Terms and conditions for using Shahin-AI platform.',
      'summary_ar': 'الشروط والأحكام لاستخدام منصة Shahin-AI.',
      'lastUpdated_en', 'January 1, 2024',
      'lastUpdated_ar': '1 يناير 2024',
      'sections', jsonb_build_array(
        jsonb_build_object('title_en', 'Acceptance of Terms', 'title_ar': 'قبول الشروط', 'body_en': 'By using our platform, you agree to these terms.', 'body_ar': 'باستخدام منصتنا، أنت توافق على هذه الشروط.'),
        jsonb_build_object('title_en', 'User Responsibilities', 'title_ar': 'مسؤوليات المستخدم', 'body_en', 'Users must comply with all applicable laws.', 'body_ar': 'يجب على المستخدمين الامتثال لجميع القوانين المعمول بها.')
      )
    ),
    jsonb_build_object(
      'id', 'privacy',
      'title_en', 'Privacy Policy',
      'title_ar': 'سياسة الخصوصية',
      'summary_en', 'How we collect, use, and protect your data.',
      'summary_ar': 'كيف نجمع ونستخدم ونحمي بياناتك.',
      'lastUpdated_en', 'January 1, 2024',
      'lastUpdated_ar': '1 يناير 2024',
      'sections', jsonb_build_array(
        jsonb_build_object('title_en', 'Data Collection', 'title_ar': 'جمع البيانات', 'body_en': 'We collect data necessary to provide our services.', 'body_ar': 'نجمع البيانات الضرورية لتقديم خدماتنا.'),
        jsonb_build_object('title_en', 'Data Usage', 'title_ar': 'استخدام البيانات', 'body_en': 'Your data is used only for service delivery and improvement.', 'body_ar': 'تُستخدم بياناتك فقط لتقديم الخدمة وتحسينها.')
      )
    ),
    jsonb_build_object(
      'id', 'cookies',
      'title_en', 'Cookie Policy',
      'title_ar': 'سياسة ملفات تعريف الارتباط',
      'summary_en', 'Information about cookies we use and your choices.',
      'summary_ar': 'معلومات حول ملفات تعريف الارتباط التي نستخدمها وخياراتك.',
      'lastUpdated_en', 'January 1, 2024',
      'lastUpdated_ar': '1 يناير 2024',
      'sections', jsonb_build_array(
        jsonb_build_object('title_en', 'Essential Cookies', 'title_ar': 'ملفات تعريف الارتباط الأساسية', 'body_en': 'Required for basic site functionality.', 'body_ar': 'مطلوبة للوظائف الأساسية للموقع.'),
        jsonb_build_object('title_en', 'Analytics Cookies', 'title_ar': 'ملفات تعريف الارتباط للتحليلات', 'body_en': 'Help us improve our services.', 'body_ar': 'تساعدنا في تحسين خدماتنا.')
      )
    )
  ),
  'gdprCompliance', jsonb_build_object(
    'title_en', 'GDPR Compliance',
    'title_ar': 'الامتثال لـ GDPR',
    'body_en': 'We are fully compliant with EU General Data Protection Regulation.',
    'body_ar': 'نحن متوافقون تماماً مع اللائحة العامة لحماية البيانات للاتحاد الأوروبي.',
    'rights', jsonb_build_array(
      jsonb_build_object('name_en', 'Right to Access', 'name_ar': 'حق الوصول', 'description_en': 'Request access to your personal data.', 'description_ar': 'طلب الوصول إلى بياناتك الشخصية.'),
      jsonb_build_object('name_en', 'Right to Deletion', 'name_ar': 'حق الحذف', 'description_en': 'Request deletion of your personal data.', 'description_ar': 'طلب حذف بياناتك الشخصية.')
    )
  ),
  'contactLabel_en', 'Contact Legal Team',
  'contactLabel_ar': 'اتصل بالفريق القانوني',
  'contactHref', '/contact'
)
WHERE route = '/legal' AND archetype = 'marketing-landing';

-- Add comment
COMMENT ON COLUMN dos.ui_route_template_binding.props IS 'JSONB props bag for marketing page configuration. For legal: {brandCode, eyebrow, title, sub, documents, gdprCompliance, contactLabel, contactHref}';
